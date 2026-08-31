// Testovi za živi šifarnik uplatnih računa (racuniService) i njegove
// potrošače: validacija mod 97, seed kompletnost, fallback bez baze,
// primjena stanja iz baze (izmjena odmah važi) i prepoznavanje starih
// brojeva u uvozu izvoda.
const test = require("node:test");
const assert = require("node:assert/strict");

const svc = require("../src/services/racuniService");
const { buildDefaults } = require("../src/utils/payrollUplatnice");
const { lookupJavniPrihod } = require("../src/services/bankStatements/javniPrihodi");

// Poslije svakog testa vrati keš na čisto seed stanje da testovi ne cure.
test.afterEach(() => {
  svc.primijeniRedove([], []);
});

test("mod 97: svih 38 seed računa prolazi validaciju", () => {
  assert.equal(svc.SEED_DEFS.length, 38);
  for (const d of svc.SEED_DEFS) {
    assert.equal(svc.validirajRacun(d.racun), null, `${d.kljuc}: ${d.racun}`);
  }
});

test("mod 97: izmijenjena cifra i pogrešna dužina se odbijaju", () => {
  const dobar = "1549212026373354"; // SBK služba za zapošljavanje
  assert.equal(svc.validirajRacun(dobar), null);
  // promijeni jednu cifru → kontrola pada
  const los = dobar.slice(0, 15) + (dobar[15] === "4" ? "5" : "4");
  assert.match(svc.validirajRacun(los) || "", /modulo 97/);
  assert.match(svc.validirajRacun("12345") || "", /16 cifara/);
  assert.match(svc.validirajRacun("") || "", /16 cifara/);
  // crtice i razmaci se tolerišu u unosu
  assert.equal(svc.validirajRacun("154-921-20263733-54"), null);
});

test("seed: struktura slotova (30 kantonalnih + 5 federalnih + RS + 2 komore)", () => {
  const poGrupi = {};
  const kljucevi = new Set();
  for (const d of svc.SEED_DEFS) {
    poGrupi[d.grupa] = (poGrupi[d.grupa] || 0) + 1;
    assert.ok(!kljucevi.has(d.kljuc), `dupli ključ ${d.kljuc}`);
    kljucevi.add(d.kljuc);
    assert.ok(d.korisnik.length > 3);
  }
  assert.deepEqual(poGrupi, { kanton: 30, federalni: 5, rs: 1, komora: 2 });
});

test("fallback bez baze: trenutni() vraća seed vrijednosti", () => {
  const t = svc.trenutni();
  assert.equal(t.KANTONI.SBK.nezapRacun, "154-921-20263733-54");
  assert.equal(t.FBIH_BUDZET_RACUN, "102-050-00001066-98");
  assert.equal(t.RS_BUDZET_RACUN, "5620990000055687");
  assert.equal(t.KOMORE.KS, "3387302220433691");
  // opcine i nazivi kantona ostaju iz snapshota
  assert.equal(t.KANTONI.SBK.genitiv, "Središnjobosanskog kantona");
  assert.ok(t.KANTONI.SBK.opcine.some((o) => o.ime === "Travnik"));
});

test("izmjena u bazi odmah važi: trenutni(), buildDefaults i uplatnice", () => {
  const prije = svc.getVerzija();
  // simuliraj red iz baze: SBK budžet prebačen na drugi (validan) račun
  svc.primijeniRedove(
    [{ kljuc: "SBK.budzet", racun: "1549212026373354", updatedAt: new Date("2026-08-31T10:00:00Z"), izvor: "Sl. novine FBiH 99/26", datumProvjere: "2026-08-31" }],
    [],
  );
  assert.ok(svc.getVerzija() > prije, "verzija mora porasti");
  assert.equal(svc.trenutni().KANTONI.SBK.budzet, "154-921-20263733-54");
  // buildDefaults (payroll uplatnice, izvoz, štampa naloga) čita živo stanje
  const d = buildDefaults("SBK");
  assert.equal(d.porez.account, "154-921-20263733-54");
  assert.equal(d.vodna.account, "154-921-20263733-54");
  // ostali slotovi netaknuti
  assert.equal(svc.trenutni().KANTONI.SBK.zoRacun, "134-481-10082431-53");
  // meta za "usklađeno sa" liniju
  assert.deepEqual(svc.getMeta(), { izvor: "Sl. novine FBiH 99/26", datum: "2026-08-31" });
});

