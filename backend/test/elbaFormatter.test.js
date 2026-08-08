// Testovi ELBA "TXT verzija 2" formattera (BBI / ASA / Sparkasse platforma).
// Nema javnog fixture-a iz banke, pa se provjerava struktura po zvaničnoj
// specifikaciji iz BBI/ASA uputstava: kontrolna linija, CR slogovi, TAB
// polja bez navodnika, cp1250 bajtovi, JP polja samo za javne prihode.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatElba,
  ElbaGreska,
} = require("../src/services/paymentExport/elbaFormatter");

function ulaz() {
  return {
    platilac: {
      racun: "198-501-10100197-08",
      naziv: "Test firma d.o.o. Bihać",
      mjesto: "Bihać",
    },
    datumValute: new Date(2026, 7, 10),
    nalozi: [
      {
        tip: "javniPrihod",
        racun: "1020500000106698",
        naziv: "Budžet Federacije BiH",
        mjesto: "SARAJEVO",
        svrha: "Doprinos za PIO/MIO za 07/2026",
        iznosFeninga: 133176,
        jib: "4263909740008",
        vrstaPrihoda: "712112",
        periodOd: new Date(2026, 6, 1),
        periodDo: new Date(2026, 6, 31),
        opcina: "019",
        budzetskaOrganizacija: "5102001",
        pozivNaBroj: "0000000007",
      },
      {
        tip: "prenos",
        racun: "5520461543115616",
        naziv: "Elvedin Nuhović",
        mjesto: "CAZIN",
        svrha: "Isplata neto plate za 07/2026, Elvedin Nuhović",
        sifra1: "01",
        sifra2: "10",
        sifra3: "",
        iznosFeninga: 170010,
      },
    ],
  };
}

function redovi(buffer) {
  // slogovi su odvojeni CR (0x0D); LF ne smije postojati
  assert.equal(buffer.includes(0x0a), false, "LF ne smije postojati u ELBA datoteci");
  return buffer
    .toString("latin1")
    .split("\r")
    .filter((r) => r.length > 0);
}

test("struktura: kontrolna linija + slog po nalogu, TAB polja bez navodnika", () => {
  const buf = formatElba(ulaz());
  const rows = redovi(buf);
  assert.equal(rows.length, 3); // kontrolna + 2 naloga

  // kontrolna: broj naloga TAB suma (decimalna tačka)
  assert.equal(rows[0], "2\t3031.86"); // 1331,76 + 1700,10

  // javni prihod: 15 polja
  const jp = rows[1].split("\t");
  assert.equal(jp.length, 15);
  assert.equal(jp[0], "1"); // redni broj
  assert.equal(jp[2], "1020500000106698");
  assert.equal(jp[4], "1331.76");
  assert.equal(jp[6], "F"); // hitnost
  assert.equal(jp[7], "4263909740008"); // JIB
  assert.equal(jp[8], "0"); // vrsta uplate
  assert.equal(jp[9], "712112");
  assert.equal(jp[10], "2026-07-01");
  assert.equal(jp[11], "2026-07-31");
  assert.equal(jp[12], "019");
  assert.equal(jp[13], "5102001");
  assert.equal(jp[14], "0000000007");

  // prenos: samo 7 polja (bez JP dijela)
  const pr = rows[2].split("\t");
  assert.equal(pr.length, 7);
  assert.equal(pr[0], "2");
  assert.equal(pr[2], "5520461543115616");
  assert.equal(pr[4], "1700.10");
});

test("cp1250: dijakritika u pravim bajtovima, bez uppercase-a", () => {
  const buf = formatElba(ulaz());
  // "Budžet": ž = 0x9E u cp1250
  assert.ok(buf.includes(0x9e), "malo ž mora biti 0x9E");
  // "Nuhović": ć = 0xE6
  assert.ok(buf.includes(0xe6), "malo ć mora biti 0xE6");
  // naziv pošiljaoca ostaje u izvornom obliku (nije uppercase)
  const rows = redovi(buf);
  assert.ok(rows[1].split("\t")[1].startsWith("Test firma d.o.o."));
});

test("greške: nepodržan znak, TAB u polju, pogrešan račun, prazna datoteka", () => {
  const a = ulaz();
  a.nalozi[1].naziv = "Jörg";
  assert.throws(
    () => formatElba(a),
    (e) => e instanceof ElbaGreska && e.message.includes("naziv primaoca") && e.message.includes("nalog 2"),
  );

  const b = ulaz();
  b.nalozi[0].svrha = "Doprinos\tza PIO";
  assert.throws(
    () => formatElba(b),
    (e) => e instanceof ElbaGreska && e.message.includes("TAB"),
  );

  const c = ulaz();
  c.nalozi[1].racun = "12345";
  assert.throws(
    () => formatElba(c),
    (e) => e instanceof ElbaGreska && e.message.includes("račun primaoca"),
  );

  const d = ulaz();
  d.nalozi = [];
  assert.throws(() => formatElba(d), ElbaGreska);
});

test("kontrolna suma se uvijek slaže sa zbirom naloga", () => {
  const a = ulaz();
  a.nalozi[0].iznosFeninga = 1; // 0.01 KM
  a.nalozi[1].iznosFeninga = 99; // 0.99 KM
  const rows = redovi(formatElba(a));
  assert.equal(rows[0], "2\t1.00");
  assert.equal(rows[1].split("\t")[4], "0.01");
  assert.equal(rows[2].split("\t")[4], "0.99");
});
