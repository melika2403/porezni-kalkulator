// Golden testovi spiskova primanja za banke: svaki profil mora replicirati
// STVARNU tabelu te banke (fajlovi klijenta, pročitani 30.08.2026, vidi
// docs/plan-obustave-rekapitulacija-banke.md). Zaglavlja i raspored se NE
// smiju mijenjati bez novog stvarnog primjera od banke.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const MOD_PATH = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "src",
  "sections",
  "prijave-radnika",
  "spisakBanke.ts",
);

let mod;
test.before(async () => {
  mod = await import(pathToFileURL(MOD_PATH).href);
});

const radnik = (o = {}) => ({
  ime: "Amar Amarović",
  imeSamo: "Amar",
  prezime: "Amarović",
  racun: "338-900-12345678-53",
  jmbg: "0101990123456",
  netoZaIsplatu: 1030.48,
  obrok: 170,
  prevoz: 0,
  regres: 0,
  ...o,
});

const ulaz = (radnici, o = {}) => ({
  jib: "4201509550000",
  nazivFirme: "TEST FIRMA DOO",
  year: 2026,
  month: 7,
  radnici,
  ...o,
});

test("UniCredit: zaglavlja i svrhe tačno kao u stvarnom spisku klijenta", () => {
  const t = mod.tabelaUniCredit(ulaz([radnik({ prevoz: 53 })]));
  // Zaglavlje red 1: kolone iz stvarnog fajla, doslovno.
  assert.deepEqual(t.redovi[0], [
    "JIB pravne osobe isplatitelja plaća",
    "Ime i prezime zaposlenika:",
    "Broj računa zaposlenika:",
    "Iznos u KM:",
    "Svrha doznake:",
    "Vrsta uplate:",
  ]);
  // ODVOJENI redovi po vrsti isplate, svrhe iz stvarnog fajla.
  assert.equal(t.redovi.length, 4); // header + plata + obrok + prevoz
  assert.deepEqual(t.redovi[1], [
    "4201509550000",
    "Amar Amarović",
    "3389001234567853",
    1030.48,
    "Plaća za 07/2026",
    "Redovno",
  ]);
  assert.equal(t.redovi[2][4], "Topli obrok za 07/2026");
  assert.equal(t.redovi[3][4], "Prijevoz za 07/2026");
  assert.deepEqual(t.boldRedovi, [0]);
});

test("Raiffeisen: odvojene kolone IME/PREZIME, račun 16 cifara, TOTAL red", () => {
  const t = mod.tabelaRaiffeisen(
    ulaz([
      radnik({
        ime: "Medžida Durić",
        imeSamo: "Medžida",
        prezime: "Durić",
        racun: "161-300-00994596-84",
        netoZaIsplatu: 1030.48,
        obrok: 170,
      }),
    ], { year: 2026, month: 3 }),
  );
  assert.deepEqual(t.redovi[0], [
    "JIB PRAVNOG LICA / NALOGODAVCA",
    "IME UPOSLENIKA",
    "PREZIME UPOSLENIKA",
    "RAČUN UPOSLENIKA",
    "IZNOS UPLATE",
    "SVRHA UPLATE",
  ]);
  // Red plate: velika slova, račun bez crtica, svrha kao u stvarnoj tabeli.
  assert.deepEqual(t.redovi[1], [
    "4201509550000",
    "MEDŽIDA",
    "DURIĆ",
    "1613000099459684",
    1030.48,
    "NETO PLATA 03/26.",
  ]);
  assert.equal(t.redovi[2][5], "TOPLI OBROK 03/26.");
  // Završni red TOTAL sa zbirom svih uplata.
  const total = t.redovi[t.redovi.length - 1];
  assert.equal(total[3], "TOTAL :");
  assert.equal(total[4], 1200.48);
  assert.ok(t.boldRedovi.includes(t.redovi.length - 1));
});

test("Intesa: raspored iz stvarnog fajla, JEDAN zbirni iznos po radniku", () => {
  const t = mod.tabelaIntesa(
    ulaz([
      radnik({
        ime: "Edita Mizdrak",
        racun: "154-116-99527053-31",
        jmbg: "0101990123456",
        netoZaIsplatu: 900,
        obrok: 170,
        prevoz: 53,
      }),
      radnik({
        ime: "Advija Kaltak",
        racun: "154-116-99239205-81",
        jmbg: "",
        netoZaIsplatu: 800,
        obrok: 170,
        prevoz: 0,
      }),
    ]),
  );
  // Red 2 naziv firme, red 4 svrha, red 6 zaglavlja (1-bazirano).
  assert.equal(t.redovi[1][0], "TEST FIRMA DOO");
  assert.equal(t.redovi[3][0], "UPLATA plate, toplog obroka i prevoza 07/26");
  assert.deepEqual(t.redovi[5], [
    "PREZIME I IME:",
    "PRAZNO",
    "IZNOS:",
    "JMBG:",
    "RAČUN",
  ]);
  // Radnici: veliko slovo, ZBIRNI iznos, JMBG i račun (16 cifara).
  assert.deepEqual(t.redovi[6], [
    "EDITA MIZDRAK",
    null,
    1123,
    "0101990123456",
    "1541169952705331",
  ]);
  // Bez JMBG-a: prazna ćelija, red se NE ispušta.
  assert.equal(t.redovi[7][0], "ADVIJA KALTAK");
  assert.equal(t.redovi[7][3], null);
  assert.equal(t.redovi[7][2], 970);
  // Dno: UKUPNO sa zbirom.
  const ukupno = t.redovi[t.redovi.length - 1];
  assert.equal(ukupno[1], "UKUPNO:");
  assert.equal(ukupno[2], 2093);
});

