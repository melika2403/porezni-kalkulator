// Zajednička logika za trajanje ugovora na određeno (UoR + edit radnika).

export type TrajanjeJedinica = "mjeseci" | "godine";

// Računa zadnji dan ugovora: početak + N (mjeseci|godine) − 1 dan.
// Npr. 14.05 + 6 mjeseci → 13.11.
export function computeContractEndIso(
  startIso: string,
  broj: number,
  jedinica: TrajanjeJedinica,
): string {
  if (!startIso || !broj) return "";
  const [y, m, d] = startIso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (jedinica === "mjeseci") {
    dt.setUTCMonth(dt.getUTCMonth() + broj);
  } else {
    dt.setUTCFullYear(dt.getUTCFullYear() + broj);
  }
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function maxTrajanjeBroj(jedinica: TrajanjeJedinica): number {
  return jedinica === "godine" ? 3 : 36;
}
