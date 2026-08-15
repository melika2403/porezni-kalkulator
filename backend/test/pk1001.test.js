// Testovi pravila obrasca PK-1001 (koeficijenti ličnog odbitka).
// Modul je frontend TS bez importa; Node ga učitava kroz type-stripping.
// Pravila iz zvaničnog uputstva PUFBiH, vidi docs/pk1001-porezna-kartica.md
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
  "porezna-kartica",
  "pk1001Podaci.ts",
);

let mod;
test.before(async () => {
  mod = await import(pathToFileURL(MOD_PATH).href);
});

const clan = (o = {}) => ({ ...mod.prazanClan(), ...o });

test("koeficijenti po redoslijedu djeteta: 0,5 / 0,7 / 0,9", () => {
  assert.equal(mod.koefDjeteta(1), 0.5);
  assert.equal(mod.koefDjeteta(2), 0.7);
  assert.equal(mod.koefDjeteta(3), 0.9);
  assert.equal(mod.koefDjeteta(5), 0.9);
});

test("udio u izdržavanju dijeli koeficijent (50% na prvo dijete = 0,25)", () => {
  // primjer iz zvaničnog uputstva
  assert.equal(mod.koefSaUdjelom(0.5, 50), 0.25);
  assert.equal(mod.koefSaUdjelom(0.7, 30), 0.21);
  assert.equal(mod.koefSaUdjelom(0.9, 100), 0.9);
  // prazan udio se tretira kao 100%
  assert.equal(mod.koefSaUdjelom(0.5, null), 0.5);
});

test("prag od 300 KM: prihod veći od osnovnog odbitka isključuje člana", () => {
  assert.equal(mod.preciPrag(299.99), false);
  assert.equal(mod.preciPrag(300), false);
  assert.equal(mod.preciPrag(300.01), true);
  assert.equal(mod.preciPrag(null), false);
});

test("ukupan koeficijent: osnovni 1,0 + bračni drug + dvoje djece", () => {
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    bracniDrug: [clan({ imePrezime: "Supruga" })],
    djeca: [clan({ imePrezime: "Prvo" }), clan({ imePrezime: "Drugo" })],
  });
  assert.equal(r.zbirDodataka, 1.7); // 0,5 + 0,5 + 0,7
  assert.equal(r.ukupno, 2.7);
  assert.equal(r.odbitakKm, 810); // 2,7 x 300 KM
  assert.equal(r.upozorenja.length, 0);
});

test("član sa prihodom preko praga ne nosi koeficijent i daje upozorenje", () => {
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    bracniDrug: [clan({ imePrezime: "Supruga", vlastitiPrihod: "450,00" })],
    djeca: [clan({ imePrezime: "Dijete" })],
  });
  assert.equal(r.bracniDrug[0].koeficijent, 0);
  assert.equal(r.ukupno, 1.5); // samo osnovni + prvo dijete
  assert.equal(r.upozorenja.length, 1);
  assert.match(r.upozorenja[0], /Supruga/);
  assert.match(r.upozorenja[0], /300 KM/);
});

test("djeca u omjeru 50/50 između roditelja", () => {
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    djeca: [
      clan({ imePrezime: "Prvo", udioPosto: "50" }),
      clan({ imePrezime: "Drugo", udioPosto: "50" }),
    ],
  });
  assert.equal(r.djeca[0].koeficijent, 0.25);
  assert.equal(r.djeca[1].koeficijent, 0.35);
  assert.equal(r.ukupno, 1.6);
});

