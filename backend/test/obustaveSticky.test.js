// Prenos obustave u naredne mjesece (sticky na karton radnika): ručni unos u
// obračunu se pamti kao trajna obustava, ali se ručno održavan karton (svoji
// nazivi ili više stavki) NIKAD ne dira — ručna izmjena tada važi samo za
// jedan mjesec.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  obustaveKartonaSticky,
} = require("../src/controllers/payrollController");

test("prazan karton + ručni unos: kreira trajnu obustavu (prenos u idući mjesec)", () => {
  assert.deepEqual(obustaveKartonaSticky(null, 340), [
    { naziv: "Obustava na platu", iznos: 340, aktivna: true },
  ]);
  assert.deepEqual(obustaveKartonaSticky("[]", 340.518), [
    { naziv: "Obustava na platu", iznos: 340.52, aktivna: true },
  ]);
});

test("prazan karton + obustava 0: karton se ne dira", () => {
  assert.equal(obustaveKartonaSticky(null, 0), undefined);
});

test("naša generička stavka prati novi iznos i briše se na 0", () => {
  const karton = [{ naziv: "Obustava na platu", iznos: 340, aktivna: true }];
  assert.deepEqual(obustaveKartonaSticky(karton, 400), [
    { naziv: "Obustava na platu", iznos: 400, aktivna: true },
  ]);
  // isti iznos: nema upisa
  assert.equal(obustaveKartonaSticky(karton, 340), undefined);
  // korisnik skinuo obustavu: stavka se uklanja (idući mjesec neoznačeno)
  assert.equal(obustaveKartonaSticky(karton, 0), null);
});

test("ručno održavan karton se NE dira (izmjena važi samo za mjesec)", () => {
  const karton = [{ naziv: "Kredit UniCredit, rata", iznos: 250, aktivna: true }];
  assert.equal(obustaveKartonaSticky(karton, 340), undefined);
  assert.equal(obustaveKartonaSticky(karton, 0), undefined);
  const vise = [
    { naziv: "Obustava na platu", iznos: 100, aktivna: true },
    { naziv: "Sindikat", iznos: 20, aktivna: true },
  ];
  assert.equal(obustaveKartonaSticky(vise, 300), undefined);
});

test("neaktivna istoimena stavka se ne duplira nego oživi sa novim iznosom", () => {
  // Ranije: aktivnih 0 → dodavala se NOVA stavka istog naziva, pa je ciklus
  // unos → gašenje → unos gomilao duplikate na kartonu.
  const karton = [{ naziv: "Obustava na platu", iznos: 200, aktivna: false }];
  assert.deepEqual(obustaveKartonaSticky(karton, 340), [
    { naziv: "Obustava na platu", iznos: 340, aktivna: true },
  ]);
  const saDuplikatima = [
    { naziv: "Obustava na platu", iznos: 100, aktivna: true },
    { naziv: "Obustava na platu", iznos: 200, aktivna: false },
    { naziv: "Stari kredit", iznos: 90, aktivna: false },
  ];
  assert.deepEqual(obustaveKartonaSticky(saDuplikatima, 340), [
    { naziv: "Stari kredit", iznos: 90, aktivna: false },
    { naziv: "Obustava na platu", iznos: 340, aktivna: true },
  ]);
});

test("neaktivne stavke se čuvaju uz našu generičku", () => {
  const karton = [
    { naziv: "Stari kredit", iznos: 90, aktivna: false },
    { naziv: "Obustava na platu", iznos: 340, aktivna: true },
  ];
  assert.deepEqual(obustaveKartonaSticky(karton, 400), [
    { naziv: "Stari kredit", iznos: 90, aktivna: false },
    { naziv: "Obustava na platu", iznos: 400, aktivna: true },
  ]);
  assert.deepEqual(obustaveKartonaSticky(karton, 0), [
    { naziv: "Stari kredit", iznos: 90, aktivna: false },
  ]);
});
