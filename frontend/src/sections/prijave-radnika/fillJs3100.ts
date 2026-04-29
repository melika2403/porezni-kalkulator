import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ── Types ── */

export type Js3100Vrsta = "PRIJAVA" | "PROMJENA" | "ODJAVA";
export type Js3100Spol = "M" | "Z" | "";

export interface Js3100Data {
  // ── Vrsta prijave ──
  vrsta: Js3100Vrsta;
  datumPrijave: string; // ddMMyyyy ili ISO (formatirano za PDF)

  // ── Prvi dio — Obveznik uplate doprinosa ──
  jib: string; // 13 cifara
  sifraOpcine: string; // 3 cifre — comb field "undefined"
  naziv: string;
  adresa: string;
  gradPoste: string; // npr. "71000 Sarajevo"
  telefon: string;
  email: string;

  // ── Drugi dio — Podaci o osiguraniku ──
  jmbg: string; // 13 cifara
  prezimeIme: string;
  djevojackoPrezime: string; // red 3 — fill_2
  datumRodjenjaDan: string; // 2 cifre
  datumRodjenjaMjesec: string;
  datumRodjenjaGodina: string; // 4 cifre
  spol: Js3100Spol;
  adresaPrebivalista: string;
  sifraOpcineOsiguranika: string; // 3 cifre — comb_5
  postanskiBroj: string;
  mjestoPrebivalista: string;
  postanskiMjestoCombined: string; // npr. "71300 Visoko"
  kontaktAdresa: string; // ulica i broj kontakt adrese
  emailOsiguranika: string;
  strucnaSpremaIdx: number | null; // 0..9 → Check Box2..11 (DR, MR, VSS, VŠS, SSS, Niža, VKV, KV, PK, NK)

  // ── Footer ──
  popunioImeIPrezime: string;
  popunioTelefon: string;
  datumPopunjavanja: string; // formatirano za PDF

  // ── TODO: precizirati nakon screenshot-a labeled PDF-a ──
  // tipUgovora: number 0-9 (Check Box100-109)
  // osnovOsiguranja: number 0-9 (Check Box2-11)
  // datumStupanjaNaRad / datumPrestanka
  // sati/minuta sedmično radno vrijeme
  // text1 / text2 / text3 — slobodna polja
  tipUgovoraIdx: number | null;       // -1..9 ili null = ne čekiraj
  osnovOsiguranjaIdx: number | null;  // -1..9 ili null = ne čekiraj
  napomenaText1: string;
  napomenaText2: string;
  napomenaText3: string;
  // Datum stupanja na rad (3 cifre polja)
  datumStupanjaDan: string;
  datumStupanjaMjesec: string;
  datumStupanjaGodina: string;
  // Sedmično radno vrijeme
  satiSedmicno: string;
  minutaSedmicno: string;
  // Datum prestanka rada (za ODJAVA)
  datumPrestankaDan: string;
  datumPrestankaMjesec: string;
  datumPrestankaGodina: string;
}

/* ── Pozicije kvačica za Stručnu spremu (Drugi dio, red 11) ──
   Odgovaraju Check Box100..109 (y=385, w=10, h=11)
   Redoslijed: 0=DR, 1=MR, 2=VSS, 3=VŠS, 4=SSS, 5=Niža, 6=VKV, 7=KV, 8=PK, 9=NK */
const STRUCNA_SPREMA_POS = [
  { x: 263, y: 385 },
  { x: 294, y: 385 },
  { x: 324, y: 385 },
  { x: 354, y: 385 },
  { x: 384, y: 385 },
  { x: 415, y: 386 },
  { x: 446, y: 385 },
  { x: 478, y: 385 },
  { x: 508, y: 385 },
  { x: 539, y: 385 },
];

/* ── Helpers ── */

function setTextField(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  value: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontSize?: number,
) {
  try {
    const field = form.getTextField(name);
    if (fontSize !== undefined) field.setFontSize(fontSize);
    field.setText(value || undefined);
    field.updateAppearances(font);
  } catch {
    console.warn(`[JS3100] Field "${name}" not found in template`);
  }
}

function checkBox(
  form: ReturnType<PDFDocument["getForm"]>,
  name: string,
  checked: boolean,
) {
  try {
    const cb = form.getCheckBox(name);
    if (checked) cb.check();
    else cb.uncheck();
  } catch {
    console.warn(`[JS3100] CheckBox "${name}" not found in template`);
  }
}

/* ── Main export ── */

