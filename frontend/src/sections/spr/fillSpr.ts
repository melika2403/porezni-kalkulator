import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ── Types ── */

export interface SprData {
  // Dio 1 — Podaci o poreznom obvezniku
  jmbOsobni: string; // 13 digits
  fullName: string;
  address: string;

  // Dio 2 — Podaci o djelatnosti
  jibJmb: string; // 13 digits JIB/JMB djelatnosti
  periodFrom: string; // ddMMyyyy (8 chars)
  periodTo: string; // ddMMyyyy (8 chars)
  contactChanged: boolean;
  businessName: string;
  businessAddress: string;
  activityType: string; // šifra i naziv djelatnosti

  // Dio 3 — Prihodi (rows 11-16)
  row11Cash: number; // U gotovini shodno poslovnim knjigama
  row12InKind: number; // U naturi
  row13GoodsServices: number; // U stvarima i uslugama shodno poslovnim knjigama
  row14OtherIncome: number; // Ostali prihodi
  row15BookValueAssets: number; // Knjigovodstvena vrijednost rasknjiženih stalnih sredstava
  row16TotalIncome: number; // UKUPNO prihodi (computed)

  // Dio 4 — Rashodi (rows 17-24)
  row17Materials: number; // Nabavna vrijednost prodane robe, utroš. mat. i dr.
  row18GrossWages: number; // Bruto plaće
  row19Contributions: number; // Doprinosi na plaću
  row20OtherExpenses: number; // Ostali rashodi shodno poslovnim knjigama
  row21GoodsServicesValue: number; // Vrijednost uloženih ekonomskih dobara i usluga
  row22Depreciation: number; // Amortizacija
  row23BookValueAssets: number; // Knjigovodstvena vrijednost rasknjiženih stalnih sredstava
  row24TotalExpenses: number; // UKUPNO rashodi (computed)

  // Dio 5 — Utvrđivanje dohotka (rows 25-29)
  row25Income: number; // Prihodi (red 16) — computed
  row26Expenses: number; // Rashodi (red 24) — computed
  row27Adjustments: number; // Porezne korekcije (+/-)
  row28NetIncome: number; // Dohodak iz djelatnosti (25 - 26 +/- 27) — computed
  row29PersonalDeduction: number; // Lični odbitak
  signAdjustment: "+" | "-" | ""; // da li je korekcija + ili -

  // Izjava
  dateSigned: string;
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
    if (fontSize !== undefined) {
      field.setFontSize(fontSize);
    }
    field.setText(value || undefined);
    field.updateAppearances(font);
  } catch {
    console.warn(`[SPR] Field "${name}" not found in template`);
  }
}

function setCheckBox(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  checked: boolean
) {
  try {
    const field = form.getCheckBox(name);
    if (checked) field.check();
    else field.uncheck();
  } catch {
    console.warn(`[SPR] Checkbox "${name}" not found in template`);
  }
}

/* ── Main export ── */

export async function fillSprTemplate(data: SprData): Promise<Uint8Array> {
  const [templateBytes, fontBytes, boldFontBytes] = await Promise.all([
    fetch("/templates/SPR-1053.pdf").then((r) => r.arrayBuffer()),
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

  const check = (name: string, checked: boolean) =>
    setCheckBox(form, name, checked);

  /* ── Page 1 header — comb fields ── */
  setBold("undefined", data.jmbOsobni, 9);   // JMB osobni (comb 13)
  setBold("undefined_2", data.jibJmb, 9);    // JIB/JMB djelatnosti (comb 13)
  setBold("Text2.0", data.periodFrom, 8);    // Period od (comb 8, ddMMyyyy)
  setBold("Text2.1", data.periodTo, 8);      // Period do (comb 8, ddMMyyyy)
  check("toggle_1", data.contactChanged);

  /* ── Dio 1 — Podaci o poreznom obvezniku ── */
  setBold("2 Prezime i ime", data.fullName, 10);
  setBold("3 Adresa", data.address, 9);

  /* ── Dio 2 — Podaci o djelatnosti ── */
  setBold("8 Naziv", data.businessName, 9);
  setBold("9 Adresa", data.businessAddress, 9);
  setBold("10 Vrsta djelatnosti šifra naziv", data.activityType, 9);

  /* ── Dio 3 — Prihodi (rows 11-16) ── */
  setBold("c IznosU gotovini shodno poslovnim knjigama", km(data.row11Cash), 10);
  setBold("fill_2", km(data.row12InKind), 10);
  setBold(
    "c IznosU stvarima i uslugama shodno poslovnim knjigama",
    km(data.row13GoodsServices),
    10
  );
  setBold("fill_4", km(data.row14OtherIncome), 10);
  setBold("fill_5", km(data.row15BookValueAssets), 10);
  setBold(
    "c IznosPrihodi ukupno zbir redova od 11 do 15",
    km(data.row16TotalIncome),
    10
  );

  /* ── Dio 4 — Rashodi (rows 17-24) ── */
  setBold("fill_7", km(data.row17Materials), 10);
  setBold("fill_8", km(data.row18GrossWages), 10);
  setBold("fill_9", km(data.row19Contributions), 10);
  setBold(
    "c IznosOstali rashodi shodno poslovnim knjigama",
    km(data.row20OtherExpenses),
    10
  );
  setBold(
    "c IznosVrijednost uloženih ekonomskih dobara i usluga",
    km(data.row21GoodsServicesValue),
    10
  );
  setBold("c IznosAmortizacija", km(data.row22Depreciation), 10);
  setBold(
    "c IznosKnjigovodstvena vrijednost rasknjiženih stalnih sredstava",
    km(data.row23BookValueAssets),
    10
  );
  setBold(
    "c IznosRashodi ukupno zbir redova od 17  do 23",
    km(data.row24TotalExpenses),
    10
  );

  /* ── Dio 5 — Utvrđivanje dohotka (page 2, rows 25-29) ── */
  setBold("c IznosPrihodi red 16", km(data.row25Income), 10);
  setBold("c IznosRashodi red 24", km(data.row26Expenses), 10);
  setBold("fill_3", km(Math.abs(data.row27Adjustments)), 10);
  setBold(
    "c IznosDohodak iz djelatnosti red 25  26  27",
    km(data.row28NetIncome),
    10
  );
  setBold("fill_5_2", km(data.row29PersonalDeduction), 10);

  // +/- sign for row 27 adjustment
  setBold("Text1", data.signAdjustment, 9);

  /* ── Izjava ── */
  setBold("Datum", data.dateSigned, 10);

  /* ── Re-render all field appearances with the custom font, then flatten ── */
  form.updateFieldAppearances(boldFont);
  form.flatten();

  return doc.save();
}
