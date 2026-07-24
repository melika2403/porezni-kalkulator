// ──────────────────────────────────────────────────────────────────────────────
//  MIP-1023 — Mjesečni izvještaj o isplaćenim plaćama, doprinosima i porezu.
//  Predaje se PUFBiH mjesečno u XML formatu kroz nPIS, ali se može i štampati.
//
//  Template: /templates/MIP-1023.pdf (sa AcroForm poljima).
//  Obrazac ima 5 redova radnika po stranici — više stranica ako >5 radnika.
//
//  NAPOMENA: Field naming u PDF-u je nepravilan — neke kolone su renamovane
//  zbog kolizija (npr. col 22 "Stepen uvećanja" je "12_2" jer "22" se kosi
//  sa headerima "20.0"/"20.1"). Mapping je dobijen reverse-engineering-om.
//  Ako se template promijeni, ova mapa treba ažuriranje.
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, TextAlignment } from "pdf-lib";
import { trackEvent } from "src/api/activity";
import fontkit from "@pdf-lib/fontkit";

// Po obrascu, svaki red ima 24 kolone. "0" označava prazno polje.
export interface Mip1023Row {
  vrstaIsplate: string; // "01" za redovnu platu
  jmb: string; // 13 cifara
  opcina: string; // 3-cifrena šifra općine prebivališta
  datumIsplate: string; // DD.MM.YYYY.
  brojRadnihSati: string; // npr. "168"
  brojRadnihSatiBolovanje: string; // "0" ili broj sati
  brutoPlaca: string; // "1.234,56"
  koristi: string; // "0,00"
  ukupanPrihod: string; // bruto + koristi
  pioDoprinos: string; // doprinos iz osnovice za PIO
  imePrezime: string; // "Ime Prezime"
  zdrDoprinos: string;
  nezapDoprinos: string;
  ukupanDoprinos: string; // pio + zdr + nezap iz
  prihodUmanjen: string; // ukupan - doprinosi
  faktorOdbitka: string; // "1.0"
  iznosOdbitka: string; // faktor × 300
  osnovicaPoreza: string; // prihod_umanjen - lični_odbitak
  iznosPoreza: string; // osnovica × 0.1
  satiUvecaniStaz: string; // "0"
  stepenUvecanja: string; // "0"
  sifraRadnogMjesta: string; // "0"
  doprinosPioStaz: string; // "0"
}

export interface Mip1023Data {
  // Dio 1 — Podaci o poslodavcu
  jib: string; // 13 cifara
  naziv: string;
  sifraDjelatnosti: string;
  brojZaposlenih: string;
  mjesec: string; // "MM" (1-12, padded)
  godinaSuffix: string; // posljednje 2 cifre godine, npr. "26" za 2026

  // Zbirovi sa svih listova
  ukupanPrihod: string;
  ukupanDoprinos: string;
  ukupanLicniOdbitak: string;
  ukupanPorez: string;

  // Dio 3 — Doprinosi na teret poslodavca
  poslodavacPio: string;
  poslodavacZdr: string;
  poslodavacNezap: string;
  poslodavacDodatniZdr: string; // "0,00" tipično

  // Datum potpisa
  datumPotpisa: string;

  // Redovi
  rows: Mip1023Row[]; // do 5 po stranici
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
    // MIP-1023 PDF — većina polja nema /DA (default appearance) entry, što
    // baca grešku u pdf-lib. Postavljamo DA ručno prije setText: "/Helv 8 Tf 0 g"
    // (helvetica 8pt black). updateAppearances kasnije embed-uje pravi font.
    if (!field.acroField.getDefaultAppearance()) {
      field.acroField.setDefaultAppearance(`/Helv ${size} Tf 0 g`);
    }
    field.setFontSize(size);
    if (align !== undefined) field.setAlignment(align);
    // Truncate ako prelazi maxLength (neka polja imaju maxLength=2 ili 3).
    const maxLen = field.getMaxLength();
    const safeValue =
      maxLen != null && value && value.length > maxLen ? value.slice(0, maxLen) : value;
    field.setText(safeValue || undefined);
    field.updateAppearances(font);
  } catch (e) {
    console.warn(`[MIP-1023] Field "${name}" failed:`, (e as Error).message);
  }
}

