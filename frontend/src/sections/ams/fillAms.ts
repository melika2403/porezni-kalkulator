import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ── Types ── */

export interface AmsRow {
  iznosDohotka: number;
  zdravstveno: number;   // × 0.04  (computed)
  osnovica: number;      // iznos - zdravstveno  (computed)
  porez: number;         // osnovica × 0.1  (computed)
  porezniKredit: number; // user input
  razlika: number;       // porez - kredit  (computed)
}

export interface AmsData {
  // Dio 1
  imeIPrezime: string;
  jmbg: string;
  adresa: string;
  datumIsplate: string; // ISO yyyy-mm-dd → split to dan/mj/god
  periodMjesec: string; // "04"
  periodGodina: string; // "25" (2-digit)

  // Dio 2
  naziv: string;
  adresaIsplatioca: string;
  drzava: string;

  // Dio 3 — 5 rows
  rows: AmsRow[];

  // Ukupno (computed sums)
  ukupnoZdravstveno: number;
  ukupnoOsnovica: number;
  ukupnoPorez: number;
  ukupnoPorezniKredit: number;
  ukupnoRazlika: number;

  // Dio 4
  datum: string;
}

/* ── Helpers ── */

const km = (n: number) =>
  n === 0
    ? ""
    : n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function setTextField(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize?: number
) {
  try {
    const field = form.getTextField(name);
    if (fontSize !== undefined) field.setFontSize(fontSize);
    field.setText(value || undefined);
    field.updateAppearances(font);
  } catch {
    console.warn(`[AMS] Field "${name}" not found`);
  }
}

/* ── Main export ── */

export async function fillAmsTemplate(data: AmsData): Promise<Uint8Array> {
  const [templateBytes, fontBytes, boldFontBytes] = await Promise.all([
    fetch("/templates/AMS-1035.pdf").then((r) => r.arrayBuffer()),
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);

  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const boldFont = await doc.embedFont(boldFontBytes);

  const form = doc.getForm();

  const set = (name: string, value: string, fontSize?: number) =>
    setTextField(form, name, value, font, fontSize);

  const setBold = (name: string, value: string, fontSize?: number) =>
    setTextField(form, name, value, boldFont, fontSize);

  /* ── Header (always 1/1) ── */
  set("StranicaRow1", "1", 8);
  set("OdRow1", "1", 8);

  /* ── Dio 1 ── */
  setBold("1 Ime i prezime", data.imeIPrezime, 10);
  setBold("2 JMBG", data.jmbg, 9);
  setBold("3 dresa", data.adresa, 9);

  // Datum isplate — dan / mjesec / godina (zadnje 2 cifre)
  if (data.datumIsplate) {
    const [y, m, d] = data.datumIsplate.split("-");
    setBold("undefined", d ?? "", 9);
    setBold("undefined_2", m ?? "", 9);
    setBold("undefined_3", (y ?? "").slice(-2), 9);
  }

  setBold("5 Period mjesecgodina", data.periodMjesec, 9);
  // periodGodina dolazi kao 4-cifarna godina, uzimamo zadnje 2 cifre
  setBold("20", data.periodGodina.slice(-2), 9);

  /* ── Dio 2 ── */
  setBold("6 Naziv", data.naziv, 9);
  setBold("7 dresa", data.adresaIsplatioca, 9);
  setBold("8 Država", data.drzava, 9);

  /* ── Dio 3 — 5 rows ── */
  const col13Fields = ["fill_7", "fill_13", "fill_19", "fill_25", "fill_31"];

  data.rows.forEach((row, i) => {
    const n = i + 1;
    setBold(`9 Iznos dohotkaRow${n}`, km(row.iznosDohotka), 9);
    setBold(`10 Zdravstveno osiguranje na teret osiguranika kolona 9 X 004Row${n}`, km(row.zdravstveno), 9);
    setBold(`11 Osnovica za porez kolona 9  10Row${n}`, km(row.osnovica), 9);
    setBold(`12 Iznos poreza kolona 11 X 01Row${n}`, km(row.porez), 9);
    setBold(col13Fields[i], km(row.porezniKredit), 9);
    setBold(`14 Razlika poreza za uplatuRow${n}`, km(row.razlika), 9);
  });

  /* ── Ukupno red ── */
  const UK = "Ukupno za sve straniceprijenos Ukoliko su potrebni dodatni redovi koristiti dodatni primjerak ovog obrasca";
  setBold(`10 Zdravstveno osiguranje na teret osiguranika kolona 9 X 004${UK}`, km(data.ukupnoZdravstveno), 9);
  setBold(`11 Osnovica za porez kolona 9  10${UK}`, km(data.ukupnoOsnovica), 9);
  setBold(`12 Iznos poreza kolona 11 X 01${UK}`, km(data.ukupnoPorez), 9);
  setBold("fill_36", km(data.ukupnoPorezniKredit), 9);
  setBold(`14 Razlika poreza za uplatu${UK}`, km(data.ukupnoRazlika), 9);

  /* ── Dio 4 ── */
  setBold("Datum", data.datum, 10);

  form.updateFieldAppearances(boldFont);
  form.flatten();

  return doc.save();
}
