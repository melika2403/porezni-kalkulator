// Dvofaktorska prijava: sve što je zajedničko prijavi (authController) i
// podešavanju u profilu (twoFactorController).
//
// Tri pojma koja se ne smiju pomiješati:
//  - access_token: dokaz da je korisnik prijavljen. Postavlja se TEK poslije
//    drugog faktora.
//  - twofa_challenge: kratkotrajni dokaz "lozinka je bila tačna", traje 10
//    minuta i NE vrijedi kao prijava (requireAuth ga odbija po `purpose`).
//  - tfa_device: dugotrajni dokaz "ovom uređaju vjerujem", postavlja se samo uz
//    "Zapamti me" i preskače drugi faktor pri sljedećim prijavama.

const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { UserTwoFactor, UserTrustedDevice } = require("../models/index");
const { cookieBaseOptions } = require("../utils/authCookies");
const { send2faCodeEmail } = require("../utils/mailer");
const { decrypt } = require("../utils/encryptJmbg");
const totp = require("../utils/totp");
const {
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  TRUSTED_DEVICE_TTL_MS,
  generateOtp,
  hashOtp,
  safeEqualHex,
  isOtpShaped,
  normalizeOtpInput,
  findBackupCodeIndex,
  generateDeviceToken,
  hashDeviceToken,
  deviceLabel,
} = require("../utils/twoFactor");

const CHALLENGE_COOKIE = "twofa_challenge";
const DEVICE_COOKIE = "tfa_device";
const CHALLENGE_TTL_SECONDS = 10 * 60;
const CHALLENGE_PURPOSE = "2fa";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in environment");
  return secret;
}

// ─── Aktivni 2FA zapis ───────────────────────────────────────────────────────

/** Red sa uključenim 2FA, ili null. Redovi u podešavanju (enabled=false) ne broje. */
async function getEnabledTwoFactor(userId) {
  const row = await UserTwoFactor.findOne({ where: { userId, enabled: true } });
  return row || null;
}

// ─── Challenge (međukorak prijave) ───────────────────────────────────────────

function signChallenge({ userId, rememberMe, method }) {
  return jwt.sign(
    { purpose: CHALLENGE_PURPOSE, rememberMe: Boolean(rememberMe), method },
    getJwtSecret(),
    { subject: String(userId), expiresIn: CHALLENGE_TTL_SECONDS },
  );
}

/** Vraća { userId, rememberMe, method } ili null za istekao/tuđi/pogrešan token. */
function readChallenge(req) {
  const token = req.cookies?.[CHALLENGE_COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.purpose !== CHALLENGE_PURPOSE) return null;
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;
    return {
      userId,
      rememberMe: Boolean(payload.rememberMe),
      method: payload.method,
    };
  } catch {
    return null;
  }
}

function setChallengeCookie(res, token) {
  res.cookie(CHALLENGE_COOKIE, token, {
    ...cookieBaseOptions(),
    maxAge: CHALLENGE_TTL_SECONDS * 1000,
  });
}

function clearChallengeCookie(res) {
  res.clearCookie(CHALLENGE_COOKIE, cookieBaseOptions());
}

// ─── Povjereni uređaji ───────────────────────────────────────────────────────

/**
 * Da li ovaj browser smije preskočiti drugi faktor. Uz provjeru osvježava
 * lastSeenAt (za listu u profilu), ali to ne blokira odgovor.
 */
async function isTrustedDevice(req, userId) {
  const raw = req.cookies?.[DEVICE_COOKIE];
  if (!raw) return false;
  const row = await UserTrustedDevice.findOne({
    where: {
      userId,
      tokenHash: hashDeviceToken(raw),
      expiresAt: { [Op.gt]: new Date() },
    },
  });
  if (!row) return false;
  void row.update({ lastSeenAt: new Date() }).catch(() => {});
  return true;
}

/**
 * Zapamti uređaj. Zove se SAMO kad je korisnik čekirao "Zapamti me": trajanje
 * je isto kao remember-me sesija, pa kod na tom računaru više ne dolazi.
 */
async function rememberDevice(req, res, userId) {
  const { token, hash } = generateDeviceToken();
  await UserTrustedDevice.create({
    userId,
    tokenHash: hash,
    label: deviceLabel(req.headers["user-agent"]),
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + TRUSTED_DEVICE_TTL_MS),
  });
  res.cookie(DEVICE_COOKIE, token, {
    ...cookieBaseOptions(),
    maxAge: TRUSTED_DEVICE_TTL_MS,
  });
}

function clearDeviceCookie(res) {
  res.clearCookie(DEVICE_COOKIE, cookieBaseOptions());
}

/** Poništi sva povjerenja (dugme u profilu, isključivanje 2FA, brisanje 2FA). */
async function forgetAllDevices(userId, res) {
  await UserTrustedDevice.destroy({ where: { userId } });
  if (res) clearDeviceCookie(res);
}

// ─── Slanje koda ─────────────────────────────────────────────────────────────

/**
 * Napravi kod, upiši hash, pošalji mail. Vraća { ok } ili { ok:false, error }
 * kad je ponovno slanje pretjerano često. Kod se NIKAD ne vraća pozivaocu.
 */
async function issueEmailOtp(user, row, { svrha = "prijava" } = {}) {
  const now = Date.now();
  if (row.otpSentAt && now - new Date(row.otpSentAt).getTime() < OTP_RESEND_COOLDOWN_MS) {
    const preostalo = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (now - new Date(row.otpSentAt).getTime())) / 1000,
    );
    return { ok: false, error: "PRECESTO_SLANJE", retryAfter: preostalo };
  }

  const code = generateOtp();
  await row.update({
    otpHash: hashOtp(code),
    otpExpiresAt: new Date(now + OTP_TTL_MS),
    otpAttempts: 0,
    otpSentAt: new Date(now),
  });

  await send2faCodeEmail(user.email, user.firstName, code, { svrha });
  return { ok: true };
}

