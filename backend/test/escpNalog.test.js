// Unit testovi ESC/P generatora naloga za plaćanje (matrični LX-350).
// Generator je frontend TS modul bez importa; Node ga učitava direktno kroz
// type-stripping (node >= 23.6). Spec: docs/faza1-escp-stampa-naloga.md
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { pathToFileURL } = require("url");

const MOD_PATH = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "src",
  "lib",
  "nalozi",
  "escpNalog.ts",
);

const MAPPER_PATH = path.join(path.dirname(MOD_PATH), "nalogVrijednosti.ts");

let mod;
let mapper;
test.before(async () => {
  mod = await import(pathToFileURL(MOD_PATH).href);
  mapper = await import(pathToFileURL(MAPPER_PATH).href);
});

// Nađi sve pozicije podniza u nizu bajtova.
function nadji(buf, seq) {
  const pos = [];
  outer: for (let i = 0; i <= buf.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (buf[i + j] !== seq[j]) continue outer;
    }
    pos.push(i);
  }
  return pos;
}

const broji = (buf, seq) => nadji(buf, seq).length;

test("init: ESC @, ESC ! 1, ESC C 24, ESC O na početku (ascii mod)", () => {
  const buf = mod.buildPrn([mod.testNalogValues()], { kodnaStranica: "ascii" });
  const init = [0x1b, 0x40, 0x1b, 0x21, 0x01, 0x1b, 0x43, 0x18, 0x1b, 0x4f];
  assert.deepStrictEqual([...buf.slice(0, init.length)], init);
});

test("pc852 mod: ESC ( t dodjela PC852 + ESC t 1 poslije baznog inita", () => {
  const buf = mod.buildPrn([mod.testNalogValues()], { kodnaStranica: "pc852" });
  const izbor = [0x1b, 0x28, 0x74, 0x03, 0x00, 0x01, 0x0a, 0x00, 0x1b, 0x74, 0x01];
  assert.deepStrictEqual([...buf.slice(10, 10 + izbor.length)], izbor);
});

test("jedan nalog: tačno 21 CRLF, FF kao zadnji bajt, ništa poslije", () => {
  const buf = mod.buildPrn([mod.testNalogValues()], { kodnaStranica: "ascii" });
  assert.strictEqual(broji(buf, [0x0d, 0x0a]), 21);
  assert.strictEqual(buf[buf.length - 1], 0x0c);
  assert.strictEqual(broji(buf, [0x0c]), 1);
});

test("ESC $ pozicije: kolona 4 → (15,0), kolona 77 → (124,1)", () => {
  const buf = mod.buildPrn([mod.testNalogValues()], { kodnaStranica: "ascii" });
  // kolona 4 (uplatio2, linija 2): (4-1)*5 = 15
  assert.ok(broji(buf, [0x1b, 0x24, 15, 0]) >= 1, "nema ESC $ za kolonu 4");
  // kolona 77 (vrstaUplate, linija 10): (77-1)*5 = 380 = 256 + 124
  assert.ok(broji(buf, [0x1b, 0x24, 124, 1]) >= 1, "nema ESC $ za kolonu 77");
});

test("dva naloga → dva FF; filtrirana lista ne sadrži odznačeni nalog", () => {
  const a = { ...mod.testNalogValues(), uplatio1: "PRVI" };
  const b = { ...mod.testNalogValues(), uplatio1: "DRUGI" };
  const oba = mod.buildPrn([a, b], { kodnaStranica: "ascii" });
  assert.strictEqual(broji(oba, [0x0c]), 2);
  assert.strictEqual(broji(oba, [0x0d, 0x0a]), 42);

  // "odznačen" nalog (b) se jednostavno ne šalje generatoru
  const samoA = mod.buildPrn([a], { kodnaStranica: "ascii" });
  const tekst = Buffer.from(samoA).toString("latin1");
  assert.ok(tekst.includes("PRVI"));
  assert.ok(!tekst.includes("DRUGI"));
});

test("transliteracija: čćžšđ → ASCII, Đ po kontekstu (DJURIĆ vs Djurić)", () => {
  assert.strictEqual(mod.toEscpAscii("čćžšđ ČĆŽŠ"), "cczsdj CCZS");
  assert.strictEqual(mod.toEscpAscii("ĐURIĆ"), "DJURIC");
  assert.strictEqual(mod.toEscpAscii("Đurić"), "Djuric");
  assert.strictEqual(mod.toEscpAscii("MEĐIĆ"), "MEDJIC");
  // ostali ne-ASCII → ?
  assert.strictEqual(mod.toEscpAscii("café €"), "caf? ?");
});

