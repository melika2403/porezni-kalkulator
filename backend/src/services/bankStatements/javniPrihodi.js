// Lookup računa javnih prihoda → kategorija transakcije.
// Računi se čitaju iz živog šifarnika (racuniService: baza + admin panel,
// fallback seed snapshot) i lookup se automatski pregradi kad admin promijeni
// broj. Uz trenutne brojeve prepoznaju se i RANIJI brojevi istog slota (iz
// audit loga), jer izvodi iz perioda prije izmjene nose uplate na stari račun.
// Ovdje su SAMO dodatni računi koji nisu u šifarniku uplatnica (UIO za
// indirektne poreze), jer šifarnik služi uplatnicama pa ga ne proširujemo
// matching-only stavkama.

const racuniService = require("../../services/racuniService");

/** račun "338-500-22751661-53" → "3385002275166153" */
function normalizeAccount(acc) {
  return String(acc || "").replace(/[^\d]/g, "");
}

// UIO BiH računi za jednokratne uplate indirektnih poreza (PDV) kod
// komercijalnih banaka. Viđeno na izvodima; dopunjavati po potrebi.
const UIO_RACUNI = [
  "1610000046470286", // Raiffeisen
  "3380002210018390", // UniCredit
  "5520040002414171", // Hypo/Addiko
  "5556000003433714", // Nova banka
  "1327310410293154", // NLB
];

/**
 * Mapa: normalizovan račun → { naziv, category, fond? }.
 * category odgovara id-u iz categories.js. fond postoji samo na računima
 * doprinosa (PIO | ZDR_KANTON | ZDR_FED | NEZAP_KANTON | NEZAP_FED) i služi
 * razlikovanju doprinosa vlasnika od doprinosa radnika po iznosu uplate
 * (vidi vlasnikDoprinosi.js): isti račun prima i jedno i drugo.
 */
function buildLookup() {
  const t = racuniService.trenutni();
  const map = new Map();
  // kljuc → info, da bi i raniji brojevi slota dobili isto prepoznavanje
  const infoPoSlotu = new Map();
  const add = (kljuc, acc, naziv, category, fond) => {
    const info = { naziv, category, fond: fond || null };
    const n = normalizeAccount(acc);
    if (n) map.set(n, info);
    if (kljuc) infoPoSlotu.set(kljuc, info);
  };

  for (const [key, k] of Object.entries(t.KANTONI || {})) {
    // zdravstveno i nezaposlenost = doprinosi; kantonalni budžet najčešće
    // prima porez na dohodak (716111/716116) za obrtnike
    add(`${key}.zo`, k.zoRacun, `ZZO ${k.genitiv || k.ime}`, "DOPRINOSI_PODUZETNIKA", "ZDR_KANTON");
    add(`${key}.nezap`, k.nezapRacun, `Zavod za zapošljavanje ${k.genitiv || k.ime}`, "DOPRINOSI_PODUZETNIKA", "NEZAP_KANTON");
    add(`${key}.budzet`, k.budzet, `Budžet ${k.genitiv || k.ime}`, "POREZ_DOHODAK_VLASNIKA");
  }

  // Budžet FBiH prima PIO/MIO (i vodnu naknadu, nesreće) → doprinosi
  add("FBIH.budzet", t.FBIH_BUDZET_RACUN, "Budžet FBiH (PIO/MIO)", "DOPRINOSI_PODUZETNIKA", "PIO");
  add("FBIH.zo", t.FBIH_ZO_RACUN, "Federalni ZZO", "DOPRINOSI_PODUZETNIKA", "ZDR_FED");
  add("FBIH.nezap", t.FBIH_NEZAP_RACUN, "Federalni zavod za zapošljavanje", "DOPRINOSI_PODUZETNIKA", "NEZAP_FED");
  add("FOND.invalidi", t.FOND_INVALIDI_RACUN, "Fond za rehabilitaciju OSI", "OSTALI_RASHODI");
  if (t.JRT_TREZOR_BIH_RACUN) {
    add("JRT.trezor", t.JRT_TREZOR_BIH_RACUN, "JRT Trezor BiH", "PDV_UIO");
  }
  for (const acc of UIO_RACUNI) {
    add(null, acc, "UIO BiH (indirektni porezi)", "PDV_UIO");
  }

  // Raniji brojevi slotova: stari izvodi nose uplate na stari račun. Trenutni
  // broj ima prednost ako se ikad preklope (postavljen je prvi, ne prepisujemo).
  for (const [kljuc, brojevi] of racuniService.stariBrojevi()) {
    const info = infoPoSlotu.get(kljuc);
    if (!info) continue;
    for (const n of brojevi) {
      if (!map.has(n)) map.set(n, info);
    }
  }

  return map;
}

let lookup = null;
let lookupVerzija = -1;

/** Vrati { naziv, category } za račun javnih prihoda, ili null. */
function lookupJavniPrihod(account) {
  if (!account) return null;
  if (!lookup || lookupVerzija !== racuniService.getVerzija()) {
    lookup = buildLookup();
    lookupVerzija = racuniService.getVerzija();
  }
  return lookup.get(normalizeAccount(account)) || null;
}

module.exports = { lookupJavniPrihod, normalizeAccount };
