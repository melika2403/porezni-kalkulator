// Testovi MF banka XML izvoza (24x7 iBank Web Banking). Očekivane vrijednosti
// i redoslijed tagova dolaze iz STVARNIH izvoza iz MF Web Bankinga
// ("PIO NALOG.xml" i "PLATA NALOG FX2004.xml", klijent, 01.09.2026.).
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  formatMfXml,
  MfGreska,
} = require("../src/services/paymentExport/mfXmlFormatter");

// dekodiraj UTF-16 LE buffer (skida BOM)
function dekodiraj(buf) {
  assert.equal(buf[0], 0xff, "BOM prvi bajt");
  assert.equal(buf[1], 0xfe, "BOM drugi bajt");
  return buf.subarray(2).toString("utf16le");
}

function vrijednost(xml, tag, od = 0) {
  const i = xml.indexOf(`<${tag}>`, od);
  if (i < 0) return null;
  const j = xml.indexOf(`</${tag}>`, i);
  return xml.slice(i + tag.length + 2, j);
}

const platilac = {
  racun: "5723760000071452",
  naziv: "MICHELIN UGOSTITELJSKA RADNJA CAFE BAR",
  adresa: "GNJILAVAC BB",
  mjesto: "CAZIN",
  mjestoSaPtt: "77220 CAZIN",
};

const pioNalog = {
  tip: "javniPrihod",
  racun: "102-050-00001066-98",
  naziv: "Budžet Federacije BiH",
  mjesto: "",
  svrha: "Doprinos za PIO",
  iznosFeninga: 31401,
  jib: "4363801360009",
  vrstaPrihoda: "712112",
  periodOd: new Date(2026, 6, 1),
  periodDo: new Date(2026, 6, 31),
  opcina: "019",
  budzetskaOrganizacija: "5102001",
  pozivNaBroj: "0000000007",
};

const plataNalog = {
  tip: "prenos",
  kategorija: "plata",
  racun: "5723760000257692",
  naziv: "REDŽO JONUZOVIĆ",
  mjesto: "Cazin",
  svrha: "NETO PLATA 07/26.",
  iznosFeninga: 103000,
  sifra1: "01",
  sifra2: "10",
  sifra3: "",
};

const file = (nalozi) => ({
  platilac,
  datumValute: new Date(2026, 8, 1),
  nalozi,
});

