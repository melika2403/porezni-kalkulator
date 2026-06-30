// Pomoćne funkcije za iznose (isti pristup kao ugovor o pozajmici/djelu).
// Tačka je UVIJEK thousands separator, zarez je UVIJEK decimalni.

import { iznosUSlova } from "../ugovor-o-djelu/iznosSlovima";
import type { KompenzacijaData, KompStavka } from "./types";

// Live formatter dok korisnik kuca: "5000" -> "5.000", "5000,5" -> "5.000,5".
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

// "1.234,56" -> 1234.56
export function parseIznos(s: string): number {
  if (!s) return 0;
  const cleaned = s.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Na blur: normalizuj unos na "X.XXX,00" (uvijek dvije decimale). Prazno ostaje prazno.
export function formatMoneyBlur(s: string): string {
  if (!s || !s.trim()) return "";
  return formatBroj(parseIznos(s));
}

// 1234.5 -> "1.234,50"
export function formatBroj(n: number): string {
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// 1234.5 -> "1.234,50 KM"
export function formatKM(n: number): string {
  return `${formatBroj(n)} KM`;
}

// "3884.4" raw -> "3.884,40 KM (slovima: ...)" za ugovor o cesiji.
export function composeIznosString(raw: string): string {
  const n = parseIznos(raw);
  if (n <= 0) return raw;
  return `${formatBroj(n)} KM (slovima: ${iznosUSlova(n)})`;
}

export { iznosUSlova };

// Ograniči broj stavki da dokument uvijek stane na jedan list: ako ih ima više
// od maxRows, prikaži prvih (maxRows-1) i jedan zbirni red za ostatak.
export function collapseStavke(stavke: KompStavka[], maxRows = 6): KompStavka[] {
  if (stavke.length <= maxRows) return stavke;
  const head = stavke.slice(0, maxRows - 1);
  const rest = stavke.slice(maxRows - 1);
  const sum = rest.reduce((a, b) => a + (b.iznos || 0), 0);
  return [...head, { opis: `Ostale stavke (zbir ${rest.length} stavki)`, iznos: sum }];
}

// Zbirovi i izračun kompenzacije: kompenzuje se manji iznos, razlika ide na žiro.
export function kompTotals(data: KompenzacijaData) {
  const sum = (s: KompStavka[]) => s.reduce((a, b) => a + (b.iznos || 0), 0);
  const ukupnoD = sum(data.duznikStavke);
  const ukupnoP = sum(data.povjeriocStavke);
  const kompenzacija = Math.min(ukupnoD, ukupnoP);
  const nekompenzirani = Math.abs(ukupnoD - ukupnoP);
  return { ukupnoD, ukupnoP, kompenzacija, nekompenzirani };
}
