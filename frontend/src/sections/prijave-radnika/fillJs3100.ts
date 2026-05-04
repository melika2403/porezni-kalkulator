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

  // ── Treći dio — Podaci o osiguranju ──
  // Red 1: Dnevno radno vrijeme
  sati: string; // 2 cifre — undefined_5
  minuta: string; // 2 cifre — undefined_6
  // Red 2: Osnov osiguranja
  osnovOsiguranjaOpis: string; // Text2 — opis
  osnovOsiguranjaSifra: string; // 2 cifre — undefined_7
  // Red 3: Zanimanje
  zanimanjeOpis: string; // Text3
  zanimanjeSifra: string; // 7 cifara — undefined_8
  // Red 4: Stručna sprema koja se traži na radnom mjestu (Check Box2..11)
  strucnaSpremaTraziSeIdx: number | null;
  // Red 5: Datum prijave/odjave/promjene osiguranja
  datumPromjeneDan: string; // 2 cifre — undefined_9
  datumPromjeneMjesec: string; // 2 cifre — undefined_10
  datumPromjeneGodina: string; // 4 cifre — undefined_11
  napomenaPromjene: string; // fill_22 — slobodno polje desno
  // Red 6: Osnov za uplatu doprinosa
  osnovUplateOpis: string; // Text1
  osnovUplateSifra: string; // 2 cifre — undefined_12
  // Red 7: Staž sa uvećanim trajanjem
  sifraRadnogMjesta: string; // 4 cifre — undefined_13
  stepenUvecanja: string; // 2 cifre — undefined_14
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

/* ── Pozicije za "Stručna sprema koja se traži na radnom mjestu" (Treći dio, red 4) ──
   Odgovaraju Check Box2..11 (y=302, w=10, h=18) */
const STRUCNA_SPREMA_TRAZI_POS = [
  { x: 264, y: 302 },
  { x: 295, y: 302 },
  { x: 325, y: 302 },
  { x: 357, y: 302 },
  { x: 389, y: 302 },
  { x: 419, y: 302 },
  { x: 450, y: 302 },
  { x: 482, y: 301 },
  { x: 512, y: 302 },
  { x: 544, y: 302 },
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

  /* ── Treći dio — Podaci o osiguranju ── */
  // Red 1: Dnevno radno vrijeme (undefined_5 = sati, undefined_6 = minuta)
  setBold("undefined_5", data.sati.replace(/\D/g, "").slice(0, 2), 11);
  setBold("undefined_6", data.minuta.replace(/\D/g, "").slice(0, 2), 11);

  // Red 2: Osnov osiguranja (Text2 = opis, undefined_7 = 2-cifreni kod)
  setBold("Text2", data.osnovOsiguranjaOpis, 10);
  setBold("undefined_7", data.osnovOsiguranjaSifra.replace(/\D/g, "").slice(0, 2), 11);

  // Red 3: Zanimanje (Text3 = opis, undefined_8 = 7-cifreni kod)
  setBold("Text3", data.zanimanjeOpis, 10);
  setBold("undefined_8", data.zanimanjeSifra.replace(/\D/g, "").slice(0, 7), 11);

  // Red 5: Datum prijave/odjave/promjene osiguranja
  setBold("undefined_9", data.datumPromjeneDan, 11);
  setBold("undefined_10", data.datumPromjeneMjesec, 11);
  setBold("undefined_11", data.datumPromjeneGodina, 11);
  setBold("fill_22", data.napomenaPromjene, 10);

  // Red 6: Osnov za uplatu doprinosa (Text1 = opis, undefined_12 = 2-cifreni kod)
  setBold("Text1", data.osnovUplateOpis, 10);
  setBold("undefined_12", data.osnovUplateSifra.replace(/\D/g, "").slice(0, 2), 11);

  // Red 7: Staž sa uvećanim trajanjem
  setBold("undefined_13", data.sifraRadnogMjesta.replace(/\D/g, "").slice(0, 4), 11);
  setBold("undefined_14", data.stepenUvecanja.replace(/\D/g, "").slice(0, 2), 11);

  /* ── Footer ── */
  setBold("Datum", data.datumPopunjavanja, 8);
  setBold("Datum_2", data.datumPopunjavanja, 11);
  setBold("Ime i prezime lica koje je popunilo prijavu", data.popunioImeIPrezime, 10);
  setBold("Telefonski broj lica koje je popunilo prijavu", data.popunioTelefon, 10);

  /* ── Re-render appearances + flatten ── */
  form.updateFieldAppearances(boldFont);
  form.flatten();

  /* ── X kvačice crtamo NAKON flatten-a da prazna kvačica iz form-flattenovanja
     ne pokrije naš X ── */
  const page = doc.getPage(0);

  // Drugi dio, red 11 — Stručna sprema (osiguranika)
  if (
    data.strucnaSpremaIdx !== null &&
    data.strucnaSpremaIdx >= 0 &&
    data.strucnaSpremaIdx <= 9
  ) {
    const pos = STRUCNA_SPREMA_POS[data.strucnaSpremaIdx];
    page.drawText("X", {
      x: pos.x + 1.5,
      y: pos.y + 2,
      size: 9,
      font: boldFont,
    });
  }

  // Treći dio, red 4 — Stručna sprema koja se traži na radnom mjestu
  if (
    data.strucnaSpremaTraziSeIdx !== null &&
    data.strucnaSpremaTraziSeIdx >= 0 &&
    data.strucnaSpremaTraziSeIdx <= 9
  ) {
    const pos = STRUCNA_SPREMA_TRAZI_POS[data.strucnaSpremaTraziSeIdx];
    page.drawText("X", {
      x: pos.x + 1,
      y: pos.y + 5,
      size: 11,
      font: boldFont,
    });
  }

  return doc.save();
}
