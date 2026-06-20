// ──────────────────────────────────────────────────────────────────────────────
//  Obrazac 2001-A, Specifikacija uz isplatu plaća zaposlenika sa prebivalištem
//  u Republici Srpskoj u radnom odnosu kod poslodavca iz FBiH.
//
//  Isto kao 2001, ali samo za RS radnike. Dodatno iskazuje koliko zdravstva i
//  nezaposlenosti ostaje u FBiH (redovi 27a, 28a) i ukupne obaveze u FBiH (30a).
//  Template: /templates/Obrazac 2001-A.pdf (AcroForm polja).
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, PDFPage, rgb, TextAlignment } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type VrstaIsplate2001 = "DOPRINOSA_I_POREZA" | "SAMO_DOPRINOSA" | "SAMO_POREZA";

export interface Obrazac2001AData {
  // Dio 1
  naziv: string;
  jib: string; // 13 cifara
  adresa: string;
  opcina: string; // općina firme
  periodOdDan: string;
  periodOdMjesec: string;
  periodOdGodina: string;
  periodDoDan: string;
  periodDoMjesec: string;
  periodDoGodina: string;
  vrstaDjelatnosti: string;
  brojZaposlenih: string;
  placeUNovcu: string;
  placeUStvarima: string;
  ukupnePlace: string;
  nerezident: boolean;
  izuzeci: boolean;
  konsolidacija: boolean;
  sportskiKolektiv: boolean;
  vrstaIsplate: VrstaIsplate2001;

  // Dio 2, iz osnovice (zaposlenik)
  pioStopa: string;
  pioIznos: string;
  zdrStopa: string;
  zdrIznos: string;
  nezapStopa: string;
  nezapIznos: string;
  empUkupnoIznos: string;

  // Dio 3, na osnovicu (poslodavac)
  erpPioStopa: string;
  erpPioIznos: string;
  erpZdrStopa: string;
  erpZdrIznos: string;
  erpNezapStopa: string;
  erpNezapIznos: string;
  dodatniPioStopa: string;
  dodatniPioIznos: string;
  dodatniZdrStopa: string;
  dodatniZdrIznos: string;
  erpUkupnoIznos: string;

  // Dio 4, obaveze
  obavezePio: string; // 26
  obavezeZdr: string; // 27
  obavezeZdrFBiHStopa: string; // 27a stopa
  obavezeZdrFBiH: string; // 27a iznos
  obavezeNezap: string; // 28
  obavezeNezapFBiHStopa: string; // 28a stopa
  obavezeNezapFBiH: string; // 28a iznos
  obavezePorez: string; // 29
  obavezeUkupno: string; // 30
  obavezeUkupnoFBiH: string; // 30a

  // Dio 5
  potpisObveznika: string;
  datum: string;
}

// JIB: 13 jednocifrenih polja, redoslijed lijevo-desno (iz koordinata templejta).
const JIB_FIELDS = [
  "2 JIBJMB", "2 JIBJMB7", "2 JIBJMB1", "2 JIBJMB2", "2 JIBJMB3",
  "2 JIBJMB4", "2 JIBJMB5", "2 JIBJMB6", "2 JIBJMB8", "2 JIBJMB9",
  "2 JIBJMB10", "2 JIBJMB11", "2 JIBJMB12",
];
// Period od/do: po 8 jednocifrenih polja (DD MM GGGG).
const PERIOD_OD_FIELDS = [
  "PeriodOd", "PeriodOd2", "PeriodOd3", "PeriodOd4",
  "PeriodOd5", "PeriodOd6", "PeriodOd7", "PeriodOd8",
];
const PERIOD_DO_FIELDS = [
  "PeriodDo", "PeriodDo1", "PeriodDo2", "PeriodDo3",
  "PeriodDo4", "PeriodDo5", "PeriodDo6", "PeriodDo7",
];

type Form = ReturnType<PDFDocument["getForm"]>;
type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

function setText(
  form: Form,
  name: string,
  value: string,
  font: Font,
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
    console.warn(`[Obrazac2001A] Field "${name}" not found`);
  }
}

// Upiši string cifru po cifru u niz jednocifrenih polja (centrirano).
function setDigits(form: Form, fields: string[], value: string, font: Font) {
  const digits = String(value || "").replace(/\D/g, "");
  for (let i = 0; i < fields.length; i++) {
    setText(form, fields[i], digits[i] || "", font, 10, TextAlignment.Center);
  }
}

