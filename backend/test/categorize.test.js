// Testovi seed pravila kategorizacije.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { suggestCategory } = require("../src/services/bankStatements/categorize");

test("UIO račun → PDV_UIO", () => {
  assert.equal(
    suggestCategory({
      direction: "out",
      description: "INDIREKTNI POREZ/ UIO-DOMACA PROIZVODNJA",
      counterpartyAccount: "1610000046470286",
    }),
    "PDV_UIO",
  );
});

test("kantonalni ZZO račun → DOPRINOSI_PODUZETNIKA", () => {
  // USK zoRacun 338-500-22751661-53
  assert.equal(
    suggestCategory({
      direction: "out",
      description: "Doprinos za zdravstveno osiguranje",
      counterpartyAccount: "3385002275166153",
    }),
    "DOPRINOSI_PODUZETNIKA",
  );
});

test("polog pazara → PAZAR", () => {
  assert.equal(
    suggestCategory({ direction: "in", description: "BU- POLOG PAZARA" }),
    "PAZAR",
  );
});

test("sama riječ pazar na prilivu → PAZAR", () => {
  assert.equal(
    suggestCategory({ direction: "in", description: "PAZAR 01-07.07.2026" }),
    "PAZAR",
  );
  assert.equal(
    suggestCategory({ direction: "in", description: "Uplata pazara za vikend" }),
    "PAZAR",
  );
});

test("Novi Pazar (grad) i slične riječi nisu pazar", () => {
  assert.equal(
    suggestCategory({
      direction: "in",
      description: "Placanje po fakturi 12/26, ABC doo Novi Pazar",
    }),
    "PRIHOD_RACUN",
  );
  assert.equal(
    suggestCategory({ direction: "in", description: "Uplata sa bazara" }),
    "PRIHOD_RACUN",
  );
});

test("provizija (odliv) → PROVIZIJA_BANKE, i kad opis spominje pazar", () => {
  assert.equal(
    suggestCategory({ direction: "out", description: "PROVIZIJA- BU- POLOG PAZARA" }),
    "PROVIZIJA_BANKE",
  );
  assert.equal(
    suggestCategory({
      direction: "out",
      description: "Naplata: Naknade po partiji 1414765310013649, dospjele...",
    }),
    "PROVIZIJA_BANKE",
  );
  assert.equal(
    suggestCategory({
      direction: "out",
      description: "/Provizija banke za realizaciju naloga sa brojem 5616",
    }),
    "PROVIZIJA_BANKE",
  );
});

test("POS priliv → PRIHOD_RACUN", () => {
  assert.equal(
    suggestCategory({
      direction: "in",
      description: "/Prijenos po osnovu POS trans. Terminal; PS003418",
    }),
    "PRIHOD_RACUN",
  );
});

test("default: priliv → PRIHOD_RACUN, odliv → null", () => {
  assert.equal(
    suggestCategory({ direction: "in", description: "PLRN 2511662026" }),
    "PRIHOD_RACUN",
  );
  assert.equal(
    suggestCategory({ direction: "out", description: "PLRN 2511662026" }),
    null,
  );
});

test("bankarske naknade i bez dijakritike → PROVIZIJA_BANKE", () => {
  assert.equal(
    suggestCategory({
      direction: "out",
      description: "Naknada za vodjenje transakcijskog racuna",
    }),
    "PROVIZIJA_BANKE",
  );
  assert.equal(
    suggestCategory({ direction: "out", description: "Troskovi platnog prometa" }),
    "PROVIZIJA_BANKE",
  );
  assert.equal(
    suggestCategory({
      direction: "out",
      description: "Naknada za SMS obavjestenja 06/2026",
    }),
    "PROVIZIJA_BANKE",
  );
});

test("anuitet → RATA_KREDITA, isplata kredita → KREDIT_PRILIV", () => {
  assert.equal(
    suggestCategory({ direction: "out", description: "Anuitet po ugovoru o kreditu 123" }),
    "RATA_KREDITA",
  );
  assert.equal(
    suggestCategory({ direction: "in", description: "Isplata kredita po ugovoru 55/26" }),
    "KREDIT_PRILIV",
  );
});

test("plate → PLATE_ZAPOSLENIKA, ali 'placanje'/'uplata' ne", () => {
  assert.equal(
    suggestCategory({ direction: "out", description: "Isplata plata za 06/2026" }),
    "PLATE_ZAPOSLENIKA",
  );
  assert.equal(
    suggestCategory({ direction: "out", description: "LICNA PRIMANJA ZAPOSLENIH" }),
    "PLATE_ZAPOSLENIKA",
  );
  assert.equal(
    suggestCategory({ direction: "out", description: "Placanje po fakturi 12/26" }),
    null,
  );
});

test("režije po nazivu primaoca / zakup / osiguranje → OSTALI_RASHODI", () => {
  assert.equal(
    suggestCategory({
      direction: "out",
      description: "Racun 06/2026",
      counterpartyName: "JP ELEKTROPRIVREDA BIH DD",
    }),
    "OSTALI_RASHODI",
  );
  assert.equal(
    suggestCategory({ direction: "out", description: "Zakupnina za juli" }),
    "OSTALI_RASHODI",
  );
  // osiguranje je oslobođeno PDV-a → rashod bez pretporeza
  assert.equal(
    suggestCategory({
      direction: "out",
      description: "Premija osiguranja po polisi 4411",
    }),
    "OSTALI_RASHODI_BEZ_PDV",
  );
  // doprinos NIJE premija osiguranja (bez računa primaoca → bez prijedloga)
  assert.equal(
    suggestCategory({
      direction: "out",
      description: "Doprinos za zdravstveno osiguranje",
    }),
    null,
  );
});

test("prenos na vlastiti račun → PRENOS_IZMEDJU_RACUNA (oba smjera)", () => {
  assert.equal(
    suggestCategory({ direction: "out", description: "Prenos na vlastiti racun" }),
    "PRENOS_IZMEDJU_RACUNA",
  );
  assert.equal(
    suggestCategory({ direction: "in", description: "Prenos sa vlastitog racuna" }),
    "PRENOS_IZMEDJU_RACUNA",
  );
});

test("UIO po opisu i bez računa primaoca → PDV_UIO", () => {
  assert.equal(
    suggestCategory({ direction: "out", description: "INDIREKTNI POREZ- PDV 06/26" }),
    "PDV_UIO",
  );
});
