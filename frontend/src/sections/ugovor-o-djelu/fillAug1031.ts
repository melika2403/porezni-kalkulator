import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { VrstaNaknade } from "./uodCalc";

export interface Aug1031Data {
  naruciIme: string;
  naruciAdresa: string;
  naruciId: string;
  izvrIme: string;
  izvrJmbg: string;
  datum: string;
  vrsta: VrstaNaknade;
  brutoPrihod: number;
  rashodi: number;
  dohodak: number;
  zdravstveno: number;
  osnovicaPorez: number;
  porez: number;
  pio: number;
}

const fmt = (n: number) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const splitDate = (iso: string) => {
  const [y = "", m = "", d = ""] = iso.slice(0, 10).split("-");
  return { d, m, yShort: y.slice(2), yFull: y };
};

export async function fillAug1031(data: Aug1031Data): Promise<Uint8Array> {
  const [buf, arialBoldBytes] = await Promise.all([
    fetch("/templates/AUG-1031.pdf").then((r) => r.arrayBuffer()),
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

  const { d, m, yShort, yFull } = splitDate(data.datum);

  // ─── Header ─────────────────────────────────────────────────────────────
  set("StranicaObrazac AUG1031 Akontacija poreza po odbitku za povremene samostalne djelatnosti", "1");
  set("OdObrazac AUG1031 Akontacija poreza po odbitku za povremene samostalne djelatnosti", "1");
  set("2 Naziv", data.naruciIme);
  set("3 JIBJMB", data.naruciId);
  set("4 Adresa", data.naruciAdresa);

  // Datum isplate: dan / mjesec / godina (label "20__")
  set("5 Datum isplate Danmjesecgodina", d);
  set("undefined", m);
  set("20", yShort);

  // Period (mjesec/godina) za koji se podnosi obrazac
  set("undefined_2", m);
  set("undefined_3", yShort);

  // Checkbox 20% / 30% rashodi
  if (data.vrsta === "standard") check("Check Box1.0");
  else if (data.vrsta === "autorsko") check("Check Box1.1");

  // ─── Tabela: 1. red (jedan izvršilac po obrascu) ─────────────────────────
  set("undefined_4", data.izvrJmbg);
  set("8 Prezime i ime poreznog obveznika", data.izvrIme);
  set("9 Iznos prihoda", fmt(data.brutoPrihod));
  set("10 Iznos rashoda 20 ili 30 kolone 9", fmt(data.rashodi));
  set("11 Iznos dohotka kolona 9  10", fmt(data.dohodak));
  set("12 Zdravstve no osiguranje na teret osiguranik a kolona 11 x 004", fmt(data.zdravstveno));
  set("13 Osnovica za porez kolone 11  12", fmt(data.osnovicaPorez));
  set("14 Iznos poreza kolona 13 x 01", fmt(data.porez));
  set("15 Penzijsko i invalidsko osiguranje na teret isplatioca Krajnja suma kolona 11 x 006", fmt(data.pio));

  // ─── Ukupno (jedan red → ista vrijednost) ────────────────────────────────
  const u = "Ukupno za sve stranice  prijenos Ukoliko su potrebni dodatni redovi koristi se dodatni primjerak ovog obrasca";
  set(`9 Iznos prihoda${u}`, fmt(data.brutoPrihod));
  set(`10 Iznos rashoda 20 ili 30 kolone 9${u}`, fmt(data.rashodi));
  set(`11 Iznos dohotka kolona 9  10${u}`, fmt(data.dohodak));
  set(`12 Zdravstve no osiguranje na teret osiguranik a kolona 11 x 004${u}`, fmt(data.zdravstveno));
  set(`13 Osnovica za porez kolone 11  12${u}`, fmt(data.osnovicaPorez));
  set(`14 Iznos poreza kolona 13 x 01${u}`, fmt(data.porez));
  set(`15 Penzijsko i invalidsko osiguranje na teret isplatioca Krajnja suma kolona 11 x 006${u}`, fmt(data.pio));

  // ─── Datum potpisa ──────────────────────────────────────────────────────
  set("Datum", `${d}.${m}.${yFull}.`);

  // Use Arial Bold for all field appearances (bold output + bosanski znakovi)
  form.updateFieldAppearances(arialBold);

  return doc.save();
}
