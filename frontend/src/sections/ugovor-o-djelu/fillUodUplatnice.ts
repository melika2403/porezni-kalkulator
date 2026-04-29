import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  KANTONI,
  FBIH_ZO_RACUN,
  FBIH_BUDZET_RACUN,
  fillPage,
  type KantonKey,
} from "src/sections/ams/fillUplatnica";

const accDigits = (s: string) => s.replace(/-/g, "");

export interface UodUplatniceData {
  // Uplatilac (naručilac)
  naruciNaziv: string;
  naruciAdresa: string;
  naruciZiroRacun?: string;

  // Izvršilac (porezni obveznik)
  izvrJmbg: string;

  // Kanton + općina (porezni obveznik)
  kantonKey: KantonKey;
  opcinaKod: string;
  opcinaIme: string;

  // Iznosi (iz uodCalc)
  zdravstvenoKanton: number;
  zdravstvenoFbih: number;
  porez: number;
  pio: number;
  zastita: number;
  voda: number;

  // Datum + porezni period
  datum: string;          // ISO yyyy-mm-dd
  periodMjesec: string;   // "01"–"12"
  periodGodina: string;   // "2026"
}

export async function fillUodUplatnice(data: UodUplatniceData): Promise<Uint8Array> {
  const kanton = KANTONI[data.kantonKey];

  const [templateBytes, fontBytes] = await Promise.all([
    fetch("/templates/UPLATNICA PRAZNA.pdf").then((r) => r.arrayBuffer()),
    fetch("/templates/arial.ttf").then((r) => r.arrayBuffer()),
  ]);

  const out = await PDFDocument.create();
  out.registerFontkit(fontkit);
  const font = await out.embedFont(fontBytes);

  const posilDigits = data.naruciZiroRacun ? accDigits(data.naruciZiroRacun) : undefined;

  const shared = {
    jmbg: data.izvrJmbg,
    opcinaKod: data.opcinaKod,
    opcinaIme: data.opcinaIme,
    datum: data.datum,
    periodMjesec: data.periodMjesec,
    periodGodina: data.periodGodina,
    racunPosilDigits: posilDigits,
    uplatio: [data.naruciNaziv, data.naruciAdresa],
  };

  const entries: Array<{
    svrha: string;
    primatelj: string[];
    racunPrim: string;
    iznos: number;
    vrstaProhoda: string;
  }> = [
    {
      svrha: "Doprinos za zdravstveno osiguranje po ugovoru o djelu",
      primatelj: ["Zavod zdravstvenog osiguranja", kanton.genitiv],
      racunPrim: kanton.zoRacun,
      iznos: data.zdravstvenoKanton,
      vrstaProhoda: "712116",
    },
    {
      svrha: "Doprinos za zdravstveno osiguranje po ugovoru o djelu",
      primatelj: ["Zavod zdravstvenog osiguranja i reosiguranja FBiH"],
      racunPrim: FBIH_ZO_RACUN,
      iznos: data.zdravstvenoFbih,
      vrstaProhoda: "712116",
    },
    {
      svrha: "Porez na dohodak po ugovoru o djelu",
      primatelj: ["Budžet " + kanton.genitiv],
      racunPrim: kanton.budzet,
      iznos: data.porez,
      vrstaProhoda: "716116",
    },
    {
      svrha: "Doprinos za PIO/MIO po ugovoru o djelu",
      primatelj: ["Budžet Federacije BiH"],
      racunPrim: FBIH_BUDZET_RACUN,
      iznos: data.pio,
      vrstaProhoda: "712126",
    },
    {
      svrha: "Posebna naknada za zaštitu od prirodnih i drugih nesreća",
      primatelj: ["Budžet " + kanton.genitiv],
      racunPrim: kanton.budzet,
      iznos: data.zastita,
      vrstaProhoda: "722582",
    },
    {
      svrha: "Opšta vodna naknada",
      primatelj: ["Budžet " + kanton.genitiv],
      racunPrim: kanton.budzet,
      iznos: data.voda,
      vrstaProhoda: "722582",
    },
  ];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const tpl = await PDFDocument.load(templateBytes);
    const [p] = await out.copyPages(tpl, [0]);
    out.addPage(p);
    fillPage(out.getPage(i), font, {
      ...shared,
      svrha: e.svrha,
      primatelj: e.primatelj,
      racunPrimDigits: accDigits(e.racunPrim),
      kmIznos: e.iznos,
      vrstaProhoda: e.vrstaProhoda,
    });
  }

  return out.save();
}
