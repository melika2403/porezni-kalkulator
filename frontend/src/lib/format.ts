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

// Inicijali organizacije za avatar. Ignoriše navodnike i pravne forme
// (d.o.o., d.d. ... i obrt prefikse TR, STR, SZR, SUR ...), pa uzima inicijale
// stvarnog naziva. Npr. `"ANDY-S" d.o.o.` -> "AN", `TR "JASMIN"` -> "JA".
const ORG_FORM_TOKENS = new Set([
  // Pravne forme (najčešće sufiksi)
  "doo",
  "jdoo",
  "dd",
  "dno",
  "kd",
  "sp",
  // Obrt / radnja prefiksi (i puni nazivi)
  "tr",
  "str",
  "szr",
  "sur",
  "sr",
  "ur",
  "zr",
  "pr",
  "or",
  "obrt",
  "radnja",
]);

export function orgInitials(name: string | null | undefined): string {
  if (!name) return "?";
  // Izbaci navodnike i slične znakove koji smetaju inicijalima.
  const cleaned = String(name).replace(/["“”„«»'']/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const norm = (t: string) => t.toLowerCase().replace(/[.\-]/g, "");
  const real = tokens.filter((t) => norm(t) && !ORG_FORM_TOKENS.has(norm(t)));
  const use = real.length ? real : tokens;
  if (!use.length) return "?";
  const lettersOf = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "");
  if (use.length === 1) {
    const l = lettersOf(use[0]) || use[0];
    return l.slice(0, 2).toUpperCase();
  }
  const first = (s: string) => (lettersOf(s)[0] || s[0] || "").toUpperCase();
  return first(use[0]) + first(use[1]);
}

// Današnji datum u LOKALNOJ zoni kao "YYYY-MM-DD". new Date().toISOString()
// vraća UTC, pa u zoni BiH (UTC+1/+2) neposredno nakon ponoći da jučerašnji dan
// i pokvari poređenje rokova ("kasni"/"dospio"). Uvijek koristiti ovo.
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(input: Date | string | null | undefined): string {
  if (!input) return "–";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "–";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}.`;
}

// Množina po bosanskim pravilima: 1 stavka, 2-4 stavke, 5+ stavki; po zadnjoj
// cifri (21 stavka, 32 stavke), ali 11-14 uvijek treći oblik (11 stavki).
// mnozina(n, "stavka", "stavke", "stavki")
export function mnozina(
  n: number,
  jedan: string,
  dvaCetiri: string,
  vise: string,
): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return jedan;
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return dvaCetiri;
  return vise;
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
