// Smart decimal parser koji prihvata oba separatora.
//
// Pravila (heuristika za "1.234,56", "1,234.56", "2.2", "2,2" itd.):
//   • Ako string ima samo zareze   → posljednji zarez je decimal, ostali thousand
//   • Ako string ima samo tačke    → posljednja tačka je decimal, ostale thousand
//                                    (jedna tačka = jasno decimal: "2.2", "0.4")
//   • Ako string ima oboje         → posljednji separator je decimal,
//                                    drugi je thousand separator
//
// Bez ove heuristike, naivni `s.replace(/\./g, "").replace(",", ".")` lomi
// inpute poput "2.2" → "22" i "0.4" → "4".
export function parseDecimal(s: string | null | undefined): number {
  if (s == null) return 0;
  const t = String(s).trim();
  if (!t) return 0;

  const lastDot = t.lastIndexOf(".");
  const lastComma = t.lastIndexOf(",");

  let normalized: string;
  if (lastDot === -1 && lastComma === -1) {
    normalized = t;
  } else if (lastDot === -1) {
    normalized = t.replace(/,(?=.*,)/g, "").replace(",", ".");
  } else if (lastComma === -1) {
    normalized = t.replace(/\.(?=.*\.)/g, "");
  } else if (lastDot > lastComma) {
    normalized = t.replace(/,/g, "");
  } else {
    normalized = t.replace(/\./g, "").replace(",", ".");
  }

  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}
