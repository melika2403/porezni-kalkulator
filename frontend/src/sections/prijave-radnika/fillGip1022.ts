// ──────────────────────────────────────────────────────────────────────────────
//  GIP-1022 — Godišnji izvještaj o ukupno isplaćenim plaćama i drugim ličnim
//             primanjima zaposlenika.
//  Predaje se PUFBiH na kraju godine, jedan PDF per radnik, preko nPIS u XML.
//
//  Template: /templates/GIP-1022.pdf (228 AcroForm polja).
//  Struktura:
//   • Dio 1: poslodavac (JIB, naziv, adresa) + zaposlenik (JMB, prezime ime, adresa)
//   • Dio 2: 12 mjeseci × 17 kolona + Ukupno red
//   • Dio 3: izjava + potpis + datum
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, TextAlignment } from "pdf-lib";
import { trackEvent } from "src/api/activity";
import fontkit from "@pdf-lib/fontkit";

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "August",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

export interface Gip1022Row {
  mjesec: number; // 1-12
  isplataZaMjesec: string; // "MM/YYYY"
  vrstaIsplate: string; // "1"
  iznosNovac: string; // bruto+koristi formatted
  iznosStvari: string; // "0,00"
  bruto: string; // bruto formatted
  pio: string; // PIO 17%
  zdr: string; // ZDR 12.5%
  nezap: string; // NEZAP 1.5%
  ukupniDopr: string; // 31%
  placaBezDopr: string; // bruto - doprinosi
  faktor: string; // npr. "1.0"
  iznosOdbitka: string; // faktor × 300
  osnovicaPoreza: string;
  iznosPoreza: string;
  neto: string;
  datumUplate: string; // DD.MM.YYYY.
}

export interface Gip1022Data {
  /** za dnevnik aktivnosti (admin vidi za koju org-u je dokument) */
  organizationId?: number | null;
  // Dio 1 — poslodavac
  jib: string;
  naziv: string;
  adresaSjedista: string;
  // Dio 1 — zaposlenik
  jmbZaposlenika: string;
  prezimeIme: string;
  adresaPrebivalista: string;
  // Godina (zadnje 2 cifre, npr. "26" za 2026)
  godinaSuffix: string;
  // Datum potpisa
  datumPotpisa: string;
  // 12 redova (po mjesecima koji postoje; preskači mjesece bez plate)
  rows: Gip1022Row[];
  // Ukupno red (zbirovi)
  ukupno: {
    iznosNovac: string;
    iznosStvari: string;
    bruto: string;
    pio: string;
    zdr: string;
    nezap: string;
    ukupniDopr: string;
    placaBezDopr: string;
    faktor: string; // ostavlja se prazno za Ukupno
    iznosOdbitka: string;
    osnovicaPoreza: string;
    iznosPoreza: string;
    neto: string;
  };
}

function setText(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size = 8,
  align?: TextAlignment,
) {
  try {
    const field = form.getTextField(name);
    if (!field.acroField.getDefaultAppearance()) {
      field.acroField.setDefaultAppearance(`/Helv ${size} Tf 0 g`);
    }
    field.setFontSize(size);
    if (align !== undefined) field.setAlignment(align);
    const maxLen = field.getMaxLength();
    const safeValue =
      maxLen != null && value && value.length > maxLen
        ? value.slice(0, maxLen)
        : value;
    field.setText(safeValue || undefined);
    field.updateAppearances(font);
  } catch (e) {
    console.warn(`[GIP-1022] Field "${name}" failed:`, (e as Error).message);
  }
}

