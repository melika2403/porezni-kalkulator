// Testovi kriptografskog dijela dvofaktorske prijave i pravila oko challenge
// tokena. Pokretanje:
//   cd backend && npm test
// Dio koji dira bazu (verifyCode nad Sequelize redom) nije ovdje: ovi testovi
// se vrte bez MySQL-a.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const {
  generateOtp,
  hashOtp,
  safeEqualHex,
  isOtpShaped,
  normalizeOtpInput,
  normalizeBackupInput,
  generateBackupCodes,
  findBackupCodeIndex,
  generateDeviceToken,
  hashDeviceToken,
  deviceLabel,
} = require("../src/utils/twoFactor");

test("OTP je uvijek šestocifren", () => {
  for (let i = 0; i < 200; i += 1) {
    const kod = generateOtp();
    assert.match(kod, /^\d{6}$/);
  }
});

test("OTP hash se poklapa samo sa istim kodom", () => {
  const kod = "042317";
  assert.equal(safeEqualHex(hashOtp(kod), hashOtp("042317")), true);
  assert.equal(safeEqualHex(hashOtp(kod), hashOtp("042318")), false);
});

test("safeEqualHex ne puca na praznom ili raznoličnom ulazu", () => {
  assert.equal(safeEqualHex("", ""), false);
  assert.equal(safeEqualHex("abcd", "abcdef"), false);
  assert.equal(safeEqualHex(null, "abcd"), false);
});

test("unos koda trpi razmake i crtice", () => {
  assert.equal(normalizeOtpInput(" 123 456 "), "123456");
  assert.equal(normalizeOtpInput("123-456"), "123456");
  assert.equal(isOtpShaped("123 456"), true);
  assert.equal(isOtpShaped("12345"), false);
  assert.equal(isOtpShaped("ABCD-EFGH"), false);
});

test("rezervni kodovi: deset komada, čitljiv oblik, bez zbunjujućih znakova", async () => {
  const { plain, hashes } = await generateBackupCodes();
  assert.equal(plain.length, 10);
  assert.equal(hashes.length, 10);
  assert.equal(new Set(plain).size, 10, "kodovi se ne smiju ponavljati");
  for (const kod of plain) {
    assert.match(kod, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal(/[01OIL8U]/.test(kod), false, `zbunjujući znak u ${kod}`);
  }
});

test("rezervni kod prolazi jednom, poslije uklanjanja ne prolazi", async () => {
  const { plain, hashes } = await generateBackupCodes();
  const idx = await findBackupCodeIndex(plain[3], hashes);
  assert.equal(idx, 3);

  const preostali = hashes.filter((_, i) => i !== idx);
  assert.equal(await findBackupCodeIndex(plain[3], preostali), -1);
  // ostali kodovi i dalje rade
  assert.notEqual(await findBackupCodeIndex(plain[4], preostali), -1);
});

test("rezervni kod se prepoznaje bez crtice i u malim slovima", async () => {
  const { plain, hashes } = await generateBackupCodes();
  const bezCrtice = plain[0].replace("-", "").toLowerCase();
  assert.equal(await findBackupCodeIndex(bezCrtice, hashes), 0);
  assert.equal(normalizeBackupInput(" abcd-2345 "), "ABCD2345");
});

test("pogrešan rezervni kod ne prolazi", async () => {
  const { hashes } = await generateBackupCodes();
  assert.equal(await findBackupCodeIndex("ZZZZ-ZZZZ", hashes), -1);
  assert.equal(await findBackupCodeIndex("kratko", hashes), -1);
  assert.equal(await findBackupCodeIndex("", hashes), -1);
});

test("token povjerenog uređaja: sirovi token nikad nije jednak hashu", () => {
  const { token, hash } = generateDeviceToken();
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(token, hash);
  assert.equal(hashDeviceToken(token), hash);
});

test("oznaka uređaja se skraćuje i ne pada na praznom", () => {
  assert.equal(deviceLabel(""), "Nepoznat uređaj");
  assert.equal(deviceLabel(undefined), "Nepoznat uređaj");
  assert.equal(deviceLabel("x".repeat(500)).length, 160);
});

// ─── Provjera koda nad redom ─────────────────────────────────────────────────
// Lažni Sequelize red: update() upisuje vrijednosti i na instancu, tačno kao
// pravi. Bez ovoga se brojač pokušaja ne bi mogao testirati bez baze, a upravo
// je tu bila greška za jedan.

function lazniRed(polja) {
  return Object.assign(
    {
      async update(vrijednosti) {
        Object.assign(this, vrijednosti);
        return this;
      },
    },
    polja,
  );
}

function redSaEmailKodom(kod) {
  return lazniRed({
    userId: 1,
    method: "EMAIL",
    enabled: true,
    otpHash: hashOtp(kod),
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    otpAttempts: 0,
    backupCodes: [],
  });
}

test("brojač preostalih pokušaja broji tačno", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const { verifyCode } = require("../src/services/twoFactorService");
  const red = redSaEmailKodom("123456");

  // 5 dozvoljenih pokušaja: poslije prvog promašaja ostaju 4, ne 3
  for (const ocekivano of [4, 3, 2, 1, 0]) {
    const r = await verifyCode(red, "000000");
    assert.equal(r.ok, false);
    assert.equal(r.error, "NEISPRAVAN_KOD");
    assert.equal(
      r.preostaloPokusaja,
      ocekivano,
      `poslije ${red.otpAttempts}. pokušaja mora pisati ${ocekivano}`,
    );
  }

  // tek šesti pokušaj poništava kod
  const sesti = await verifyCode(red, "000000");
  assert.equal(sesti.error, "PREVISE_POKUSAJA");
  assert.equal(red.otpHash, null, "iscrpljen kod se poništava");
});

