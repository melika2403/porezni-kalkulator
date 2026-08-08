// Golden test za TKDIS 336 formatter (Faza 0, Korak 2).
//
// Rekonstruiše ulazne objekte za dvije produkcijske Halcom datoteke i poredi
// izlaz formattera (profil "halcom") BAJT PO BAJT sa fixture datotekama,
// uključujući CRLF i završni 0x1A.
//
// JEDINA dokumentovana razlika: u individualnim stavkama (tip 1) se pozicije
// 253-254 (model poziva odobrenja) i 255-276 (poziv odobrenja) IZUZIMAJU iz
// poređenja, jer mi pišemo datum valute kao DD-MM-GGGG uz model 00, a fixtures
// nose naslijeđene datume iz starog Halcom imenika (2019.). Sve ostalo mora
// biti identično. Vidi docs/faza0-tkdis-izvoz-halcom.md.
//
// Test je pisan PRIJE implementacije (formatTkdis još ne postoji) i mora
// PADATI dok se formatter ne napiše u Koraku 3.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const formatterModule = require("../src/services/paymentExport/tkdisFormatter");
// Očekivani konačni API (Korak 3): formatTkdis(tkdisFile, profil) → Buffer
const formatTkdis = formatterModule.formatTkdis;

const FIXTURES = path.join(__dirname, "fixtures");
const ROW_TOTAL = 338; // 336 znakova + CRLF

function ucitajFixture(ime) {
  return fs.readFileSync(path.join(FIXTURES, ime));
}

// Poredi bajt po bajt; u tip-1 redovima preskače pozicije 253-276 (model +
// poziv odobrenja). Tip reda se čita iz OČEKIVANOG (fixture) bajta na 336.
function uporediSaIzuzetkom(actual, expected, label) {
  assert.equal(
    actual.length,
    expected.length,
    `${label}: dužina ${actual.length}, očekivano ${expected.length}`,
  );
  const razlike = [];
  for (let i = 0; i < expected.length; i++) {
    const red = Math.floor(i / ROW_TOTAL);
    const pozURedu = (i % ROW_TOTAL) + 1; // 1-based; 337/338 su CR/LF
    const pocetakReda = red * ROW_TOTAL;
    const tipReda =
      pocetakReda + 335 < expected.length
        ? String.fromCharCode(expected[pocetakReda + 335])
        : "?";
    if (tipReda === "1" && pozURedu >= 253 && pozURedu <= 276) continue;
    if (actual[i] !== expected[i]) {
      razlike.push(
        `red ${red + 1} poz ${pozURedu}: dobio 0x${actual[i].toString(16)} ` +
          `(${JSON.stringify(String.fromCharCode(actual[i]))}), očekivano ` +
          `0x${expected[i].toString(16)} (${JSON.stringify(String.fromCharCode(expected[i]))})`,
      );
      if (razlike.length >= 10) break;
    }
  }
  assert.equal(
    razlike.length,
    0,
    `${label}: ${razlike.length}+ razlika:\n  ${razlike.join("\n  ")}`,
  );
}

// ── Sanity: fixtures ne smiju biti dirnute (git EOL konverzija bi ih ubila) ──

test("fixtures su netaknute (veličina + CRLF + 0x1A)", () => {
  const izvoz = ucitajFixture("izvoz_naloga.txt");
  assert.equal(izvoz.length, 1691, "izvoz_naloga.txt mora imati 1691 bajt");
  assert.equal(izvoz[izvoz.length - 1], 0x1a);
  assert.equal(izvoz.length, 5 * ROW_TOTAL + 1, "5 redova x 338 + 1");

  const maxCop = ucitajFixture("MAX_COP.txt");
  assert.equal(maxCop.length, 1015, "MAX_COP.txt mora imati 1015 bajta");
  assert.equal(maxCop[maxCop.length - 1], 0x1a);
  assert.equal(maxCop.length, 3 * ROW_TOTAL + 1, "3 reda x 338 + 1");
});

// ── Golden 1: izvoz_naloga.txt (OPTIKA VIZUS, juni 2026, 3 naloga) ───────────
// Ulaz nosi PRAVU dijakritiku (BUDŽET, BIHAĆ, NUHOVIĆ): YUSCII encoder je
// pretvara u @ ] [ znakove. Račun platioca je u PK obliku sa crticama da se
// pokrije i normalizacija računa.

const IZVOZ_NALOGA_INPUT = {
  platilac: {
    racun: "186-222-03109539-77",
    naziv: "DOO OPTIKA VIZUS 1993",
    mjesto: "CAZIN",
  },
  datumValute: new Date(2026, 5, 26),
  nalozi: [
    {
      tip: "javniPrihod",
      racun: "1020500000106698",
      naziv: "BUDŽET FBIH",
      mjesto: "SARAJEVO",
      svrha: "DOPRINOS PIO",
      iznosFeninga: 133176,
      jib: "4263909740008",
      vrstaPrihoda: "712112",
      periodOd: new Date(2026, 5, 1),
      periodDo: new Date(2026, 5, 30),
      opcina: "019",
      budzetskaOrganizacija: "5102001",
      pozivNaBroj: "0000000006",
    },
    {
      tip: "javniPrihod",
      racun: "338-000-22100058-77",
      naziv: "BUDŽET USK",
      mjesto: "BIHAĆ",
      svrha: "POREZ NA DOHODAK",
      iznosFeninga: 41124,
      jib: "4263909740008",
      vrstaPrihoda: "716111",
      periodOd: new Date(2026, 5, 1),
      periodDo: new Date(2026, 5, 30),
      opcina: "019",
      budzetskaOrganizacija: "0000000",
      pozivNaBroj: "0000000006",
    },
    {
      tip: "prenos",
      racun: "5520461543115616",
      naziv: "ELVEDIN NUHOVIĆ",
      mjesto: "CAZIN",
      svrha: "NETO PLATA 06/26.",
      sifra1: "01",
      sifra2: "10",
      sifra3: "",
      iznosFeninga: 170010,
    },
  ],
};

