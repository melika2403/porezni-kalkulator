// Podešavanje dvofaktorske prijave u Moj profil → Sigurnost.
//
// Sve rute ovdje su iza requireAuth. Radnje koje mijenjaju sigurnosne postavke
// traže ponovni unos lozinke (step-up): otet session ne smije biti dovoljan da
// napadač veže svoj kanal na tuđi nalog, niti da 2FA isključi.

const bcrypt = require("bcryptjs");
const QRCode = require("qrcode");
const { User, UserTwoFactor, UserTrustedDevice } = require("../models/index");
const twoFactorService = require("../services/twoFactorService");
const { generateBackupCodes } = require("../utils/twoFactor");
const totp = require("../utils/totp");
const { encrypt } = require("../utils/encryptJmbg");
const { logEvent } = require("./activityController");

const PODRZANE_METODE = ["EMAIL", "TOTP"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Step-up provjera. Korisnik koji ima lozinku mora je unijeti; korisnik bez
 * lozinke (prijava samo preko Google-a) je nema čime potvrditi, pa mu je
 * postojeći session jedini dokaz koji uopšte može dati.
 */
async function provjeriLozinku(userId, password) {
  const user = await User.findByPk(userId, {
    attributes: ["id", "email", "firstName", "password"],
  });
  if (!user) return { ok: false, error: "UNAUTHENTICATED" };
  if (!user.password) return { ok: true, user };
  if (!isNonEmptyString(password))
    return { ok: false, error: "LOZINKA_OBAVEZNA" };
  const tacna = await bcrypt.compare(password, user.password);
  if (!tacna) return { ok: false, error: "POGRESNA_LOZINKA" };
  return { ok: true, user };
}

async function status(req, res) {
  try {
    const userId = req.user.id;
    const row = await UserTwoFactor.findOne({ where: { userId } });
    const uredjaji = await UserTrustedDevice.count({ where: { userId } });
    return res.status(200).json({
      ok: true,
      data: {
        enabled: !!row?.enabled,
        method: row?.enabled ? row.method : null,
        enabledAt: row?.enabled ? row.enabledAt : null,
        preostaloRezervnihKodova: row?.enabled
          ? (Array.isArray(row.backupCodes) ? row.backupCodes.length : 0)
          : 0,
        povjerenihUredjaja: uredjaji,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

/**
 * Korak 1 i 2 wizarda: potvrda lozinke i izbor metode. Za EMAIL odmah šalje
 * kod. Ne mijenja ništa što bi oborilo postojeći 2FA (piše u pending polja).
 */
async function setupStart(req, res) {
  const { method, password } = req.body ?? {};
  if (!PODRZANE_METODE.includes(method))
    return res.status(400).json({ ok: false, error: "NEDOSTUPNA_METODA" });

  try {
    const provjera = await provjeriLozinku(req.user.id, password);
    if (!provjera.ok)
      return res.status(400).json({ ok: false, error: provjera.error });
    const user = provjera.user;

    if (method === "EMAIL" && !user.email)
      return res.status(400).json({ ok: false, error: "NEMA_EMAILA" });

    const [row] = await UserTwoFactor.findOrCreate({
      where: { userId: user.id },
      defaults: { userId: user.id, method, enabled: false },
    });
    await row.update({ pendingMethod: method, pendingTotpSecret: null });

    if (method === "EMAIL") {
      const poslano = await twoFactorService.issueEmailOtp(user, row, {
        svrha: "aktivacija",
      });
      if (!poslano.ok)
        return res.status(429).json({
          ok: false,
          error: poslano.error,
          data: { retryAfter: poslano.retryAfter ?? null },
        });
      return res.status(200).json({ ok: true, data: { method } });
    }

    // TOTP: nova tajna se pravi pri SVAKOM pokretanju podešavanja. Aktivna
    // tajna se ne dira dok korisnik ne potvrdi kod, pa napušteno podešavanje
    // ne obori postojeći 2FA.
    const tajna = totp.generateSecret();
    await row.update({ pendingTotpSecret: encrypt(tajna) });

    const otpauthUrl = totp.buildOtpauthUrl(tajna, user.email || `korisnik-${user.id}`);
    // QR se crta na serveru i ide kao data URL: frontend tako ne treba svoju
    // biblioteku, a tajna ne prolazi kroz nijedan vanjski servis.
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 220,
      color: { dark: "#0f1a12", light: "#ffffff" },
    });

    return res.status(200).json({
      ok: true,
      data: {
        method,
        qrDataUrl,
        otpauthUrl,
        // za ručni unos u aplikaciju kad kamera nije opcija
        secret: totp.formatSecretForDisplay(tajna),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

/**
 * Korak 3 i 4: potvrda koda pa rezervni kodovi. Kodovi se vraćaju SAMO ovdje i
 * samo jednom, u bazi ostaju kao bcrypt hashevi.
 */
async function setupConfirm(req, res) {
  const { code } = req.body ?? {};
  if (!isNonEmptyString(code))
    return res.status(400).json({ ok: false, error: "NEISPRAVAN_KOD" });

  try {
    const userId = req.user.id;
    const row = await UserTwoFactor.findOne({ where: { userId } });
    if (!row || !row.pendingMethod)
      return res.status(400).json({ ok: false, error: "PODESAVANJE_NIJE_POCETO" });

    // Samo metodski kod: rezervni kodovi ovdje ne smiju proći jer se upravo
    // generišu novi. Tajna se čita iz pending polja, ne iz aktivne.
    const rezultat = await twoFactorService.verifyMethodCode(
      row,
      code,
      row.pendingMethod,
      { tajnaUPodesavanju: true },
    );
    if (!rezultat.ok)
      return res.status(400).json({ ok: false, error: rezultat.error });

    const { plain, hashes } = await generateBackupCodes();
    const naTotp = row.pendingMethod === "TOTP";
    await row.update({
      method: row.pendingMethod,
      pendingMethod: null,
      // Tajna prelazi u aktivnu tek sada, kad je korisnik dokazao da mu je
      // aplikacija stvarno podešena.
      ...(naTotp
        ? {
            totpSecret: row.pendingTotpSecret,
            // Kod upotrijebljen za potvrdu se ne smije ponoviti pri prijavi.
            lastTotpStep: rezultat.korak ?? null,
          }
        : { totpSecret: null, lastTotpStep: null }),
      pendingTotpSecret: null,
      enabled: true,
      enabledAt: row.enabledAt || new Date(),
      lastUsedAt: new Date(),
      backupCodes: hashes,
      // Zaostali email kod iz ranijeg podešavanja ne smije preživjeti promjenu
      // metode.
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    });

    // Nova metoda znači nova odluka o povjerenju: stari povjereni uređaji se
    // gase da promjena metode zaista važi svuda.
    await twoFactorService.forgetAllDevices(userId, res);

    void logEvent({
      userId,
      action: "2FA_UKLJUCEN",
      label: row.method === "EMAIL" ? "Email kod" : "Aplikacija",
    });

    return res
      .status(200)
      .json({ ok: true, data: { method: row.method, backupCodes: plain } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

/**
 * Kod za AKTIVNU metodu, kad korisnik mora nešto potvrditi iz profila (za sada
 * isključivanje 2FA). Bez ovoga bi korisnik sa email metodom morao trošiti
 * rezervni kod samo da bi 2FA isključio.
 */
async function sendCurrentMethodCode(req, res) {
  try {
    const row = await UserTwoFactor.findOne({
      where: { userId: req.user.id, enabled: true },
    });
    if (!row) return res.status(400).json({ ok: false, error: "2FA_NIJE_UKLJUCEN" });
    if (row.method !== "EMAIL")
      return res.status(400).json({ ok: false, error: "NEDOSTUPNO" });

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "email", "firstName"],
    });
    const poslano = await twoFactorService.issueEmailOtp(user, row);
    if (!poslano.ok)
      return res.status(429).json({
        ok: false,
        error: poslano.error,
        data: { retryAfter: poslano.retryAfter ?? null },
      });
    return res.status(200).json({ ok: true, data: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

/** Novi set rezervnih kodova; stari prestaju važiti odmah. */
async function regenerateBackupCodes(req, res) {
  try {
    const provjera = await provjeriLozinku(req.user.id, req.body?.password);
    if (!provjera.ok)
      return res.status(400).json({ ok: false, error: provjera.error });

    const row = await UserTwoFactor.findOne({
      where: { userId: req.user.id, enabled: true },
    });
    if (!row) return res.status(400).json({ ok: false, error: "2FA_NIJE_UKLJUCEN" });

    const { plain, hashes } = await generateBackupCodes();
    await row.update({ backupCodes: hashes });
    void logEvent({
      userId: req.user.id,
      action: "2FA_NOVI_KODOVI",
      label: null,
    });
    return res.status(200).json({ ok: true, data: { backupCodes: plain } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

/** Poništi povjerenje svim uređajima: sljedeća prijava svugdje traži kod. */
async function clearTrustedDevices(req, res) {
  try {
    await twoFactorService.forgetAllDevices(req.user.id, res);
    return res.status(200).json({ ok: true, data: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

/** Isključenje traži i lozinku i važeći kod: dvije stvari, kao i uključenje. */
async function disable(req, res) {
  const { password, code } = req.body ?? {};
  try {
    const provjera = await provjeriLozinku(req.user.id, password);
    if (!provjera.ok)
      return res.status(400).json({ ok: false, error: provjera.error });

    const row = await UserTwoFactor.findOne({
      where: { userId: req.user.id, enabled: true },
    });
    if (!row) return res.status(400).json({ ok: false, error: "2FA_NIJE_UKLJUCEN" });

    if (!isNonEmptyString(code))
      return res.status(400).json({ ok: false, error: "NEISPRAVAN_KOD" });
    const rezultat = await twoFactorService.verifyCode(row, code);
    if (!rezultat.ok)
      return res.status(400).json({ ok: false, error: rezultat.error });

    await row.destroy();
    await twoFactorService.forgetAllDevices(req.user.id, res);
    void logEvent({ userId: req.user.id, action: "2FA_ISKLJUCEN", label: null });
    return res.status(200).json({ ok: true, data: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

/**
 * Novi kod na mail TOKOM PODEŠAVANJA (prijava ima svoj resend na /api/auth).
 */
async function resendSetupCode(req, res) {
  try {
    const row = await UserTwoFactor.findOne({ where: { userId: req.user.id } });
    if (!row || row.pendingMethod !== "EMAIL")
      return res.status(400).json({ ok: false, error: "PODESAVANJE_NIJE_POCETO" });

    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "email", "firstName"],
    });
    const poslano = await twoFactorService.issueEmailOtp(user, row, {
      svrha: "aktivacija",
    });
    if (!poslano.ok)
      return res.status(429).json({
        ok: false,
        error: poslano.error,
        data: { retryAfter: poslano.retryAfter ?? null },
      });
    return res.status(200).json({ ok: true, data: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

module.exports = {
  status,
  setupStart,
  setupConfirm,
  resendSetupCode,
  sendCurrentMethodCode,
  regenerateBackupCodes,
  clearTrustedDevices,
  disable,
};
