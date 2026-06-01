// ──────────────────────────────────────────────────────────────────────────────
//  GIP-1022 XML — paketni uvoz obrazaca u nPIS.
//  Schema: urn:PaketniUvozObrazaca_V1_0.xsd
//  Struktura: <PaketniUvozObrazaca> > <PodaciOPoslodavcu> + N × <Obrazac1022>.
//  Brojevi: dot-decimal, 2 mjesta; faktor 3 mjesta. Datumi: YYYY-MM-DD.
//  Mjesec u redu je broj mjeseca u kojem je izvršena uplata (1-12).
// ──────────────────────────────────────────────────────────────────────────────

export interface Gip1022XmlRow {
  mjesec: number; // 1-12 (mjesec uplate)
  isplataZaMjesec: string; // "M/YYYY" (period za koji se isplata odnosi)
  vrstaIsplate: string; // "1" za redovnu platu
  iznosNovac: number;
  iznosStvari: number;
  bruto: number;
  pio: number;
  zdr: number;
  nezap: number;
  ukupniDopr: number;
  placaBezDopr: number;
  faktor: number; // npr. 1.000
  iznosOdbitka: number;
  osnovicaPoreza: number;
  iznosPoreza: number;
  neto: number;
  datumUplate: string; // YYYY-MM-DD
}

export interface Gip1022XmlUkupno {
  iznosNovac: number;
  iznosStvari: number;
  bruto: number;
  pio: number;
  zdr: number;
  nezap: number;
  ukupniDopr: number;
  placaBezDopr: number;
  iznosOdbitka: number;
  osnovicaPoreza: number;
  iznosPoreza: number;
  neto: number;
}

export interface Gip1022XmlObrazac {
  naziv: string; // poslodavac
  adresaSjedista: string;
  jmbZaposlenika: string;
  imeIPrezime: string; // "PREZIME IME"
  adresaPrebivalista: string;
  poreznaGodina: number;
  rows: Gip1022XmlRow[];
  ukupno: Gip1022XmlUkupno;
}

