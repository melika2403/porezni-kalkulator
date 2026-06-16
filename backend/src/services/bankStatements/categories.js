// Katalog kategorija transakcija za obrt (FBiH) i mapiranje na kolone
// KPR-1041 obrasca. Kategorija odgovara na tri pitanja:
//   1. u koju KPR kolonu ide (null = ne ide u KPR uopšte)
//   2. da li se za PDV obveznika izbija PDV (kolona 14 prihodi / 20 rashodi)
//   3. za koji smjer važi (IN / OUT / BOTH)
//
// KPR-1041 kolone: 11 prihod u gotovini, 12 prihod preko računa,
// 13 prihod u stvarima i uslugama, 14 PDV u prihodima,
// 16 roba/materijal, 17 bruto plate zaposlenika, 18 doprinosi poduzetnika,
// 19 ostali rashodi, 20 PDV u rashodima.
//
// Frontend kopija labela: frontend/src/lib/bankCategories.ts — držati u sinhronu.

const CATEGORIES = [
  // ── PRILIVI koji su prihod ────────────────────────────────────────────────
  {
    id: "PRIHOD_RACUN",
    label: "Prihod, naplata preko računa",
    direction: "IN",
    kprColumn: 12,
    pdvSplit: true,
    kprOpis: "Naplata preko računa",
  },
  {
    id: "PAZAR",
    label: "Pazar, prihod u gotovini",
    direction: "IN",
    kprColumn: 11,
    pdvSplit: true,
    kprOpis: "Polog pazara",
  },
  {
    id: "PRIHOD_NATURA",
    label: "Prihod u stvarima i uslugama",
    direction: "IN",
    kprColumn: 13,
    pdvSplit: true,
    kprOpis: "Prihod u stvarima/uslugama",
  },
  // ── PRILIVI koji NISU prihod ──────────────────────────────────────────────
  {
    id: "POZAJMICA_VLASNIKA",
    label: "Pozajmica vlasnika",
    direction: "IN",
    kprColumn: null,
    pdvSplit: false,
  },
  {
    id: "KREDIT_PRILIV",
    label: "Priliv kredita",
    direction: "IN",
    kprColumn: null,
    pdvSplit: false,
  },
  {
    id: "POVRAT_PDV",
    label: "Povrat PDV-a",
    direction: "IN",
    kprColumn: null,
    pdvSplit: false,
  },
  // ── ODLIVI koji su rashod ─────────────────────────────────────────────────
  {
    id: "ROBA_MATERIJAL",
    label: "Nabavka robe i materijala",
    direction: "OUT",
    kprColumn: 16,
    pdvSplit: true,
    kprOpis: "Nabavka robe/materijala",
  },
  {
    id: "PLATE_ZAPOSLENIKA",
    label: "Bruto plate zaposlenika",
    direction: "OUT",
    kprColumn: 17,
    pdvSplit: false,
    kprOpis: "Plate zaposlenika",
  },
  {
    id: "DOPRINOSI_PODUZETNIKA",
    label: "Doprinosi poduzetnika",
    direction: "OUT",
    kprColumn: 18,
    pdvSplit: false,
    kprOpis: "Doprinosi poduzetnika",
  },
  {
    id: "OSTALI_RASHODI",
    label: "Ostali rashodi (režije, usluge, zakup...)",
    direction: "OUT",
    kprColumn: 19,
    pdvSplit: true,
    kprOpis: "Ostali rashodi",
  },
  {
    id: "PROVIZIJA_BANKE",
    label: "Bankarska provizija",
    direction: "OUT",
    kprColumn: 19,
    pdvSplit: false, // finansijske usluge su oslobođene PDV-a
    kprOpis: "Bankarska provizija",
  },
  // ── ODLIVI koji NISU (priznat) rashod ─────────────────────────────────────
  {
    id: "PDV_UIO",
    label: "Uplata PDV-a (UIO)",
    direction: "OUT",
    kprColumn: null,
    pdvSplit: false,
  },
  {
    id: "POREZ_DOHODAK_VLASNIKA",
    label: "Porez na dohodak vlasnika",
    direction: "OUT",
    kprColumn: null,
    pdvSplit: false,
  },
  {
    id: "POVRAT_POZAJMICE",
    label: "Povrat pozajmice vlasniku",
    direction: "OUT",
    kprColumn: null,
    pdvSplit: false,
  },
  {
    id: "RATA_KREDITA",
    label: "Rata kredita (glavnica)",
    direction: "OUT",
    kprColumn: null,
    pdvSplit: false,
  },
  {
    id: "OPREMA_STALNO_SREDSTVO",
    label: "Oprema / stalno sredstvo (ide u amortizaciju)",
    direction: "OUT",
    kprColumn: null,
    pdvSplit: false,
  },
  // ── OBA SMJERA ────────────────────────────────────────────────────────────
  {
    id: "PRENOS_IZMEDJU_RACUNA",
    label: "Prenos između vlastitih računa",
    direction: "BOTH",
    kprColumn: null,
    pdvSplit: false,
  },
  {
    id: "OSTALO_BEZ_KPR",
    label: "Ostalo (ne ide u KPR)",
    direction: "BOTH",
    kprColumn: null,
    pdvSplit: false,
  },
];

const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

function isValidCategory(id, direction /* "IN"|"OUT" */) {
  const c = CATEGORY_BY_ID.get(id);
  if (!c) return false;
  if (!direction) return true;
  return c.direction === "BOTH" || c.direction === direction;
}

module.exports = { CATEGORIES, CATEGORY_BY_ID, isValidCategory };