// Field naming pattern per row (Row1..Row12):
//   col 1 "1 Mjesec isplateRow{N}"
//   col 2 "2 Isplata za mjesec  i godinuRow{N}"  (DOUBLE SPACE !!)
//   col 3 "3 Vrsta isplateRow{N}"
//   col 4 "4 Iznos prihoda u novcuRow{N}"
//   col 5 "5 Iznos prihoda u stvarima ili uslugamaRow{N}"
//   col 6 = fill_{6 + 17*(N-1)}
//   col 7 "7 Iznos za penzijsko i invalidsko osiguranje 17Row{N}"
//   col 8 "8 Iznos za zdravstveno osiguranje 125Row{N}"
//   col 9 "9 Iznos za osiguranje  od Nezaposle  nosti 15Row{N}"  (DOUBLE SPACES)
//   col 10 "10 Ukupni doprinosi 31 kolone 789Row{N}"
//   col 11 = fill_{11 + 17*(N-1)}
//   col 12 = fill_{12 + 17*(N-1)}
//   col 13 = fill_{13 + 17*(N-1)}
//   col 14 "14 Osnovica poreza kolona 11  13Row{N}"  (DOUBLE SPACE)
//   col 15 = fill_{15 + 17*(N-1)}
//   col 16 = fill_{16 + 17*(N-1)}
//   col 17 "17 Datum kada je izvršena uplataRow{N}"
//
// Ukupno red (N=13) ima isti pattern ali sa "Ukupno" suffix-om i col 1 (Mjesec)
// ne postoji. Fill offset za Ukupno je 209/214/215/216/218/219 (off by -1 od
// formule jer Ukupno nema col 1).

function rowFieldName(rowNum: number, col: number): string | null {
  if (rowNum < 1 || rowNum > 12) return null;
  const suffix = `Row${rowNum}`;
  const fillBase = 6 + 17 * (rowNum - 1);
  switch (col) {
    case 1:
      return `1 Mjesec isplate${suffix}`;
    case 2:
      return `2 Isplata za mjesec  i godinu${suffix}`;
    case 3:
      return `3 Vrsta isplate${suffix}`;
    case 4:
      return `4 Iznos prihoda u novcu${suffix}`;
    case 5:
      return `5 Iznos prihoda u stvarima ili usluga${suffix.includes("ma") ? "" : ""}ma${suffix}`;
    case 6:
      return `fill_${fillBase}`;
    case 7:
      return `7 Iznos za penzijsko i invalidsko osiguranje 17${suffix}`;
    case 8:
      return `8 Iznos za zdravstveno osiguranje 125${suffix}`;
    case 9:
      return `9 Iznos za osiguranje  od Nezaposle  nosti 15${suffix}`;
    case 10:
      return `10 Ukupni doprinosi 31 kolone 789${suffix}`;
    case 11:
      return `fill_${fillBase + 5}`;
    case 12:
      return `fill_${fillBase + 6}`;
    case 13:
      return `fill_${fillBase + 7}`;
    case 14:
      return `14 Osnovica poreza kolona 11  13${suffix}`;
    case 15:
      return `fill_${fillBase + 9}`;
    case 16:
      return `fill_${fillBase + 10}`;
    case 17:
      return `17 Datum kada je izvršena uplata${suffix}`;
    default:
      return null;
  }
}

// Ukupno field names (special — col 1 missing, fill_X za col 6,11,12,13,15,16)
function ukupnoFieldName(col: number): string | null {
  switch (col) {
    case 2:
      return `2 Isplata za mjesec  i godinuUkupno`;
    case 3:
      return `3 Vrsta isplateUkupno`;
    case 4:
      return `4 Iznos prihoda u novcuUkupno`;
    case 5:
      return `5 Iznos prihoda u stvarima ili uslugamaUkupno`;
    case 6:
      return `fill_209`;
    case 7:
      return `7 Iznos za penzijsko i invalidsko osiguranje 17Ukupno`;
    case 8:
      return `8 Iznos za zdravstveno osiguranje 125Ukupno`;
    case 9:
      return `9 Iznos za osiguranje  od Nezaposle  nosti 15Ukupno`;
    case 10:
      return `10 Ukupni doprinosi 31 kolone 789Ukupno`;
    case 11:
      return `fill_214`;
    case 12:
      return `fill_215`;
    case 13:
      return `fill_216`;
    case 14:
      return `14 Osnovica poreza kolona 11  13Ukupno`;
    case 15:
      return `fill_218`;
    case 16:
      return `fill_219`;
    case 17:
      return `17 Datum kada je izvršena uplataUkupno`;
    default:
      return null;
  }
}

