// Prepoznavanje banke iz vodećeg trocifrenog koda žiro računa.
// Mirror backend šifarnika (backend/src/services/bankStatements/bankCodes.js),
// držati ih usklađene.

const BANK_CODES: Record<number, string> = {
  132: "NLB Banka",
  134: "ASA Banka",
  140: "ASA Banka", // bivša Sberbank BH, od 1.12.2022. računi prešli na 134
  141: "BBI Banka",
  154: "Intesa Sanpaolo Banka",
  161: "Raiffeisen Bank",
  186: "Ziraat Bank",
  194: "ProCredit Bank",
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
export function bankNameFromAccount(account: string | null | undefined): string | null {
  const digits = String(account ?? "").replace(/\D+/g, "");
  if (digits.length < 3) return null;
  return BANK_CODES[Number(digits.slice(0, 3))] ?? null;
}

/** Formatira cifre žiro računa u XXX-XXX-XXXXXXXX-XX (progresivno pri kucanju). */
export function formatBankAccount(value: string): string {
  const digits = String(value ?? "").replace(/\D+/g, "").slice(0, 16);
  const groups = [3, 3, 8, 2];
  const parts: string[] = [];
  let i = 0;
  for (const len of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + len));
    i += len;
  }
  return parts.join("-");
}
