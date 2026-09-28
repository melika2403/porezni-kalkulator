// Parsiranje PDF bankovnih izvoda: detekcija banke → bank modul → validacija.
//
// Rezultat NIKAD ne ide u knjige bez prolaska validacije salda
// (početno + Σ priliv − Σ odliv = završno), to je sigurnosna mreža
// protiv promjene formata izvoda ili greške u parseru.

const { extractTextItems, groupIntoRows } = require("../../utils/pdfText");
const { validateStatement } = require("./engine");
const { dopuniProtivstranu } = require("./counterparty");

// Redoslijed je bitan: specifičnije banke prije generičkog Asseco formata.
// Intesa je prva jer njen izvod u koloni Banka nosi nazive drugih banaka
// (npr. "UNICREDIT BANK DD"), a Intesa detekcija gleda samo zaglavlje.
const BANKS = [
  require("./banks/intesa"),
  require("./banks/unicredit"),
  require("./banks/raiffeisen"),
  require("./banks/kib"),
  require("./banks/sparkasse"),
  require("./banks/asseco"),
];

/**
 * @param {Buffer} buffer - sadržaj PDF fajla
 * @returns {Promise<{
 *   ok: boolean,
 *   error?: "NO_TEXT_LAYER"|"UNSUPPORTED_BANK"|"PARSE_ERROR",
 *   errorDetail?: string,
 *   bankId?: string, bankName?: string,
 *   account?: string, statementNumber?: string, statementDate?: string,
 *   currency?: string,
 *   openingBalance?: number, closingBalance?: number,
 *   transactions?: Array, validation?: {ok:boolean, errors:string[], computed:Object},
 *   warnings?: string[]
 * }>}
 */
async function parseBankStatement(buffer) {
  let pages;
  try {
    pages = await extractTextItems(buffer);
  } catch (e) {
    return { ok: false, error: "PARSE_ERROR", errorDetail: `PDF se ne može pročitati: ${e.message}` };
  }

  const totalItems = pages.reduce((s, p) => s + p.items.length, 0);
  if (totalItems < 10) {
    // skeniran izvod / slika bez tekstualnog sloja
    return { ok: false, error: "NO_TEXT_LAYER" };
  }

  const pagesRows = pages.map((p) => ({
    pageNumber: p.pageNumber,
    rows: groupIntoRows(p.items),
  }));
  const allText = pagesRows
    .map(({ rows }) => rows.map((r) => r.items.map((i) => i.str).join(" ")).join("\n"))
    .join("\n");

  const bank = BANKS.find((b) => b.detect(pagesRows, allText));
  if (!bank) {
    return { ok: false, error: "UNSUPPORTED_BANK" };
  }

  let result;
  try {
    result = bank.parse(pagesRows);
  } catch (e) {
    return {
      ok: false,
      error: "PARSE_ERROR",
      errorDetail: `${bank.name}: ${e.message}`,
      bankId: bank.id,
    };
  }

  // naziv i račun protivstrane iz opisa, tamo gdje ih banka ne daje zasebno;
  // ide prije validacije jer ne dira iznose, samo dopunjava prazna polja
  dopuniProtivstranu(result.transactions);

  const validation = validateStatement(result);
  return {
    ok: validation.ok,
    error: validation.ok ? undefined : "VALIDATION_FAILED",
    bankId: bank.id,
    ...result,
    validation,
    // kompletan tekst izvoda: za provjeru da izvod pripada organizaciji
    // (naziv vlasnika računa se ne parsira po banci, traži se u tekstu)
    allText,
  };
}

module.exports = { parseBankStatement, BANKS };
