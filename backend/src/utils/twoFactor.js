// Pomoćne funkcije za dvofaktorsku prijavu.
//
// Ovdje je samo kriptografija i formatiranje; sve što dira bazu, cookieje ili
// odgovore je u twoFactorController.js. Tajne se nigdje ne loguju.

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// Jednokratni kod poslan mailom: 10 minuta, 5 pokušaja, ponovno slanje najviše
// jednom u minuti. Brojač pokušaja živi u bazi (po nalogu), ne u memoriji
// procesa, pa vrijedi i kad aplikacija ide u više procesa.
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

// Povjeren uređaj traje koliko i remember-me sesija (10 godina): korisnik koji
// je čekirao "Zapamti me" ne smije ponovo dobiti pitanje za kod.
const TRUSTED_DEVICE_TTL_MS = 1000 * 60 * 60 * 24 * 365 * 10;

const BACKUP_CODE_COUNT = 10;
// Base32 bez 0/1/8/I/L/O/U: izbjegava i zabunu pri prepisivanju i slučajne
// riječi u kodu.
const BACKUP_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ2345679";

/** Šestocifreni kod, uniformno raspoređen (crypto.randomInt, ne Math.random). */
function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code).trim()).digest("hex");
}

/** Poređenje hasheva u konstantnom vremenu. */
function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Korisnik zna kucati "123 456" ili "123-456"; gledamo samo cifre. */
function normalizeOtpInput(raw) {
  return String(raw ?? "").replace(/\D/g, "");
}

function isOtpShaped(raw) {
  return /^\d{6}$/.test(normalizeOtpInput(raw));
}

function randomBackupCode() {
  const chars = [];
  for (let i = 0; i < 8; i += 1) {
    chars.push(BACKUP_ALPHABET[crypto.randomInt(0, BACKUP_ALPHABET.length)]);
  }
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** Za poređenje: bez crtica, velika slova. */
function normalizeBackupInput(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Deset jednokratnih kodova. Vraća čitljive kodove (prikazuju se korisniku
 * tačno jednom) i bcrypt hasheve za bazu.
 */
async function generateBackupCodes() {
  const plain = Array.from({ length: BACKUP_CODE_COUNT }, randomBackupCode);
  const hashes = await Promise.all(
    plain.map((code) => bcrypt.hash(normalizeBackupInput(code), 10)),
  );
  return { plain, hashes };
}

/**
 * Traži kod među hashevima. Vraća indeks pogotka ili -1. Pozivalac je dužan
 * ukloniti taj indeks iz niza (kodovi su jednokratni).
 */
async function findBackupCodeIndex(raw, hashes) {
  const candidate = normalizeBackupInput(raw);
  if (candidate.length !== 8 || !Array.isArray(hashes)) return -1;
  for (let i = 0; i < hashes.length; i += 1) {
    // Sekvencijalno namjerno: bcrypt je spor po dizajnu, deset paralelnih
    // hasheva bi na svaki pokušaj zauzelo cijeli thread pool.
    if (await bcrypt.compare(candidate, hashes[i])) return i;
  }
  return -1;
}

/** Nasumičan token za cookie povjerenog uređaja i njegov hash za bazu. */
function generateDeviceToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashDeviceToken(token) };
}

function hashDeviceToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/** Kratka oznaka uređaja za listu u profilu; user agent zna biti ogroman. */
function deviceLabel(userAgent) {
  const ua = String(userAgent ?? "").trim();
  if (!ua) return "Nepoznat uređaj";
  return ua.slice(0, 160);
}

module.exports = {
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  TRUSTED_DEVICE_TTL_MS,
  BACKUP_CODE_COUNT,
  generateOtp,
  hashOtp,
  safeEqualHex,
  normalizeOtpInput,
  isOtpShaped,
  generateBackupCodes,
  findBackupCodeIndex,
  normalizeBackupInput,
  generateDeviceToken,
  hashDeviceToken,
  deviceLabel,
};
