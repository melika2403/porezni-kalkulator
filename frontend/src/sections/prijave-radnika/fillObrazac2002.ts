// ──────────────────────────────────────────────────────────────────────────────
//  Obrazac 2002 — Specifikacija uz uplatu doprinosa poduzetnika sa
//  prebivalištem u Federaciji BiH. Mjesečna obaveza vlasnika obrta.
//
//  Template: /templates/obrazac-2002.pdf (sa AcroForm poljima — comb stilom).
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, PDFPage, rgb, TextAlignment } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type Operacija2002 = "PRIJAVA" | "IZMJENA" | "BRISANJE";

export type VrstaSamostalne2002 =
  | "SLOBODNO_ZANIMANJE"
  | "DJELATNOST_OBRTA"
  | "NISKO_AKUMULACIJSKA"
  | "POLJOPRIVREDA_SUMARSTVO"
  | "TRGOVAC_POJEDINAC";

export type DohodakNa2002 = "POSLOVNIH_KNJIGA" | "PAUSALNO";

export interface Obrazac2002Data {
  // Dio 1 — Podaci o registrovanoj djelatnosti
  naziv: string; // 1
  jib: string; // 2, 13 cifara (comb)
  operacija: Operacija2002; // 3
  // 4) Period od/do — DD MM YYYY (8 cifara svaki)
  periodOdDan: string;
  periodOdMjesec: string;
  periodOdGodina: string;
  periodDoDan: string;
  periodDoMjesec: string;
  periodDoGodina: string;
  adresa: string; // 5
  opcina: string; // 6
  brojZaposlenih: string; // 7
  vrstaDjelatnosti: string; // 8 (šifra + naziv)
  vrstaSamostalne: VrstaSamostalne2002; // 9
  dohodakNa: DohodakNa2002; // 10
  osnovica: string; // 11
  brojRadnihSati: string; // 12
  brojRadnihSatiBolovanje: string; // 13
  // 14) Datum uplate doprinosa
  datumUplateDan: string;
  datumUplateMjesec: string;
  datumUplateGodina: string;

  // Dio 2 — Podaci o poduzetniku
  prezimeIme: string; // 15
  jmb: string; // 16, 13 cifara (comb)
  adresaPoduzetnika: string; // 17
  opcinaPoduzetnika: string; // 18

  // Dio 3 — Doprinosi
  pioStopa: string; // 19
  pioIznos: string;
  zdrStopa: string; // 20
  zdrIznos: string;
  nezapStopa: string; // 21
  nezapIznos: string;
  ukupnoIznos: string; // 22

  // Dio 4 — Izjava
  potpis: string;
  datum: string; // DD.MM.YYYY
}

function setText(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size = 10,
  align?: TextAlignment,
) {
  try {
    const field = form.getTextField(name);
    field.setFontSize(size);
    if (align !== undefined) field.setAlignment(align);
    field.setText(value || undefined);
    field.updateAppearances(font);
  } catch {
    console.warn(`[Obrazac2002] Field "${name}" not found`);
  }
}

// Templejt PDF-a već ima vizuelno nacrtan kvadrat za svaki checkbox. Ako
// pozovemo `field.check()` i `updateAppearances()`, pdf-lib generiše svoj
// default appearance koji crta veliki tamni kvadrat preko templejt-ovog,
// pa ispada da imamo dva kvadrata. Umjesto toga: skinemo border widget-a,
// ostavimo polje uncheck-ovano, i ručno nacrtamo ZapfDingbats kvačicu (znak
// "4") unutar widget rect-a, koja se nakon flatten-a urendiruje u stranicu.
// Templejt PDF-a već ima vizuelno nacrtan kvadrat za svaki checkbox. Da
// izbjegnemo duple kvadrate, prikupimo rect-ove svih widget-a, uklonimo polje
// iz forme (da pdf-lib flatten ne crta ništa preko), pa NAKON flatten-a
// ručno nacrtamo popunjen crni kvadrat unutar template kvadrata.
type CheckMark = { x: number; y: number; w: number; h: number };

