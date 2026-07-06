// Dijeljeni helperi za ručni unos iznosa u KM ("1.234,56" format).
// Koristi ih PkAmountInput (PK Office) i forme koje drže iznos kao string.

/**
 * "1.234,56" / "1234,56" / "1234.56" / "1.234" → broj (null ako nije validan).
 * Tačke se tretiraju kao hiljade kad postoji zarez ili kad su u grupama po 3.
 */
export function parseKm(value: string): number | null {
  let s = String(value || "").trim().replace(/\s+/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" bez zareza: tačke su separatori hiljada
    s = s.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Number(s);
}

/** 1234.5 → "1.234,50" (uvijek 2 decimale, tačka za hiljade) */
export function formatKm(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Živa maska pri kucanju: grupiše hiljade tačkama, zarez je decimalni
 * separator (max 2 decimale). "1234" → "1.234", "1234,5" → "1.234,5".
 * Tačka ukucana na kraju (numpad) tretira se kao zarez.
 */
export function maskAmountTyping(raw: string): string {
  let s = String(raw || "").replace(/\s+/g, "");
  const neg = s.startsWith("-") ? "-" : "";
  if (!s.includes(",") && /\.$/.test(s)) s = `${s.slice(0, -1)},`;
  s = s.replace(/[^\d,]/g, "");
  const ci = s.indexOf(",");
  let int = ci === -1 ? s : s.slice(0, ci);
  const dec = ci === -1 ? null : s.slice(ci + 1).replace(/,/g, "").slice(0, 2);
  int = int.replace(/^0+(?=\d)/, "");
  if (int === "" && dec !== null) int = "0";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dec === null ? neg + grouped : `${neg + grouped},${dec}`;
}