test("Intesa svrha nabraja samo vrste koje postoje u mjesecu", () => {
  const samoPlata = mod.tabelaIntesa(
    ulaz([radnik({ obrok: 0, prevoz: 0, regres: 0 })]),
  );
  assert.equal(samoPlata.redovi[3][0], "UPLATA plate 07/26");
  const saRegresom = mod.tabelaIntesa(
    ulaz([radnik({ obrok: 170, prevoz: 0, regres: 500 })]),
  );
  assert.equal(
    saRegresom.redovi[3][0],
    "UPLATA plate, toplog obroka i regresa 07/26",
  );
});

test("plata 0 (obustave pojele neto) ne pravi red plate, dodaci ostaju", () => {
  const t = mod.tabelaUniCredit(
    ulaz([radnik({ netoZaIsplatu: 0, obrok: 170, prevoz: 0 })]),
  );
  assert.equal(t.redovi.length, 2); // header + samo topli obrok
  assert.equal(t.redovi[1][4], "Topli obrok za 07/2026");
});

test("tabelaZaProfil vodi na TAČAN raspored (zamjena grana bi bila tiha)", () => {
  const u = ulaz([radnik()]);
  // Aplikacija zove isključivo tabelaZaProfil; bez ovog testa bi zamjena
  // Raiffeisen i Intesa grane prošla zeleno, a klijent bi dobio tuđi format.
  assert.equal(
    mod.tabelaZaProfil("unicredit", u).redovi[0][0],
    "JIB pravne osobe isplatitelja plaća",
  );
  assert.equal(
    mod.tabelaZaProfil("raiffeisen", u).redovi[0][0],
    "JIB PRAVNOG LICA / NALOGODAVCA",
  );
  assert.equal(mod.tabelaZaProfil("intesa", u).redovi[5][0], "PREZIME I IME:");
});

test("prefiksi banaka odgovaraju šifarniku (338/161/154)", () => {
  // Zamjena dva prefiksa bi radnike jedne banke ubacila u fajl druge.
  const poKljucu = Object.fromEntries(
    mod.SPISAK_PROFILI.map((p) => [p.kljuc, p.prefix]),
  );
  assert.equal(poKljucu.unicredit, "338");
  assert.equal(poKljucu.raiffeisen, "161");
  assert.equal(poKljucu.intesa, "154");
});

test("sheetXml: inline stringovi sa XML escape-om, brojevi kao brojevi", () => {
  const xml = mod.sheetXml({
    redovi: [
      ["A & <B>", 12.5, null],
      ["red", 7, null],
    ],
    boldRedovi: [0],
    sirineKolona: [10, 10, 10],
  });
  assert.ok(xml.includes("A &amp; &lt;B&gt;"));
  // Iznosi nose stil sa formatom #,##0.00: s=3 u bold redu, s=2 u običnom
  // (prikaz "1.030,48" kao u stvarnoj Raiffeisen tabeli).
  assert.ok(xml.includes('<c r="B1" s="3"><v>12.5</v></c>'));
  assert.ok(xml.includes('<c r="B2" s="2"><v>7</v></c>'));
  // null ćelija se ne emituje.
  assert.ok(!xml.includes('r="C1"'));
});

test("styles.xml definiše brojčani format #,##0.00 za iznose", () => {
  const dijelovi = mod.xlsxDijelovi(mod.tabelaUniCredit(ulaz([radnik()])));
  const styles = dijelovi["xl/styles.xml"];
  assert.ok(styles.includes('formatCode="#,##0.00"'));
  assert.ok(styles.includes('numFmtId="164" applyNumberFormat="1"'));
});

test("xlsxDijelovi sadrži sve obavezne dijelove validnog xlsx-a", () => {
  const dijelovi = mod.xlsxDijelovi(mod.tabelaUniCredit(ulaz([radnik()])));
  for (const putanja of [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/worksheets/sheet1.xml",
  ]) {
    assert.ok(dijelovi[putanja], `nedostaje ${putanja}`);
  }
  assert.ok(dijelovi["xl/worksheets/sheet1.xml"].includes("Plaća za 07/2026"));
});
