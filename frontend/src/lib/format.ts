// PK Office formatiranje. BAM iznosi i datumi se uvijek prikazuju kroz ove
// helpere kako bi cijela aplikacija imala konzistentan izgled.
// Ručna implementacija (bez Intl.NumberFormat) jer Node i browser ICU
// daju različit izlaz za bs-BA locale → hydration mismatch u SSR-u.

export function formatBAM(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "–";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "–";
  const negative = n < 0;
  const abs = Math.abs(n);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${withThousands},${decPart} KM`;
}

// Live formatiranje novčanog unosa dok korisnik kuca: grupiše hiljade tačkom,
// dozvoljava do 2 decimale iza zareza. "1234" -> "1.234"; "1234,5" -> "1.234,5".
export function formatMoneyLive(input: string): string {
  if (!input || !input.trim()) return "";
  const cleaned = input.replace(/\./g, "");
  const parts = cleaned.split(",");
  let intPart = parts[0].replace(/\D/g, "");
  if (!intPart && parts.length > 1) intPart = "0";
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (parts.length > 1) {
    const decPart = parts[1].replace(/\D/g, "").slice(0, 2);
    return `${intPart},${decPart}`;
  }
  return intPart;
}

// Parsiraj formatirani unos ("1.000,50") u broj (1000.5). Prazno -> null.
export function parseMoneyInput(input: string): number | null {
  if (!input || !String(input).trim()) return null;
  const n = Number(String(input).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Blur formatiranje: dopuni na puni oblik sa 2 decimale "1.000,00". Prazno -> "".
export function formatMoneyBlur(input: string): string {
  const n = parseMoneyInput(input);
  if (n === null) return "";
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "-" : ""}${withThousands},${decPart}`;
}

export function formatDate(input: Date | string | null | undefined): string {
  if (!input) return "–";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "–";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}.`;
}

export function formatDateTime(input: Date | string | null | undefined): string {
  if (!input) return "–";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "–";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}. ${hh}:${mi}`;
}
