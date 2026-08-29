// Testovi CSV uvoza radnika (dijeljeni modul radniciCsv.ts, bez importa):
// parser mora tolerisati Excel varijante (BOM, ";" i ",", navodnici, domaći
// iznosi i datumi), a validacije moraju hvatati podatke koji bi napravili
// neispravnog radnika. Uvoz samo dodaje nove radnike (dedup radi modal).
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
  "zaposlenici",
  "radniciCsv.ts",
);

let mod;
test.before(async () => {
  mod = await import(pathToFileURL(MOD_PATH).href);
});

test("šablon se parsira nazad bez grešaka (roundtrip, ='...' omotač se skida)", () => {
  const r = mod.parsirajRadnikeCsv(mod.sablonCsv());
  assert.equal(r.greskaFajla, null);
  assert.equal(r.redovi.length, 1);
  const red = r.redovi[0];
  assert.equal(red.greske.length, 0);
  assert.equal(red.podaci.ime, "Emir");
  assert.equal(red.podaci.prezime, "Emirović");
  // JMBG i račun su u šablonu kao ="..." (Excel tekst trik): parser skida
  // omotač i vodeća nula OSTAJE.
  assert.equal(red.podaci.jmbg, "0101990123456");
  assert.equal(red.podaci.ziroRacun, "3389001234567853");
  assert.equal(red.podaci.datumPrijave, "2026-09-01");
  assert.equal(red.podaci.netoPlata, 1030);
  assert.equal(red.podaci.koeficijent, 1);
  assert.equal(red.podaci.satiDnevno, 8);
});

test("Excel naučni zapis JMBG-a i računa je jasna greška, ne polomljen uvoz", () => {
  const csv = [
    "Ime*;Prezime*;JMBG;Žiro račun;Datum prijave*",
    "Emir;Emirović;1,0199E+11;3,389E+15;01.09.2026",
  ].join("\n");
  const r = mod.parsirajRadnikeCsv(csv);
  const red = r.redovi[0];
  assert.ok(red.greske.some((g) => g.includes("JMBG pretvorio u broj")));
  assert.ok(red.greske.some((g) => g.includes("žiro račun pretvorio u broj")));
});

test("parser CSV teksta: navodnici, escape, novi red u ćeliji, zarez separator", () => {
  const redovi = mod.parsirajCsvTekst(
    'a,"b, sa zarezom","c ""pod navodnicima""","više\nredova"\n1,2,3,4',
  );
  assert.deepEqual(redovi[0], [
    "a",
    "b, sa zarezom",
    'c "pod navodnicima"',
    "više\nredova",
  ]);
  assert.deepEqual(redovi[1], ["1", "2", "3", "4"]);
});

test("zaglavlje se prepoznaje bez dijakritike, zvjezdica i redoslijeda kolona", () => {
  const csv =
    "PREZIME;IME;DATUM PRIJAVE;ZIRO RACUN\nAmarović;Amar;1.9.2026.;338-900-12345678-53";
  const r = mod.parsirajRadnikeCsv(csv);
  assert.equal(r.greskaFajla, null);
  const p = r.redovi[0].podaci;
  assert.equal(p.ime, "Amar");
  assert.equal(p.prezime, "Amarović");
  assert.equal(p.datumPrijave, "2026-09-01");
  assert.equal(p.ziroRacun, "338-900-12345678-53");
});

test("fajl bez kolona Ime/Prezime se odbija sa porukom", () => {
  const r = mod.parsirajRadnikeCsv("Kolona1;Kolona2\na;b");
  assert.ok(r.greskaFajla?.includes("Ime i Prezime"));
});

test("validacije: obavezna polja, JMBG, datum, iznosi", () => {
  const csv = [
    "Ime*;Prezime*;JMBG;Datum prijave*;Neto plata;Sati dnevno",
    ";Amarović;123;32.13.2026;abc;9", // sve pogrešno
    "Amar;Amarović;0101990123456;01.09.2026;1.030,48;4", // sve ispravno
  ].join("\n");
  const r = mod.parsirajRadnikeCsv(csv);
  const los = r.redovi[0];
  assert.ok(los.greske.some((g) => g.includes("ime je obavezno")));
  assert.ok(los.greske.some((g) => g.includes("13 cifara")));
  assert.ok(los.greske.some((g) => g.includes("datum prijave")));
  assert.ok(los.greske.some((g) => g.includes("neto plata")));
  assert.ok(los.greske.some((g) => g.includes("1-8")));

  const dobar = r.redovi[1];
  assert.equal(dobar.greske.length, 0);
  assert.equal(dobar.podaci.netoPlata, 1030.48);
  assert.equal(dobar.podaci.satiDnevno, 4);
});

test("upozorenja ne blokiraju: bez grada, JMBG-a i plate red ostaje za uvoz", () => {
  const csv = "Ime*;Prezime*;Datum prijave*\nAmar;Amarović;01.09.2026";
  const r = mod.parsirajRadnikeCsv(csv);
  const red = r.redovi[0];
  assert.equal(red.greske.length, 0);
  assert.ok(red.upozorenja.some((u) => u.includes("grada")));
  assert.ok(red.upozorenja.some((u) => u.includes("JMBG")));
  assert.ok(red.upozorenja.some((u) => u.includes("plate")));
});

