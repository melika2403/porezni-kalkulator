// Golden test za Raiffeisen RBBHnet formatter (SM 211 + UJ 345, čisti ASCII).
//
// Fixtures su ORIGINALNE izvozne datoteke starog programa koje RBBHnet
// dokazano prima (obračun 06/2026, MELY OBRT). Poređenje je bajt po bajt u
// cijelosti: SM slog 211 znakova, UJ slogovi 345, CRLF završeci, bez EOF
// markera. JEDINI dozvoljeni izuzetak: original radnici datoteke ima jedan
// CP852 bajt (Ž = 0xA6 u "BUDŽET USK", iz Com_Softovog registra primalaca);
// naš formatter kvačice transliterira u ASCII (novo online bankarstvo odbija
// CP852 bajtove), pa se u očekivanim bajtovima 0xA6 zamijeni sa "Z".
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  formatRaiffeisen,
  podijeliZaRaiffeisen,
  RaiffeisenGreska,
} = require("../src/services/paymentExport/raiffeisenFormatter");

const FIXTURES = path.join(__dirname, "fixtures");

// Višeredni naziv/svrha iz Com_Softovog registra: u jednom tekstu su redovi
// dopunjeni razmacima do 35 (tako izgledaju i u originalnim datotekama), pa
// se ovako zadaju i u goldenima. Formatter to mora prepoznati kao prelom reda.
const dvaReda = (prvi, drugi) => prvi.padEnd(35, " ") + drugi;

function ucitaj(ime) {
  return fs.readFileSync(path.join(FIXTURES, ime));
}