// ─── Provjera koda ───────────────────────────────────────────────────────────

/**
 * Provjeri kod koji je korisnik unio. Prihvata metodski kod (EMAIL za sada) i
 * rezervni kod, u oba slučaja jednokratno.
 *
 * Vraća { ok: true, usedBackupCode } ili { ok: false, error }:
 *  - NEISPRAVAN_KOD, ISTEKAO_KOD, PREVISE_POKUSAJA, NEMA_KODA
 */
async function verifyCode(row, rawCode) {
  const unos = String(rawCode ?? "").trim();
  if (!unos) return { ok: false, error: "NEISPRAVAN_KOD" };

  // Rezervni kod ima drugi oblik (xxxx-xxxx) pa ga prepoznajemo prije OTP-a i
  // ne trošimo na njega brojač pokušaja metodskog koda.
  if (!isOtpShaped(unos)) {
    const hashes = Array.isArray(row.backupCodes) ? row.backupCodes : [];
    const idx = await findBackupCodeIndex(unos, hashes);
    if (idx < 0) return { ok: false, error: "NEISPRAVAN_KOD" };
    const preostali = hashes.filter((_, i) => i !== idx);
    await row.update({ backupCodes: preostali, lastUsedAt: new Date() });
    return { ok: true, usedBackupCode: true };
  }

  return verifyMethodCode(row, unos, row.method);
}

/**
 * Samo metodski kod, bez rezervnih. Koristi se pri PODEŠAVANJU: tada se
 * rezervni kodovi tek generišu, pa ne smiju biti način da se metoda potvrdi.
 */
async function verifyMethodCode(row, rawCode, method, { tajnaUPodesavanju = false } = {}) {
  const unos = String(rawCode ?? "").trim();
  if (!isOtpShaped(unos)) return { ok: false, error: "NEISPRAVAN_KOD" };
  if (method === "EMAIL") return verifyEmailOtp(row, unos);
  if (method === "TOTP") return verifyTotp(row, unos, tajnaUPodesavanju);
  return { ok: false, error: "NEISPRAVAN_KOD" };
}

/**
 * Kod iz aplikacije. Tajna je u bazi šifrovana, pa se dešifruje samo ovdje.
 * `tajnaUPodesavanju` znači da se gleda pendingTotpSecret: pri podešavanju
 * aktivna tajna se ne smije koristiti (niti postoji kod prvog uključenja).
 */
async function verifyTotp(row, unos, tajnaUPodesavanju) {
  const sifrovana = tajnaUPodesavanju ? row.pendingTotpSecret : row.totpSecret;
  if (!sifrovana) return { ok: false, error: "NEMA_KODA" };

  const tajna = decrypt(sifrovana);
  if (!tajna) {
    // Neispravan ključ ili oštećen zapis: bolje jasna greška nego tiho odbijanje
    // svakog koda, jer bi korisnik mislio da mu je aplikacija razdešena.
    console.error("2FA: TOTP tajna se ne može dešifrovati, userId", row.userId);
    return { ok: false, error: "NEMA_KODA" };
  }

  // Isti kod ne prolazi dvaput: prihvata se samo korak noviji od zadnjeg
  // iskorištenog. Pri podešavanju još nema historije.
  const korak = totp.verifyCode(tajna, unos, {
    poslijeKoraka: tajnaUPodesavanju ? null : row.lastTotpStep,
  });
  if (korak == null) return { ok: false, error: "NEISPRAVAN_KOD" };

  if (!tajnaUPodesavanju) {
    await row.update({ lastTotpStep: korak, lastUsedAt: new Date() });
  }
  return { ok: true, usedBackupCode: false, korak };
}

async function verifyEmailOtp(row, unos) {
  if (!row.otpHash || !row.otpExpiresAt) {
    return { ok: false, error: "NEMA_KODA" };
  }
  if (new Date(row.otpExpiresAt).getTime() < Date.now()) {
    await row.update({ otpHash: null, otpExpiresAt: null, otpAttempts: 0 });
    return { ok: false, error: "ISTEKAO_KOD" };
  }
  if (row.otpAttempts >= OTP_MAX_ATTEMPTS) {
    // Kod se poništava, ne nalog: korisnik traži novi kod i nastavlja.
    await row.update({ otpHash: null, otpExpiresAt: null, otpAttempts: 0 });
    return { ok: false, error: "PREVISE_POKUSAJA" };
  }

  if (!safeEqualHex(hashOtp(normalizeOtpInput(unos)), row.otpHash)) {
    // update() upisuje vrijednost i na instancu, pa je row.otpAttempts poslije
    // njega VEĆ uvećan. Dodavanje još jedan bi korisniku javilo da je ostao bez
    // pokušaja dok jedan još ima.
    await row.update({ otpAttempts: row.otpAttempts + 1 });
    const preostalo = OTP_MAX_ATTEMPTS - row.otpAttempts;
    return { ok: false, error: "NEISPRAVAN_KOD", preostaloPokusaja: preostalo };
  }

  await row.update({
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    lastUsedAt: new Date(),
  });
  return { ok: true, usedBackupCode: false };
}

module.exports = {
  CHALLENGE_COOKIE,
  DEVICE_COOKIE,
  getEnabledTwoFactor,
  signChallenge,
  readChallenge,
  setChallengeCookie,
  clearChallengeCookie,
  isTrustedDevice,
  rememberDevice,
  clearDeviceCookie,
  forgetAllDevices,
  issueEmailOtp,
  verifyCode,
  verifyMethodCode,
};
