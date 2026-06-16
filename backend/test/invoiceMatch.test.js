// Testovi generisanja varijanti broja fakture za auto-match.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { numberVariants } = require("../src/services/bankStatements/invoiceMatch");

test("varijante za 0042-2026 pokrivaju uobičajene zapise", () => {
  const v = numberVariants("0042-2026", 2026);
  for (const expected of [
    "0042-2026",
    "0042/2026",
    "42-2026",
    "42/2026",
    "0042/26",
    "42/26",
  ]) {
    assert.ok(v.includes(expected), `fali varijanta ${expected}`);
  }
});

test("varijante prepoznaju broj u stvarnom opisu", () => {
  const v = numberVariants("0040-2026", 2026);
  const opis = "UPLATA PO RACUNU BR 40/2026 STUDIO ENA".toUpperCase();
  assert.ok(v.some((x) => opis.includes(x)));
});