export interface Gip1022XmlData {
  jibPoslodavca: string;
  nazivPoslodavca: string;
  brojZahtjeva: number;
  datumPodnosenja: string; // YYYY-MM-DD
  obrasci: Gip1022XmlObrazac[];
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const fmt2 = (n: number) => n.toFixed(2);
const fmt3 = (n: number) => n.toFixed(3);

export function generateGip1022Xml(data: Gip1022XmlData): string {
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8" ?>`);
  lines.push(
    `<PaketniUvozObrazaca xsi:schemaLocation="urn:PaketniUvozObrazaca_V1_0.xsd PaketniUvozObrazaca_V1_0.xsd" xmlns="urn:PaketniUvozObrazaca_V1_0.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
  );
  lines.push(` <PodaciOPoslodavcu>`);
  lines.push(`   <JIBPoslodavca>${xmlEscape(data.jibPoslodavca)}</JIBPoslodavca>`);
  lines.push(`   <NazivPoslodavca>${xmlEscape(data.nazivPoslodavca)}</NazivPoslodavca>`);
  lines.push(`   <BrojZahtjeva>${data.brojZahtjeva}</BrojZahtjeva>`);
  lines.push(`   <DatumPodnosenja>${xmlEscape(data.datumPodnosenja)}</DatumPodnosenja>`);
  lines.push(` </PodaciOPoslodavcu>`);

  for (const o of data.obrasci) {
    lines.push(` <Obrazac1022>`);
    lines.push(`   <Dio1PodaciOPoslodavcuIPoreznomObvezniku>`);
    lines.push(`     <JIBJMBPoslodavca>${xmlEscape(data.jibPoslodavca)}</JIBJMBPoslodavca>`);
    lines.push(`     <Naziv>${xmlEscape(o.naziv)}</Naziv>`);
    lines.push(`     <AdresaSjedista>${xmlEscape(o.adresaSjedista)}</AdresaSjedista>`);
    lines.push(`     <JMBZaposlenika>${xmlEscape(o.jmbZaposlenika)}</JMBZaposlenika>`);
    lines.push(`     <ImeIPrezime>${xmlEscape(o.imeIPrezime)}</ImeIPrezime>`);
    lines.push(`     <AdresaPrebivalista>${xmlEscape(o.adresaPrebivalista)}</AdresaPrebivalista>`);
    lines.push(`     <PoreznaGodina>${o.poreznaGodina}</PoreznaGodina>`);
    lines.push(`   </Dio1PodaciOPoslodavcuIPoreznomObvezniku>`);
    lines.push(`   <Dio2PodaciOPrihodimaDoprinosimaIPorezu>`);

    for (const r of o.rows) {
      lines.push(`    <PodaciOPrihodimaDoprinosimaIPorezu>`);
      lines.push(`     <Mjesec>${r.mjesec}</Mjesec>`);
      lines.push(`     <IsplataZaMjesecIGodinu>${xmlEscape(r.isplataZaMjesec)}</IsplataZaMjesecIGodinu>`);
      lines.push(`     <VrstaIsplate>${xmlEscape(r.vrstaIsplate)}</VrstaIsplate>`);
      lines.push(`     <IznosPrihodaUNovcu>${fmt2(r.iznosNovac)}</IznosPrihodaUNovcu>`);
      lines.push(`     <IznosPrihodaUStvarimaUslugama>${fmt2(r.iznosStvari)}</IznosPrihodaUStvarimaUslugama>`);
      lines.push(`     <BrutoPlaca>${fmt2(r.bruto)}</BrutoPlaca>`);
      lines.push(`     <IznosZaPenzijskoInvalidskoOsiguranje>${fmt2(r.pio)}</IznosZaPenzijskoInvalidskoOsiguranje>`);
      lines.push(`     <IznosZaZdravstvenoOsiguranje>${fmt2(r.zdr)}</IznosZaZdravstvenoOsiguranje>`);
      lines.push(`     <IznosZaOsiguranjeOdNezaposlenosti>${fmt2(r.nezap)}</IznosZaOsiguranjeOdNezaposlenosti>`);
      lines.push(`     <UkupniDoprinosi>${fmt2(r.ukupniDopr)}</UkupniDoprinosi>`);
      lines.push(`     <PlacaBezDoprinosa>${fmt2(r.placaBezDopr)}</PlacaBezDoprinosa>`);
      lines.push(`     <FaktorLicnihOdbitakaPremaPoreznojKartici>${fmt3(r.faktor)}</FaktorLicnihOdbitakaPremaPoreznojKartici>`);
      lines.push(`     <IznosLicnogOdbitka>${fmt2(r.iznosOdbitka)}</IznosLicnogOdbitka>`);
      lines.push(`     <OsnovicaPoreza>${fmt2(r.osnovicaPoreza)}</OsnovicaPoreza>`);
      lines.push(`     <IznosUplacenogPoreza>${fmt2(r.iznosPoreza)}</IznosUplacenogPoreza>`);
      lines.push(`     <NetoPlaca>${fmt2(r.neto)}</NetoPlaca>`);
      lines.push(`     <DatumUplate>${xmlEscape(r.datumUplate)}</DatumUplate>`);
      lines.push(`    </PodaciOPrihodimaDoprinosimaIPorezu>`);
    }

    lines.push(`    <Ukupno>`);
    lines.push(`     <IznosPrihodaUNovcu>${fmt2(o.ukupno.iznosNovac)}</IznosPrihodaUNovcu>`);
    lines.push(`     <IznosPrihodaUStvarimaUslugama>${fmt2(o.ukupno.iznosStvari)}</IznosPrihodaUStvarimaUslugama>`);
    lines.push(`     <BrutoPlaca>${fmt2(o.ukupno.bruto)}</BrutoPlaca>`);
    lines.push(`     <IznosZaPenzijskoInvalidskoOsiguranje>${fmt2(o.ukupno.pio)}</IznosZaPenzijskoInvalidskoOsiguranje>`);
    lines.push(`     <IznosZaZdravstvenoOsiguranje>${fmt2(o.ukupno.zdr)}</IznosZaZdravstvenoOsiguranje>`);
    lines.push(`     <IznosZaOsiguranjeOdNezaposlenosti>${fmt2(o.ukupno.nezap)}</IznosZaOsiguranjeOdNezaposlenosti>`);
    lines.push(`     <UkupniDoprinosi>${fmt2(o.ukupno.ukupniDopr)}</UkupniDoprinosi>`);
    lines.push(`     <PlacaBezDoprinosa>${fmt2(o.ukupno.placaBezDopr)}</PlacaBezDoprinosa>`);
    lines.push(`     <IznosLicnogOdbitka>${fmt2(o.ukupno.iznosOdbitka)}</IznosLicnogOdbitka>`);
    lines.push(`     <OsnovicaPoreza>${fmt2(o.ukupno.osnovicaPoreza)}</OsnovicaPoreza>`);
    lines.push(`     <IznosUplacenogPoreza>${fmt2(o.ukupno.iznosPoreza)}</IznosUplacenogPoreza>`);
    lines.push(`     <NetoPlaca>${fmt2(o.ukupno.neto)}</NetoPlaca>`);
    lines.push(`    </Ukupno>`);
    lines.push(`   </Dio2PodaciOPrihodimaDoprinosimaIPorezu>`);
    lines.push(` <Dio3IzjavaPoslodavcaIsplatioca>`);
    lines.push(`   <JIBJMBPoslodavca>${xmlEscape(data.jibPoslodavca)}</JIBJMBPoslodavca>`);
    lines.push(`   <DatumUnosa>${xmlEscape(data.datumPodnosenja)}</DatumUnosa>`);
    lines.push(`   <NazivPoslodavca>${xmlEscape(o.naziv)}</NazivPoslodavca>`);
    lines.push(` </Dio3IzjavaPoslodavcaIsplatioca>`);
    lines.push(`   <Dokument>`);
    lines.push(`     <Operacija>Novi</Operacija>`);
    lines.push(`   </Dokument>`);
    lines.push(` </Obrazac1022>`);
  }

  lines.push(`</PaketniUvozObrazaca>`);
  return lines.join("\n");
}
