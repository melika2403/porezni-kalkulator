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
  zamanjanjeKod: string; // numeric code for comb boxes
  datumStupanja: string; // ddMMyyyy
  drzavljanstvo: string;
  radnoVrijemeRadno: string;
  osnovOsiguranja: string;
  osnovOsiguranjaKod: string; // numeric code for comb boxes
  datumPrestanka: string; // ddMMyyyy
  datumPromjene: string; // ddMMyyyy
  vrstaPromjene: string;
  vrstaPromjeneKod: string; // numeric code for comb boxes

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
      size: 11,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    // Also fill in after "ZAVOD ZDRAVSTVENOG OSIGURANJA ___"
    page.drawText(data.kanton, {
      x: 240,
      y: 775,
      size: 10,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  }
  // fill_1 is the field after "Poslovnica - Područni ured"
  setBold("fill_1", data.poslovnica, 9);

  /* ── Naziv i sjedište obveznika uplate doprinosa ── */
  setBold(
    "NAZIV I SJEDIŠTE OBVEZNIKA UPLATE DOPRINOSA",
    data.nazivObveznika,
    9,
  );
  setBold("jedinstveni", data.jib, 8); // 1) JIB
  setBold("REG", data.regBroj, 8); // 2) Registarski broj
  setBold("šifra", data.sifraDjelatnosti, 8); // 3) Šifra djelatnosti
  setBold("radno vrijeme", data.radnoVrijemeObveznika, 8); // 4) Radno vrijeme obveznika (y=593)

  /* ── Podaci o osiguraniku ── */
  setBold("JMBG", data.jmbg, 8); // 5) JMBG
  setBold("Prezime", data.prezime, 10); // 6) Prezime
  setBold("Ime", data.ime, 10); // 7) Ime
  setBold("fill_6", data.djevojackoPrezime, 10); // 8) Djevojačko prezime
  setBold("Ulica i broj prebivališta", data.ulicaBroj, 9); // 9) Ulica i broj
  setBold("broj pošte", data.brojPoste, 8); // 10) Broj pošte
  setBold("Zanimanje", data.zanimanje, 9); // 11) Zanimanje (text, y=444)
  setBold("zanimanje", data.zamanjanjeKod, 8); // 11) Zanimanje (comb, y=444)
  setBold("datum stupanja", data.datumStupanja, 8); // 12) Datum stupanja na rad

  setBold("Državljanstvo", data.drzavljanstvo, 9); // 13) Državljanstvo (text, y=404)
  setBold("dr", data.drzavljanstvo, 8); // 13) Državljanstvo (comb, y=406)
  setBold("Radno vrijeme radno  tjedno", data.radnoVrijemeRadno, 9); // 14) Radno vrijeme (text, y=387)
  setBold("radno vrijeme t", data.radnoVrijemeRadno, 8); // 14) Radno vrijeme (comb, y=387)
  setBold("Osnov osiguranja", data.osnovOsiguranja, 9); // 15) Osnov osiguranja (text, y=370)
  setBold("oo", data.osnovOsiguranjaKod, 8); // 15) Osnov osiguranja (comb, y=371)
  setBold("datum pr", data.datumPrestanka, 8); // 16) Datum prestanka rada
  setBold("datum pro", data.datumPromjene, 8); // 17) Datum promjene
  setBold("Vrsta promjene", data.vrstaPromjene, 9); // 18) Vrsta promjene (text, y=352)
  setBold("VP", data.vrstaPromjeneKod, 8); // 18) Vrsta promjene (comb, y=354)

  /* ── Članovi porodice (rows 19-28) ── */
  for (let i = 0; i < Math.min(data.familyMembers.length, 10); i++) {
    const m = data.familyMembers[i];
    setBold(`JMBG ${19 + i}`, m.jmbg, 8);
    setBold(`Prezime i ime ${i + 1}`, m.fullName, 9);
    setBold(`Srodstvo ${i + 1}`, m.srodstvo, 9);
  }

  /* ── Footer ── */
  setBold("Napomena", data.napomena, 9);
  setBold("U", data.mjesto, 10);
  setBold("Dana", data.datum, 10);

  /* ── Re-render all field appearances with the custom font, then flatten ── */
  form.updateFieldAppearances(boldFont);
  form.flatten();

  return doc.save();
}