function collectCheckBox(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  checked: boolean,
  out: CheckMark[],
) {
  try {
    const field = form.getCheckBox(name);
    if (checked) {
      for (const w of field.acroField.getWidgets()) {
        const r = w.getRectangle();
        out.push({ x: r.x, y: r.y, w: r.width, h: r.height });
      }
    }
    form.removeField(field);
  } catch {
    console.warn(`[Obrazac2002] CheckBox "${name}" not found`);
  }
}

function drawCheckMarks(page: PDFPage, marks: CheckMark[]) {
  for (const m of marks) {
    const inset = Math.min(m.w, m.h) * 0.22;
    page.drawRectangle({
      x: m.x + inset,
      y: m.y + inset,
      width: m.w - 2 * inset,
      height: m.h - 2 * inset,
      color: rgb(0, 0, 0),
    });
  }
}

function fillCombDigits(
  form: ReturnType<PDFDocument["getForm"]>,
  names: string[],
  value: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size = 10,
) {
  const digits = value.replace(/\D/g, "").slice(0, names.length);
  for (let i = 0; i < names.length; i++) {
    setText(form, names[i], digits[i] || "", font, size, TextAlignment.Center);
  }
}

// JIB obveznika (red 2): polja 1–13, lijevo→desno na y=620
const JIB_OBVEZNIKA_FIELDS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13",
];
// Period od (DD MM YYYY): polja 14–21, y=574
const PERIOD_OD_FIELDS = ["14", "15", "16", "17", "18", "19", "20", "21"];
// Period do (DD MM YYYY): polja 22–29, y=540
const PERIOD_DO_FIELDS = ["22", "23", "24", "25", "26", "27", "28", "29"];
// 14) Datum uplate (DD MM YYYY): polja 30–37, y=332
const DATUM_UPLATE_FIELDS = ["30", "31", "32", "33", "34", "35", "36", "37"];
// 16) JMB poduzetnika: polja 38–50, y=259-260
const JMB_PODUZETNIKA_FIELDS = [
  "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50",
];