test("uvoz izvoda prepoznaje i novi i stari broj slota", () => {
  svc.primijeniRedove(
    [{ kljuc: "SBK.nezap", racun: "1549212026373354", updatedAt: new Date() }],
    [{ kljuc: "SBK.nezap", stariRacun: "3380002210028187" }],
  );
  const novi = lookupJavniPrihod("154-921-20263733-54");
  assert.equal(novi && novi.fond, "NEZAP_KANTON");
  const stari = lookupJavniPrihod("338-000-22100281-87");
  assert.ok(stari, "stari broj mora ostati prepoznat");
  assert.equal(stari.fond, "NEZAP_KANTON");
  assert.equal(stari.category, "DOPRINOSI_PODUZETNIKA");
});

test("seed broj se tretira kao stari kad se slot promijeni (bez log zapisa)", () => {
  // FBIH.zo promijenjen u bazi na drugi validan broj; seed broj mora ostati
  // prepoznat u izvodima i bez eksplicitnog audit zapisa.
  svc.primijeniRedove(
    [{ kljuc: "FBIH.zo", racun: "1549212014617245", updatedAt: new Date() }],
    [],
  );
  assert.equal(svc.trenutni().FBIH_ZO_RACUN, "154-921-20146172-45");
  const stariSeed = lookupJavniPrihod("102-050-00000640-18");
  assert.ok(stariSeed, "seed broj mora ostati prepoznat");
  assert.equal(stariSeed.fond, "ZDR_FED");
});

test("povratak na prazno stanje baze vraća seed i diže verziju", () => {
  svc.primijeniRedove(
    [{ kljuc: "SBK.budzet", racun: "1549212026373354", updatedAt: new Date() }],
    [],
  );
  svc.primijeniRedove([], []);
  assert.equal(svc.trenutni().KANTONI.SBK.budzet, "134-113-03600001-94");
  assert.equal(svc.getMeta(), null);
});

test("formatiranje računa: 3-3-8-2 grupisanje", () => {
  assert.equal(svc.formatAccountDashed("1549212026373354"), "154-921-20263733-54");
  assert.equal(svc.formatAccountDashed("154-921-20263733-54"), "154-921-20263733-54");
});

// ── Regresija: nijedan pravi račun javnih prihoda ne smije biti upisan
// direktno u kodu izvan seed/data fajlova. Ovakvi propusti su se desili dva
// puta (kartica u AMS-u i FAQ tekst na /javni-prihodi), a tiho proizvode
// ekran koji pokazuje stari broj dok generisani dokument nosi novi.
test("nema hardkodiranih računa javnih prihoda u kodu", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const KORIJEN = path.join(__dirname, "..", "..");

  // Fajlovi kojima je dozvoljeno da sadrže brojeve: seed/šifarnik i helperi
  // za formatiranje (njihovi primjeri su u komentarima, koje ionako skačemo).
  const DOZVOLJENO = new Set([
    "frontend/src/data/uplatni-racuni.ts",
    "frontend/src/data/opcine.ts",
    "backend/src/utils/uplatniRacuniData.json",
    "backend/src/services/racuniService.js",
    // UIO_RACUNI je namjerno doslovna lista za PREPOZNAVANJE uplata sa izvoda
    // (ne generišemo uplatnice na te račune); jedan od njih je isti kao JRT
    // Trezor, i tu mora ostati literal da stari izvodi ostanu prepoznati.
    "backend/src/services/bankStatements/javniPrihodi.js",
  ]);

  const brojevi = new Set();
  for (const d of svc.SEED_DEFS) {
    brojevi.add(d.racun);
    brojevi.add(svc.formatAccountDashed(d.racun));
  }

  const nalazi = [];
  const skeniraj = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".next") continue;
        skeniraj(p);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx)$/.test(e.name)) continue;
      const rel = path.relative(KORIJEN, p).split(path.sep).join("/");
      if (DOZVOLJENO.has(rel)) continue;
      const linije = fs.readFileSync(p, "utf8").split(/\r?\n/);
      linije.forEach((l, i) => {
        const t = l.trim();
        // komentari nose primjere formata, njih ne diramo
        if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return;
        for (const b of brojevi) {
          if (l.includes(b)) nalazi.push(`${rel}:${i + 1} → ${b}`);
        }
      });
    }
  };
  skeniraj(path.join(KORIJEN, "frontend", "src"));
  skeniraj(path.join(KORIJEN, "backend", "src"));

  assert.deepEqual(nalazi, [], "hardkodirani računi:\n" + nalazi.join("\n"));
});
