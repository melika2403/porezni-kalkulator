// ──────────────────────────────────────────────────────────────────────────────
//  Obrazac 2001 — Specifikacija uz isplatu plaća zaposlenika.
//  Šalje se mjesečno Poreznoj upravi FBiH istog/sljedećeg dana nakon isplate.
//
//  Template: /templates/obrazac-2001.pdf (sa AcroForm poljima).
//  Pravni osnov: Pravilnik o načinu obračunavanja i uplate doprinosa FBiH.
// ──────────────────────────────────────────────────────────────────────────────
import { PDFDocument, PDFPage, rgb, TextAlignment } from "pdf-lib";
import { trackEvent } from "src/api/activity";
import fontkit from "@pdf-lib/fontkit";

export type VrstaIsplate2001 = "DOPRINOSA_I_POREZA" | "SAMO_DOPRINOSA" | "SAMO_POREZA";

export interface Obrazac2001Data {
  /** za dnevnik aktivnosti (admin vidi za koju org-u je dokument) */
  organizationId?: number | null;
  // Dio 1 — Podaci o poslodavcu/isplatiocu i plaćama
  naziv: string; // 1
  jib: string; // 2, 13 cifara
  adresa: string; // 3
  opcina: string; // 4
  periodOdDan: string; // 5, 2 cifre
  periodOdMjesec: string;
  periodOdGodina: string; // 4 cifre
  periodDoDan: string;
  periodDoMjesec: string;
  periodDoGodina: string;
  vrstaDjelatnosti: string; // 6, šifra + naziv
  brojZaposlenih: string; // 7
  placeUNovcu: string; // 8, formatiran iznos (npr. "1.234,56")
  placeUStvarima: string; // 9
  ukupnePlace: string; // 10
  nerezident: boolean; // 11
  izuzeci: boolean; // 12
  konsolidacija: boolean; // 13
  sportskiKolektiv: boolean; // 14
  vrstaIsplate: VrstaIsplate2001; // 15

  // Dio 2 — Doprinosi iz osnovice (na teret osiguranika)
  pioStopa: string; // 16
  pioIznos: string;
  zdrStopa: string; // 17
  zdrIznos: string;
  nezapStopa: string; // 18
  nezapIznos: string;
  empUkupnoIznos: string; // 19

  // Dio 3 — Doprinosi na osnovicu (na teret poslodavca)
  erpPioStopa: string; // 20
  erpPioIznos: string;
  erpZdrStopa: string; // 21
  erpZdrIznos: string;
  erpNezapStopa: string; // 22
  erpNezapIznos: string;
  dodatniPioStopa: string; // 23
  dodatniPioIznos: string;
  dodatniZdrStopa: string; // 24
  dodatniZdrIznos: string;
  erpUkupnoIznos: string; // 25

  // Dio 4 — Obaveze
  obavezePio: string; // 26 = 16 + 20 + 23
  obavezeZdr: string; // 27 = 17 + 21 + 24
  obavezeNezap: string; // 28 = 18 + 22
  obavezePorez: string; // 29
  obavezeUkupno: string; // 30 = 26+27+28+29