test("iznosi: domaći i strojni zapis, KM sufiks, nevažeći = NaN", () => {
  assert.equal(mod.parsirajIznos("1.030,48"), 1030.48);
  assert.equal(mod.parsirajIznos("1030,48"), 1030.48);
  assert.equal(mod.parsirajIznos("1030.48"), 1030.48);
  assert.equal(mod.parsirajIznos("1.030"), 1030);
  assert.equal(mod.parsirajIznos("1030 KM"), 1030);
  assert.equal(mod.parsirajIznos(""), null);
  assert.ok(Number.isNaN(mod.parsirajIznos("abc")));
});

test("iznosi u engleskom zapisu se NE čitaju kao sitniš", () => {
  // Regresija: "1,030.00" se ranije čitalo kao 1,03 KM plate, bez greške.
  assert.equal(mod.parsirajIznos("1,030.00"), 1030);
  assert.equal(mod.parsirajIznos("2,500.75"), 2500.75);
  assert.equal(mod.parsirajIznos("1,030"), 1030);
  // Domaći zapis ostaje netaknut (zarez kao decimala).
  assert.equal(mod.parsirajIznos("0,50"), 0.5);
  assert.equal(mod.parsirajIznos("1.030,48"), 1030.48);
});

test("navodnik usred ćelije ne guta naredne redove", () => {
  // Regresija: 'Radnik na 5" cijevima' je progutao ostatak fajla, pa je
  // sljedeći radnik nestajao bez ijedne poruke.
  const csv = [
    "Ime*;Prezime*;Datum prijave*;Radno mjesto",
    'Amar;Amarović;01.09.2026;Radnik na 5" cijevima',
    "Emir;Emirović;01.09.2026;Prodavač",
  ].join("\r\n");
  const r = mod.parsirajRadnikeCsv(csv);
  assert.equal(r.redovi.length, 2);
  assert.equal(r.redovi[1].podaci.ime, "Emir");
});

test("dvije kolone za isti podatak se odbijaju umjesto tihog gaženja", () => {
  const r = mod.parsirajRadnikeCsv(
    "Ime*;Prezime*;Datum prijave*;Neto plata;Neto\nA;B;01.09.2026;1030,00;",
  );
  assert.ok(r.greskaFajla?.includes("dvije kolone"));
});

test("broj reda prati fizički red u fajlu (prazni redovi se ne broje pogrešno)", () => {
  const r = mod.parsirajRadnikeCsv(
    "Ime*;Prezime*;Datum prijave*\r\n\r\nAmar;Amarović;01.09.2026",
  );
  assert.equal(r.redovi.length, 1);
  assert.equal(r.redovi[0].brojReda, 3);
});

test("žiro račun bez 16 cifara i sumnjivo mala plata daju upozorenje", () => {
  const r = mod.parsirajRadnikeCsv(
    "Ime*;Prezime*;Datum prijave*;Žiro račun;Neto plata\nA;B;01.09.2026;161-300-0099;1,03",
  );
  const u = r.redovi[0].upozorenja.join(" | ");
  assert.ok(u.includes("16 cifara"));
  assert.ok(u.includes("sumnjivo mala"));
  assert.equal(r.redovi[0].greske.length, 0);
});

test("datum van razumnog raspona je greška", () => {
  const r = mod.parsirajRadnikeCsv(
    "Ime*;Prezime*;Datum prijave*\nA;B;01.09.1899",
  );
  assert.ok(r.redovi[0].greske.some((g) => g.includes("razumnog raspona")));
});

test("datumi: DD.MM.GGGG, sa tačkom na kraju, ISO; nepostojeći datum pada", () => {
  assert.equal(mod.parsirajDatum("01.09.2026"), "2026-09-01");
  assert.equal(mod.parsirajDatum("1.9.2026."), "2026-09-01");
  assert.equal(mod.parsirajDatum("2026-09-01"), "2026-09-01");
  assert.equal(mod.parsirajDatum("31.02.2026"), null);
  assert.equal(mod.parsirajDatum("nema"), null);
});

test("izvještajni CSV neutralizuje formule u imenima (CSV injection)", () => {
  const csv = mod.napraviIzvjestajCsv(
    [
      {
        firstName: "=HYPERLINK(\"http://zlo\")",
        lastName: "Test",
        role: "RADNIK",
        position: null,
        jmbg: null,
        city: null,
        prijavaDate: null,
        odjavaDate: null,
      },
    ],
    () => "0,00",
    () => "u izradi",
  );
  // Ćelija mora početi apostrofom da je Excel ne izvrši kao formulu.
  assert.ok(csv.includes("'=HYPERLINK"));
});

test("izvještajni CSV: BOM, 9 kolona u zaglavlju I redovima (grad uključen)", () => {
  const csv = mod.napraviIzvjestajCsv(
    [
      {
        firstName: "Amar",
        lastName: "Amarović",
        role: "RADNIK",
        position: "Prodavač",
        jmbg: "0101990123456",
        city: "Sarajevo",
        prijavaDate: "2026-09-01",
        odjavaDate: null,
      },
    ],
    () => "1.030,00 KM neto",
    () => "prijavljen",
  );
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const linije = csv.slice(1).split("\r\n");
  assert.equal(linije[0].split(";").length, 9);
  const red = linije[1].split(";");
  assert.equal(red.length, 9);
  assert.equal(red[4], "Sarajevo"); // kolona Grad poravnata sa zaglavljem
  // Standard projekta: DD.MM.GGGG. sa tačkom na kraju.
  assert.equal(red[5], "01.09.2026.");
});