test("pc852 encoding: naša slova kao Latin 2 bajtovi", () => {
  assert.deepStrictEqual(mod.encodePolje("ŠĐŽČĆ šđžčć", "pc852"), [
    0xe6, 0xd1, 0xa6, 0xac, 0x8f, 0x20, 0xe7, 0xd0, 0xa7, 0x9f, 0x86,
  ]);
});

test("predugo polje se tvrdo reže na prostor do sljedećeg polja", () => {
  // svrha2: linija 5 kolona 4, sljedeće polje racunPrimaoca kolona 48 → max 44
  assert.strictEqual(mod.MAX_DUZINA.svrha2, 44);
  const vals = { svrha2: "A".repeat(60) };
  const buf = mod.buildPrn([vals], { kodnaStranica: "ascii" });
  assert.strictEqual(broji(buf, [0x41]), 44);
});

test("transliteracija koja produži tekst (đ→dj) ne prelazi maksimum polja", () => {
  // primalac1 max: iznos je na koloni 48, primalac1 na 14 → 34 znaka
  assert.strictEqual(mod.MAX_DUZINA.primalac1, 34);
  const vals = { primalac1: "đ".repeat(34) }; // 34 znaka → 68 ASCII bajtova
  const buf = mod.buildPrn([vals], { kodnaStranica: "ascii" });
  const tekst = Buffer.from(buf).toString("latin1");
  const m = tekst.match(/(?:dj)+/);
  assert.ok(m, "nema dj sekvence");
  assert.strictEqual(m[0].length, 34); // odrezano na 34 bajta
});

test("kalibracija: pomakLinija dodaje prazne CRLF, pomakKolona pomjera ESC $", () => {
  const buf = mod.buildPrn([mod.testNalogValues()], {
    kodnaStranica: "ascii",
    pomakLinija: 2,
    pomakKolona: 4,
  });
  assert.strictEqual(broji(buf, [0x0d, 0x0a]), 23);
  // kolona 4 + pomak 4: (4-1+4)*5 = 35
  assert.ok(broji(buf, [0x1b, 0x24, 35, 0]) >= 1);
});

test("mapper: formati vrijednosti (iznos, datumi, računi, JIB)", () => {
  const platilac = {
    racun: "323-232-32323232-32",
    naziv: "Test obrta",
    adresa: "Ulica 2",
    mjesto: "Cazin",
  };
  const nalog = {
    tip: "javniPrihod",
    naziv: "Budžet Federacije BiH",
    mjesto: "SARAJEVO",
    racun: "102-050-00001066-98",
    svrha: "Vlasnik, Doprinos za PIO/MIO za 07/2026",
    iznosKm: 312.39,
    jib: "8888888888888",
    vrstaPrihoda: "712112",
    opcina: "019",
    budzetskaOrganizacija: "5102001",
    pozivNaBroj: "0000000007",
    periodOd: "2026-07-01",
    periodDo: "2026-07-31",
  };
  const v = mapper.nalogUVrijednosti(nalog, platilac, "2026-08-14");
  // računi u grupama kućica 3+3+8+2; period u parovima sa duplim razmakom i
  // budžetska cifra po kućici (kalibrisano po probnoj štampi 13.8.2026.)
  assert.strictEqual(v.racunPosiljaoca, "323 232 32323232 32");
  assert.strictEqual(v.racunPrimaoca, "102 050 00001066 98");
  assert.strictEqual(v.iznos, "312,39");
  assert.strictEqual(v.datumUplate, "14.08.2026"); // naš format, namjerno
  assert.strictEqual(v.periodOd, "01  07  26");
  assert.strictEqual(v.periodDo, "31  07  26");
  assert.strictEqual(v.budzetskaOrg, "5 1 0 2 0 0 1");
  assert.strictEqual(v.brojObveznika, "8888888888888");
  // vrsta uplate: "0" (redovna) za javne prihode, potvrđeno iz Raiffeisen UJ
  assert.strictEqual(v.vrstaUplate, "0");
  assert.strictEqual(v.mjestoUplate, "Cazin");
  // uplatilac: naziv, adresa i mjesto teku kao jedan tekst kroz 13/30/30
  assert.strictEqual(v.uplatio1, "Test obrta,");
  assert.strictEqual(v.uplatio2, "Ulica 2, Cazin");
  assert.strictEqual(v.uplatio3, "");
  // primalac: naziv kroz 20/30, mjesto u trećem redu
  assert.strictEqual(v.primalac1, "Budžet Federacije");
  assert.strictEqual(v.primalac2, "BiH");
  assert.strictEqual(v.primalac3, "SARAJEVO");
  // svrha se prelije po granicama riječi bez sječenja riječi (22/30/30)
  assert.strictEqual(v.svrha1, "Vlasnik, Doprinos za");
  assert.strictEqual(v.svrha2, "PIO/MIO za 07/2026");
  // veliki iznos sa tačkama hiljada
  const v2 = mapper.nalogUVrijednosti({ ...nalog, iznosKm: 1234567.8 }, platilac, "2026-08-14");
  assert.strictEqual(v2.iznos, "1.234.567,80");
});