type CheckMark = { x: number; y: number; w: number; h: number };

// Skupi rect-ove svih widget-a polja, ukloni ga, vrati rect-ove (sortirane po
// x) da bismo nakon flatten-a ručno nacrtali kvačicu. Koristimo generički
// getField (ne getCheckBox), jer u nekim build-ovima pdf-lib zna klasifikovati
// checkbox drugačije pa getCheckBox baci grešku na tip.
type WidgetLike = {
  getRectangle: () => { x: number; y: number; width: number; height: number };
};
function collectCheckBoxRects(form: Form, name: string): CheckMark[] {
  const rects: CheckMark[] = [];
  let field;
  try {
    field = form.getField(name);
  } catch {
    field = undefined;
  }
  if (field) {
    const acro = field.acroField as { getWidgets?: () => WidgetLike[] };
    const widgets = acro.getWidgets ? acro.getWidgets() : [];
    for (const w of widgets) {
      const r = w.getRectangle();
      rects.push({ x: r.x, y: r.y, w: r.width, h: r.height });
    }
    try {
      form.removeField(field);
    } catch {
      // polje se ne može ukloniti, nije fatalno
    }
  }
  rects.sort((a, b) => a.x - b.x);
  return rects;
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

export async function fillObrazac2001ATemplate(
  data: Obrazac2001AData,
): Promise<Uint8Array> {
  const [templateBytes, fontBytes, boldBytes] = await Promise.all([
    fetch("/templates/Obrazac 2001-A.pdf").then((r) => r.arrayBuffer()),
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);

  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const bold = await doc.embedFont(boldBytes);
  const form = doc.getForm();
  const page = doc.getPage(0);
  const C = TextAlignment.Center;

  // SAMO JIB i Period (datum) kućice sjede prenisko u templejtu. Povećavamo im
  // visinu prema gore (dno ostaje isto, nema rezanja donjeg ruba cifre), pa
  // pdf-lib cifru pozicionira više. Iznose i broj zaposlenih NE diramo.
  const EXTEND = 4;
  type RectWidget = {
    getRectangle: () => { x: number; y: number; width: number; height: number };
    setRectangle: (r: { x: number; y: number; width: number; height: number }) => void;
  };
  [...JIB_FIELDS, ...PERIOD_OD_FIELDS, ...PERIOD_DO_FIELDS].forEach((name) => {
    let f;
    try {
      f = form.getTextField(name);
    } catch {
      return;
    }
    const acro = f.acroField as { getWidgets?: () => RectWidget[] };
    for (const w of acro.getWidgets ? acro.getWidgets() : []) {
      const r = w.getRectangle();
      w.setRectangle({ x: r.x, y: r.y, width: r.width, height: r.height + EXTEND });
    }
  });

  // Dio 1
  setText(form, "1 Naziv", data.naziv, bold, 10);
  setDigits(form, JIB_FIELDS, data.jib, bold);
  setText(form, "3 Adresa", data.adresa, font, 10);
  setText(form, "fill_36", data.opcina, font, 10);
  setDigits(
    form,
    PERIOD_OD_FIELDS,
    `${data.periodOdDan}${data.periodOdMjesec}${data.periodOdGodina}`,
    bold,
  );
  setDigits(
    form,
    PERIOD_DO_FIELDS,
    `${data.periodDoDan}${data.periodDoMjesec}${data.periodDoGodina}`,
    bold,
  );
  setText(form, "6 Vrsta djelatnosti šifra naziv", data.vrstaDjelatnosti, font, 9);
  setText(form, "7 Broj zaposlenih", data.brojZaposlenih, bold, 11, C);
  setText(form, "fill_40", data.placeUNovcu, font, 10);
  setText(form, "fill_41", data.placeUStvarima, font, 10);
  setText(form, "fill_42", data.ukupnePlace, bold, 10);

  // Checkboxevi 11-14 (Check Box2..5). Skupljamo rect-ove, crtamo nakon flatten-a.
  const marks: CheckMark[] = [];
  const cb = (name: string, checked: boolean) => {
    const rects = collectCheckBoxRects(form, name);
    if (checked) marks.push(...rects);
  };
  cb("Check Box2", data.nerezident);
  cb("Check Box3", data.izuzeci);
  cb("Check Box4", data.konsolidacija);
  cb("Check Box5", data.sportskiKolektiv);

  // Vrsta isplate: jedno polje "Check Box6" sa 3 widgeta (a, b, c po x-u).
  // Crtamo kvačicu samo na izabranom.
  const vrstaRects = collectCheckBoxRects(form, "Check Box6");
  const vrstaIdx =
    data.vrstaIsplate === "SAMO_DOPRINOSA"
      ? 1
      : data.vrstaIsplate === "SAMO_POREZA"
        ? 2
        : 0;
  if (vrstaRects[vrstaIdx]) marks.push(vrstaRects[vrstaIdx]);

  // Dio 2, iz osnovice (zaposlenik). Pažnja: mala "stopa" u nazivima 2001-A.
  setText(form, "c stopaDoprinosi za penzijsko i invalidsko osiguranje", data.pioStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za penzijsko i invalidsko osiguranje", data.pioIznos, font, 10, C);
  setText(form, "c stopaDoprinosi za zdravstveno osiguranje", data.zdrStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za zdravstveno osiguranje", data.zdrIznos, font, 10, C);
  setText(form, "c stopaDoprinosi za osiguranje od nezaposlenosti", data.nezapStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za osiguranje od nezaposlenosti", data.nezapIznos, font, 10, C);
  setText(form, "d IznosDoprinosi za osiguranje od nezaposlenosti1", data.empUkupnoIznos, bold, 10, C);

  // Dio 3, na osnovicu (poslodavac)
  setText(form, "c stopaDoprinosi za penzijsko i invalidsko osiguranje_2", data.erpPioStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za penzijsko i invalidsko osiguranje_2", data.erpPioIznos, font, 10, C);
  setText(form, "c stopaDoprinosi za zdravstveno osiguranje_2", data.erpZdrStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za zdravstveno osiguranje_2", data.erpZdrIznos, font, 10, C);
  setText(form, "c stopaDoprinosi za osiguranje od nezaposlenosti_2", data.erpNezapStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za osiguranje od nezaposlenosti_2", data.erpNezapIznos, font, 10, C);
  setText(form, "c stopaDodatni doprinosi za penzijsko i invalidsko osiguranje", data.dodatniPioStopa, font, 10, C);
  setText(form, "d IznosDodatni doprinosi za penzijsko i invalidsko osiguranje", data.dodatniPioIznos, font, 10, C);
  setText(form, "c stopaDodatni doprinosi za zdravstveno osiguranje", data.dodatniZdrStopa, font, 10, C);
  setText(form, "d IznosDodatni doprinosi za zdravstveno osiguranje", data.dodatniZdrIznos, font, 10, C);
  setText(form, "d IznosDodatni doprinosi za zdravstveno osiguranje1", data.erpUkupnoIznos, bold, 10, C);

  // Dio 4, obaveze
  setText(form, "d IznosDoprinosi za penzijsko i invalidsko osiguranje 14  18  21", data.obavezePio, font, 10, C);
  setText(form, "d IznosDoprinosi za zdravstveno osiguranje 15  19  22", data.obavezeZdr, font, 10, C);
  // 27a, od čega u FBiH (zdravstvo)
  setText(form, "fill_21", data.obavezeZdrFBiHStopa, font, 10, C);
  setText(form, "fill_22", data.obavezeZdrFBiH, font, 10, C);
  setText(form, "d IznosDoprinosi za osiguranje od nezaposlenosti 16  20", data.obavezeNezap, font, 10, C);
  // 28a, od čega u FBiH (nezaposlenost)
  setText(form, "fill_25", data.obavezeNezapFBiHStopa, font, 10, C);
  setText(form, "fill_26", data.obavezeNezapFBiH, font, 10, C);
  setText(form, "d IznosPorez na dohodak", data.obavezePorez, font, 10, C);
  setText(form, "d IznosUkupne obaveze 24  25  26  27", data.obavezeUkupno, bold, 10, C);
  // 30a, od čega ukupne obaveze u FBiH
  setText(form, "fill_32", data.obavezeUkupnoFBiH, bold, 10, C);

  // Dio 5
  setText(form, "Potpis obveznika", data.potpisObveznika, font, 10);
  setText(form, "Datum", data.datum, font, 10);

  form.updateFieldAppearances(bold);
  form.flatten();
  drawCheckMarks(page, marks);

  return await doc.save();
}
