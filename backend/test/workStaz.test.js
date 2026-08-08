// Staž na platnom listiću: zaključno sa zadnjim danom mjeseca obračuna,
// inkluzivno (kraj = 1. narednog mjeseca), kadrovska konvencija. Slučaj koji
// je klijent prijavio: prijava 01.03.2026., julski listić mora reći 5 mj.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { workStazLabel } = require("../src/utils/payslipPdf");

// kraj za obračun 07/2026 = 2026-08-01 (kako ga računa addPayslipPage)
const KRAJ_JULI = "2026-08-01";

test("prijava 01.03., julski listić: 5 mjeseci (slučaj klijenta)", () => {
  assert.equal(workStazLabel({ prijavaDate: "2026-03-01" }, KRAJ_JULI), "5 mj.");
});

test("prijava usred mjeseca: broje se samo navršeni mjeseci", () => {
  // 15.03. → zaključno sa 31.07. je 4 mj. i 17 dana
  assert.equal(workStazLabel({ prijavaDate: "2026-03-15" }, KRAJ_JULI), "4 mj.");
});

test("prijava 01.07.: na listiću za juli piše 1 mjesec, ne '< 1 mjesec'", () => {
  assert.equal(workStazLabel({ prijavaDate: "2026-07-01" }, KRAJ_JULI), "1 mj.");
});

test("prijava 15.07.: nepun prvi mjesec je '< 1 mjesec'", () => {
  assert.equal(workStazLabel({ prijavaDate: "2026-07-15" }, KRAJ_JULI), "< 1 mjesec");
});

test("decembar prelazi u narednu godinu (kraj = 01.01.)", () => {
  // obračun 12/2026 → kraj 2027-01-01; prijava 01.03. → 10 mj.
  assert.equal(workStazLabel({ prijavaDate: "2026-03-01" }, "2027-01-01"), "10 mj.");
});

test("raniji staž: priorWorkYears se dodaje na staž od prijave", () => {
  // 1 godina prije + od 01.03. do kraja jula (5 mj.) = 1 god. 5 mj.
  assert.equal(
    workStazLabel({ prijavaDate: "2026-03-01", priorWorkYears: 1 }, KRAJ_JULI),
    "1 god. 5 mj.",
  );
});

test("firstEmploymentDate kad nema priorWorkYears", () => {
  // prvo zaposlenje 01.08.2024. → zaključno sa 31.07.2026. tačno 2 godine
  assert.equal(
    workStazLabel({ firstEmploymentDate: "2024-08-01", prijavaDate: "2026-03-01" }, KRAJ_JULI),
    "2 god.",
  );
});