test("javni prihod: sva polja kao u stvarnom PIO izvozu iz MF bankinga", () => {
  const xml = dekodiraj(formatMfXml(file([pioNalog])));
  assert.ok(xml.startsWith("<pmtorderrq><pmtorder>"), "root bez deklaracije");
  assert.ok(!xml.includes("\n"), "sve u jednoj liniji");
  assert.equal(vrijednost(xml, "name"), platilac.naziv);
  assert.equal(vrijednost(xml, "city"), "GNJILAVAC BB, 77220 CAZIN");
  assert.equal(vrijednost(xml, "acctid"), "5723760000071452");
  assert.equal(vrijednost(xml, "bankname"), "MF banka a.d. Banja Luka");
  assert.ok(xml.includes("<acctid>1020500000106698</acctid>"), "račun primaoca bez crtica");
  assert.equal(vrijednost(xml, "trntype"), "ibank.payment.budgetary");
  assert.equal(vrijednost(xml, "trnamt"), "314.01");
  assert.equal(vrijednost(xml, "purpose"), "Doprinos za PIO");
  assert.equal(vrijednost(xml, "purposecode"), "999");
  assert.equal(vrijednost(xml, "curdef"), "BAM");
  assert.equal(vrijednost(xml, "payeerefnumber"), "0000000007");
  assert.equal(vrijednost(xml, "validationaccountid"), "1020500000106698");
  assert.equal(vrijednost(xml, "datefrom"), "2026-07-01T00:00:00");
  assert.equal(vrijednost(xml, "dateto"), "2026-07-31T00:00:00");
  assert.equal(vrijednost(xml, "county"), "019");
  assert.equal(vrijednost(xml, "paymentcode"), "0");
  assert.equal(vrijednost(xml, "budgetarybeneficiary"), "5102001");
  assert.equal(vrijednost(xml, "taxaccount"), "4363801360009");
  assert.equal(vrijednost(xml, "incomecode"), "712112");
  assert.equal(vrijednost(xml, "urgency"), "ACH", "prema drugoj banci ide kliring");
  assert.equal(vrijednost(xml, "dtdue"), "2026-09-01T00:00:00");
  assert.equal(vrijednost(xml, "channel"), "ibank.rc");
  assert.match(vrijednost(xml, "trnuid"), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

test("plata: pp3, šifra 43, INT unutar MF banke, prazan budgetary, diakritika", () => {
  const xml = dekodiraj(formatMfXml(file([plataNalog])));
  assert.equal(vrijednost(xml, "trntype"), "ibank.payment.pp3");
  assert.equal(vrijednost(xml, "purposecode"), "43");
  assert.equal(vrijednost(xml, "urgency"), "INT", "primalac u MF banci (572...)");
  assert.equal(vrijednost(xml, "trnamt"), "1030.00");
  assert.ok(xml.includes("REDŽO JONUZOVIĆ"), "UTF-16 čuva naša slova");
  // budgetary blok postoji ali sav prazan, kao u stvarnom plata izvozu
  assert.ok(xml.includes("<budgetary><validationaccountid /><validationaccountdescription /><datefrom /><dateto /><county /><paymentcode /><budgetarybeneficiary /><taxaccount /><incomecode /></budgetary>"));
  assert.ok(xml.includes("<payeerefnumber />"), "plata nema poziv na broj");
});

test("redoslijed tagova identičan MF izvozu", () => {
  const xml = dekodiraj(formatMfXml(file([plataNalog])));
  const tagovi = [...xml.matchAll(/<([a-z]+)[ >/]/g)].map((m) => m[1]);
  // redoslijed iz stvarnog "PLATA NALOG FX2004.xml"
  assert.deepEqual(tagovi, [
    "pmtorderrq", "pmtorder",
    "companyinfo", "name", "city",
    "accountinfo", "acctid", "bankid", "bankname",
    "payeecompanyinfo", "name", "city",
    "payeeaccountinfo", "acctid", "bankid", "bankname",
    "trntype", "trnuid", "dtdue", "trnamt", "purpose", "purposecode",
    "curdef", "refmodel", "refnumber", "payeerefmodel", "payeerefnumber",
    "budgetary", "validationaccountid", "validationaccountdescription",
    "datefrom", "dateto", "county", "paymentcode", "budgetarybeneficiary",
    "taxaccount", "incomecode",
    "urgency", "priority", "taxid", "fitid",
    "properties", "notification", "channel",
  ]);
});

test("više naloga u jednom fajlu (spec: maxoccurs unbounded)", () => {
  const xml = dekodiraj(formatMfXml(file([pioNalog, plataNalog])));
  assert.equal((xml.match(/<pmtorder>/g) || []).length, 2);
  assert.equal((xml.match(/<\/pmtorder>/g) || []).length, 2);
  assert.ok(xml.endsWith("</pmtorderrq>"));
  // svaki nalog ima svoj GUID
  const uids = [...xml.matchAll(/<trnuid>([^<]+)<\/trnuid>/g)].map((m) => m[1]);
  assert.equal(new Set(uids).size, 2);
});

test("XML escaping specijalnih znakova u nazivu i svrsi", () => {
  const xml = dekodiraj(
    formatMfXml(file([{ ...plataNalog, naziv: 'PERO & SINOVI <d.o.o.>', svrha: "Roba & usluge" }])),
  );
  assert.ok(xml.includes("PERO &amp; SINOVI &lt;d.o.o.&gt;"));
  assert.ok(xml.includes("Roba &amp; usluge"));
});

test("naziv primaoca se siječe na 50 znakova, kao u MF izvozu", () => {
  const dug = "FEDERALNO MINISTARSTVO FINANSIJA-DEPOZITNI RN- PRIKUPLJANJE JP";
  const xml = dekodiraj(formatMfXml(file([{ ...pioNalog, naziv: dug }])));
  assert.ok(xml.includes(`<name>${dug.slice(0, 50)}</name>`));
  // puni naziv ostaje u validationaccountdescription
  assert.equal(vrijednost(xml, "validationaccountdescription"), dug);
});

test("nalozi sa nulom se preskaču, prazan izvoz je greška", () => {
  const xml = dekodiraj(formatMfXml(file([{ ...plataNalog, iznosFeninga: 0 }, pioNalog])));
  assert.equal((xml.match(/<pmtorder>/g) || []).length, 1);
  assert.throws(() => formatMfXml(file([{ ...plataNalog, iznosFeninga: 0 }])), MfGreska);
});

test("validacije: račun platioca, račun primaoca, JIB za javne prihode", () => {
  assert.throws(
    () => formatMfXml({ platilac: { ...platilac, racun: "12345" }, datumValute: new Date(), nalozi: [plataNalog] }),
    /16 cifara/,
  );
  assert.throws(
    () => formatMfXml(file([{ ...plataNalog, racun: "999" }])),
    /nema 16 cifara/,
  );
  assert.throws(
    () => formatMfXml(file([{ ...pioNalog, jib: "" }])),
    /JIB/,
  );
});

test("javni prihod: prazna ili prekratka obavezna polja se ODBIJAJU", () => {
  // šifra općine (3), vrsta prihoda (6), budžetska organizacija (7),
  // poziv na broj (10) i porezni broj (13) su fiksne dužine
  assert.throws(
    () => formatMfXml(file([{ ...pioNalog, opcina: "" }])),
    /šifra općine \(nalog 1, Budžet Federacije BiH\) mora imati tačno 3 cifara/,
  );
  assert.throws(
    () => formatMfXml(file([{ ...pioNalog, opcina: "19" }])),
    /šifra općine .* mora imati tačno 3 cifara/,
  );
  assert.throws(
    () => formatMfXml(file([{ ...pioNalog, vrstaPrihoda: "" }])),
    /vrsta prihoda .* mora imati tačno 6 cifara/,
  );
  assert.throws(
    () => formatMfXml(file([{ ...pioNalog, budzetskaOrganizacija: "510200" }])),
    /budžetska organizacija .* mora imati tačno 7 cifara/,
  );
  assert.throws(
    () => formatMfXml(file([{ ...pioNalog, pozivNaBroj: "7" }])),
    /poziv na broj .* mora imati tačno 10 cifara/,
  );
  assert.throws(
    () => formatMfXml(file([{ ...pioNalog, jib: "436" }])),
    /porezni broj obveznika \(JIB\) .* mora imati tačno 13 cifara/,
  );
  // greška nosi redni broj naloga, ne samo prvi nalog u datoteci
  assert.throws(
    () => formatMfXml(file([plataNalog, { ...pioNalog, opcina: "" }])),
    /\(nalog 2, Budžet Federacije BiH\)/,
  );
  // prenos nema porezna polja, njih validacija ne dira
  assert.doesNotThrow(() => formatMfXml(file([plataNalog])));
});

test("izvoz je dozvoljen samo sa računa u MF banci (572)", () => {
  assert.throws(
    () =>
      formatMfXml({
        platilac: { ...platilac, racun: "1610000000000019" },
        datumValute: new Date(2026, 8, 1),
        nalozi: [plataNalog],
      }),
    /namijenjen računu u MF banci/,
  );
  assert.throws(
    () =>
      formatMfXml({
        platilac: { ...platilac, racun: "1610000000000019" },
        datumValute: new Date(2026, 8, 1),
        nalozi: [plataNalog],
      }),
    MfGreska,
  );
});

test("trnuid je deterministički: isti obračun daje iste identifikatore", () => {
  const uids = (nalozi) =>
    [...dekodiraj(formatMfXml(file(nalozi))).matchAll(/<trnuid>([^<]+)<\/trnuid>/g)].map(
      (m) => m[1],
    );
  const prvi = uids([pioNalog, plataNalog]);
  const drugi = uids([pioNalog, plataNalog]);
  assert.deepEqual(drugi, prvi, "ponovljeni izvoz mora dati iste trnuid");
  assert.equal(new Set(prvi).size, 2, "svaki nalog ima svoj trnuid");
  for (const u of prvi) {
    assert.match(u, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
  // izmijenjen iznos = drugi nalog = drugi identifikator
  const izmijenjen = uids([{ ...pioNalog, iznosFeninga: 31402 }, plataNalog]);
  assert.notEqual(izmijenjen[0], prvi[0]);
  assert.equal(izmijenjen[1], prvi[1], "netaknut nalog zadržava svoj trnuid");
});