test("ostali članovi 0,3, invalidnost 0,3, alimentacija po redoslijedu", () => {
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    ostali: [clan({ imePrezime: "Majka", srodstvo: "majka" })],
    invalidnosti: [clan({ imePrezime: "Obveznik" })],
    alimentacije: [
      clan({ imePrezime: "Bivša supruga", iznosAlimentacije: "200", vrsta: "SUPRUZNIK" }),
      clan({ imePrezime: "Dijete iz braka", iznosAlimentacije: "150", vrsta: "DIJETE" }),
    ],
  });
  assert.equal(r.ostali[0].koeficijent, 0.3);
  assert.equal(r.invalidnosti[0].koeficijent, 0.3);
  // bivši supružnik nosi 0,5 i NE troši mjesto prvog djeteta
  assert.equal(r.alimentacije[0].koeficijent, 0.5);
  assert.equal(r.alimentacije[1].koeficijent, 0.5);
  assert.equal(r.ukupno, 2.6); // 1,0 + 0,3 + 0,3 + 0,5 + 0,5
});

test("alimentacija se ne provjerava na prag vlastitog prihoda", () => {
  // u Dijelu 6 se upisuje iznos alimentacije, ne prihod primaoca
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    alimentacije: [clan({ imePrezime: "Dijete", iznosAlimentacije: "500" })],
  });
  assert.equal(r.alimentacije[0].koeficijent, 0.5);
  assert.equal(r.upozorenja.length, 0);
});

// ── Regresije iz reviewa 15.08.2026 ────────────────────────────────────────

test("Dio 6: bivši supružnik ne troši redno mjesto prvog djeteta", () => {
  // Uputstvo: 0,5 za bivšeg supružnika I za prvo dijete, 0,7 za drugo.
  // Ranije je supružnik bio "prvi red" pa su djeca dizana za jedan stepen
  // (0,7 i 0,9), što je davalo 120 KM previše mjesečnog ličnog odbitka.
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    alimentacije: [
      clan({ imePrezime: "Bivša supruga", vrsta: "SUPRUZNIK" }),
      clan({ imePrezime: "Prvo dijete", vrsta: "DIJETE" }),
      clan({ imePrezime: "Drugo dijete", vrsta: "DIJETE" }),
    ],
  });
  assert.deepEqual(
    r.alimentacije.map((x) => x.koeficijent),
    [0.5, 0.5, 0.7],
  );
  assert.equal(r.ukupno, 2.7); // 1,0 + 0,5 + 0,5 + 0,7
});

test("Dio 4: dijete preko praga ne troši redno mjesto ostaloj djeci", () => {
  // Dijete sa prihodom preko 300 KM se NE unosi u zahtjev, pa sljedeće
  // dijete i dalje mora biti "prvo" (0,5), a ne "drugo" (0,7).
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    djeca: [
      clan({ imePrezime: "Zaposleno dijete", vlastitiPrihod: "800,00" }),
      clan({ imePrezime: "Prvo pravo dijete" }),
      clan({ imePrezime: "Drugo pravo dijete" }),
    ],
  });
  assert.equal(r.djeca[0].koeficijent, 0);
  assert.equal(r.djeca[0].uObrascu, false);
  assert.equal(r.djeca[1].koeficijent, 0.5);
  assert.equal(r.djeca[2].koeficijent, 0.7);
  assert.equal(r.ukupno, 2.2); // 1,0 + 0,5 + 0,7
});

test("član preko praga ne ide na obrazac (uObrascu false)", () => {
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    bracniDrug: [clan({ imePrezime: "Supruga", vlastitiPrihod: "450" })],
    ostali: [clan({ imePrezime: "Majka", vlastitiPrihod: "100" })],
  });
  assert.equal(r.bracniDrug[0].uObrascu, false);
  assert.equal(r.ostali[0].uObrascu, true);
});

test("zbir odštampanih koeficijenata daje tačno ukupan koeficijent", () => {
  // Koeficijenti se zaokružuju na dvije decimale (toliko se i štampa), pa
  // zbir redova mora dati broj iz Dijela 8 bez ostatka.
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    djeca: [
      clan({ imePrezime: "Prvo", udioPosto: "33" }),
      clan({ imePrezime: "Drugo", udioPosto: "33" }),
      clan({ imePrezime: "Treće", udioPosto: "33" }),
    ],
  });
  const redovi = [...r.djeca].filter((x) => x.uObrascu);
  const zbir = redovi.reduce((s, x) => s + x.koeficijent, 0);
  assert.equal(Math.round(zbir * 100) / 100, r.zbirDodataka);
  assert.equal(Math.round((1 + zbir) * 100) / 100, r.ukupno);
});