export async function fillObrazac2002Template(
  data: Obrazac2002Data,
): Promise<Uint8Array> {
  const [templateBytes, fontBytes, boldBytes] = await Promise.all([
    fetch("/templates/obrazac-2002.pdf").then((r) => r.arrayBuffer()),
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);

  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const bold = await doc.embedFont(boldBytes);
  const form = doc.getForm();
  const page = doc.getPage(0);
  const marks: CheckMark[] = [];
  const check = (name: string, checked: boolean) =>
    collectCheckBox(form, name, checked, marks);

  // Dio 1
  setText(form, "fill_1", data.naziv, bold, 10);
  fillCombDigits(form, JIB_OBVEZNIKA_FIELDS, data.jib, bold, 11);

  // 3) Operacija
  check("ca", data.operacija === "PRIJAVA");
  check("ca2", data.operacija === "IZMJENA");
  check("ca3", data.operacija === "BRISANJE");

  // 4) Period od/do
  const periodOd = [
    data.periodOdDan[0] || "",
    data.periodOdDan[1] || "",
    data.periodOdMjesec[0] || "",
    data.periodOdMjesec[1] || "",
    data.periodOdGodina[0] || "",
    data.periodOdGodina[1] || "",
    data.periodOdGodina[2] || "",
    data.periodOdGodina[3] || "",
  ].join("");
  fillCombDigits(form, PERIOD_OD_FIELDS, periodOd, bold, 11);
  const periodDo = [
    data.periodDoDan[0] || "",
    data.periodDoDan[1] || "",
    data.periodDoMjesec[0] || "",
    data.periodDoMjesec[1] || "",
    data.periodDoGodina[0] || "",
    data.periodDoGodina[1] || "",
    data.periodDoGodina[2] || "",
    data.periodDoGodina[3] || "",
  ].join("");
  fillCombDigits(form, PERIOD_DO_FIELDS, periodDo, bold, 11);

  // 5) Adresa
  setText(form, "0", data.adresa, font, 10);
  // 6) Općina
  setText(form, "01", data.opcina, font, 10);
  // 7) Broj zaposlenih
  setText(form, "2\n\t3", data.brojZaposlenih, bold, 11);
  // 8) Vrsta djelatnosti
  setText(form, "Text71", data.vrstaDjelatnosti, font, 9);

  // 9) Vrsta samostalne djelatnosti (ca4 = a, ca5 = b, ca6 = c, ca7 = d, ca8 = e)
  check("ca4", data.vrstaSamostalne === "SLOBODNO_ZANIMANJE");
  check("ca5", data.vrstaSamostalne === "DJELATNOST_OBRTA");
  check("ca6", data.vrstaSamostalne === "NISKO_AKUMULACIJSKA");
  check("ca7", data.vrstaSamostalne === "POLJOPRIVREDA_SUMARSTVO");
  check("ca8", data.vrstaSamostalne === "TRGOVAC_POJEDINAC");

  // 10) Dohodak se utvrđuje (ca9 = a poslovnih knjiga, ca10 = b paušalno)
  check("ca9", data.dohodakNa === "POSLOVNIH_KNJIGA");
  check("ca10", data.dohodakNa === "PAUSALNO");

  // 11) Osnovica za obračun
  setText(form, "fill_6", data.osnovica, bold, 10);
  // 12) Broj radnih sati
  setText(form, "\n\n3", data.brojRadnihSati, font, 10);
  // 13) Broj radnih sati na bolovanju
  setText(form, "\n\n3_2", data.brojRadnihSatiBolovanje, font, 10);

  // 14) Datum uplate doprinosa
  const datumUplate = [
    data.datumUplateDan[0] || "",
    data.datumUplateDan[1] || "",
    data.datumUplateMjesec[0] || "",
    data.datumUplateMjesec[1] || "",
    data.datumUplateGodina[0] || "",
    data.datumUplateGodina[1] || "",
    data.datumUplateGodina[2] || "",
    data.datumUplateGodina[3] || "",
  ].join("");
  fillCombDigits(form, DATUM_UPLATE_FIELDS, datumUplate, bold, 11);

  // Dio 2 — Podaci o poduzetniku
  setText(form, "fill_9", data.prezimeIme, bold, 10);
  fillCombDigits(form, JMB_PODUZETNIKA_FIELDS, data.jmb, bold, 11);
  setText(form, "200", data.adresaPoduzetnika, font, 10);
  setText(form, "04", data.opcinaPoduzetnika, font, 10);

  // Dio 3 — Doprinosi (stopa i iznos centrirani u svojim ćelijama)
  // 19 PIO: stopa = 51, iznos = 54 (y=184)
  // 20 ZDR: stopa = 52, iznos = 55 (y=172)
  // 21 NEZAP: stopa = 53, iznos = 56 (y=161)
  // 22 Ukupno: iznos = 57 (y=149)
  const C = TextAlignment.Center;
  setText(form, "51", data.pioStopa, font, 10, C);
  setText(form, "54", data.pioIznos, font, 10, C);
  setText(form, "52", data.zdrStopa, font, 10, C);
  setText(form, "55", data.zdrIznos, font, 10, C);
  setText(form, "53", data.nezapStopa, font, 10, C);
  setText(form, "56", data.nezapIznos, font, 10, C);
  setText(form, "57", data.ukupnoIznos, bold, 10, C);

  // Dio 4 — Izjava
  setText(form, "fill_26", data.potpis, font, 10);
  setText(form, "fill_27", data.datum, font, 10);

  // Prekrivamo unutrašnjost "Za službenu upotrebu" okvira bijelim pravougaonikom.
  // Granice okvira (x 432.63..571.82, y 684.87..771.34) smanjene za 4px inset
  // da border okvira ostane vidljiv.
  page.drawRectangle({
    x: 436.63,
    y: 688.87,
    width: 131.19,
    height: 78.47,
    color: rgb(1, 1, 1),
  });

  // Renderiraj appearance-e tekstualnih polja i flatten-uj — checkbox polja
  // smo već uklonili iz forme da pdf-lib ne crta ništa preko.
  form.updateFieldAppearances(bold);
  form.flatten();

  // Crtamo crne kvadrate za checked checkbox-eve TEK NAKON flatten-a, da
  // budu na vrhu sadržaja.
  drawCheckMarks(page, marks);

  return await doc.save();
}
