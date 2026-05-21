// ──────────────────────────────────────────────────────────────────────────────
//  MIP-1023 XML — paketni uvoz obrazaca u nPIS.
//  Schema: urn:PaketniUvozObrazaca_V1_0.xsd
//  Struktura: <PaketniUvozObrazaca> > <PodaciOPoslodavcu> + jedan <Obrazac1023>.
//  Jedan MIP = jedan mjesec, svi radnici u <Dio2>, zbirno u <Dio3>.
//  Brojevi: dot-decimal 2 mjesta; faktor 3 mjesta; sati 2 mjesta. Datumi: YYYY-MM-DD.
// ──────────────────────────────────────────────────────────────────────────────

export interface Mip1023XmlWorker {
  vrstaIsplate: string; // "1"
  jmb: string;
  imePrezime: string; // "PREZIME IME"
  datumIsplate: string; // YYYY-MM-DD
  radniSati: number;
  radniSatiBolovanje: number;
  bruto: number;
  koristi: number;
  ukupanPrihod: number;
  pio: number; // employee PIO
  zo: number; // employee ZO
  nezap: number; // employee NEZAP
  doprinosi: number; // employee total (31%)
  prihodUmanjen: number; // ukupan - doprinosi
  faktor: number; // npr. 1.000
  iznosOdbitka: number;
  osnovicaPoreza: number;
  iznosPoreza: number;
  radniSatiUT: number; // uvećani staž
  stepenUvecanja: number; // integer 0
  sifraRadnogMjestaUT: string; // "000000" za standardno
  doprinosiPioMioZaUT: number;
  beneficiraniStaz: boolean;
  opcinaPrebivalista: string; // 3-cifrena šifra općine
}

export interface Mip1023XmlDio3 {
  pio: number; // employer PIO
  zo: number; // employer ZO
  nezap: number; // employer NEZAP
  dodatniDoprinosiZo: number;
  prihod: number; // sum ukupanPrihod
  doprinosi: number; // sum employee total doprinosi
  licniOdbici: number; // sum iznosOdbitka
  porez: number; // sum iznosPoreza
}

