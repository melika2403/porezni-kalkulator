// Lookup računa javnih prihoda → kategorija transakcije.
// Računi se čitaju iz postojećeg šifarnika (uplatniRacuniData.json, sinhronizovan
// iz frontend/src/data/uplatni-racuni.ts). Ovdje su SAMO dodatni računi koji
// nisu u šifarniku uplatnica (UIO za indirektne poreze), jer šifarnik služi
// uplatnicama pa ga ne proširujemo matching-only stavkama.

const RACUNI = require("../../utils/uplatniRacuniData.json");

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
  const map = new Map();
  const add = (acc, naziv, category, fond) => {
    const n = normalizeAccount(acc);
    if (n) map.set(n, { naziv, category, fond: fond || null });
  };

  for (const [, k] of Object.entries(RACUNI.KANTONI || {})) {
    // zdravstveno i nezaposlenost = doprinosi; kantonalni budžet najčešće
    // prima porez na dohodak (716111/716116) za obrtnike
    add(k.zoRacun, `ZZO ${k.genitiv || k.ime}`, "DOPRINOSI_PODUZETNIKA", "ZDR_KANTON");
    add(k.nezapRacun, `Zavod za zapošljavanje ${k.genitiv || k.ime}`, "DOPRINOSI_PODUZETNIKA", "NEZAP_KANTON");
    add(k.budzet, `Budžet ${k.genitiv || k.ime}`, "POREZ_DOHODAK_VLASNIKA");
  }

  // Budžet FBiH prima PIO/MIO (i vodnu naknadu, nesreće) → doprinosi
  add(RACUNI.FBIH_BUDZET_RACUN, "Budžet FBiH (PIO/MIO)", "DOPRINOSI_PODUZETNIKA", "PIO");
  add(RACUNI.FBIH_ZO_RACUN, "Federalni ZZO", "DOPRINOSI_PODUZETNIKA", "ZDR_FED");
  add(RACUNI.FBIH_NEZAP_RACUN, "Federalni zavod za zapošljavanje", "DOPRINOSI_PODUZETNIKA", "NEZAP_FED");
  add(RACUNI.FOND_INVALIDI_RACUN, "Fond za rehabilitaciju OSI", "OSTALI_RASHODI");
  if (RACUNI.JRT_TREZOR_BIH_RACUN) {
    add(RACUNI.JRT_TREZOR_BIH_RACUN, "JRT Trezor BiH", "PDV_UIO");
  }
  for (const acc of UIO_RACUNI) {
    add(acc, "UIO BiH (indirektni porezi)", "PDV_UIO");
  }

  return map;
}

const LOOKUP = buildLookup();

/** Vrati { naziv, category } za račun javnih prihoda, ili null. */
function lookupJavniPrihod(account) {
  if (!account) return null;
  return LOOKUP.get(normalizeAccount(account)) || null;
}

module.exports = { lookupJavniPrihod, normalizeAccount };
