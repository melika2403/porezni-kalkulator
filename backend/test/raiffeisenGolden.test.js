// Golden test za Raiffeisen RBBHnet formatter (SM 211 + UJ 345, CP852).
//
// Fixtures su ORIGINALNE izvozne datoteke starog programa koje RBBHnet
// dokazano prima (obračun 06/2026, MELY OBRT). Poređenje je bajt po bajt u
// cijelosti, bez ijednog izuzetka: SM slog 211 znakova, UJ slogovi 345,
// CRLF završeci, bez EOF markera, CP852 (Ž = 0xA6 u "BUDŽET USK").
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  formatRaiffeisen,
  RaiffeisenGreska,
} = require("../src/services/paymentExport/raiffeisenFormatter");

const FIXTURES = path.join(__dirname, "fixtures");

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
      jp("OSIGURANJA I REOSIGURANJA FBIH     FOND SOLIDARNOSTI", "1020500000064018", "DOPRINOS ZA ZDRAV 10 2", 2369, "712111", "124", "0000000"),
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
      jp("OSIGURANJA I REOSIGURANJA FBIH     FOND SOLIDARNOSTI", "1020500000064018", "DOPRINOS ZA ZDRAV 10 2", 2386, "712111", "124", "0000000"),
      jp("ZAPOSLJAVANJE", "1610000028570003", "OD NEZAPOSLENOSTI 30", 968, "712113", "124", "0000000"),
      jp("BUDZET USK A", "3380002210005877", "VODOPRIVREDNA NAKNADA", 516, "722529", "124", "0000000"),
      // BUDŽET sa pravim Ž: CP852 encoder mora dati bajt 0xA6 kao u datoteci
      jp("BUDŽET USK", "3380002210005877", "PRIRODNIH NESRECA", 516, "722581", "124", "0000000"),
      jp("BUDZET USK", "3380002210005877", "POREZ NA DOHODAK", 8132, "716111", "124", "0000000"),
      jp("ZA ZDRAVSTVENO OSIGURANJE", "3385002275166153", "DOPRINOS ZA ZDRAV 89 8", 21007, "712111", "124", "0000000"),
      jp("ZAPOSLJAVANJE USK A", "3380002210012958", "OD NEZAPOSLENOSTI 70", 2259, "712113", "124", "0000000"),
    ],
  };
  uporedi(formatRaiffeisen(file), ucitaj("raiffeisen_plataradnici_161.txt"), "plataradnici");
});

test("raiffeisen: prenos (neto plata) baca grešku dok banka ne potvrdi format", () => {
  const file = {
    platilac: PLATILAC,
    datumValute: new Date(2026, 6, 8),
    nalozi: [
      {
        tip: "prenos",
        racun: "1610000028570003",
        naziv: "RADNIK",
        mjesto: "BUZIM",
        svrha: "NETO",
        iznosFeninga: 1000,
      },
    ],
  };
  assert.throws(
    () => formatRaiffeisen(file),
    (e) => e instanceof RaiffeisenGreska && e.message.includes("javne prihode"),
  );
});