// Field mapping per row index (0-4) and column number.
// MAPPED FROM DEBUG PDF — definitivno mapiranje. Adobe je polja imenovao
// nepredvidivo zbog naming collisions sa header fieldovima ("4 Broj zaposlenih"
// se kosi sa "4_2" pa Adobe rename, itd.)
function fieldName(rowIdx: number, col: number): string | null {
  // Tabela mapiranja — fields "1", "2", "3_3", "4_6", "5_5" su Red.br (col 1)
  // za rows 1-5. Adobe naming po smislu redni broj. Multi-page: page 2 polja
  // dobijaju vrijednosti "6", "7", "8", "9", "10", itd.
  const map: Record<number, (string | null)[]> = {
    // Red.br (col 1): NEMA fillable polja — template ima statičke "1"-"5" labele
    // na svakoj stranici, pa multi-page page 2 ostaje "1-5" (ne 6-10). Prihvaćeno.
    1: [null, null, null, null, null],
    // Vrsta isplate (col 2): "1" kod svakog radnika.
    2: ["1", "2", "3_3", "4_6", "5_5"],
    // JMB (col 3): r0="3", r1="3_2", r2="3_4", r3="3_5", r4="3_6"
    3: ["3", "3_2", "3_4", "3_5", "3_6"],
    // Općina (col 4): r0="4", r1="undefined_3", r2="4_4", r3="4_7", r4="4_9"
    4: ["4", "undefined_3", "4_4", "4_7", "4_9"],
    // Datum isplate (col 5): r0="5", r1="5_2", r2="5_3", r3="5_4", r4="5_6"
    5: ["5", "5_2", "5_3", "5_4", "5_6"],
    // Sati (col 6)
    6: ["6", "6_2", "6_3", "6_4", "6_5"],
    // Bolovanje (col 7)
    7: ["7", "7_2", "7_3", "7_4", "7_5"],
    // Bruto (col 8)
    8: ["8", "8_2", "8_3", "8_4", "8_5"],
    // Koristi (col 9)
    9: ["9", "9_2", "9_3", "9_4", "9_5"],
    // Ukupan prihod (col 10)
    10: ["10", "10_2", "10_3", "10_4", "10_5"],
    // PIO doprinos (col 11)
    11: ["11", "11_2", "11_3", "11_4", "11_5"],
    // Ime i prezime (col 12): "12_2", "12_4", "12_6", "12_8", "12_10"
    12: ["12_2", "12_4", "12_6", "12_8", "12_10"],
    // ZDR doprinos (col 13)
    13: ["13", "13_2", "13_3", "13_4", "13_5"],
    // NEZAP doprinos (col 14)
    14: ["14", "14_2", "14_3", "14_4", "14_5"],
    // Ukupan doprinos (col 15)
    15: ["15", "15_2", "15_3", "15_4", "15_5"],
    // Prihod umanjen (col 16)
    16: ["16", "16_2", "16_3", "16_4", "16_5"],
    // Faktor odbitka (col 17)
    17: ["17", "17_2", "17_3", "17_4", "17_5"],
    // Iznos ličnog odbitka (col 18)
    18: ["18", "18_2", "18_3", "18_4", "18_5"],
    // Osnovica poreza (col 19)
    19: ["19", "19_2", "19_3", "19_4", "19_5"],
    // Iznos poreza (col 20): "20_2", "20_3", "20_4", "20_5", "20_6"
    20: ["20_2", "20_3", "20_4", "20_5", "20_6"],
    // Sati uvećani (col 21)
    21: ["21", "21_2", "21_3", "21_4", "21_5"],
    // Stepen uvećanja (col 22): "12", "12_3", "12_5", "12_7", "12_9"
    22: ["12", "12_3", "12_5", "12_7", "12_9"],
    // Šifra rad mjesta (col 23)
    23: ["23", "23_2", "23_3", "23_4", "23_5"],
    // PIO staž (col 24)
    24: ["24", "24_2", "24_3", "24_4", "24_5"],
  };
  const row = map[col];
  if (!row || rowIdx < 0 || rowIdx >= row.length) return null;
  return row[rowIdx];
}

function fillRow(
  form: ReturnType<PDFDocument["getForm"]>,
  rowIdx: number,
  row: Mip1023Row,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
) {
  const values: Record<number, string> = {
    1: "",
    2: row.vrstaIsplate,
    3: row.jmb,
    4: row.opcina,
    5: row.datumIsplate,
    6: row.brojRadnihSati,
    7: row.brojRadnihSatiBolovanje,
    8: row.brutoPlaca,
    9: row.koristi,
    10: row.ukupanPrihod,
    11: row.pioDoprinos,
    12: row.imePrezime,
    13: row.zdrDoprinos,
    14: row.nezapDoprinos,
    15: row.ukupanDoprinos,
    16: row.prihodUmanjen,
    17: row.faktorOdbitka,
    18: row.iznosOdbitka,
    19: row.osnovicaPoreza,
    20: row.iznosPoreza,
    21: row.satiUvecaniStaz,
    22: row.stepenUvecanja,
    23: row.sifraRadnogMjesta,
    24: row.doprinosPioStaz,
  };
  for (const [colStr, value] of Object.entries(values)) {
    const col = Number(colStr);
    const name = fieldName(rowIdx, col);
    if (!name) continue;
    setText(form, name, value, font, 9, TextAlignment.Center);
  }
}

