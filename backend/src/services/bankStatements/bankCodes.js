// Prepoznavanje banke iz vodećeg trocifrenog koda žiro računa.
// Nazivi usklađeni sa bankName vrijednostima parsera da se izvodi
// grupišu zajedno na frontendu. Dopuniti po potrebi.

const BANK_CODES = {
  132: "NLB Banka",
  134: "ASA Banka",
  140: "ProCredit Bank",
  141: "BBI Banka",
  154: "Intesa Sanpaolo Banka",
  161: "Raiffeisen Bank",
  186: "Ziraat Bank",
  198: "KIB Banka",
  199: "Sparkasse Bank",
  306: "Addiko Bank",
  338: "UniCredit Bank",
  552: "Addiko Bank",
  555: "Nova Banka",
  562: "NLB Banka",
  572: "MF Banka",
};

/** "338-520-22082328-45" ili "3385202208232845" → "UniCredit Bank" ili null */
function bankNameFromAccount(account) {
  const digits = String(account || "").replace(/[^\d]/g, "");
  if (digits.length < 3) return null;
  return BANK_CODES[Number(digits.slice(0, 3))] || null;
}

module.exports = { bankNameFromAccount, BANK_CODES };
