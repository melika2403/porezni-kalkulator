// Katalog kategorija transakcija — frontend kopija labela.
// Truth source za mapiranje na KPR kolone je backend:
// backend/src/services/bankStatements/categories.js — držati u sinhronu.

export type BankCategoryDirection = "IN" | "OUT" | "BOTH";

export type BankCategory = {
  id: string;
  label: string;
  direction: BankCategoryDirection;
  /** false = ne ide u KPR (nije prihod ni rashod) */
  inKpr: boolean;
  /** KPR-1041 kolona u koju knjiženje ide (null = ne ide u KPR) */
  kprColumn: number | null;
};

export const BANK_CATEGORIES: BankCategory[] = [
  // prilivi koji su prihod
  { id: "PRIHOD_RACUN", label: "Prihod, naplata preko računa", direction: "IN", inKpr: true, kprColumn: 12 },
  { id: "PAZAR", label: "Pazar, prihod u gotovini", direction: "IN", inKpr: true, kprColumn: 11 },
  { id: "PRIHOD_NATURA", label: "Prihod u stvarima i uslugama", direction: "IN", inKpr: true, kprColumn: 13 },
  // prilivi koji nisu prihod
  { id: "POZAJMICA_VLASNIKA", label: "Pozajmica vlasnika", direction: "IN", inKpr: false, kprColumn: null },
  { id: "KREDIT_PRILIV", label: "Priliv kredita", direction: "IN", inKpr: false, kprColumn: null },
  { id: "POVRAT_PDV", label: "Povrat PDV-a", direction: "IN", inKpr: false, kprColumn: null },
  // odlivi koji su rashod
  { id: "ROBA_MATERIJAL", label: "Nabavka robe i materijala", direction: "OUT", inKpr: true, kprColumn: 16 },
  { id: "PLATE_ZAPOSLENIKA", label: "Bruto plate zaposlenika", direction: "OUT", inKpr: true, kprColumn: 17 },
  { id: "DOPRINOSI_PODUZETNIKA", label: "Doprinosi poduzetnika", direction: "OUT", inKpr: true, kprColumn: 18 },
  { id: "OSTALI_RASHODI", label: "Ostali rashodi (režije, usluge, zakup...)", direction: "OUT", inKpr: true, kprColumn: 19 },
  { id: "PROVIZIJA_BANKE", label: "Bankarska provizija", direction: "OUT", inKpr: true, kprColumn: 19 },
  // odlivi koji nisu (priznat) rashod
  { id: "PDV_UIO", label: "Uplata PDV-a (UIO)", direction: "OUT", inKpr: false, kprColumn: null },
  { id: "POREZ_DOHODAK_VLASNIKA", label: "Porez na dohodak vlasnika", direction: "OUT", inKpr: false, kprColumn: null },
  { id: "POVRAT_POZAJMICE", label: "Povrat pozajmice vlasniku", direction: "OUT", inKpr: false, kprColumn: null },
  { id: "RATA_KREDITA", label: "Rata kredita (glavnica)", direction: "OUT", inKpr: false, kprColumn: null },
  { id: "OPREMA_STALNO_SREDSTVO", label: "Oprema / stalno sredstvo (ide u amortizaciju)", direction: "OUT", inKpr: false, kprColumn: null },
  // oba smjera
  { id: "PRENOS_IZMEDJU_RACUNA", label: "Prenos između vlastitih računa", direction: "BOTH", inKpr: false, kprColumn: null },
  { id: "OSTALO_BEZ_KPR", label: "Ostalo (ne ide u KPR)", direction: "BOTH", inKpr: false, kprColumn: null },
];

const BY_ID = new Map(BANK_CATEGORIES.map((c) => [c.id, c]));

export function categoryLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  return BY_ID.get(id)?.label ?? id;
}

/** Label sa KPR sufiksom: "Doprinosi poduzetnika (Kolona 18)" ili
 *  "Uplata PDV-a (UIO) (Ne ide u KPR)". Za pregled u listama. */
export function categoryDisplayLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  const c = BY_ID.get(id);
  if (!c) return id;
  return c.kprColumn != null
    ? `${c.label} (Kolona ${c.kprColumn})`
    : `${c.label} (Ne ide u KPR)`;
}

export function categoryInKpr(id: string | null | undefined): boolean | null {
  if (!id) return null;
  return BY_ID.get(id)?.inKpr ?? null;
}

/** Kategorije primjenjive na dati smjer, grupisane za select. */
export function categoriesForDirection(direction: "IN" | "OUT") {
  const applicable = BANK_CATEGORIES.filter(
    (c) => c.direction === direction || c.direction === "BOTH",
  );
  return {
    uKpr: applicable.filter((c) => c.inKpr),
    bezKpr: applicable.filter((c) => !c.inKpr),
  };
}
