// Popunjava zvanični UINO obrazac D PDV (.xls) na nivou bajtova, pa izgled
// fajla (ivice, visine redova, formule) ostaje identičan originalu.
//
// Predložak public/templates/dpdv.xls je original sa uino.gov.ba u koji su
// kroz pravi Excel jednokratno upisane placeholder vrijednosti fiksnih
// dužina: stringovi "Ć<TAG>~~~..." i jedinstveni magic brojevi. Ovdje se ti
// bajtovi samo prepišu stvarnim vrijednostima na unaprijed izračunatim
// offsetima (uključujući keširane rezultate formula na mašinskom sheetu
// "Polja iz obrasca" koji UINO čita). Prije svakog upisa provjerava se da
// na offsetu zaista stoji placeholder, pa neusklađen predložak ne može
// proizvesti pokvaren fajl. Offseti se generišu skriptom uz predložak i
// važe isključivo za taj tačan fajl.

export type DpdvExportData = {
  naziv: string;
  /** PDV (identifikacioni) broj, 12 cifara */
  pdvBroj: string;
  adresa: string;
  telefon: string;
  mjesto: string;
  /** polje 6. Djelatnost: naziv riječima */
  djelatnostNaziv: string;
  /** polje 7. Pretežna djelatnost: šifra */
  preteznaDjelatnost: string;
  odgovornoLice: string;
  month: number;
  year: number;
  /** ključ stavke forme (iz1_bez, ul3_pdv, zalihe_bez...) → iznos u KM */
  fields: Record<string, number>;
};

const MAGIC_BASE = 987654301.234567;

// Numerički slotovi: id0-id11 = kućice ID broja (F5-Q5), od0-od7 i do0-do7 =
// kućice datuma perioda (redovi 7 i 8, dan/mjesec/godina kao u programu
// korisnika), ostalo = iznosi stavki (prazno = 0, kao zvanična praksa).
// Iznosi imaju dva offseta: ćelija na obrascu + keš formule na ws2.
const NUM_SLOTS: { key: string; i: number; offs: number[] }[] = [
  { key: "id0", i: 0, offs: [37764] },
  { key: "id1", i: 1, offs: [37782] },
  { key: "id2", i: 2, offs: [37800] },
  { key: "id3", i: 3, offs: [37818] },
  { key: "id4", i: 4, offs: [37836] },
  { key: "id5", i: 5, offs: [37854] },
  { key: "id6", i: 6, offs: [37872] },
  { key: "id7", i: 7, offs: [37890] },
  { key: "id8", i: 8, offs: [37908] },
  { key: "id9", i: 9, offs: [37926] },
  { key: "id10", i: 10, offs: [37944] },
  { key: "id11", i: 11, offs: [37962] },
  { key: "od0", i: 12, offs: [38134] },
  { key: "od1", i: 13, offs: [38152] },
  { key: "od2", i: 14, offs: [38170] },
  { key: "od3", i: 15, offs: [38188] },
  { key: "od4", i: 16, offs: [38206] },
  { key: "od5", i: 17, offs: [38224] },
  { key: "od6", i: 18, offs: [38242] },
  { key: "od7", i: 19, offs: [38260] },
  { key: "do0", i: 20, offs: [38352] },
  { key: "do1", i: 21, offs: [38370] },
  { key: "do2", i: 22, offs: [38388] },
  { key: "do3", i: 23, offs: [38406] },
  { key: "do4", i: 24, offs: [38424] },
  { key: "do5", i: 25, offs: [38442] },
  { key: "do6", i: 26, offs: [38460] },
  { key: "do7", i: 27, offs: [38478] },
  { key: "iz1_bez", i: 28, offs: [38864, 48138] },
  { key: "iz2_bez", i: 29, offs: [38980, 48171] },
  { key: "iz3_bez", i: 30, offs: [39096, 48204] },
  { key: "iz4_bez", i: 31, offs: [39212, 48237] },
  { key: "iz5_bez", i: 32, offs: [39328, 48270] },
  { key: "iz6_bez", i: 33, offs: [39444, 48303] },
  { key: "iz6_pdv", i: 34, offs: [39482, 48336] },
  { key: "iz7_pdv", i: 35, offs: [39634, 48369] },
  { key: "iz8_bez", i: 36, offs: [39716, 48402] },
  { key: "iz8_pdv", i: 37, offs: [39754, 48435] },
  { key: "iz9_bez", i: 38, offs: [39836, 48468] },
  { key: "iz9_pdv", i: 39, offs: [39874, 48501] },
  { key: "iz10_pdv", i: 40, offs: [40012, 48534] },
  { key: "ul1_bez", i: 41, offs: [40306, 48567] },
  { key: "ul2_bez", i: 42, offs: [40448, 48600] },
  { key: "ul2_pdv", i: 43, offs: [40486, 48633] },
  { key: "ul3_bez", i: 44, offs: [40594, 48666] },
  { key: "ul3_pdv", i: 45, offs: [40632, 48699] },
  { key: "ul4_bez", i: 46, offs: [40740, 48732] },
  { key: "ul4_pdv", i: 47, offs: [40778, 48765] },
  { key: "ul5_bez", i: 48, offs: [40886, 48798] },
  { key: "ul5_pdv", i: 49, offs: [40924, 48831] },
  { key: "ul6_bez", i: 50, offs: [41032, 48864] },
  { key: "ul6_pdv", i: 51, offs: [41070, 48897] },
  { key: "ul7_pdv", i: 52, offs: [41208, 48930] },
  { key: "ul8_bez", i: 53, offs: [41588, 48963] },
  { key: "ul8_pdv", i: 54, offs: [41626, 48996] },
  { key: "ul9_pdv", i: 55, offs: [41768, 49029] },
  { key: "zalihe_bez", i: 56, offs: [42018, 49062] },
];

