// Prijedlog kategorije za transakciju sa izvoda (seed pravila, bez učenja).
// Redoslijed po pouzdanosti:
//   1. račun primaoca u registru javnih prihoda (doprinosi, porezi, PDV/UIO)
//   2. prepoznatljivi obrasci u opisu (polog pazara, provizija, POS...)
//   3. default: priliv → prihod preko računa; odliv → bez prijedloga
//
// Vraća se SAMO prijedlog — stavka ostaje UNMATCHED dok je korisnik ne
// potvrdi. Naučena pravila po organizaciji dolaze kao korak iznad ovoga.

const { lookupJavniPrihod } = require("./javniPrihodi");

// pattern pravila: prvi pogodak pobjeđuje, pa specifičnije prije opštijih.
// Regexi računaju i na ASCII varijante bez dijakritike (VODJENJE/VODENJE...)
// jer banke izvoze opise različito.
const PATTERN_RULES = [
  // prenos između vlastitih računa: eksplicitan marker, prije svega ostalog
  { re: /VLASTIT\w*\s+RA[CČ]UN/i, direction: "IN", category: "PRENOS_IZMEDJU_RACUNA" },
  { re: /VLASTIT\w*\s+RA[CČ]UN/i, direction: "OUT", category: "PRENOS_IZMEDJU_RACUNA" },
  // ── odlivi ──
  // bankarske naknade: provizija, vođenje/održavanje računa, platni promet,
  // obrada naloga, e/m-banking, SMS, kartice
  { re: /PROVIZIJ|BANKOVNE?\s+USLUGE|TRO[SŠ]KOV\w*\s+PLATNOG\s+PROMETA|NAKNAD\w*\s+(PO\s+PARTIJI|BANKE?\b|ZA\s+(VO[DĐ]J?ENJE|ODR[ZŽ]AVANJE|OBRAD\w+|PLATNI\s+PROMET|ELEKTRONSKO|INTERNET|MOBILNO|SMS|KARTIC\w+))/i, direction: "OUT", category: "PROVIZIJA_BANKE" },
  { re: /RATA\s+KREDITA|OTPLATA\s+KREDITA|ANUITET/i, direction: "OUT", category: "RATA_KREDITA" },
  { re: /POZAJMIC/i, direction: "OUT", category: "POVRAT_POZAJMICE" },
  // UIO i kad račun primaoca nije prepoznat (lookup po računu ide prije ovoga)
  { re: /INDIREKTNI\s+POREZ|\bUIN?O\b/i, direction: "OUT", category: "PDV_UIO" },
  // plata/plate/plaća... ("plaćanje" i "uplata" NE hvataju: granice riječi).
  // T-oblik (plata/plate...) je jednoznačna imenica; Ć/C-oblik (plaća/placa) je
  // i glagol ("firma plaća najam/račun/robu"), pa negativni lookahead odbija
  // tipične objekte glagola da nesalarni odliv ne padne u PLATE_ZAPOSLENIKA.
  { re: /\bPLAT(A|E|U|OM)\b|LI[CČ]N\w*\s+PRIMANJA|\bPLA[ĆC](A|E|U|OM)\b(?!\s+(NAJAM|NAJMA|KIRIJ\w+|RA[CČ]UN\w*|FAKTUR\w+|ROBU?|ROBE|USLUG\w+|ZAKUP\w*|RE[ŽZ]IJ\w+|DOBAVLJA\w+|PDV|POREZ\w*|DOPRINOS\w*))/i, direction: "OUT", category: "PLATE_ZAPOSLENIKA" },
  // priznati rashodi po jasnim markerima: osiguranje, zakup, režije/telekomi
  // (naziv primaoca je često jedini signal, vidi text niže). Usluge osiguranja
  // su oslobođene PDV-a pa idu bez pretporeza (kao i bankarske naknade).
  { re: /PREMIJ\w*\s+OSIGURANJA|\bPOLIS[AEIU]\b|\bKASKO\b/i, direction: "OUT", category: "OSTALI_RASHODI_BEZ_PDV" },
  { re: /\bZAKUP|\bNAJAM|NAJAMNIN|KIRIJ/i, direction: "OUT", category: "OSTALI_RASHODI" },
  { re: /ELEKTROPRIVRED|ELEKTRODISTRIBUCIJ|ELEKTROKRAJIN|BH\s*TELECOM|HT\s*ERONET|\bERONET|TELEMACH|\bM:?TEL\b|VODOVOD|TOPLAN[AE]|KOMUNALN|KOMUNALAC|[CČ]ISTO[CĆ]A/i, direction: "OUT", category: "OSTALI_RASHODI" },
  // ── prilivi ──
  // sama riječ "pazar" (i padeži: pazara, pazaru, pazarom) je dovoljan signal
  // na prilivu ("PAZAR 01-07.07.2026", "POLOG PAZARA"...). Izuzetak: grad "Novi
  // Pazar" u nazivu/adresi platioca nije pazar, pa lookbehind na sve padeže
  // (Novi/Novog/Novom/Novim Pazar/Pazara/Pazaru/Pazarom).
  { re: /(?<!NOV(?:I|OG|OM|IM|OME)\s)\bPAZAR(A|U|OM)?\b/i, direction: "IN", category: "PAZAR" },
  { re: /POS\s+trans|POS\s+TERMINAL/i, direction: "IN", category: "PRIHOD_RACUN" },
  { re: /POZAJMIC/i, direction: "IN", category: "POZAJMICA_VLASNIKA" },
  { re: /POVRAT\s+PDV/i, direction: "IN", category: "POVRAT_PDV" },
  { re: /ISPLATA\s+KREDITA|PLASMAN\s+KREDITA|ODOBREN\w*\s+KREDIT/i, direction: "IN", category: "KREDIT_PRILIV" },
];

/**
 * @param {{description?:string, counterpartyName?:string, counterpartyAccount?:string, direction:"in"|"out"|"IN"|"OUT"}} tx
 * @returns {string|null} id kategorije iz categories.js ili null
 */
function suggestCategory(tx) {
  const direction = String(tx.direction || "").toUpperCase();

  // 1. račun primaoca: javni prihodi (samo odlivi imaju smisla)
  if (direction === "OUT" && tx.counterpartyAccount) {
    const hit = lookupJavniPrihod(tx.counterpartyAccount);
    if (hit) return hit.category;
  }

  // 2. obrasci u opisu + nazivu primaoca/platioca (režije i telekomi se
  // često prepoznaju samo po nazivu primaoca)
  const text = [tx.description, tx.counterpartyName]
    .filter(Boolean)
    .join(" ");
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
