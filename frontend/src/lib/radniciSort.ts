// Jedinstveno redanje radnika u sidebarima i listama (JS3100, šihterica,
// ugovori, rješenja i odluke, porezna kartica, aktivni radnici, organizacija):
//   1) prijavljeni (i draft) prije odjavljenih
//   2) prijavljeni po datumu prijave ASC (najstariji gore); draft bez datuma
//      prijave pada na dno svoje grupe
//   3) odjavljeni po datumu odjave ASC (fallback: datum prijave)
//   4) tiebreak: datum kreiranja ASC
// Bez importa da ga backend testovi mogu učitati direktno (Node type-stripping).

export type RadnikZaSort = {
  employmentStatus?: string | null;
  prijavaDate?: string | null;
  odjavaDate?: string | null;
  createdAt?: string | null;
};

const BEZ_DATUMA = "9999-12-31";

// ISO datum bez vremena, da se "2026-01-15" i "2026-01-15T00:00:00Z" porede isto
const dan = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : "");

export function sortirajRadnike<T extends RadnikZaSort>(radnici: readonly T[]): T[] {
  return [...radnici].sort((a, b) => {
    const aOdj = a.employmentStatus === "ODJAVLJEN" ? 1 : 0;
    const bOdj = b.employmentStatus === "ODJAVLJEN" ? 1 : 0;
    if (aOdj !== bOdj) return aOdj - bOdj;
    const kljuc = (w: T) =>
      (aOdj ? dan(w.odjavaDate) || dan(w.prijavaDate) : dan(w.prijavaDate)) ||
      BEZ_DATUMA;
    const ak = kljuc(a);
    const bk = kljuc(b);
    if (ak !== bk) return ak.localeCompare(bk);
    return dan(a.createdAt).localeCompare(dan(b.createdAt));
  });
}
