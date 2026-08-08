// Testovi grešaka TKDIS formattera: umjesto tihog ispuštanja ili pogrešnog
// skraćivanja, formatter BACA grešku sa kontekstom (polje, nalog, vrijednost).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  formatTkdis,
  TkdisGreska,
} = require("../src/services/paymentExport/tkdisFormatter");

function osnovniUlaz() {
  return {
    platilac: {
      racun: "186-222-03109539-77",
      naziv: "TEST FIRMA",
      mjesto: "CAZIN",
    },
    datumValute: new Date(2026, 5, 26),
    nalozi: [
      {
        tip: "prenos",
        racun: "5520461543115616",
        naziv: "TEST RADNIK",
        mjesto: "CAZIN",
        svrha: "NETO PLATA 06/26.",
        sifra1: "01",
        sifra2: "10",
        sifra3: "",
        iznosFeninga: 170010,
      },
    ],
  };
}

test("nepodržan znak baca grešku sa poljem i nalogom u poruci", () => {
  const ulaz = osnovniUlaz();
  ulaz.nalozi[0].naziv = "JÖRG MÜLLER";
  assert.throws(
    () => formatTkdis(ulaz, "halcom"),
    (e) =>
      e instanceof TkdisGreska &&
      e.message.includes("naziv primaoca") &&
      e.message.includes("nalog 1") &&
      e.message.includes("Ö"),
  );
  // isti znak ne postoji ni u našem cp1250 podskupu
  assert.throws(() => formatTkdis(ulaz, "unicredit"), TkdisGreska);
});

test("dijakritika prolazi u oba profila", () => {
  const ulaz = osnovniUlaz();
  ulaz.nalozi[0].naziv = "ŠČĆŽĐ RADNIĆ";
  assert.ok(Buffer.isBuffer(formatTkdis(ulaz, "halcom")));
  assert.ok(Buffer.isBuffer(formatTkdis(ulaz, "unicredit")));
});

test("račun pogrešne dužine baca grešku", () => {
  const ulaz = osnovniUlaz();
  ulaz.nalozi[0].racun = "552046154311561"; // 15 cifara
  assert.throws(
    () => formatTkdis(ulaz, "halcom"),
    (e) => e instanceof TkdisGreska && e.message.includes("račun primaoca"),
  );
});

test("iznos mora biti cijeli broj feninga veći od nule", () => {
  for (const los of [1700.1, 0, -5, NaN]) {
    const ulaz = osnovniUlaz();
    ulaz.nalozi[0].iznosFeninga = los;
    assert.throws(
      () => formatTkdis(ulaz, "halcom"),
      (e) => e instanceof TkdisGreska && e.message.includes("iznos"),
      `iznos ${los} mora pasti`,
    );
  }
});

test("javni prihod: JIB, općina, budžetska org i poziv na broj fiksne dužine", () => {
  const jp = () => ({
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
  });
  const provjeri = (izmjena, polje) => {
    const ulaz = osnovniUlaz();
    ulaz.nalozi = [Object.assign(jp(), izmjena)];
    assert.throws(
      () => formatTkdis(ulaz, "halcom"),
      (e) => e instanceof TkdisGreska && e.message.includes(polje),
      `${polje} mora pasti`,
    );
  };
  provjeri({ jib: "426390974000" }, "JIB"); // 12 cifara
  provjeri({ opcina: "19" }, "šifra općine");
  provjeri({ budzetskaOrganizacija: "" }, "budžetska organizacija");
  provjeri({ pozivNaBroj: "6" }, "poziv na broj");
  provjeri({ vrstaPrihoda: "71611" }, "vrsta prihoda");
});

test("prazna datoteka i nepoznat profil bacaju grešku", () => {
  const ulaz = osnovniUlaz();
  ulaz.nalozi = [];
  assert.throws(() => formatTkdis(ulaz, "halcom"), TkdisGreska);
  assert.throws(() => formatTkdis(osnovniUlaz(), "raiffeisen"), TkdisGreska);
});