function fillRow(
  form: ReturnType<PDFDocument["getForm"]>,
  rowNum: number, // 1-12
  row: Gip1022Row,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
) {
  const values: Record<number, string> = {
    1: MONTH_NAMES[row.mjesec - 1] || "",
    2: row.isplataZaMjesec,
    3: row.vrstaIsplate,
    4: row.iznosNovac,
    5: row.iznosStvari,
    6: row.bruto,
    7: row.pio,
    8: row.zdr,
    9: row.nezap,
    10: row.ukupniDopr,
    11: row.placaBezDopr,
    12: row.faktor,
    13: row.iznosOdbitka,
    14: row.osnovicaPoreza,
    15: row.iznosPoreza,
    16: row.neto,
    17: row.datumUplate,
  };
  for (const [colStr, value] of Object.entries(values)) {
    const col = Number(colStr);
    const name = rowFieldName(rowNum, col);
    if (!name) continue;
    // Col 17 (datum uplate) ima usko polje pa datum iskače — držimo na 7pt.
    const size = col === 17 ? 7 : 9;
    setText(form, name, value, font, size, TextAlignment.Center);
  }
}

function fillUkupno(
  form: ReturnType<PDFDocument["getForm"]>,
  u: Gip1022Data["ukupno"],
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
) {
  const values: Record<number, string> = {
    4: u.iznosNovac,
    5: u.iznosStvari,
    6: u.bruto,
    7: u.pio,
    8: u.zdr,
    9: u.nezap,
    10: u.ukupniDopr,
    11: u.placaBezDopr,
    12: u.faktor,
    13: u.iznosOdbitka,
    14: u.osnovicaPoreza,
    15: u.iznosPoreza,
    16: u.neto,
  };
  for (const [colStr, value] of Object.entries(values)) {
    const col = Number(colStr);
    const name = ukupnoFieldName(col);
    if (!name) continue;
    setText(form, name, value, font, 9, TextAlignment.Center);
  }
}

export async function fillGip1022Template(
  data: Gip1022Data,
): Promise<Uint8Array> {
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("GIP_GENERATE", "GIP-1022 PDF", data.organizationId);

  const [templateBytes, fontBytes, boldBytes] = await Promise.all([
    fetch("/templates/GIP-1022.pdf").then((r) => r.arrayBuffer()),
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);

  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const bold = await doc.embedFont(boldBytes);
  const form = doc.getForm();

  // Dio 1 — Poslodavac
  setText(form, "undefined", data.jib, font, 9);
  setText(form, "2 Naziv", data.naziv, font, 9);
  setText(form, "3 Adresa sjedišta", data.adresaSjedista, font, 9);
  // Dio 1 — Zaposlenik
  setText(form, "undefined_2", data.jmbZaposlenika, font, 9);
  setText(form, "5 Prezime  i  ime", data.prezimeIme, font, 9);
  setText(form, "6 Adresa prebivališta", data.adresaPrebivalista, font, 9);
  // Godina (suffix 2 cifre, template ima "20XX")
  setText(form, "20", data.godinaSuffix, font, 9, TextAlignment.Center);

  // Dio 2 — Redovi 1-12
  for (const row of data.rows) {
    if (row.mjesec < 1 || row.mjesec > 12) continue;
    fillRow(form, row.mjesec, row, font);
  }
  fillUkupno(form, data.ukupno, bold);

  // Datum potpisa
  setText(form, "Datum", data.datumPotpisa, font, 9);

  form.updateFieldAppearances(bold);
  form.flatten();

  return await doc.save();
}