  // Dio 5 — Izjava
  potpisObveznika: string; // Text73
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
    console.warn(`[Obrazac2001] Field "${name}" not found`);
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
    console.warn(`[Obrazac2001] CheckBox "${name}" not found`);
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

export async function fillObrazac2001Template(
  data: Obrazac2001Data,
): Promise<Uint8Array> {
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("OBRAZAC_2001_GENERATE", "Obrazac 2001", data.organizationId);

  const [templateBytes, fontBytes, boldBytes] = await Promise.all([
    fetch("/templates/obrazac-2001.pdf").then((r) => r.arrayBuffer()),
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

  const Ctr = TextAlignment.Center;
  // Dio 1
  setText(form, "1 Naziv", data.naziv, bold, 10);
  setText(form, "JIB/JMB", data.jib.replace(/\D/g, "").slice(0, 13), bold, 11, Ctr);
  setText(form, "3 Adresa", data.adresa, font, 10);
  setText(form, "4 Opcina", data.opcina, font, 10);

  // Period od (DD MM YYYY) — Text4.0.0, Text4.0.1, Text2
  setText(form, "Text4.0.0", data.periodOdDan, bold, 11, Ctr);
  setText(form, "Text4.0.1", data.periodOdMjesec, bold, 11, Ctr);
  setText(form, "Text2", data.periodOdGodina, bold, 11, Ctr);
  // Period do — Text4.1.0, Text4.1.1, Text3
  setText(form, "Text4.1.0", data.periodDoDan, bold, 11, Ctr);
  setText(form, "Text4.1.1", data.periodDoMjesec, bold, 11, Ctr);
  setText(form, "Text3", data.periodDoGodina, bold, 11, Ctr);

  setText(form, "6 Vrsta djelatnosti šifra naziv", data.vrstaDjelatnosti, font, 9);
  setText(form, "7 Broj zaposlenih", data.brojZaposlenih, bold, 11);
  setText(form, "8 Place u novcu", data.placeUNovcu, font, 10);
  setText(form, "9 place u stvarima i ili uslugama", data.placeUStvarima, font, 10);
  setText(form, "10 Ukupne place", data.ukupnePlace, bold, 10);

  check("11 Nerezident", data.nerezident);
  check("12 izuzeci po clanu 6 tacka 10", data.izuzeci);
  check("13 Konsolidacija privrednih drustava", data.konsolidacija);
  check("14 Po osnovu dugovanja sport. kolektiva", data.sportskiKolektiv);

  check("a Doprinosa i poreza", data.vrstaIsplate === "DOPRINOSA_I_POREZA");
  check("b Samo doprinosa", data.vrstaIsplate === "SAMO_DOPRINOSA");
  check("c Samo poreza", data.vrstaIsplate === "SAMO_POREZA");

  // Dio 2 — Doprinosi iz osnovice (sve stope i iznosi centrirani)
  const C = Ctr;
  setText(form, "c StopaDoprinosi za penzijsko i invalidsko osiguranje", data.pioStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za penzijsko i invalidsko osiguranje", data.pioIznos, font, 10, C);
  setText(form, "c StopaDoprinosi za zdravstveno osiguranje", data.zdrStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za zdravstveno osiguranje", data.zdrIznos, font, 10, C);
  setText(form, "c StopaDoprinosi za osiguranje od nezaposlenosti", data.nezapStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za osiguranje od nezaposlenosti", data.nezapIznos, font, 10, C);
  setText(form, "Ukupni doprinosi 14  15  16 Iznos", data.empUkupnoIznos, bold, 10, C);

  // Dio 3 — Doprinosi na osnovicu
  setText(form, "c StopaDoprinosi za penzijsko i invalidsko osiguranje_2", data.erpPioStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za penzijsko i invalidsko osiguranje_2", data.erpPioIznos, font, 10, C);
  setText(form, "c StopaDoprinosi za zdravstveno osiguranje_2", data.erpZdrStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za zdravstveno osiguranje_2", data.erpZdrIznos, font, 10, C);
  setText(form, "c StopaDoprinosi za osiguranje od nezaposlenosti_2", data.erpNezapStopa, font, 10, C);
  setText(form, "d IznosDoprinosi za osiguranje od nezaposlenosti_2", data.erpNezapIznos, font, 10, C);
  setText(form, "c StopaDodatni doprinosi za penzijsko i invalidsko osiguranje", data.dodatniPioStopa, font, 10, C);
  setText(form, "d IznosDodatni doprinosi za penzijsko i invalidsko osiguranje", data.dodatniPioIznos, font, 10, C);
  setText(form, "c StopaDodatni doprinosi za zdravstveno osiguranje", data.dodatniZdrStopa, font, 10, C);
  setText(form, "d IznosDodatni doprinosi za zdravstveno osiguranje", data.dodatniZdrIznos, font, 10, C);
  setText(form, "d Ukupni doprinosi 18+19+20+21+22 Iznos", data.erpUkupnoIznos, bold, 10, C);

  // Dio 4 — Obaveze
  setText(form, "d IznosDoprinosi za penzijsko i invalidsko osiguranje 14  18  21", data.obavezePio, font, 10, C);
  setText(form, "d IznosDoprinosi za zdravstveno osiguranje 15  19  22", data.obavezeZdr, font, 10, C);
  setText(form, "d IznosDoprinosi za osiguranje od nezaposlenosti  16  20", data.obavezeNezap, font, 10, C);
  setText(form, "d IznosPorez na dohodak", data.obavezePorez, font, 10, C);
  setText(form, "d IznosUkupne obaveze 24  25  26  27", data.obavezeUkupno, bold, 10, C);

  // Dio 5
  setText(form, "Text73", data.potpisObveznika, font, 10);
  setText(form, "Datum", data.datum, font, 10);

  // Prekrivamo unutrašnjost "Za službenu upotrebu" okvira bijelim pravougaonikom.
  // Koordinate okvira (clip rect 468.1 756 105 66.72) smanjene za 4px inset
  // da border okvira ostane vidljiv.
  page.drawRectangle({
    x: 472.1,
    y: 760,
    width: 97,
    height: 58.72,
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
