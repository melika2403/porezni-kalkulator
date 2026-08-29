// TOTP (RFC 6238) za aplikacije tipa Google Authenticator, Authy, 1Password.
//
// Pisano ručno preko node:crypto, bez biblioteke: algoritam je HMAC plus
// odsijecanje, tridesetak linija, a svaka biblioteka bi bila nova zavisnost u
// putanji prijave. Isti razlog kao kod middlewares/rateLimit.js.
//
// Parametri su oni koje aplikacije podrazumijevaju i koje NE treba mijenjati,
// jer ih većina čitača QR koda ignoriše: SHA1, 6 cifara, korak 30 sekundi.

const crypto = require("crypto");

const KORAK_SEKUNDI = 30;
const CIFARA = 6;
// Prihvatamo i prethodni i naredni korak: sat na telefonu zna kasniti ili
// žuriti nekoliko sekundi, a korisnik kuca kod pred sam istek.
const PROZOR = 1;
const TAJNA_BAJTOVA = 20; // 160 bita, kako RFC 4226 preporučuje za SHA1

const BASE32_ALFABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  let bits = 0;
  let vrijednost = 0;
  let izlaz = "";
  for (const bajt of buffer) {
    vrijednost = (vrijednost << 8) | bajt;
    bits += 8;
    while (bits >= 5) {
      izlaz += BASE32_ALFABET[(vrijednost >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) izlaz += BASE32_ALFABET[(vrijednost << (5 - bits)) & 31];
  return izlaz;
}

function base32Decode(tekst) {
  const ocisceno = String(tekst || "")
    .toUpperCase()
    .replace(/=+$/, "")
    .replace(/\s+/g, "");
  let bits = 0;
  let vrijednost = 0;
  const bajtovi = [];
  for (const znak of ocisceno) {
    const idx = BASE32_ALFABET.indexOf(znak);
    if (idx === -1) throw new Error("Neispravan base32 znak");
    vrijednost = (vrijednost << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bajtovi.push((vrijednost >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bajtovi);
}

/** Nova tajna kao base32 tekst; taj oblik ide i u QR i u ručni unos. */
function generateSecret() {
  return base32Encode(crypto.randomBytes(TAJNA_BAJTOVA));
}

/** Redni broj koraka za dati trenutak (default: sada). */
function currentStep(vrijemeMs = Date.now()) {
  return Math.floor(vrijemeMs / 1000 / KORAK_SEKUNDI);
}

/** Kod za tačno određeni korak. */
function codeForStep(secretBase32, korak) {
  const kljuc = base32Decode(secretBase32);
  const brojac = Buffer.alloc(8);
  // 8 bajtova big-endian; gornja polovina je nula sve do 2106. godine
  brojac.writeUInt32BE(Math.floor(korak / 2 ** 32), 0);
  brojac.writeUInt32BE(korak >>> 0, 4);

  const hmac = crypto.createHmac("sha1", kljuc).update(brojac).digest();
  const pomak = hmac[hmac.length - 1] & 0x0f;
  const isjecak =
    ((hmac[pomak] & 0x7f) << 24) |
    ((hmac[pomak + 1] & 0xff) << 16) |
    ((hmac[pomak + 2] & 0xff) << 8) |
    (hmac[pomak + 3] & 0xff);

  return String(isjecak % 10 ** CIFARA).padStart(CIFARA, "0");
}

/**
 * Provjeri kod. Vraća korak na kojem je pogodio, ili null.
 *
 * `poslijeKoraka` je zadnji već iskorišten korak: isti kod ne smije proći
 * dvaput (napadač koji ga vidi preko ramena ili u logu proxyja ima 30 sekundi
 * da ga ponovi). Pozivalac je dužan upisati vraćeni korak.
 */
function verifyCode(secretBase32, uneseniKod, { poslijeKoraka = null, vrijemeMs = Date.now() } = {}) {
  const kod = String(uneseniKod || "").replace(/\D/g, "");
  if (kod.length !== CIFARA) return null;

  const sada = currentStep(vrijemeMs);
  for (let pomak = -PROZOR; pomak <= PROZOR; pomak += 1) {
    const korak = sada + pomak;
    if (poslijeKoraka != null && korak <= Number(poslijeKoraka)) continue;
    const ocekivan = codeForStep(secretBase32, korak);
    // Oba su iste dužine (6 cifara), pa je timingSafeEqual siguran.
    if (
      crypto.timingSafeEqual(Buffer.from(ocekivan, "utf8"), Buffer.from(kod, "utf8"))
    ) {
      return korak;
    }
  }
  return null;
}

/**
 * otpauth:// URI koji aplikacije čitaju iz QR koda. Labela je "izdavač:nalog",
 * tako je aplikacije prikazuju u listi.
 */
function buildOtpauthUrl(secretBase32, nalog, izdavac = "Porezni Kalkulator") {
  const labela = `${encodeURIComponent(izdavac)}:${encodeURIComponent(nalog || "nalog")}`;
  const parametri = new URLSearchParams({
    secret: secretBase32,
    issuer: izdavac,
    algorithm: "SHA1",
    digits: String(CIFARA),
    period: String(KORAK_SEKUNDI),
  });
  return `otpauth://totp/${labela}?${parametri.toString()}`;
}

/** Tajna u grupama od po četiri znaka, za prepisivanje rukom. */
function formatSecretForDisplay(secretBase32) {
  return String(secretBase32 || "")
    .match(/.{1,4}/g)
    ?.join(" ") ?? "";
}

module.exports = {
  KORAK_SEKUNDI,
  CIFARA,
  PROZOR,
  base32Encode,
  base32Decode,
  generateSecret,
  currentStep,
  codeForStep,
  verifyCode,
  buildOtpauthUrl,
  formatSecretForDisplay,
};