test("tačan email kod prolazi i odmah se poništava", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const { verifyCode } = require("../src/services/twoFactorService");
  const red = redSaEmailKodom("424242");

  const prvi = await verifyCode(red, "424242");
  assert.equal(prvi.ok, true);
  assert.equal(prvi.usedBackupCode, false);
  assert.equal(red.otpHash, null);

  // isti kod drugi put nema šta pogoditi
  const drugi = await verifyCode(red, "424242");
  assert.equal(drugi.ok, false);
  assert.equal(drugi.error, "NEMA_KODA");
});

test("istekao email kod se odbija i briše", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const { verifyCode } = require("../src/services/twoFactorService");
  const red = redSaEmailKodom("111111");
  red.otpExpiresAt = new Date(Date.now() - 1000);

  const r = await verifyCode(red, "111111");
  assert.equal(r.error, "ISTEKAO_KOD");
  assert.equal(red.otpHash, null);
});

test("rezervni kod prolazi kroz verifyCode i troši se iz niza", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const { verifyCode } = require("../src/services/twoFactorService");
  const { plain, hashes } = await generateBackupCodes();
  const red = redSaEmailKodom("999999");
  red.backupCodes = hashes;

  const r = await verifyCode(red, plain[0]);
  assert.equal(r.ok, true);
  assert.equal(r.usedBackupCode, true);
  assert.equal(red.backupCodes.length, 9);

  // isti rezervni kod drugi put pada, i ne troši pokušaje email koda
  const ponovo = await verifyCode(red, plain[0]);
  assert.equal(ponovo.ok, false);
  assert.equal(red.otpAttempts, 0, "rezervni kod ne dira brojač email koda");
});

// ─── Step-up drugim faktorom ─────────────────────────────────────────────────
// Bez ovoga bi napadač sa sesijom i lozinkom uzeo svjež set rezervnih kodova pa
// jednim od njih ugasio 2FA, iako isključivanje traži kod.

async function saLaznimRedom(red, posao) {
  const modeli = require("../src/models/index");
  const original = modeli.UserTwoFactor.findOne;
  modeli.UserTwoFactor.findOne = async () => red;
  try {
    return await posao();
  } finally {
    modeli.UserTwoFactor.findOne = original;
  }
}

test("step-up: uključen 2FA bez koda ne prolazi", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const { provjeriTrenutniFaktor } = require("../src/controllers/twoFactorController");
  const red = redSaEmailKodom("555555");

  await saLaznimRedom(red, async () => {
    for (const prazno of [undefined, null, "", "   "]) {
      const r = await provjeriTrenutniFaktor(1, prazno);
      assert.equal(r.ok, false);
      assert.equal(r.error, "KOD_OBAVEZAN");
    }
    const pogresan = await provjeriTrenutniFaktor(1, "000000");
    assert.equal(pogresan.ok, false);
    assert.equal(pogresan.error, "NEISPRAVAN_KOD");
  });
});

