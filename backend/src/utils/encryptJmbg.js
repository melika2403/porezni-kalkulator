const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey() {
  const hex = process.env.JMBG_ENCRYPT_KEY;
  if (!hex) throw new Error("Missing JMBG_ENCRYPT_KEY in environment");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32)
    throw new Error("JMBG_ENCRYPT_KEY must be 64 hex chars (32 bytes)");
  return key;
}

function encryptJmbg(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LEN,
  });
  const enc = Buffer.concat([
    cipher.update(String(plaintext).trim(), "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${enc.toString("hex")}`;
}

function decryptJmbg(ciphertext) {
  try {
    const [ivHex, tagHex, encHex] = ciphertext.split(":");
    if (!ivHex || !tagHex || !encHex) return null;
    const key = getKey();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivHex, "hex"),
      { authTagLength: TAG_LEN }
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return (
      decipher.update(Buffer.from(encHex, "hex"), undefined, "utf8") +
      decipher.final("utf8")
    );
  } catch {
    return null;
  }
}

module.exports = { encryptJmbg, decryptJmbg };