function uporedi(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: dužina ${actual.length}, očekivano ${expected.length}`);
  const razlike = [];
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      razlike.push(
        `bajt ${i}: dobio 0x${actual[i].toString(16)} ` +
          `(${JSON.stringify(String.fromCharCode(actual[i]))}), očekivano ` +
          `0x${expected[i].toString(16)} (${JSON.stringify(String.fromCharCode(expected[i]))})`,
      );
      if (razlike.length >= 10) break;
    }
  }
  assert.equal(razlike.length, 0, `${label}:\n  ${razlike.join("\n  ")}`);
}

test("fixtures su netaknuti originali (veličina, CRLF, bez EOF markera)", () => {
  const vlasnik = ucitaj("raiffeisen_platavlasnik_161.txt");
  // SM 211 + CRLF + 5 x (345 + CRLF)
  assert.equal(vlasnik.length, 213 + 5 * 347);
  assert.equal(vlasnik.includes(0x1a), false);
  const radnici = ucitaj("raiffeisen_plataradnici_161.txt");
  assert.equal(radnici.length, 213 + 8 * 347);
  assert.equal(radnici.includes(0x1a), false);
  // CP852: Ž u "BUDŽET USK" (samo radnici datoteka)
  assert.equal(vlasnik.includes(0xa6), false);
  assert.equal(radnici.includes(0xa6), true);
});

// Zajednički platilac (MELY OBRT, Bužim; PTT broj je dio polja mjesta,
// tačno kako ga stari program piše).
const PLATILAC = {
  racun: "161-000-01719200-95",
  naziv: "MELY  OBRT VL DEDIC AMIR",
  adresa: "ELKASOVA RIJEKA BB",
  mjesto: "77245 BUZIM",
};
const JIB = "4364144210006";
const OD = new Date(2026, 5, 1);
const DO = new Date(2026, 5, 30);

// Pomoćnik: javni prihod sa zajedničkim vrijednostima iz datoteka.
function jp(naziv, racun, svrha, iznosFeninga, vrstaPrihoda, opcina, budzetskaOrganizacija) {
  return {
    tip: "javniPrihod",
    naziv,
    racun,
    mjesto: "",
    svrha,
    iznosFeninga,
    jib: JIB,
    vrstaPrihoda,
    periodOd: OD,
    periodDo: DO,
    opcina,
    budzetskaOrganizacija,
    pozivNaBroj: "0000000006",
  };
}

test("golden: raiffeisen platavlasnik (5 naloga vlasnika), bajt po bajt", () => {
  const file = {
    platilac: PLATILAC,
    datumValute: new Date(2026, 6, 8),
    opis: "PLATE ZA 2026060",
    nalozi: [
      jp("FOND ZA PIO", "1020500000106698", "DOPRINOS ZA PIO", 31239, "712112", "124", "5102001"),
      jp("ZA ZDRAVSTVENO OSIGURANJE", "3385002275166153", "DOPRINOS ZA ZDRAV 89 8", 20860, "712111", "019", "0000000"),
      jp(dvaReda("OSIGURANJA I REOSIGURANJA FBIH", "FOND SOLIDARNOSTI"), "1020500000064018", "DOPRINOS ZA ZDRAV 10 2", 2369, "712111", "124", "0000000"),
      jp("ZAPOSLJAVANJE USK A", "3380002210012958", "OD NEZAPOSLENOSTI 70", 2243, "712113", "019", "0000000"),
      jp("ZAPOSLJAVANJE", "1610000028570003", "OD NEZAPOSLENOSTI 30", 961, "712113", "124", "0000000"),
    ],
  };
  uporedi(formatRaiffeisen(file), ucitaj("raiffeisen_platavlasnik_161.txt"), "platavlasnik");
});

test("golden: raiffeisen plataradnici (8 naloga radnika), bajt po bajt", () => {
  const file = {
    platilac: PLATILAC,
    datumValute: new Date(2026, 6, 8),
    opis: "PLATE ZA 2026060",
    nalozi: [
      jp("FOND ZA PIO", "1020500000106698", "DOPRINOS ZA PIO", 31460, "712112", "124", "5102001"),
      jp(dvaReda("OSIGURANJA I REOSIGURANJA FBIH", "FOND SOLIDARNOSTI"), "1020500000064018", "DOPRINOS ZA ZDRAV 10 2", 2386, "712111", "124", "0000000"),
      jp("ZAPOSLJAVANJE", "1610000028570003", "OD NEZAPOSLENOSTI 30", 968, "712113", "124", "0000000"),
      jp("BUDZET USK A", "3380002210005877", "VODOPRIVREDNA NAKNADA", 516, "722529", "124", "0000000"),
      // BUDŽET sa pravim Ž: ASCII transliteracija mora dati "Z" (original ima
      // CP852 bajt 0xA6 koji novo online bankarstvo odbija)
      jp("BUDŽET USK", "3380002210005877", "PRIRODNIH NESRECA", 516, "722581", "124", "0000000"),
      jp("BUDZET USK", "3380002210005877", "POREZ NA DOHODAK", 8132, "716111", "124", "0000000"),
      jp("ZA ZDRAVSTVENO OSIGURANJE", "3385002275166153", "DOPRINOS ZA ZDRAV 89 8", 21007, "712111", "124", "0000000"),
      jp("ZAPOSLJAVANJE USK A", "3380002210012958", "OD NEZAPOSLENOSTI 70", 2259, "712113", "124", "0000000"),
    ],
  };
  // Očekivano = original sa 0xA6 (Ž) zamijenjenim ASCII "Z" (vidi zaglavlje).
  const original = ucitaj("raiffeisen_plataradnici_161.txt");
  const ocekivano = Buffer.from(original.map((b) => (b === 0xa6 ? 0x5a : b)));
  uporedi(formatRaiffeisen(file), ocekivano, "plataradnici");
});

// Novi original (august 2026, URBANLINE): Com_Softov izvoz koji NOVO
// RBBHnet online bankarstvo dokazano prima. Ovaj golden ujedno pokriva
// DEFAULT opis ("PLATE ZA GGGGMM0", bez zadanog opisa) i mjestoSaPtt
// ("77220 CAZIN" iz PTT šifarnika, ne direktno zadano mjesto).
test("golden: raiffeisen novi original (radi na novom online bankarstvu)", () => {
  const OD7 = new Date(2026, 6, 1);
  const DO7 = new Date(2026, 6, 31);
  const jp7 = (naziv, racun, svrha, iznosFeninga, vrstaPrihoda, budzetskaOrganizacija) => ({
    tip: "javniPrihod",
    naziv,
    racun,
    mjesto: "",
    svrha,
    iznosFeninga,
    jib: "4364728470000",
    vrstaPrihoda,
    periodOd: OD7,
    periodDo: DO7,
    opcina: "019",
    budzetskaOrganizacija,
    pozivNaBroj: "0000000007",
  });
  const file = {
    platilac: {
      racun: "161-000-03713500-58",
      naziv: "OBRT  URBANLINE  CAZIN",
      adresa: "MUTNIK BB",
      mjesto: "CAZIN",
      mjestoSaPtt: "77220 CAZIN",
    },
    datumValute: new Date(2026, 7, 6),
    // opis NAMJERNO izostavljen: default mora dati "PLATE ZA 2026070"
    nalozi: [
      jp7("FOND ZA PIO", "1020500000106698", "DOPRINOS ZA PIO", 52845, "712112", "5102001"),
      jp7("ZA ZDRAVSTVENO OSIGURANJE", "3385002275166153", "DOPRINOS ZA ZDRAV 89 8", 35287, "712111", "0000000"),
      jp7(dvaReda("OSIGURANJA I REOSIGURANJA FBIH", "FOND SOLIDARNOSTI"), "1020500000064018", "DOPRINOS ZA ZDRAV 10 2", 4008, "712111", "0000000"),
      jp7("ZAPOSLJAVANJE USK A", "3380002210012958", "OD NEZAPOSLENOSTI 70", 3794, "712113", "0000000"),
      jp7("ZAPOSLJAVANJE", "1610000028570003", "OD NEZAPOSLENOSTI 30", 1626, "712113", "0000000"),
    ],
  };
  uporedi(formatRaiffeisen(file), ucitaj("raiffeisen_platavlasnik_161_novo.txt"), "novi original");
});

test("raiffeisen: kvačice se transliteriraju u ASCII, izlaz bez bajtova >= 0x80", () => {
  const file = {
    platilac: PLATILAC,
    datumValute: new Date(2026, 6, 8),
    opis: "PLATE ZA 2026060",
    nalozi: [
      jp("BUDŽET ĐURIĆ ŠČĆŽ", "3380002210005877", "ZAŠTITA OD ŽČĆĐ", 516, "722581", "124", "0000000"),
    ],
  };
  const buf = formatRaiffeisen(file);
  for (const b of buf) {
    assert.ok(b < 0x80, `ne-ASCII bajt u izlazu: 0x${b.toString(16)}`);
  }
  const tekst = buf.toString("latin1");
  assert.ok(tekst.includes("BUDZET DJURIC SCCZ"), "transliteracija naziva");
  assert.ok(tekst.includes("ZASTITA OD ZCCDJ"), "transliteracija svrhe");
});

// Treći original: platasviradnici (august 2026, DURIĆ BETON) sa UO slozima
// (prenosi/plate, 313 znakova bez poreskog repa, konstanta "8889 07 ") PRIJE
// UJ javnih prihoda. U originalu Ć (0x8F u "DURIĆ") i Ž (0xA6 u "OSTROŽAC" i
// "BUDŽET") dolaze iz Com_Softovog registra: naš ASCII izlaz ih transliterira,
// pa se u očekivanim bajtovima zamijene sa C/Z. Nalozi se namjerno zadaju sa
// javnim prihodima PRVO: formatter mora sam presložiti prenose na početak.
test("golden: raiffeisen platasviradnici (3 UO prenosa + 8 UJ), bajt po bajt", () => {
  const OD6 = new Date(2026, 5, 1);
  const DO6 = new Date(2026, 5, 30);
  const jp6 = (naziv, racun, svrha, iznosFeninga, vrstaPrihoda, budzetskaOrganizacija) => ({
    tip: "javniPrihod",
    naziv,
    racun,
    mjesto: "",
    svrha,
    iznosFeninga,
    jib: "4263257570008",
    vrstaPrihoda,
    periodOd: OD6,
    periodDo: DO6,
    opcina: "019",
    budzetskaOrganizacija,
    pozivNaBroj: "0000000000",
  });
  const prenos = (naziv, racun, svrha, iznosFeninga) => ({
    tip: "prenos",
    naziv,
    racun,
    mjesto: "",
    svrha,
    iznosFeninga,
  });
  const file = {
    platilac: {
      racun: "198-201-20100243-83",
      naziv: "DOO  DURIĆ BETON",
      adresa: "OSTROŽAC 225",
      mjesto: "77220 CAZIN",
    },
    datumValute: new Date(2026, 7, 11),
    opis: "PLATE ZA 2026060",
    nalozi: [
      jp6("FOND ZA PIO", "1020500000106698", "DOPRINOS ZA PIO", 461837, "712112", "5102001"),
      jp6("ZA ZDRAVSTVENO OSIGURANJE", "3385002275166153", "DOPRINOS ZA ZDRAV 89 8", 308389, "712111", "0000000"),
      jp6(dvaReda("OSIGURANJA I REOSIGURANJA FBIH", "FOND SOLIDARNOSTI"), "1020500000064018", "DOPRINOS ZA ZDRAV 10 2", 35028, "712111", "0000000"),
      jp6("ZAPOSLJAVANJE USK A", "3380002210012958", "OD NEZAPOSLENOSTI 70", 33158, "712113", "0000000"),
      jp6("ZAPOSLJAVANJE", "1610000028570003", "OD NEZAPOSLENOSTI 30", 14210, "712113", "0000000"),
      jp6("BUDZET USK A", "3380002210005877", "POREZ NA DOHODAK", 88419, "716111", "0000000"),
      jp6("BUDZET USK A", "3380002210005877", "VODOPRIVREDNA NAKNADA", 7729, "722529", "0000000"),
      jp6("BUDŽET USK", "3380002210005877", "PRIRODNIH NESRECA", 7729, "722581", "0000000"),
      prenos(
        dvaReda("KIB DD VELIKA KLADUSA", "POSLOVNICA CAZIN"),
        "1982010000000083",
        dvaReda("PO DOSTAVLJENOM SPISKU", "ZA 2026 06 0"),
        1030506,
      ),
      prenos(
        dvaReda("UNI CREDIT ZAGREBACKA BANKA", "FILIJALA CAZIN"),
        "3385202502482151",
        dvaReda("DOSTAVLJENOJ SPECIFIKACIJI", "ZA UPOSLENE RADNIKE"),
        103084,
      ),
      prenos("DD FILIJALA CAZIN", "1610000000000011", "DOSTAVLJENOM SPISKU 6 RADNIKA", 206112),
    ],
  };
  const original = ucitaj("raiffeisen_platasviradnici_198.txt");
  const ocekivano = Buffer.from(
    original.map((b) => (b === 0xa6 ? 0x5a : b === 0x8f ? 0x43 : b)),
  );
  uporedi(formatRaiffeisen(file), ocekivano, "platasviradnici");
});

// Novo online bankarstvo odbija uvoz naloga sa navodnicima (potvrđeno na
// stvarnom uvozu 13.8.2026.: '"ELEKTRO BIKI" OBRT' pao, bez navodnika prošao).
// Navodnici se uklanjaju PRIJE dopune polja: SM slog mora ostati tačno 211.
test("raiffeisen: navodnici se uklanjaju, SM ostaje 211 znakova", () => {
  const file = {
    platilac: {
      racun: "161-000-01719200-95",
      naziv: '"ELEKTRO BIKI" OBRT',
      adresa: "PUSKARI BB",
      mjesto: "77220 CAZIN",
    },
    datumValute: new Date(2026, 7, 13),
    opis: "PLATE ZA 2026070",
    nalozi: [
      jp('DOO "PRIMALAC" TEST', "1020500000106698", 'SVRHA SA „NAVODNICIMA”', 31239, "712112", "124", "5102001"),
    ],
  };
  const buf = formatRaiffeisen(file);
  const linije = buf.toString("latin1").split("\r\n").filter(Boolean);
  assert.equal(linije[0].length, 211, "SM slog mora ostati 211 znakova");
  assert.equal(linije[1].length, 345, "UJ slog mora ostati 345 znakova");
  assert.ok(!buf.includes(0x22), "izlaz ne smije sadržati navodnike");
  // naziv počinje odmah bez navodnika, ostala polja nepomjerena
  assert.equal(linije[0].slice(37, 72).trimEnd(), "ELEKTRO BIKI OBRT");
  assert.equal(linije[0].slice(164, 167), "BAM");
  assert.equal(linije[1].slice(19, 54).trimEnd(), "DOO PRIMALAC TEST");
  assert.equal(linije[1].slice(184, 219).trimEnd(), "SVRHA SA NAVODNICIMA");
});

// Polja od 105 znakova su 3 reda po 35 (vidljivo u Com_Soft originalima,
// novo bankarstvo pri ručnom unosu kaže "maksimalan broj karaktera po redu
// je 35"): riječ ne smije preći granicu reda, nastavak počinje na offsetu 35.
test("raiffeisen: naziv/svrha se prelamaju u redove od 35 po riječima", () => {
  const file = {
    platilac: PLATILAC,
    datumValute: new Date(2026, 6, 8),
    opis: "PLATE ZA 2026060",
    nalozi: [
      jp(
        "ZAVOD ZDRAVSTVENOG OSIGURANJA I REOSIGURANJA FBIH",
        "1020500000064018",
        "DOPRINOS ZA ZDRAVSTVO (KANTONALNI DIO) ZA 07/2026",
        2369, "712111", "124", "0000000",
      ),
    ],
  };
  const buf = formatRaiffeisen(file);
  const uj = buf.toString("latin1").split("\r\n").filter(Boolean)[1];
  const nazivPolje = uj.slice(19, 124);
  const svrhaPolje = uj.slice(184, 289);
  // red 1 staje na granici riječi, red 2 počinje TAČNO na offsetu 35
  assert.equal(nazivPolje.slice(0, 35), "ZAVOD ZDRAVSTVENOG OSIGURANJA I    ");
  assert.equal(nazivPolje.slice(35, 70).trimEnd(), "REOSIGURANJA FBIH");
  assert.equal(svrhaPolje.slice(0, 35), "DOPRINOS ZA ZDRAVSTVO (KANTONALNI  ");
  assert.equal(svrhaPolje.slice(35, 70).trimEnd(), "DIO) ZA 07/2026");
  // ukupna širina polja netaknuta
  assert.equal(uj.length, 345);
});

// RBBHnet bira vrstu plaćanja i šifru svrhe PO PAKETU pri uvozu, pa se izvoz
// dijeli: doprinosi (javni prihodi) pa lične isplate po kategoriji. Miješani
// paket banka odbija čim sadrži prenos na račun fizičkog lica.
test("raiffeisen: podjela u datoteke po paketu (doprinosi, plate, obrok...)", () => {
  const jpN = (i) => ({ tip: "javniPrihod", iznosFeninga: i });
  const pr = (kategorija, i) => ({ tip: "prenos", kategorija, iznosFeninga: i });
  const dijelovi = podijeliZaRaiffeisen([
    pr("plata", 100000),
    jpN(31239),
    pr("obrok", 17600),
    pr("plata", 90000),
    jpN(20860),
    pr("prevoz", 3000),
    pr("regres", 40000),
  ]);
  assert.deepEqual(
    dijelovi.map((d) => [d.sufiks, d.nalozi.length]),
    [
      ["doprinosi", 2],
      ["plate", 2],
      ["topli-obrok", 1],
      ["prevoz", 1],
      ["regres", 1],
    ],
  );
  // naslov nosi uputu koju vrstu/svrhu izabrati pri uvozu
  assert.ok(dijelovi[1].naslov.includes("511"));
  assert.ok(dijelovi[2].naslov.includes("518"));
  assert.ok(dijelovi[3].naslov.includes("519"));
  assert.ok(dijelovi[4].naslov.includes("110"));
  // prazni dijelovi se izostavljaju
  const samoJp = podijeliZaRaiffeisen([jpN(100)]);
  assert.deepEqual(samoJp.map((d) => d.sufiks), ["doprinosi"]);
  // prenos bez kategorije ide sa platama
  const bezKat = podijeliZaRaiffeisen([pr(undefined, 5)]);
  assert.deepEqual(bezKat.map((d) => d.sufiks), ["plate"]);
  // NOVA vrsta isplate (npr. otpremnina dodana u obracunAdapter) ne smije
  // oboriti cijeli izvoz: dobija svoj paket, svrha se bira pri uvozu
  const novaVrsta = podijeliZaRaiffeisen([jpN(100), pr("otpremnina", 5)]);
  assert.deepEqual(
    novaVrsta.map((d) => d.sufiks),
    ["doprinosi", "ostalo"],
  );
  assert.ok(novaVrsta[1].naslov.includes("svrhu izaberite"));
  // nalog nepoznatog TIPA i dalje baca grešku (ne smije tiho ispasti)
  assert.throws(
    () => podijeliZaRaiffeisen([{ tip: "nesto", iznosFeninga: 5 }]),
    (e) => e instanceof RaiffeisenGreska && e.message.includes("bez dijela"),
  );
});

// Podaci iz stvarnih naziva (Word copy/paste, strana slova) ne smiju oboriti
// izvoz: transliteriraju se, a ne bacaju grešku.
test("raiffeisen: tipografska interpunkcija i strana slova se transliteriraju", () => {
  const file = {
    platilac: {
      racun: "161-000-01719200-95",
      naziv: "OBRT – PEKARA ’MALA’",
      adresa: "TRG 1",
      mjesto: "77220 CAZIN",
    },
    datumValute: new Date(2026, 7, 13),
    opis: "PLATE ZA 2026070",
    nalozi: [jp("ÖZLEM ÉCLAIR DOO", "1020500000106698", "NAKNADA… DIO", 31239, "712112", "124", "5102001")],
  };
  const buf = formatRaiffeisen(file);
  for (const b of buf) assert.ok(b < 0x80, `ne-ASCII bajt: 0x${b.toString(16)}`);
  const tekst = buf.toString("latin1");
  assert.ok(tekst.includes("OBRT - PEKARA 'MALA'"), "interpunkcija platioca");
  assert.ok(tekst.includes("OZLEM ECLAIR DOO"), "strana slova u nazivu");
  assert.ok(tekst.includes("NAKNADA... DIO"), "tri tačke u svrsi");
});

test("raiffeisen: nepoznat tip naloga baca grešku", () => {
  const file = {
    platilac: PLATILAC,
    datumValute: new Date(2026, 6, 8),
    nalozi: [{ tip: "nesto", racun: "1610000028570003", naziv: "X", svrha: "X", iznosFeninga: 1000 }],
  };
  assert.throws(
    () => formatRaiffeisen(file),
    (e) => e instanceof RaiffeisenGreska && e.message.includes("Nepoznat tip"),
  );
});