export interface Mip1023XmlData {
  jibPoslodavca: string;
  nazivPoslodavca: string;
  brojZahtjeva: number;
  datumPodnosenja: string; // YYYY-MM-DD
  sifraDjelatnosti: string;
  periodOd: string; // YYYY-MM-DD
  periodDo: string; // YYYY-MM-DD
  workers: Mip1023XmlWorker[];
  zbirno: Mip1023XmlDio3;
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

// KD BiH šifra djelatnosti je formata "XX.XXX" (npr. "50.200"). Backend možda
// čuva bez tačke ili sa — normalizuj na sa tačkom ako je 5 cifara.
function formatSifraDjelatnosti(s: string): string {
  const clean = s.trim();
  if (/^\d{5}$/.test(clean)) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  return clean;
}

export function generateMip1023Xml(data: Mip1023XmlData): string {
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8" ?>`);
  lines.push(`<PaketniUvozObrazaca xmlns="urn:PaketniUvozObrazaca_V1_0.xsd">`);
  lines.push(` <PodaciOPoslodavcu>`);
  lines.push(`   <JIBPoslodavca>${xmlEscape(data.jibPoslodavca)}</JIBPoslodavca>`);
  lines.push(`   <NazivPoslodavca>${xmlEscape(data.nazivPoslodavca)}</NazivPoslodavca>`);
  lines.push(`   <BrojZahtjeva>${data.brojZahtjeva}</BrojZahtjeva>`);
  lines.push(`   <DatumPodnosenja>${xmlEscape(data.datumPodnosenja)}</DatumPodnosenja>`);
  lines.push(` </PodaciOPoslodavcu>`);
  lines.push(` <Obrazac1023>`);
  lines.push(`   <Dio1>`);
  lines.push(`     <JibJmb>${xmlEscape(data.jibPoslodavca)}</JibJmb>`);
  lines.push(`     <Naziv>${xmlEscape(data.nazivPoslodavca)}</Naziv>`);
  lines.push(`     <DatumUpisa>${xmlEscape(data.datumPodnosenja)}</DatumUpisa>`);
  lines.push(`     <BrojUposlenih>${data.workers.length}</BrojUposlenih>`);
  lines.push(`     <PeriodOd>${xmlEscape(data.periodOd)}</PeriodOd>`);
  lines.push(`     <PeriodDo>${xmlEscape(data.periodDo)}</PeriodDo>`);
  lines.push(`     <SifraDjelatnosti>${xmlEscape(formatSifraDjelatnosti(data.sifraDjelatnosti))}</SifraDjelatnosti>`);
  lines.push(`   </Dio1>`);
  lines.push(`   <Dio2>`);

  for (const w of data.workers) {
    lines.push(`    <PodaciOPrihodima>`);
    lines.push(`     <VrstaIsplate>${xmlEscape(w.vrstaIsplate)}</VrstaIsplate>`);
    lines.push(`     <Jmb>${xmlEscape(w.jmb)}</Jmb>`);
    lines.push(`     <ImePrezime>${xmlEscape(w.imePrezime)}</ImePrezime>`);
    lines.push(`     <DatumIsplate>${xmlEscape(w.datumIsplate)}</DatumIsplate>`);
    lines.push(`     <RadniSati>${fmt2(w.radniSati)}</RadniSati>`);
    lines.push(`     <RadniSatiBolovanje>${fmt2(w.radniSatiBolovanje)}</RadniSatiBolovanje>`);
    lines.push(`     <BrutoPlaca>${fmt2(w.bruto)}</BrutoPlaca>`);
    lines.push(`     <KoristiIDrugiOporeziviPrihodi>${fmt2(w.koristi)}</KoristiIDrugiOporeziviPrihodi>`);
    lines.push(`     <UkupanPrihod>${fmt2(w.ukupanPrihod)}</UkupanPrihod>`);
    lines.push(`     <IznosPIO>${fmt2(w.pio)}</IznosPIO>`);
    lines.push(`     <IznosZO>${fmt2(w.zo)}</IznosZO>`);
    lines.push(`     <IznosNezaposlenost>${fmt2(w.nezap)}</IznosNezaposlenost>`);
    lines.push(`     <Doprinosi>${fmt2(w.doprinosi)}</Doprinosi>`);
    lines.push(`     <PrihodUmanjenZaDoprinose>${fmt2(w.prihodUmanjen)}</PrihodUmanjenZaDoprinose>`);
    lines.push(`     <FaktorLicnogOdbitka>${fmt3(w.faktor)}</FaktorLicnogOdbitka>`);
    lines.push(`     <IznosLicnogOdbitka>${fmt2(w.iznosOdbitka)}</IznosLicnogOdbitka>`);
    lines.push(`     <OsnovicaPoreza>${fmt2(w.osnovicaPoreza)}</OsnovicaPoreza>`);
    lines.push(`     <IznosPoreza>${fmt2(w.iznosPoreza)}</IznosPoreza>`);
    lines.push(`     <RadniSatiUT>${fmt2(w.radniSatiUT)}</RadniSatiUT>`);
    lines.push(`     <StepenUvecanja>${w.stepenUvecanja}</StepenUvecanja>`);
    lines.push(`     <SifraRadnogMjestaUT>${xmlEscape(w.sifraRadnogMjestaUT)}</SifraRadnogMjestaUT>`);
    lines.push(`     <DoprinosiPIOMIOzaUT>${fmt2(w.doprinosiPioMioZaUT)}</DoprinosiPIOMIOzaUT>`);
    lines.push(`     <BeneficiraniStaz>${w.beneficiraniStaz ? "true" : "false"}</BeneficiraniStaz>`);
    lines.push(`     <OpcinaPrebivalista>${xmlEscape(w.opcinaPrebivalista)}</OpcinaPrebivalista>`);
    lines.push(`    </PodaciOPrihodima>`);
  }

  lines.push(`   </Dio2>`);
  lines.push(`    <Dio3>`);
  lines.push(`     <PIO>${fmt2(data.zbirno.pio)}</PIO>`);
  lines.push(`     <ZO>${fmt2(data.zbirno.zo)}</ZO>`);
  lines.push(`     <OsiguranjeOdNezaposlenosti>${fmt2(data.zbirno.nezap)}</OsiguranjeOdNezaposlenosti>`);
  lines.push(`     <DodatniDoprinosiZO>${fmt2(data.zbirno.dodatniDoprinosiZo)}</DodatniDoprinosiZO>`);
  lines.push(`     <Prihod>${fmt2(data.zbirno.prihod)}</Prihod>`);
  lines.push(`     <Doprinosi>${fmt2(data.zbirno.doprinosi)}</Doprinosi>`);
  lines.push(`     <LicniOdbici>${fmt2(data.zbirno.licniOdbici)}</LicniOdbici>`);
  lines.push(`     <Porez>${fmt2(data.zbirno.porez)}</Porez>`);
  lines.push(`    </Dio3>`);
  lines.push(` <Dio4IzjavaPoslodavca>`);
  lines.push(`   <JibJmbPoslodavca>${xmlEscape(data.jibPoslodavca)}</JibJmbPoslodavca>`);
  lines.push(`   <DatumUnosa>${xmlEscape(data.datumPodnosenja)}</DatumUnosa>`);
  lines.push(`   <NazivPoslodavca>${xmlEscape(data.nazivPoslodavca)}</NazivPoslodavca>`);
  lines.push(` </Dio4IzjavaPoslodavca>`);
  lines.push(`   <Dokument>`);
  lines.push(`     <Operacija>Prijava_od_strane_poreznog_obveznika</Operacija>`);
  lines.push(`   </Dokument>`);
  lines.push(` </Obrazac1023>`);
  lines.push(`</PaketniUvozObrazaca>`);
  return lines.join("\n");
}