test("Com_Soft referenca: max dužine i pozicije (korekcije 12.8.2026.)", () => {
  // Sve linije lijevog tekstualnog bloka završavaju TAČNO na koloni 34:
  // broj X-eva izbrojan sa referentnog ispisa = 34 - početna kolona polja.
  const t = mod.testNalogValues();
  const mapa = Object.fromEntries(mod.FIELD_MAP_TIP1.map((f) => [f.key, f]));
  const lijeviBlok = [
    "uplatio1", "uplatio2", "uplatio3",
    "svrha1", "svrha2", "svrha3",
    "primalac1", "primalac2", "primalac3",
  ];
  for (const key of lijeviBlok) {
    assert.strictEqual(
      mapa[key].col + t[key].length,
      34,
      `${key}: kolona ${mapa[key].col} + ${t[key].length} X-eva mora dati 34`,
    );
  }
  assert.strictEqual(t.uplatio1.length, 13);
  assert.strictEqual(t.svrha1.length, 22);
  assert.strictEqual(t.primalac1.length, 20);
  // srednji pojas jednu liniju niže; JIB i vrsta uplate OSTAJU na liniji 10
  assert.strictEqual(mapa.mjestoUplate.line, 12);
  assert.strictEqual(mapa.datumUplate.line, 12);
  assert.strictEqual(mapa.periodOd.line, 12);
  assert.strictEqual(mapa.vrstaPrihoda.line, 13);
  assert.strictEqual(mapa.periodDo.line, 14);
  assert.strictEqual(mapa.brojObveznika.line, 10);
  assert.strictEqual(mapa.vrstaUplate.line, 10);
  assert.strictEqual(mapa.opcina.line, 16);
  assert.strictEqual(mapa.pozivNaBroj.line, 18);
  // kalibracija po probnoj štampi 13.8.: period na 68 (parovi sa duplim
  // razmakom), budžetska na 62 (cifra po kućici)
  assert.strictEqual(mapa.periodOd.col, 68);
  assert.strictEqual(mapa.periodDo.col, 68);
  assert.strictEqual(mapa.budzetskaOrg.line, 16);
  assert.strictEqual(mapa.budzetskaOrg.col, 62);
  // formati testnih vrijednosti: računi 3+3+8+2, period parovi, budžetska
  // razmaknuta cifra po kućici
  assert.strictEqual(t.racunPosiljaoca, "999 999 99999999 99");
  assert.strictEqual(t.racunPrimaoca, "999 999 99999999 99");
  assert.strictEqual(t.periodOd, "99  99  99");
  assert.strictEqual(t.periodDo, "99  99  99");
  assert.strictEqual(t.budzetskaOrg, "9 9 9 9 9 9 9");
  assert.strictEqual(t.datumUplate, "99.99.9999");
  // sve vrijednosti staju u tvrdi limit generatora (ništa se ne reže)
  for (const [key, val] of Object.entries(t)) {
    assert.ok(
      val.length <= mod.MAX_DUZINA[key],
      `${key}: ${val.length} > tvrdi limit ${mod.MAX_DUZINA[key]}`,
    );
  }
});

test("mapper: podjela teksta, predugačka riječ se prelama u sljedeći red", () => {
  // Riječ koja ne stane ni u prazan red nastavlja u sljedećem: znak iz SREDINE
  // teksta se ne smije izgubiti. Otpada samo višak preko zadnjeg reda.
  const r = mapper.podijeliTekst("ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 kratko", [10, 10, 10]);
  assert.deepStrictEqual(r, ["ABCDEFGHIJ", "KLMNOPQRST", "UVWXYZ1234"]);
  const prazan = mapper.podijeliTekst("", [5, 5]);
  assert.deepStrictEqual(prazan, ["", ""]);
});

