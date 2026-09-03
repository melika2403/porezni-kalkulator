// Testovi Klasifikacije zanimanja FBiH: kompletnost generisanih podataka
// (4.193 zanimanja, KZBiH-08) i logika pretrage koju dijele /sifre-zanimanja
// i ZanimanjeSelect. Frontend TS moduli se učitavaju kroz Node type-stripping.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const FRONT = path.join(__dirname, "..", "..", "frontend", "src");

let ZANIMANJA_FBIH;
let pretraga;
test.before(async () => {
  ({ ZANIMANJA_FBIH } = await import(
    pathToFileURL(path.join(FRONT, "data", "zanimanja-fbih.ts")).href
  ));
  pretraga = await import(
    pathToFileURL(path.join(FRONT, "lib", "zanimanjaSearch.ts")).href
  );
});

test("podaci: 4.193 zanimanja, jedinstvene sedmocifrene šifre bez tačke", () => {
  assert.equal(ZANIMANJA_FBIH.length, 4193);
  const sifre = new Set();
  for (const z of ZANIMANJA_FBIH) {
    assert.match(z.sifra, /^\d{7}$/, `šifra "${z.sifra}" nije 7 cifara`);
    assert.ok(!sifre.has(z.sifra), `dupla šifra ${z.sifra}`);
    sifre.add(z.sifra);
    assert.ok(z.naziv.trim().length > 0);
  }
});

test("podaci: nema ćiriličnih slova-dvojnika iz izvornog dokumenta", () => {
  for (const z of ZANIMANJA_FBIH) {
    assert.ok(
      !/[Ѐ-ӿ]/.test(z.naziv),
      `ćirilično slovo u: ${z.sifra} ${z.naziv}`,
    );
  }
});

test("podaci: poznata zanimanja iz zvaničnog spiska su prisutna", () => {
  const poSifri = new Map(ZANIMANJA_FBIH.map((z) => [z.sifra, z.naziv]));
  // Administrativni službenik 4110.001 (prvi red zvaničnog spiska)
  assert.equal(poSifri.get("4110001"), "Administrativni službenik");
  // red sa ćiriličnim dvojnicima u izvoru, mora biti očišćen
  assert.equal(
    poSifri.get("3344001"),
    "Administrativni pomoćnik u medicinskoj ordinaciji",
  );
  // zadnji red zvaničnog spiska
  assert.equal(poSifri.get("2636028"), "Župnik");
});

test("pretraga: po nazivu bez dijakritike, sa dijakritikom i po šifri", () => {
  const { filtrirajZanimanja } = pretraga;
  const advokat = filtrirajZanimanja(ZANIMANJA_FBIH, "advokat", 10);
  assert.ok(advokat.some((z) => z.naziv === "Advokat"));
  // bez dijakritike nalazi dijakritiku
  const zupnik = filtrirajZanimanja(ZANIMANJA_FBIH, "zupnik", 10);
  assert.ok(zupnik.some((z) => z.naziv === "Župnik"));
  // šifra sa i bez tačke
  for (const upit of ["4110001", "4110.001", "4110"]) {
    const r = filtrirajZanimanja(ZANIMANJA_FBIH, upit, 60);
    assert.ok(
      r.some((z) => z.sifra === "4110001"),
      `upit "${upit}" mora naći 4110001`,
    );
  }
});

test("pretraga: limit, prazan upit i Infinity", () => {
  const { filtrirajZanimanja } = pretraga;
  assert.equal(filtrirajZanimanja(ZANIMANJA_FBIH, "", 25).length, 25);
  assert.equal(filtrirajZanimanja(ZANIMANJA_FBIH, "a", 5).length, 5);
  const svi = filtrirajZanimanja(ZANIMANJA_FBIH, "4110", Infinity);
  assert.ok(svi.length >= 2 && svi.every((z) => z.sifra.startsWith("4110")));
});

test("zanimanjePoSifri: tačan pogodak, toleriše tačku, odbija pogrešne dužine", () => {
  const { zanimanjePoSifri } = pretraga;
  assert.equal(zanimanjePoSifri(ZANIMANJA_FBIH, "4110001")?.naziv, "Administrativni službenik");
  assert.equal(zanimanjePoSifri(ZANIMANJA_FBIH, "4110.001")?.naziv, "Administrativni službenik");
  assert.equal(zanimanjePoSifri(ZANIMANJA_FBIH, "411000"), null);
  assert.equal(zanimanjePoSifri(ZANIMANJA_FBIH, "9999999"), null);
});

test("sifraSaTackom: prikaz sa tačkom, kopija/unos ostaje bez tačke", () => {
  const { sifraSaTackom } = pretraga;
  assert.equal(sifraSaTackom("4110001"), "4110.001");
  assert.equal(sifraSaTackom("4110.001"), "4110.001");
  assert.equal(sifraSaTackom("411"), "411");
});

test("abecedne sekcije: Lj i Nj su zasebna slova, blokovi kontinuirani", () => {
  const { pocetnoSlovo } = pretraga;
  assert.equal(pocetnoSlovo("Ljekar"), "Lj");
  assert.equal(pocetnoSlovo("Njegovatelj djece"), "Nj");
  assert.equal(pocetnoSlovo("Lutkar"), "L");
  // grupisanje nad stvarnim podacima: svako slovo se javlja tacno jednom
  const slova = [];
  for (const z of ZANIMANJA_FBIH) {
    const s2 = pocetnoSlovo(z.naziv);
    if (slova[slova.length - 1] !== s2) slova.push(s2);
  }
  assert.equal(new Set(slova).size, slova.length, "slovo se ponavlja = blok nije kontinuiran");
  assert.ok(slova.includes("Lj") && slova.includes("Nj"));
  // broj po slovu se slaze sa zvanicnim spiskom (uz poznatu FZS gresku:
  // Ljevac keramickih proizvoda je u izvoru zaveden pod L, stvarno je Lj)
  const broj = (sl) => ZANIMANJA_FBIH.filter((z) => pocetnoSlovo(z.naziv) === sl).length;
  assert.equal(broj("L") + broj("Lj"), 45); // zvanicno L=35 + LJ=10
  assert.equal(broj("Lj"), 11);
  assert.equal(broj("N") + broj("Nj"), 74); // zvanicno N=74 (ukljucuje Nj)
  assert.equal(broj("Nj"), 5);
});