// String slotovi: vrijednost se piše UTF-16LE, dopunjena razmacima do fiksne
// dužine placeholder-a. Dva offseta = SST unos + keš formule na ws2.
const STR_SLOTS: { key: string; tag: string; len: number; offs: number[] }[] = [
  { key: "naziv", tag: "NAZIV", len: 80, offs: [26924, 47068] },
  { key: "adresa", tag: "ADRESA", len: 60, offs: [27087, 47282] },
  { key: "telefon", tag: "TELEFON", len: 30, offs: [27210, 47442] },
  { key: "djelatnost", tag: "DJELATNOST", len: 60, offs: [27273, 47570] },
  { key: "pretezna", tag: "PRETEZNA", len: 40, offs: [27396, 47730] },
  { key: "mjesto", tag: "MJESTO", len: 30, offs: [27479, 47884] },
  { key: "datum", tag: "DATUM", len: 11, offs: [27542, 47985] },
  { key: "odgovorno", tag: "ODGOVORNO", len: 40, offs: [27567, 48048] },
  { key: "s2_id", tag: "IDB", len: 12, offs: [27650] },
  { key: "s2_per", tag: "PER", len: 4, offs: [27677] },
  { key: "s2_datdo", tag: "DATDO", len: 8, offs: [27688] },
];

function placeholder(tag: string, len: number): string {
  return ("Ć" + tag).padEnd(len, "~");
}

function writeUtf16(view: DataView, off: number, s: string) {
  for (let i = 0; i < s.length; i++) {
    view.setUint16(off + i * 2, s.charCodeAt(i), true);
  }
}

function checkUtf16(view: DataView, off: number, s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (view.getUint16(off + i * 2, true) !== s.charCodeAt(i)) return false;
  }
  return true;
}

export function buildDpdvXlsBytes(
  data: DpdvExportData,
  templateBytes: ArrayBuffer,
): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(templateBytes.slice(0));
  const view = new DataView(bytes.buffer);

  const idDigits = data.pdvBroj.replace(/\D/g, "").slice(0, 12).padEnd(12, "0");
  const mm = String(data.month).padStart(2, "0");
  const yyyy = String(data.year);
  const lastDay = String(new Date(data.year, data.month, 0).getDate()).padStart(2, "0");
  const now = new Date();
  const datum = `${String(now.getDate()).padStart(2, "0")}.${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}.${now.getFullYear()}.`;

  const numValues: Record<string, number> = {};
  for (let i = 0; i < 12; i++) numValues[`id${i}`] = Number(idDigits[i]);
  const odDigits = `01${mm}${yyyy}`;
  const doDigits = `${lastDay}${mm}${yyyy}`;
  for (let i = 0; i < 8; i++) {
    numValues[`od${i}`] = Number(odDigits[i]);
    numValues[`do${i}`] = Number(doDigits[i]);
  }

  const strValues: Record<string, string> = {
    naziv: data.naziv,
    adresa: data.adresa,
    telefon: data.telefon,
    djelatnost: data.djelatnostNaziv,
    pretezna: data.preteznaDjelatnost,
    mjesto: data.mjesto,
    datum,
    odgovorno: data.odgovornoLice,
    s2_id: idDigits,
    s2_per: yyyy.slice(2) + mm,
    s2_datdo: doDigits,
  };

  for (const slot of NUM_SLOTS) {
    const magic = MAGIC_BASE + slot.i;
    const raw = slot.key in numValues ? numValues[slot.key] : data.fields[slot.key];
    const value = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    for (const off of slot.offs) {
      if (view.getFloat64(off, true) !== magic) {
        throw new Error(`Predložak D PDV nije usklađen (slot ${slot.key})`);
      }
      view.setFloat64(off, value, true);
    }
  }

  for (const slot of STR_SLOTS) {
    const ph = placeholder(slot.tag, slot.len);
    const value = (strValues[slot.key] ?? "").slice(0, slot.len).padEnd(slot.len, " ");
    for (const off of slot.offs) {
      if (!checkUtf16(view, off, ph)) {
        throw new Error(`Predložak D PDV nije usklađen (slot ${slot.key})`);
      }
      writeUtf16(view, off, value);
    }
  }

  return bytes;
}

/** Preuzima popunjen obrazac D PDV kao .xls fajl (u browseru). */
export async function downloadDpdvXls(data: DpdvExportData) {
  const res = await fetch("/templates/dpdv.xls");
  if (!res.ok) throw new Error("Predložak obrasca D PDV nije dostupan");
  const out = buildDpdvXlsBytes(data, await res.arrayBuffer());
  const blob = new Blob([out], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // ime fajla kao u korisnikovom programu; bez znakova nedozvoljenih u imenu
  const org = data.naziv.replace(/[\\/:*?"<>|]/g, "").trim() || "obrt";
  a.download = `D PDV_ dodatak uz prijavu_${org}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
