// Prijedlog kategorije za transakciju sa izvoda (seed pravila, bez učenja).
// Redoslijed po pouzdanosti:
//   1. račun primaoca u registru javnih prihoda (doprinosi, porezi, PDV/UIO)
//   2. prepoznatljivi obrasci u opisu (polog pazara, provizija, POS...)
//   3. default: priliv → prihod preko računa; odliv → bez prijedloga
//
// Vraća se SAMO prijedlog — stavka ostaje UNMATCHED dok je korisnik ne
// potvrdi. Naučena pravila po organizaciji dolaze kao korak iznad ovoga.

const { lookupJavniPrihod } = require("./javniPrihodi");

// pattern pravila: prvi pogodak pobjeđuje, pa specifičnije prije opštijih
const PATTERN_RULES = [
  // odlivi
  { re: /PROVIZIJ|NAKNAD\w*\s+(PO\s+PARTIJI|ZA\s+VOĐENJE|BANK)|BANKOVNE?\s+USLUGE/i, direction: "OUT", category: "PROVIZIJA_BANKE" },
  { re: /POLOG\s+PAZARA|UPLATA\s+PAZARA|DNEVNI\s+PAZAR/i, direction: "IN", category: "PAZAR" },
  { re: /POS\s+trans|POS\s+TERMINAL/i, direction: "IN", category: "PRIHOD_RACUN" },
  { re: /POZAJMIC/i, direction: "IN", category: "POZAJMICA_VLASNIKA" },
  { re: /POZAJMIC/i, direction: "OUT", category: "POVRAT_POZAJMICE" },
  { re: /RATA\s+KREDITA|OTPLATA\s+KREDITA/i, direction: "OUT", category: "RATA_KREDITA" },
  { re: /POVRAT\s+PDV/i, direction: "IN", category: "POVRAT_PDV" },
];

/**
 * @param {{description?:string, counterpartyAccount?:string, direction:"in"|"out"|"IN"|"OUT"}} tx
 * @returns {string|null} id kategorije iz categories.js ili null
 */
function suggestCategory(tx) {
  const direction = String(tx.direction || "").toUpperCase();

  // 1. račun primaoca: javni prihodi (samo odlivi imaju smisla)
  if (direction === "OUT" && tx.counterpartyAccount) {
    const hit = lookupJavniPrihod(tx.counterpartyAccount);
    if (hit) return hit.category;
  }

  // 2. obrasci u opisu
  const text = String(tx.description || "");
  for (const rule of PATTERN_RULES) {
    if (rule.direction === direction && rule.re.test(text)) {
      return rule.category;
    }
  }

  // 3. default
  if (direction === "IN") return "PRIHOD_RACUN";
  return null;
}

module.exports = { suggestCategory };
