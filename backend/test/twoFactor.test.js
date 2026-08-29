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