test("step-up: tačan kod prolazi i troši se", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const { provjeriTrenutniFaktor } = require("../src/controllers/twoFactorController");
  const red = redSaEmailKodom("777777");
  red.otpSentAt = new Date();

  await saLaznimRedom(red, async () => {
    const r = await provjeriTrenutniFaktor(1, "777777");
    assert.equal(r.ok, true);
    assert.equal(r.row, red);
    assert.equal(red.otpHash, null, "kod se troši");
    assert.equal(
      red.otpSentAt,
      null,
      "cooldown se skida da zamjena metode odmah može poslati novi kod",
    );
  });
});

test("step-up: rezervni kod je prihvatljiv drugi faktor", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const { provjeriTrenutniFaktor } = require("../src/controllers/twoFactorController");
  const { plain, hashes } = await generateBackupCodes();
  const red = redSaEmailKodom("888888");
  red.backupCodes = hashes;

  await saLaznimRedom(red, async () => {
    const r = await provjeriTrenutniFaktor(1, plain[2]);
    assert.equal(r.ok, true);
    assert.equal(red.backupCodes.length, 9);
  });
});

test("step-up: bez uključenog 2FA propušta (prvo uključenje)", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const { provjeriTrenutniFaktor } = require("../src/controllers/twoFactorController");

  await saLaznimRedom(null, async () => {
    const r = await provjeriTrenutniFaktor(1, undefined);
    assert.equal(r.ok, true);
    assert.equal(r.row, null);
  });
});

// ─── Challenge token ─────────────────────────────────────────────────────────
// Najvažnije pravilo cijele funkcije: challenge NIJE prijava.

test("requireAuth odbija challenge token", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const { requireAuth } = require("../src/middlewares/authMiddleware");

  const token = jwt.sign({ purpose: "2fa", rememberMe: true }, process.env.JWT_SECRET, {
    subject: "1",
    expiresIn: 600,
  });

  const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
  let status = null;
  let body = null;
  const res = {
    status(s) {
      status = s;
      return this;
    },
    json(b) {
      body = b;
      return this;
    },
  };
  let pusteno = false;
  await requireAuth(req, res, () => {
    pusteno = true;
  });

  assert.equal(pusteno, false, "challenge token ne smije proći kroz requireAuth");
  assert.equal(status, 401);
  assert.equal(body.error, "INVALID_TOKEN");
});

test("challenge se čita samo sa ispravnim purpose i potpisom", () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const {
    signChallenge,
    readChallenge,
    CHALLENGE_COOKIE,
  } = require("../src/services/twoFactorService");

  const dobar = signChallenge({ userId: 7, rememberMe: true, method: "EMAIL" });
  const procitan = readChallenge({ cookies: { [CHALLENGE_COOKIE]: dobar } });
  assert.deepEqual(procitan, { userId: 7, rememberMe: true, method: "EMAIL" });

  // token bez purpose (npr. običan access_token) ne smije proći kao challenge
  const obican = jwt.sign({ role: "USER" }, process.env.JWT_SECRET, {
    subject: "7",
    expiresIn: 600,
  });
  assert.equal(readChallenge({ cookies: { [CHALLENGE_COOKIE]: obican } }), null);
  assert.equal(readChallenge({ cookies: {} }), null);
  assert.equal(
    readChallenge({ cookies: { [CHALLENGE_COOKIE]: "nije.jwt.uopste" } }),
    null,
  );
});

test("rememberMe iz challenge tokena preživi put do provjere", () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-za-2fa";
  const {
    signChallenge,
    readChallenge,
    CHALLENGE_COOKIE,
  } = require("../src/services/twoFactorService");

  const bez = signChallenge({ userId: 3, rememberMe: false, method: "EMAIL" });
  assert.equal(readChallenge({ cookies: { [CHALLENGE_COOKIE]: bez } }).rememberMe, false);
});
