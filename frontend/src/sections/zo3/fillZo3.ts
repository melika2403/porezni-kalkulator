import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* ── Types ── */

export interface Zo3Data {
  // Header
  kanton: string;
  poslovnica: string;

  // Naziv i sjedište obveznika uplate doprinosa
  nazivObveznika: string;
  jib: string; // 13 digits
  regBroj: string;
  sifraDjelatnosti: string;
  radnoVrijemeObveznika: string;

  // Podaci o osiguraniku (fields 5-18)
  jmbg: string; // 13 digits
  prezime: string;
  ime: string;
  djevojackoPrezime: string;
  ulicaBroj: string;
  brojPoste: string;
  zanimanje: string;
  datumStupanja: string; // ddMMyyyy
  drzavljanstvo: string;
  radnoVrijemeRadno: string;
  osnovOsiguranja: string;
  datumPrestanka: string; // ddMMyyyy
  datumPromjene: string; // ddMMyyyy
  vrstaPromjene: string;

  // Članovi porodice (rows 19-28)
  familyMembers: {
    jmbg: string;
    fullName: string;
    srodstvo: string;
  }[];

  // Footer
  napomena: string;
  mjesto: string;
  datum: string;
}

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
    if (fontSize !== undefined) {
      field.setFontSize(fontSize);
    }
    field.setText(value || undefined);
    field.updateAppearances(font);
  } catch {
    console.warn(`[ZO3] Field "${name}" not found in template`);
  }
}

/* ── Main export ── */

export async function fillZo3Template(data: Zo3Data): Promise<Uint8Array> {
  const [templateBytes, fontBytes, boldFontBytes] = await Promise.all([
    fetch("/templates/ZO3.pdf").then((r) => r.arrayBuffer()),
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

  /* ── Header — draw kanton on the underline, ZAVOD has no form field ── */
  const page = doc.getPage(0);
  if (data.kanton) {
    // Kanton name on the big underline below "FEDERACIJA BOSNE I HERCEGOVINE"
    page.drawText(data.kanton, {
      x: 41,
      y: 785,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
    // Also fill in after "ZAVOD ZDRAVSTVENOG OSIGURANJA ___"
    page.drawText(data.kanton, {
      x: 240,
      y: 775,
      size: 9,
      font,
      color: rgb(0, 0, 0),
    });
  }
  // fill_1 is the field after "Poslovnica - Područni ured"
  set("fill_1", data.poslovnica, 8);

  /* ── Naziv i sjedište obveznika uplate doprinosa ── */
  setBold(
    "NAZIV I SJEDIŠTE OBVEZNIKA UPLATE DOPRINOSA",
    data.nazivObveznika,
    8,
  );
  set("jedinstveni", data.jib, 7); // 1) JIB
  set("REG", data.regBroj, 7); // 2) Registarski broj
  set("šifra", data.sifraDjelatnosti, 7); // 3) Šifra djelatnosti
  set("radno vrijeme", data.radnoVrijemeObveznika, 7); // 4) Radno vrijeme obveznika (y=593)

  /* ── Podaci o osiguraniku ── */
  set("JMBG", data.jmbg, 7); // 5) JMBG
  set("Prezime", data.prezime, 9); // 6) Prezime
  set("Ime", data.ime, 9); // 7) Ime
  set("fill_6", data.djevojackoPrezime, 9); // 8) Djevojačko prezime
  set("Ulica i broj prebivališta", data.ulicaBroj, 8); // 9) Ulica i broj
  set("broj pošte", data.brojPoste, 7); // 10) Broj pošte
  set("Zanimanje", data.zanimanje, 8); // 11) Zanimanje (text, y=444)
  set("zanimanje", data.zanimanje, 7); // 11) Zanimanje (comb, y=444)
  set("datum stupanja", data.datumStupanja, 7); // 12) Datum stupanja na rad

  set("Državljanstvo", data.drzavljanstvo, 8); // 13) Državljanstvo (text, y=404)
  set("dr", data.drzavljanstvo, 7); // 13) Državljanstvo (comb, y=406)
  set("Radno vrijeme radno  tjedno", data.radnoVrijemeRadno, 8); // 14) Radno vrijeme (text, y=387)
  set("radno vrijeme t", data.radnoVrijemeRadno, 7); // 14) Radno vrijeme (comb, y=387)
  set("Osnov osiguranja", data.osnovOsiguranja, 8); // 15) Osnov osiguranja (text, y=370)
  set("oo", data.osnovOsiguranja, 7); // 15) Osnov osiguranja (comb, y=371)
  set("datum pr", data.datumPrestanka, 7); // 16) Datum prestanka rada
  set("datum pro", data.datumPromjene, 7); // 17) Datum promjene
  set("Vrsta promjene", data.vrstaPromjene, 8); // 18) Vrsta promjene (text, y=352)
  set("VP", data.vrstaPromjene, 7); // 18) Vrsta promjene (comb, y=354)

  /* ── Članovi porodice (rows 19-28) ── */
  for (let i = 0; i < Math.min(data.familyMembers.length, 10); i++) {
    const m = data.familyMembers[i];
    set(`JMBG ${19 + i}`, m.jmbg, 7);
    set(`Prezime i ime ${i + 1}`, m.fullName, 8);
    set(`Srodstvo ${i + 1}`, m.srodstvo, 8);
  }

  /* ── Footer ── */
  set("Napomena", data.napomena, 8);
  set("U", data.mjesto, 9);
  set("Dana", data.datum, 9);

  /* ── Re-render all field appearances with the custom font, then flatten ── */
  form.updateFieldAppearances(font);
  form.flatten();

  return doc.save();
}
