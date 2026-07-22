// Dijeljeni helperi za ručni unos datuma u formatu DD.MM.GGGG.
// Koristi ih PkDateInput (PK Office) i forme koje drže datum kao display string.

/** "11.06.2026." ili "11.6.2026" → "2026-06-11" (null ako nije validan) */
export function parseDateInput(value: string): string | null {
  const m = String(value || "")
    .trim()
    .match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  // odbaci nemoguće datume (31.02, 31.04...) provjerom stvarnog kalendara
  const dt = new Date(y, mo - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "2026-06-11" → "11.06.2026." ("" ako nije ISO datum) */
export function isoToDisplay(iso: string): string {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}.${m[2]}.${m[1]}.`;
}

/** Maska za kucanje datuma: tačke se same upisuju (12 → "12.", 1206 → "12.06.") */
export function maskDateInput(value: string): string {
  const digits = String(value || "").replace(/\D+/g, "").slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length >= 2) out += ".";
  if (digits.length > 2) out += digits.slice(2, 4);
  if (digits.length >= 4) out += ".";
  if (digits.length > 4) out += digits.slice(4, 8);
  if (digits.length === 8) out += ".";
  return out;
}

/** Današnji datum kao "11.06.2026." */
export function todayFormatted(): string {
  const n = new Date();
  return `${String(n.getDate()).padStart(2, "0")}.${String(
    n.getMonth() + 1,
  ).padStart(2, "0")}.${n.getFullYear()}.`;
}
