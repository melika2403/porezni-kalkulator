import {
  KANTONI,
  FBIH_ZO_RACUN,
  FBIH_BUDZET_RACUN,
  buildUplatniceFromOpts,
  type FillPageOpts,
  type KantonKey,
} from "src/sections/ams/fillUplatnica";

const accDigits = (s: string) => s.replace(/-/g, "");

export interface UodUplatniceData {
  // Uplatilac (naručilac) — on plaća doprinose i porez, pa je on porezni
  // obveznik na uplatnicama (JIB firme ili JMBG fizičkog lica).
  naruciNaziv: string;
  naruciAdresa: string;
  naruciId: string;            // JIB/JMBG narucilaca (13 cifara)
  naruciZiroRacun?: string;

  // Kanton + općina (lokacija narucilaca, za adresiranje uplate)
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

  // Nerezident: samo 3 uplatnice (porez 716116 + voda 722582 + nepogode 722582);
  // bez zdravstva i PIO. `zastita` se tada koristi kao naknada za nepogode.
  nerezident?: boolean;
}

export async function fillUodUplatnice(data: UodUplatniceData): Promise<Uint8Array> {
  const kanton = KANTONI[data.kantonKey];
  const posilDigits = data.naruciZiroRacun ? accDigits(data.naruciZiroRacun) : undefined;

  const shared: Omit<FillPageOpts, "svrha" | "primatelj" | "racunPrimDigits" | "kmIznos" | "vrstaProhoda"> = {
    jmbg: data.naruciId,
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
  }> = data.nerezident
    ? [
        {
          svrha: "Porez na dohodak (nerezident)",
          primatelj: ["Budžet " + kanton.genitiv],
          racunPrim: kanton.budzet,
          iznos: data.porez,
          vrstaProhoda: "716116",
        },
        {
          svrha: "Opšta vodna naknada",
          primatelj: ["Budžet " + kanton.genitiv],
          racunPrim: kanton.budzet,
          iznos: data.voda,
          vrstaProhoda: "722582",
        },
        {
          svrha: "Posebna naknada za zaštitu od prirodnih i drugih nesreća",
          primatelj: ["Budžet " + kanton.genitiv],
          racunPrim: kanton.budzet,
          iznos: data.zastita,
          vrstaProhoda: "722582",
        },
      ]
    : [
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

  return buildUplatniceFromOpts(
    entries.map((e) => ({
      ...shared,
      svrha: e.svrha,
      primatelj: e.primatelj,
      racunPrimDigits: accDigits(e.racunPrim),
      kmIznos: e.iznos,
      vrstaProhoda: e.vrstaProhoda,
    })),
  );
}
