import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ── Types ── */

export interface GpdData {
  // Dio 1
  jmb: string;
  fullName: string;
  taxYear: string; // 2-digit
  // Zaglavlje "za period od-do" (ddMM). Prazno = cijela godina (0101/3112);
  // kraći period se koristi kod početka/prestanka djelatnosti u toku godine.
  periodFrom?: string;
  periodTo?: string;
  address: string;
  contactChanged: boolean;
  phone: string;
  email: string;

  // Dio 2 — income rows
  row8Profit: number;
  row9Loss: number;
  row9Profit: number;
  row10Loss: number;
  row10Profit: number;
  row11Loss: number;
  row11Profit: number;
  row12Loss: number;
  row12Profit: number;
  row13Loss: number;
  row13Profit: number;
  row14Loss: number;

  // Dio 2 — computed
  row15Loss: number;
  row15Profit: number;
  row16NetLoss: number;
  row17NetProfit: number;

  // Dio 3
  row18Personal: number;
  row19Health: number;
  row20Mortgage: number;
  row21TotalDeductions: number;

  // Dio 4
  row22Loss: number;
  row23Income: number;
  row24Deductions: number;
  row25TaxBase: number;
  row26Tax: number;
  row27Reduction: number;
  row28Withholding: number;
  row29Advance: number;
  row30Foreign: number;
  row31Difference: number;

  // Row 32
  refundChoice: "advance" | "refund" | "";
  bankAccount: string;

  // Dio 5
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
    console.warn(`Field "${name}" not found in template`);
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
    console.warn(`Checkbox "${name}" not found in template`);
  }
}

/* ── Main export ── */

export async function fillGpdTemplate(data: GpdData): Promise<Uint8Array> {
  // Load template & font in parallel
  const [templateBytes, fontBytes, boldFontBytes] = await Promise.all([
    fetch("/templates/GPD-1051.pdf").then((r) => r.arrayBuffer()),
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

  /* ── Page 1 header ── */
  setBold("Text14", data.periodFrom || "0101", 9); // period from (ddMM)
  setBold("Text2", data.periodTo || "3112", 9); // period to (ddMM)

  /* ── Dio 1 — Podaci o poreznom obvezniku ── */
  setBold("1 JMB", data.jmb, 10);
  setBold("2 Prezime i ime", data.fullName, 10);
  setBold("20", data.taxYear, 10);
  setBold("3 Adresa", data.address, 9);
  setBold("6 Telefon", data.phone, 9);
  setBold("7 email", data.email, 9);
  check("toggle_11", data.contactChanged);

  /* ── Dio 2 — Prijava prihoda ── */

  // Row 8 — only profit (no loss for nesamostalna djelatnost)
  setBold("d Iznos dobitiRow1", km(data.row8Profit), 10);

  // Row 9
  setBold("fill_14", km(data.row9Loss), 10);
  setBold("fill_2", km(data.row9Profit), 10);

  // Row 10
  setBold("fill_15", km(data.row10Loss), 10);
  setBold("fill_3", km(data.row10Profit), 10);

  // Row 11
  setBold("fill_16", km(data.row11Loss), 10);
  setBold("fill_4", km(data.row11Profit), 10);

  // Row 12
  setBold("fill_17", km(data.row12Loss), 10);
  setBold("fill_5", km(data.row12Profit), 10);

  // Row 13
  setBold(
    "Dohodak od drugih samostalnih djelatnosti koje nisu navedene ovdje  veza sa obrascima AUG1031 kolona 13 i  ASD1032 kolona 10",
    km(data.row13Loss),
    10
  );
  setBold(
    "d Iznos dobitiDohodak od drugih samostalnih djelatnosti koje nisu navedene ovdje  veza sa obrascima AUG1031 kolona 13 i  ASD1032 kolona 10",
    km(data.row13Profit),
    10
  );

  // Row 14 — only loss
  setBold("Poslovni gubitak iz ranijih godina", km(data.row14Loss), 10);

  // Row 15 — totals
  setBold(
    "Unijeti ukupan iznos kolone c sabrati redove od 9 do 14 Unijeti ukupan iznos kolone d sabrati redove od 8 do 13",
    km(data.row15Loss),
    10
  );
  setBold(
    "d Iznos dobitiUnijeti ukupan iznos kolone c sabrati redove od 9 do 14 Unijeti ukupan iznos kolone d sabrati redove od 8 do 13",
    km(data.row15Profit),
    10
  );

  // Row 16 — net loss
  setBold("fill_21", km(data.row16NetLoss), 10);

  // Row 17 — net profit
  setBold("undefined", km(data.row17NetProfit), 10);

  /* ── Dio 3 — Lični odbici ── */
  setBold("fill_9", km(data.row18Personal), 10);
  setBold("fill_10", km(data.row19Health), 10);
  setBold("fill_11", km(data.row20Mortgage), 10);
  setBold("c IznosUkupni odbici sabrati redove od 18 do 20", km(data.row21TotalDeductions), 10);

  /* ── Page 2 header ── */
  setBold("Prezime i ime", data.fullName, 9);
  setBold("JIBJMB", data.jmb, 10);
  setBold("Porezna godina", data.taxYear, 10);

  /* ── Dio 4 — Obračun porezne obaveze ── */
  setBold(
    "c IznosUkupni gubitak za godinu  ukoliko je u dijelu 2  red 16 kolona c unesen gubitak",
    km(data.row22Loss),
    10
  );
  setBold(
    "c IznosUkupan dohodak za godinu  ukoliko je u dijelu 2  red 17 kolona d unesen dohodak",
    km(data.row23Income),
    10
  );
  setBold("c IznosUkupni odbici u dijelu 3 red 21", km(data.row24Deductions), 10);
  setBold(
    "c IznosOsnovica poreza na dohodak  red 23  22  24",
    km(data.row25TaxBase),
    10
  );
  setBold("c IznosIznos porezne obaveze red 25 x 01", km(data.row26Tax), 10);
  setBold("fill_6", km(data.row27Reduction), 10);
  setBold("c IznosPorez po odbitku", km(data.row28Withholding), 10);
  setBold("fill_8", km(data.row29Advance), 10);
  setBold("fill_9_2", km(data.row30Foreign), 10);
  setBold(
    "c IznosRazlika poreza za doplatu  za povrat  26 27 28 29 30",
    km(data.row31Difference),
    10
  );

  /* ── Row 32 — refund options ── */
  check("toggle_1", data.refundChoice === "advance");
  check(
    "b Prijavljujem se za povrat ovog poreza",
    data.refundChoice === "refund"
  );
  if (data.refundChoice === "refund" && data.bankAccount) {
    setBold("fill_11_2", data.bankAccount, 10);
  }

  /* ── Dio 5 — Izjava ── */
  setBold("Datum", data.dateSigned, 10);

  /* ── Re-render all field appearances with the custom font, then flatten ── */
  form.updateFieldAppearances(boldFont);
  form.flatten();

  return doc.save();
}
