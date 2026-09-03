// Testovi dijeljenog redanja radnika (sidebari, aktivni radnici, šihterica):
// prijavljeni po datumu prijave ASC, odjavljeni na dno po datumu odjave ASC.
// Frontend TS modul bez importa, Node ga učitava kroz type-stripping.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { pathToFileURL } = require("url");

const MOD_PATH = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "src",
  "lib",
  "radniciSort.ts",
);

let sortirajRadnike;
test.before(async () => {
  ({ sortirajRadnike } = await import(pathToFileURL(MOD_PATH).href));
});

const r = (id, employmentStatus, prijavaDate, odjavaDate, createdAt) => ({
  id,
  employmentStatus,
  prijavaDate,
  odjavaDate,
  createdAt: createdAt || "2026-01-01",
});

const ids = (arr) => arr.map((w) => w.id).join(",");

test("prijavljeni po datumu prijave, odjavljeni na dno po datumu odjave", () => {
  const rez = sortirajRadnike([
    r(1, "ODJAVLJEN", "2020-01-01", "2026-05-10"),
    r(2, "PRIJAVLJEN", "2024-03-01", null),
    r(3, "ODJAVLJEN", "2019-01-01", "2023-02-15"),
    r(4, "PRIJAVLJEN", "2021-07-15", null),
  ]);
  // prijavljeni: 4 (2021) pa 2 (2024); odjavljeni: 3 (odjava 2023) pa 1 (2026)
  assert.equal(ids(rez), "4,2,3,1");
});

test("draft bez datuma prijave ide na dno prijavljene grupe, iznad odjavljenih", () => {
  const rez = sortirajRadnike([
    r(1, "ODJAVLJEN", "2020-01-01", "2021-01-01"),
    r(2, "DRAFT", null, null),
    r(3, "PRIJAVLJEN", "2022-01-01", null),
  ]);
  assert.equal(ids(rez), "3,2,1");
});

test("odjavljen bez datuma odjave pada na datum prijave", () => {
  const rez = sortirajRadnike([
    r(1, "ODJAVLJEN", "2024-06-01", null),
    r(2, "ODJAVLJEN", "2018-01-01", "2020-01-01"),
  ]);
  // 2 ima odjavu 2020, 1 fallback na prijavu 2024
  assert.equal(ids(rez), "2,1");
});

test("tiebreak: isti datum se rješava datumom kreiranja", () => {
  const rez = sortirajRadnike([
    r(1, "PRIJAVLJEN", "2024-01-01", null, "2024-01-05"),
    r(2, "PRIJAVLJEN", "2024-01-01", null, "2024-01-02"),
  ]);
  assert.equal(ids(rez), "2,1");
});

test("datum sa vremenom i bez vremena se porede kao isti dan", () => {
  const rez = sortirajRadnike([
    r(1, "PRIJAVLJEN", "2024-01-01T00:00:00.000Z", null, "2024-02-01"),
    r(2, "PRIJAVLJEN", "2024-01-01", null, "2024-01-15"),
  ]);
  // isti dan prijave → createdAt odlučuje (2 je stariji)
  assert.equal(ids(rez), "2,1");
});

test("ne mutira ulazni niz", () => {
  const ulaz = [
    r(1, "ODJAVLJEN", "2020-01-01", "2021-01-01"),
    r(2, "PRIJAVLJEN", "2022-01-01", null),
  ];
  const kopija = ulaz.map((w) => w.id);
  sortirajRadnike(ulaz);
  assert.deepEqual(ulaz.map((w) => w.id), kopija);
});
