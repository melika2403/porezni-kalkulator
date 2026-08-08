// Testovi adaptera obračun → TkdisNalog[]: nalozi moraju biti identični
// onome što grade mjesečne uplatnice (isti bucketi, iznosi, računi, svrhe),
// lične isplate bez ispravnog računa se preskaču uz razlog, a cijela datoteka
// se da formatirati bez greške.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildTkdisIzObracuna,
} = require("../src/services/paymentExport/obracunAdapter");
const { formatTkdis } = require("../src/services/paymentExport/tkdisFormatter");

// Sintetički obračun: firma u Bihaću (USK, opština 003), radnik 1 iz Bihaća
// sa računom, radnik 2 iz Cazina (019) BEZ računa.
function sintetickiUlaz(combineKantonal) {
  const org = {
    type: "COMPANY",
    name: "TEST FIRMA DOO",
    city: "Bihać",
    bankAccount: "198-501-10100197-08",
    taxNumber: "4200000000005",
    payrollAccounts: null,
  };
  const workers = new Map([
    [
      1,
      {
        id: 1,
        firstName: "PRVI",
        lastName: "RADNIK",
        city: "Bihać",
        bankAccount: "552-046-15431156-16",
        role: "RADNIK",
      },
    ],
    [
      2,
      {
        id: 2,
        firstName: "DRUGI",
        lastName: "RADNIK",
        city: "Cazin",
        bankAccount: null,
        role: "RADNIK",
      },
    ],
  ]);
  const payrolls = [
    {
      workerId: 1,
      gross: 1200,
      empPio: 100, erpPio: 50,
      empZdravstvo: 80, erpZdravstvo: 40,
      empNezaposlenost: 10, erpNezaposlenost: 5,
      incomeTax: 30,
      net: 1000,
      mealAllowance: 0, vacationBonus: 0, travelExpense: 0,
      vodnaNaknada: 0.5, naknadaNesrece: 0.4,
    },
    {
      workerId: 2,
      gross: 1100,
      empPio: 200, erpPio: 100,
      empZdravstvo: 100, erpZdravstvo: 50,
      empNezaposlenost: 20, erpNezaposlenost: 10,
      incomeTax: 60,
      net: 900,
      mealAllowance: 176, vacationBonus: 0, travelExpense: 0,
      vodnaNaknada: 0.5, naknadaNesrece: 0.4,
    },
  ];
  return buildTkdisIzObracuna({
    org,
    payrolls,
    workerMap: workers,
    year: 2026,
    month: 7,
    datumValute: new Date(2026, 7, 10),
    combineKantonal,
  });
}

function nadji(nalozi, dio) {
  return nalozi.filter((n) => n.svrha.includes(dio));
}

test("javni prihodi identični bucketima mjesečnih uplatnica", () => {
  const { file } = sintetickiUlaz(false);
  const n = file.nalozi;

  // PIO: jedan zbirni nalog, Budžet FBiH, opština firme, budž. org 5102001
  const pio = nadji(n, "Doprinos za PIO/MIO");
  assert.equal(pio.length, 1);
  assert.equal(pio[0].iznosFeninga, 45000); // 100+50+200+100 KM
  assert.equal(pio[0].racun, "102-050-00001066-98");
  assert.equal(pio[0].naziv, "Budžet Federacije BiH");
  assert.equal(pio[0].mjesto, "SARAJEVO");
  assert.equal(pio[0].vrstaPrihoda, "712112");
  assert.equal(pio[0].opcina, "003");
  assert.equal(pio[0].budzetskaOrganizacija, "5102001");
  assert.equal(pio[0].pozivNaBroj, "0000000007");
  assert.equal(pio[0].svrha, "Doprinos za PIO/MIO za 07/2026");

  // Zdravstvo kantonalno: po opštini radnika (Bihać 107,76 + Cazin 134,70)
  const zdrKant = nadji(n, "zdravstvo (kantonalni dio)");
  assert.equal(zdrKant.length, 2);
  assert.deepEqual(
    zdrKant.map((x) => [x.opcina, x.iznosFeninga]),
    [["003", 10776], ["019", 13470]],
  );
  assert.equal(zdrKant[0].mjesto, "BIHAĆ"); // sjedište USK

  // Zdravstvo federalno: zbirno (12,24 + 15,30)
  const zdrFed = nadji(n, "zdravstvo (federalni dio)");
  assert.equal(zdrFed.length, 1);
  assert.equal(zdrFed[0].iznosFeninga, 2754);

  // Nezaposlenost 70/30
  const nezapKant = nadji(n, "nezaposlenost (kantonalni)");
  assert.deepEqual(
    nezapKant.map((x) => [x.opcina, x.iznosFeninga]),
    [["003", 1050], ["019", 2100]],
  );
  const nezapFed = nadji(n, "nezaposlenost (federalni)");
  assert.equal(nezapFed[0].iznosFeninga, 1350);

  // Porez: UVIJEK po opštini radnika
  const porez = nadji(n, "Porez na dohodak");
  assert.deepEqual(
    porez.map((x) => [x.opcina, x.iznosFeninga]),
    [["003", 3000], ["019", 6000]],
  );

  // Vodna + nesreće na kantonalni budžet firme, prazna budž. org → 7 nula
  const vodna = nadji(n, "vodna naknada");
  assert.equal(vodna[0].iznosFeninga, 100);
  assert.equal(vodna[0].budzetskaOrganizacija, "0000000");
  const nesrece = nadji(n, "prirodnih nesreća");
  assert.equal(nesrece[0].iznosFeninga, 80);

  // Fond invalida: 0,5% × (1200+1100) = 11,50 KM (COMPANY)
  const invalidi = nadji(n, "rehabilitaciju");
  assert.equal(invalidi[0].iznosFeninga, 1150);
  assert.equal(invalidi[0].mjesto, "SARAJEVO");

  // Svi javni prihodi nose JIB firme i period mjeseca
  for (const jp of n.filter((x) => x.tip === "javniPrihod")) {
    assert.equal(jp.jib, "4200000000005");
    assert.equal(jp.periodOd.getTime(), new Date(2026, 6, 1).getTime());
    assert.equal(jp.periodDo.getTime(), new Date(2026, 6, 31).getTime());
  }
});