// Popunjava jedan list MIP-1023 sa do 5 radnika. Vraća flatened PDF bytes.
// Red.br (col 1) ostaje statički iz template-a ("1"-"5") jer nema AcroForm polja.
// Na multi-page izvještaju to znači da i page 2 ima labele 1-5; user prihvatio.
async function fillSinglePage(
  rowsOnPage: Mip1023Row[],
  pageNum: number,
  totalPages: number,
  data: Mip1023Data,
  templateBytes: ArrayBuffer,
  fontBytes: ArrayBuffer,
  boldBytes: ArrayBuffer,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const bold = await doc.embedFont(boldBytes);
  const form = doc.getForm();

  // Dio 1 — Header (TOTALI sa svih listova — iste vrijednosti na svakoj
  // stranici, jer obrazac kaže "zbir kol.X sa SVIH listova").
  setText(form, "undefined_2", data.jib, font, 9);
  setText(form, "2 Naziv", data.naziv, font, 9);
  setText(form, "3 Šifra djelatnosti", data.sifraDjelatnosti, font, 9);
  setText(form, "4 Broj zaposlenih", data.brojZaposlenih, font, 9);
  setText(form, "5 Ukupan prihod zbir kol10 sa svih listova", data.ukupanPrihod, font, 9);
  setText(form, "6 Ukupan iznos doprinosa zbir kol 15 sa svih listova", data.ukupanDoprinos, font, 9);
  setText(form, "7 Ukupan iznos osobnog odbitka zbir kol18 sa svih listova", data.ukupanLicniOdbitak, font, 9);
  setText(form, "8  Ukupan iznos poreza zbir kol 20 sa svih listova", data.ukupanPorez, font, 9);

  // Period — mjesec / godina suffix.
  setText(form, "20.0", data.mjesec, font, 9, TextAlignment.Center);
  setText(form, "20.1", data.godinaSuffix, font, 9, TextAlignment.Center);

  // Strana N od M (zero-padded).
  setText(form, "undefined.0", String(pageNum).padStart(2, "0"), font, 9, TextAlignment.Center);
  setText(form, "undefined.1", String(totalPages).padStart(2, "0"), font, 9, TextAlignment.Center);

  // Dio 2 — Redovi na ovoj stranici (do 5).
  for (let i = 0; i < Math.min(rowsOnPage.length, 5); i++) {
    fillRow(form, i, rowsOnPage[i], font);
  }

  // Dio 3 — Doprinosi na teret poslodavca (totali, isti na svakoj stranici).
  setText(form, "fill_7", data.poslodavacPio, font, 9);
  setText(form, "fill_8", data.poslodavacZdr, font, 9);
  setText(form, "fill_9", data.poslodavacNezap, font, 9);
  setText(form, "fill_10", data.poslodavacDodatniZdr, font, 9);

  setText(form, "Datum", data.datumPotpisa, font, 9);

  form.updateFieldAppearances(bold);
  form.flatten();

  return await doc.save();
}

export async function fillMip1023Template(
  data: Mip1023Data,
): Promise<Uint8Array> {
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("MIP_GENERATE", "MIP-1023 PDF");

  const [templateBytes, fontBytes, boldBytes] = await Promise.all([
    fetch("/templates/MIP-1023.pdf").then((r) => r.arrayBuffer()),
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);

  // 5 radnika po listu. Najmanje 1 list i ako nema radnika (za prazni header).
  const totalPages = Math.max(1, Math.ceil(data.rows.length / 5));
  const pageBytes: Uint8Array[] = [];
  for (let p = 0; p < totalPages; p++) {
    const chunk = data.rows.slice(p * 5, p * 5 + 5);
    const bytes = await fillSinglePage(
      chunk,
      p + 1,
      totalPages,
      data,
      templateBytes,
      fontBytes,
      boldBytes,
    );
    pageBytes.push(bytes);
  }

  // Single page — return directly.
  if (pageBytes.length === 1) return pageBytes[0];

  // Multi-page — merge sve listove u jedan PDF. Svaki list je već flatened
  // (nema AcroForm-a), pa nema collision-a sa field name-ovima.
  const finalDoc = await PDFDocument.create();
  for (const bytes of pageBytes) {
    const src = await PDFDocument.load(bytes);
    const pages = await finalDoc.copyPages(src, src.getPageIndices());
    for (const page of pages) finalDoc.addPage(page);
  }
  return await finalDoc.save();
}
