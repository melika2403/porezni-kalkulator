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