test("golden: izvoz_naloga.txt, profil halcom, bajt po bajt", () => {
  assert.equal(
    typeof formatTkdis,
    "function",
    "formatTkdis još ne postoji (piše se u Koraku 3)",
  );
  const actual = formatTkdis(IZVOZ_NALOGA_INPUT, "halcom");
  assert.ok(Buffer.isBuffer(actual), "izlaz mora biti Buffer");
  uporediSaIzuzetkom(actual, ucitajFixture("izvoz_naloga.txt"), "izvoz_naloga");
});

// ── Golden 2: MAX_COP.txt (1 nalog, skraćivanje mjesta na 10) ────────────────
// Mjesto platioca je "BOSANSKA KRUPA": u datoteci mora biti "BOSANSKA K".
// Svrha nosi Š (ZAPOŠLJAVANJE) koje YUSCII piše kao "[".

const MAX_COP_INPUT = {
  platilac: {
    racun: "198-501-10100197-08",
    naziv: "MAX-COP DOO B. KRUPA",
    mjesto: "BOSANSKA KRUPA",
  },
  datumValute: new Date(2026, 5, 2),
  nalozi: [
    {
      tip: "javniPrihod",
      racun: "338-690-22963585-21",
      naziv: "FOND ZA PROF.REHAB.I ZAP.INVA.LICA",
      mjesto: "SARAJEVO",
      svrha:
        "NAKNADA ZA PODSTICANJE REHABILITACIJE I ZAPOŠLJAVANJE LICA SA INVALIDITETOM",
      iznosFeninga: 9231,
      jib: "4263866080009",
      vrstaPrihoda: "722569",
      periodOd: new Date(2026, 4, 1),
      periodDo: new Date(2026, 4, 31),
      opcina: "008",
      budzetskaOrganizacija: "0000000",
      pozivNaBroj: "0000000005",
    },
  ],
};

test("golden: MAX_COP.txt, profil halcom, bajt po bajt", () => {
  assert.equal(
    typeof formatTkdis,
    "function",
    "formatTkdis još ne postoji (piše se u Koraku 3)",
  );
  const actual = formatTkdis(MAX_COP_INPUT, "halcom");
  assert.ok(Buffer.isBuffer(actual), "izlaz mora biti Buffer");
  uporediSaIzuzetkom(actual, ucitajFixture("MAX_COP.txt"), "MAX_COP");
});

// ── Poziv odobrenja: naše pravilo (datum valute DD-MM-GGGG, model 00) ────────
// Izuzet je iz golden poređenja, pa se provjerava zasebno: oba profila pišu
// model "00" na 253-254 i datum valute na 255-264, ostatak razmaci.

test("poziv odobrenja = datum valute DD-MM-GGGG uz model 00", () => {
  assert.equal(
    typeof formatTkdis,
    "function",
    "formatTkdis još ne postoji (piše se u Koraku 3)",
  );
  const actual = formatTkdis(MAX_COP_INPUT, "halcom");
  const red3 = actual.subarray(2 * ROW_TOTAL, 3 * ROW_TOTAL).toString("latin1");
  assert.equal(red3.substr(252, 2), "00", "model poziva odobrenja");
  assert.equal(red3.substr(254, 22), "02-06-2026            ", "poziv odobrenja");
});

// ── UniCredit profil: iste pozicije, drugi encoding, bez 0x1A ────────────────
// Nema fixture iz stvarne banke, pa se provjerava da se izlaz od Halcom
// izlaza razlikuje SAMO u encodingu dijakritike i završnom 0x1A bajtu.

test("unicredit profil: razlika samo encoding dijakritike i 0x1A", () => {
  assert.equal(
    typeof formatTkdis,
    "function",
    "formatTkdis još ne postoji (piše se u Koraku 3)",
  );
  const halcom = formatTkdis(IZVOZ_NALOGA_INPUT, "halcom");
  const unicredit = formatTkdis(IZVOZ_NALOGA_INPUT, "unicredit");

  // bez 0x1A na kraju, inače ista dužina
  assert.equal(halcom[halcom.length - 1], 0x1a);
  assert.notEqual(unicredit[unicredit.length - 1], 0x1a);
  assert.equal(unicredit.length, halcom.length - 1);

  // Windows-1250 bajtovi za dijakritiku (uppercase): Ž 0x8E, Ć 0xC6, [itd].
  const CP1250 = { "Č": 0xc8, "Ć": 0xc6, "Ž": 0x8e, "Š": 0x8a, "Đ": 0xd0 };
  const YUSCII = { "Č": 0x5e, "Ć": 0x5d, "Ž": 0x40, "Š": 0x5b, "Đ": 0x5c };
  const yusciiToCp = new Map(
    Object.keys(YUSCII).map((s) => [YUSCII[s], CP1250[s]]),
  );

  for (let i = 0; i < unicredit.length; i++) {
    if (halcom[i] === unicredit[i]) continue;
    const ocekivano = yusciiToCp.get(halcom[i]);
    assert.equal(
      unicredit[i],
      ocekivano,
      `bajt ${i}: halcom 0x${halcom[i].toString(16)} vs unicredit ` +
        `0x${unicredit[i].toString(16)}, dozvoljena je samo YUSCII→cp1250 zamjena`,
    );
  }
});