test("objedinjavanje: kantonalni doprinosi na jedan nalog, porez ostaje po opštini", () => {
  const { file } = sintetickiUlaz(true);
  const n = file.nalozi;
  const zdrKant = nadji(n, "zdravstvo (kantonalni dio)");
  assert.equal(zdrKant.length, 1);
  assert.equal(zdrKant[0].iznosFeninga, 10776 + 13470);
  assert.equal(zdrKant[0].opcina, "003"); // sjedište firme
  const nezapKant = nadji(n, "nezaposlenost (kantonalni)");
  assert.equal(nezapKant.length, 1);
  assert.equal(nezapKant[0].iznosFeninga, 1050 + 2100);
  const porez = nadji(n, "Porez na dohodak");
  assert.equal(porez.length, 2, "porez se NE objedinjava");
});

test("lične isplate: nalog po radniku, bez računa se preskače uz razlog", () => {
  const { file, preskoceni } = sintetickiUlaz(false);
  const neto = file.nalozi.filter((x) => x.tip === "prenos");
  assert.equal(neto.length, 1);
  assert.equal(neto[0].racun, "5520461543115616");
  assert.equal(neto[0].naziv, "PRVI RADNIK");
  assert.equal(neto[0].mjesto, "Bihać");
  assert.equal(neto[0].iznosFeninga, 100000);
  assert.equal(neto[0].svrha, "Isplata neto plate za 07/2026, PRVI RADNIK");
  assert.equal(neto[0].sifra3, "");

  // Radnik 2: neto 900 + topli obrok 176, oba preskočena jer nema računa
  assert.equal(preskoceni.length, 2);
  assert.deepEqual(
    preskoceni.map((s) => [s.radnik, s.stavka, s.iznosKm]),
    [
      ["DRUGI RADNIK", "Neto plata", 900],
      ["DRUGI RADNIK", "Topli obrok", 176],
    ],
  );
  assert.ok(preskoceni[0].razlog.includes("nema upisan"));
});

test("nepoznat grad organizacije: kantonalni nalozi u preskočene, ne nestaju tiho", () => {
  const { file, preskoceni } = buildTkdisIzObracuna({
    org: {
      type: "COMPANY",
      name: "FIRMA NEPOZNAT GRAD",
      city: "Nepostojeće Mjesto",
      bankAccount: "198-501-10100197-08",
      taxNumber: "4200000000005",
      payrollAccounts: null,
    },
    payrolls: [
      {
        workerId: 1,
        gross: 1000,
        empPio: 100, erpPio: 50, empZdravstvo: 80, erpZdravstvo: 40,
        empNezaposlenost: 10, erpNezaposlenost: 5, incomeTax: 30, net: 700,
        mealAllowance: 0, vacationBonus: 0, travelExpense: 0,
        vodnaNaknada: 0, naknadaNesrece: 0,
      },
    ],
    workerMap: new Map([[1, { id: 1, firstName: "A", lastName: "B", city: "Nepostojeće Mjesto", bankAccount: null, role: "RADNIK" }]]),
    year: 2026,
    month: 7,
    datumValute: new Date(2026, 7, 10),
    combineKantonal: false,
  });
  // federalni nalozi (PIO, zdr fed, nezap fed) imaju račune i ostaju
  assert.ok(nadji(file.nalozi, "Doprinos za PIO/MIO").length === 1);
  assert.ok(nadji(file.nalozi, "zdravstvo (federalni dio)").length === 1);
  // kantonalni (zdr/nezap kantonalni, porez) nemaju račun → preskočeni sa razlogom
  const stavke = preskoceni.map((s) => s.stavka);
  assert.ok(stavke.some((s) => s.includes("zdravstvo (kantonalni dio)")));
  assert.ok(stavke.some((s) => s.includes("nezaposlenost (kantonalni)")));
  assert.ok(stavke.some((s) => s.includes("Porez na dohodak")));
  for (const s of preskoceni.filter((x) => !x.radnik)) {
    assert.ok(s.razlog.includes("račun primaoca"));
  }
});

test("cijela datoteka iz adaptera se formatira bez greške (oba profila)", () => {
  const { file } = sintetickiUlaz(false);
  const halcom = formatTkdis(file, "halcom");
  const unicredit = formatTkdis(file, "unicredit");
  // adresna + zbirna + nalozi, po 338 bajta, + 0x1A samo za Halcom
  assert.equal(halcom.length, (file.nalozi.length + 2) * 338 + 1);
  assert.equal(unicredit.length, (file.nalozi.length + 2) * 338);
  // zbirna mora nositi zbir svih naloga u feninzima
  const suma = file.nalozi.reduce((s, x) => s + x.iznosFeninga, 0);
  const zbirnaRed = halcom.subarray(338, 676).toString("latin1");
  assert.equal(zbirnaRed.substr(63, 15), String(suma).padStart(15, "0"));
  assert.equal(zbirnaRed.substr(78, 5), String(file.nalozi.length).padStart(5, "0"));
});