test("iznos sa decimalnom tačkom se ne tumači kao hiljade", () => {
  // "250.50" je prekopiran iz izvoda; ranije je postajao 25050 KM pa je
  // član pogrešno padao preko praga od 300 KM.
  assert.equal(mod.parsirajIznos("250.50"), 250.5);
  assert.equal(mod.parsirajIznos("250,50"), 250.5);
  assert.equal(mod.parsirajIznos("1.234,56"), 1234.56);
  assert.equal(mod.parsirajIznos("1.234"), 1234);
  assert.equal(mod.parsirajIznos("300"), 300);
  assert.equal(mod.parsirajIznos(""), null);
  const r = mod.izracunaj({
    ...mod.prazniPodaci(),
    djeca: [clan({ imePrezime: "Dijete", vlastitiPrihod: "250.50" })],
  });
  assert.equal(r.djeca[0].koeficijent, 0.5, "dijete sa 250,50 KM ostaje izdržavano");
  assert.equal(r.upozorenja.length, 0);
});

test("normalizacija: strani ili nepotpuni podaci ne ruše obrazac", () => {
  const p = mod.normalizujPodatke({ djeca: [{ imePrezime: "X" }], smece: 1 });
  assert.equal(p.djeca.length, 1);
  assert.equal(p.djeca[0].jmb, "");
  assert.equal(p.bracniDrug.length, 0);
  assert.equal(p.imeRoditelja, "");
  // višak redova preko kapaciteta obrasca se odsijeca
  const puno = mod.normalizujPodatke({
    djeca: Array.from({ length: 9 }, () => ({ imePrezime: "D" })),
  });
  assert.equal(puno.djeca.length, mod.MAX_REDOVA.djeca);
  // null i neispravan ulaz daju prazan obrazac
  assert.deepEqual(mod.normalizujPodatke(null).djeca, []);
});

test("podjela broja na cijeli dio i decimale (zarez je pred-štampan)", () => {
  assert.deepEqual(mod.podijeliBroj(0.5, 2), { cijeli: "0", decimale: "50" });
  assert.deepEqual(mod.podijeliBroj(1234.5, 2), { cijeli: "1234", decimale: "50" });
  assert.deepEqual(mod.podijeliBroj(null, 2), { cijeli: "", decimale: "" });
});

test("desno poravnanje: broj sjeda uz pred-štampani zarez", () => {
  // "100" u polju od 4 kućice bez ovoga izgleda kao 1000
  assert.equal(mod.desnoPoravnaj("100", 4), " 100");
  assert.equal(mod.desnoPoravnaj("50", 3), " 50");
  // tačna dužina i duže vrijednosti se ne diraju
  assert.equal(mod.desnoPoravnaj("100", 3), "100");
  assert.equal(mod.desnoPoravnaj("1234", 3), "1234");
  assert.equal(mod.desnoPoravnaj("", 4), "");
});

test("datum rođenja iz JMBG-a", () => {
  assert.deepEqual(mod.datumRodjenjaIzJmbg("0105975123456"), {
    dan: "01",
    mjesec: "05",
    godina: "1975",
  });
  // 2000-te: treća grupa počinje nulom
  assert.deepEqual(mod.datumRodjenjaIzJmbg("1503005123456"), {
    dan: "15",
    mjesec: "03",
    godina: "2005",
  });
  assert.equal(mod.datumRodjenjaIzJmbg("123"), null);
  assert.equal(mod.datumRodjenjaIzJmbg("9999975123456"), null);
});
