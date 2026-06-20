import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/* PDN-1033: prijava poreza po odbitku za nerezidenta na prihode od povremenog
   obavljanja samostalne djelatnosti. Nema rashoda ni doprinosa: kolona 9 =
   bruto, kolona 10 = porez (9 x 0,10). Popunjava se postojeći template
   (public/templates/PDN-1033.pdf) preko AcroForm polja. */
export interface Pdn1033Data {
  naruciNaziv: string;
  naruciAdresa: string;
  naruciId: string; // JIB/JMB naručioca (isplatioca)
  izvrIme: string;
  izvrJmbg: string; // JMB/ID izvršioca (nerezidenta)
  datum: string; // ISO yyyy-mm-dd (datum isplate)
  periodMjesec: string; // "01"–"12"
  periodGodina: string; // "2026"
  bruto: number; // kolona 9
  porez: number; // kolona 10 = bruto × 0,10
}

const fmt = (n: number) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const splitDate = (iso: string) => {
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return { d, m, yFull: y, yShort: y.slice(2) };
};

export async function fillPdn1033(data: Pdn1033Data): Promise<Uint8Array> {
  const [buf, arialBoldBytes] = await Promise.all([
    fetch("/templates/PDN-1033.pdf").then((r) => r.arrayBuffer()),
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);
  const doc = await PDFDocument.load(buf);
  doc.registerFontkit(fontkit);
  const arialBold = await doc.embedFont(arialBoldBytes);
  const form = doc.getForm();

  const set = (name: string, value: string) => {
    try {
      form.getTextField(name).setText(value);
    } catch {
      // ignore unknown fields
    }
  };
  const check = (name: string) => {
    try {
      form.getCheckBox(name).check();
    } catch {
      // ignore
    }
  };

  const { d, m, yFull, yShort } = splitDate(data.datum);

  // Vrsta prijave: a) Porez na dohodak od samostalne djelatnosti za nerezidente
  // (Check Box1.0 = opcija a, 1.1 = b ulaganje kapitala, 1.2 = c nagradne igre).
  check("Check Box1.0");

  // ─── Zaglavlje (isplatilac / naručilac) ──────────────────────────────────
  set("2 Naziv", data.naruciNaziv);
  set("3 Adresa", data.naruciAdresa);
  set("1) JIB/JMB", data.naruciId);

  // Datum isplate (dan/mjesec/godina) + porezni period (mjesec/godina).
  // Godina polja imaju maxLength=2, pa idu dvocifreno.
  set("6)Datum isplate_dan", d);
  set("6)Datum isplate_mje", m);
  set("6)Datum isplate_god", yShort);
  set("5) Period_Mjesec", data.periodMjesec);
  set("5) Period_godina", data.periodGodina.slice(-2));
  set("Stranica br", "1");
  set("Od", "1");

  // ─── Tabela: 1. red (jedan izvršilac po obrascu) ─────────────────────────
  //   undefined_5 = JMB poreznog obveznika (kolona 7)
  //   8 Prezime i ime = ime izvršioca (kolona 8)
  //   fill_2 = iznos (kolona 9 = bruto)
  //   10 Iznos poreza kolona 9 x 01 = porez (kolona 10)
  set("undefined_5", data.izvrJmbg);
  set("8 Prezime i ime", data.izvrIme);
  set("fill_2", fmt(data.bruto));
  set("10 Iznos poreza kolona 9 x 01", fmt(data.porez));

  // ─── Ukupno (jedan red → ista vrijednost) ────────────────────────────────
  set("fill_38", fmt(data.bruto));
  set(
    "10 Iznos poreza kolona 9 x 0112 Ukupno za sve stranice  prijenos Ukoliko su potrebni dodatni redovi koristi se dodatni primjerak ovog obrasca",
    fmt(data.porez),
  );

  // Datum potpisa
  set("Datum", `${d}.${m}.${yFull}.`);

  form.updateFieldAppearances(arialBold);
  return doc.save();
}