test("mapper: dug naziv firme se ne odštampa pogrešno napisan", () => {
  // Prvi red uplatioca ima samo 13 znakova, pa je naziv duži od toga pravilo,
  // ne izuzetak. Regresija: raniji tvrdi rez je gutao slova iz SREDINE naziva
  // ("KNJIGOVODSTVENA AGENCIJA" → "KNJIGOVODSTVE AGENCIJA").
  const platilac = {
    racun: "3232323232323232",
    naziv: "KNJIGOVODSTVENA AGENCIJA MARIC",
    adresa: "Trg 1",
    mjesto: "Cazin",
  };
  const nalog = {
    tip: "prenos", naziv: "Radnik", mjesto: "Cazin", racun: "1613000119843555",
    svrha: "Neto plata", iznosKm: 1030, jib: "", vrstaPrihoda: "", opcina: "",
    budzetskaOrganizacija: "", pozivNaBroj: "", periodOd: "", periodDo: "",
  };
  const v = mapper.nalogUVrijednosti(nalog, platilac, "2026-08-14");
  // naziv se prelama preko reda (uredno na papiru), ali bez ijednog izgubljenog
  // slova: rastavljeni redovi bez razmaka daju tačno polazni tekst
  assert.strictEqual(v.uplatio1, "KNJIGOVODSTVE");
  assert.strictEqual(v.uplatio1 + v.uplatio2.split(" ")[0], "KNJIGOVODSTVENA");
  const bezRazmaka = (s) => s.replace(/\s+/g, "");
  assert.strictEqual(
    bezRazmaka(v.uplatio1 + v.uplatio2 + v.uplatio3),
    bezRazmaka("KNJIGOVODSTVENA AGENCIJA MARIC, Trg 1, Cazin"),
  );
});

test("fajl počinje TAČNO sa 1B 40, bez ZoneTransfer/ZoneId sadržaja", () => {
  // Regresija za Mark of the Web: "[ZoneTransfer]" tekst na papiru pomjeri
  // top-of-form. Sadržaj fajla NIKAD ne smije imati ništa prije ESC @ niti
  // MotW tekst bilo gdje (MotW inače živi u NTFS Zone.Identifier streamu,
  // ftype komanda u DIO B ga briše prije kopiranja na pisač).
  for (const kodna of ["pc852", "ascii"]) {
    const buf = mod.buildPrn(
      [mod.testNalogValues(), mod.testNalogValues()],
      { kodnaStranica: kodna, pomakKolona: 2, pomakLinija: 1 },
    );
    assert.strictEqual(buf[0], 0x1b, `prvi bajt nije ESC (${kodna})`);
    assert.strictEqual(buf[1], 0x40, `drugi bajt nije @ (${kodna})`);
    const tekst = Buffer.from(buf).toString("latin1");
    assert.ok(!tekst.includes("ZoneTransfer"), `ZoneTransfer u izlazu (${kodna})`);
    assert.ok(!tekst.includes("ZoneId"), `ZoneId u izlazu (${kodna})`);
  }
});

test("tekst nema 0x00 ni višebajtnih UTF-8 sekvenci (ascii mod)", () => {
  // 0x00 legitimno postoji SAMO kao parametar escape sekvenci (npr. ESC $ n2=0
  // za kolone lijevo od 52). Prošetaj tok, preskoči poznate escape sekvence i
  // provjeri da je sav TEKST čisti printable ASCII + CR/LF/FF.
  const vals = { ...mod.testNalogValues(), primalac1: "Šđčćž ĐŽ test" };
  const buf = mod.buildPrn([vals], { kodnaStranica: "ascii" });
  // dužina escape sekvence po drugom bajtu (poslije 0x1B)
  const ESC_LEN = { 0x40: 2, 0x21: 3, 0x43: 3, 0x4f: 2, 0x74: 3, 0x24: 4, 0x28: 8 };
  let i = 0;
  while (i < buf.length) {
    if (buf[i] === 0x1b) {
      const len = ESC_LEN[buf[i + 1]];
      assert.ok(len, `nepoznata escape sekvenca: 1B ${buf[i + 1]?.toString(16)}`);
      i += len;
      continue;
    }
    const b = buf[i];
    const kontrolni = b === 0x0d || b === 0x0a || b === 0x0c;
    assert.ok(
      kontrolni || (b >= 0x20 && b <= 0x7e),
      `neispravan bajt u tekstu (ascii mod): 0x${b.toString(16)} na ${i}`,
    );
    i += 1;
  }
});