export async function fillJs3100Template(data: Js3100Data): Promise<Uint8Array> {
  const [templateBytes, fontBytes, boldFontBytes] = await Promise.all([
    fetch("/templates/JS3100.pdf").then((r) => r.arrayBuffer()),
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

  /* ── Vrsta prijave (3 checkbox-like text fields stacked top-right) ── */
  // Prijava → "X" u "6 Vrsta prijave", Promjena → u "Promjena podataka o osiguranju", Odjava → u "Odjava osiguranja"
  setBold("6 Vrsta prijave", data.vrsta === "PRIJAVA" ? "X" : "", 11);
  setBold("Promjena podataka o osiguranju", data.vrsta === "PROMJENA" ? "X" : "", 11);
  setBold("Odjava osiguranja", data.vrsta === "ODJAVA" ? "X" : "", 11);

  // Polje "undefined" (x=327, y=664, maxLen=3, comb) → 5) Šifra općine
  setBold("undefined", data.sifraOpcine.slice(0, 3), 11);

  /* ── Prvi dio — Obveznik uplate doprinosa ── */
  setBold("1 JIBJMB", data.jib.replace(/\D/g, "").slice(0, 13), 11);
  setBold("2 Naziv obveznika uplate doprinosa", data.naziv, 10);
  setBold("3 Adresa obveznika uplate doprinosa", data.adresa, 10);
  setBold("4 Grad i poštanski broj", data.gradPoste, 10);
  setBold("7 Telefon", data.telefon, 10);
  setBold("8 Email", data.email, 10);

  /* ── Drugi dio — Podaci o osiguraniku ── */
  // "Drugi dio  Podaci o osiguraniku" je polje na (268, 555) širina 185 → vjerovatno JMBG
  setBold("Drugi dio  Podaci o osiguraniku", data.jmbg.replace(/\D/g, "").slice(0, 13), 11);
  setBold("Prezime i ime osiguranika", data.prezimeIme, 11);
  // fill_2 (y=521, w=309) → red 3: Djevojačko prezime
  setBold("fill_2", data.djevojackoPrezime, 11);

  // Datum rođenja — 3 polja u istom redu (y=507): undefined_2/3/4 = dan/mjesec/godina
  setBold("undefined_2", data.datumRodjenjaDan, 11);
  setBold("undefined_3", data.datumRodjenjaMjesec, 11);
  setBold("undefined_4", data.datumRodjenjaGodina, 11);

  // Spol (2 checkbox-like text polja Ženski/Muški)
  setBold("Ženski", data.spol === "Z" ? "X" : "", 11);
  setBold("Muški", data.spol === "M" ? "X" : "", 11);

  // Adresa prebivališta + šifra općine + kontakt + poštanski + mjesto + email
  setBold("Adresa prebivališta", data.adresaPrebivalista, 10);
  // comb_5: 3-cifreni comb field → šifra općine osiguranika
  setBold("comb_5", data.sifraOpcineOsiguranika.replace(/\D/g, "").slice(0, 3), 11);
  // fill_3: kontakt adresa — ulica i broj
  setBold("fill_3", data.kontaktAdresa, 10);
  setBold("Poštanski broj", data.postanskiBroj, 10);
  // Email row (y=397): lijevo polje = email, desno = "71300 Visoko"
  setBold("Poštanski broj Email adresa", data.emailOsiguranika, 10);
  setBold("MjestoEmail adresa", data.postanskiMjestoCombined, 10);

  /* ── Tip ugovora (Check Box100..109) ── */
  if (data.tipUgovoraIdx !== null && data.tipUgovoraIdx >= 0 && data.tipUgovoraIdx <= 9) {
    checkBox(form, `Check Box${100 + data.tipUgovoraIdx}`, true);
  }

  /* ── Osnov osiguranja (Check Box2..11) ── */
  if (data.osnovOsiguranjaIdx !== null && data.osnovOsiguranjaIdx >= 0 && data.osnovOsiguranjaIdx <= 9) {
    checkBox(form, `Check Box${2 + data.osnovOsiguranjaIdx}`, true);
  }

  /* ── Datumi i dodatna polja u sredini — TODO: potvrditi semantiku ── */
  // Datum stupanja na rad (undefined_5, undefined_6, undefined_7 ili 9/10/11)
  setBold("undefined_5", data.datumStupanjaDan, 11);
  setBold("undefined_6", data.datumStupanjaMjesec, 11);
  // undefined_7 je sam po sebi (538, 337) — vjerovatno minute sedmičnog vremena
  setBold("undefined_7", data.minutaSedmicno, 11);

  setBold("Sati Minuta", data.satiSedmicno, 11);

  // Slobodna tekst polja
  setBold("Text1", data.napomenaText1, 10);
  setBold("Text2", data.napomenaText2, 10);
  setBold("Text3", data.napomenaText3, 10);

  // Datum prestanka (undefined_9, _10, _11) — TODO potvrditi
  setBold("undefined_9", data.datumPrestankaDan, 11);
  setBold("undefined_10", data.datumPrestankaMjesec, 11);
  setBold("undefined_11", data.datumPrestankaGodina, 11);

  /* ── Footer ── */
  setBold("Datum", data.datumPopunjavanja, 11);
  setBold("Datum_2", data.datumPopunjavanja, 11);
  setBold("Ime i prezime lica koje je popunilo prijavu", data.popunioImeIPrezime, 10);
  setBold("Telefonski broj lica koje je popunilo prijavu", data.popunioTelefon, 10);

  /* ── Re-render appearances + flatten ── */
  form.updateFieldAppearances(boldFont);
  form.flatten();

  /* ── Stručna sprema (red 11) ── crtamo "X" NAKON flatten-a da prazna
     kvačica iz form-flattenovanja ne pokrije naš X */
  if (
    data.strucnaSpremaIdx !== null &&
    data.strucnaSpremaIdx >= 0 &&
    data.strucnaSpremaIdx <= 9
  ) {
    const pos = STRUCNA_SPREMA_POS[data.strucnaSpremaIdx];
    doc.getPage(0).drawText("X", {
      x: pos.x + 1.5,
      y: pos.y + 2,
      size: 9,
      font: boldFont,
    });
  }

  return doc.save();
}
