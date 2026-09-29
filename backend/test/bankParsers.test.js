// Fixture testovi za parsere bankovnih izvoda. Pokretanje:
//   cd backend && npm test
// Svaki uzorak mora: biti prepoznat kao prava banka, proći validaciju
// salda i imati očekivani broj transakcija i stanja (vrijednosti su
// ručno provjerene iz PDF-ova).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseBankStatement } = require("../src/services/bankStatements");

const FIXTURES = path.join(__dirname, "fixtures");

async function parseFixture(name) {
  const buffer = fs.readFileSync(path.join(FIXTURES, name));
  return parseBankStatement(buffer);
}

function assertValid(r) {
  assert.equal(
    r.ok,
    true,
    `validacija pala: ${JSON.stringify(r.validation && r.validation.errors)}`,
  );
}

test("UniCredit: 2 transakcije, saldo se slaže", async () => {
  const r = await parseFixture("UNICREDIT banka.pdf");
  assertValid(r);
  assert.equal(r.bankId, "unicredit");
  assert.equal(r.transactions.length, 2);
  assert.equal(r.openingBalance, 14356.29);
  assert.equal(r.closingBalance, 10351.29);
  assert.equal(r.validation.computed.totalOut, 4005.0);
  assert.equal(r.validation.computed.totalIn, 0);
  assert.equal(r.statementNumber, "92");
  assert.equal(r.statementDate, "2026-06-08");
  assert.equal(r.transactions[0].date, "2026-06-08");
  assert.equal(r.transactions[0].direction, "out");
  assert.equal(r.transactions[0].amount, 4000.0);
});

test("Raiffeisen: 6 transakcija, saldo po redu se slaže", async () => {
  const r = await parseFixture("RAIFFEISEN banka.pdf");
  assertValid(r);
  assert.equal(r.bankId, "raiffeisen");
  assert.equal(r.transactions.length, 6);
  assert.equal(r.openingBalance, 18577.86);
  assert.equal(r.closingBalance, 13044.11);
  assert.equal(r.validation.computed.totalOut, 5533.75);
  // svaka transakcija nosi saldo nakon (red-po-red validacija aktivna)
  assert.ok(r.transactions.every((t) => t.balanceAfter != null));
  // protivračun iz nastavka opisa
  assert.equal(r.transactions[0].counterpartyAccount, "1861410310551807");
  assert.match(r.transactions[0].counterpartyName, /BABILON DOO/);
});

test("KIB: 1 transakcija, datum izvoda kao datum transakcije", async () => {
  const r = await parseFixture("KIB banka.pdf");
  assertValid(r);
  assert.equal(r.bankId, "kib");
  assert.equal(r.transactions.length, 1);
  assert.equal(r.openingBalance, 5200.83);
  assert.equal(r.closingBalance, 3491.61);
  assert.equal(r.transactions[0].amount, 1709.22);
  assert.equal(r.transactions[0].direction, "out");
  assert.match(r.transactions[0].description, /INDIREKTNI POREZ/);
});

test("Sparkasse: 2 transakcije (polog pazara + provizija)", async () => {
  const r = await parseFixture("SPARKASSE banka.PDF");
  assertValid(r);
  assert.equal(r.bankId, "sparkasse");
  assert.equal(r.transactions.length, 2);
  assert.equal(r.openingBalance, 312.54);
  assert.equal(r.closingBalance, 3309.54);
  assert.equal(r.validation.computed.totalIn, 3000.0);
  assert.equal(r.validation.computed.totalOut, 3.0);
  assert.match(r.transactions[0].description, /POLOG PAZARA/);
});

test("BBI (Asseco): 1 transakcija naknade", async () => {
  const r = await parseFixture("ASA banka.pdf"); // fajl je BBI izvod
  assertValid(r);
  assert.equal(r.bankId, "asseco");
  assert.equal(r.bankName, "BBI Banka");
  assert.equal(r.transactions.length, 1);
  assert.equal(r.openingBalance, 1196.43);
  assert.equal(r.closingBalance, 1186.43);
  assert.equal(r.transactions[0].direction, "out");
  assert.equal(r.transactions[0].amount, 10.0);
  assert.equal(r.transactions[0].date, "2026-06-01");
});

test("MF Banka (Asseco): 1 priliv", async () => {
  const r = await parseFixture("MF banka.pdf");
  assertValid(r);
  assert.equal(r.bankId, "asseco");
  assert.equal(r.bankName, "MF Banka");
  assert.equal(r.transactions.length, 1);
  assert.equal(r.openingBalance, 2683.46);
  assert.equal(r.closingBalance, 4775.76);
  assert.equal(r.transactions[0].direction, "in");
  assert.equal(r.transactions[0].amount, 2092.3);
  assert.match(r.transactions[0].counterpartyName, /MARANA/);
  assert.equal(r.transactions[0].counterpartyAccount, "5723760000066796");
});

test("Ziraat (Asseco): 6 transakcija, 2 priliva i 4 odliva", async () => {
  const r = await parseFixture("ZIRAAT banka.pdf");
  assertValid(r);
  assert.equal(r.bankId, "asseco");
  assert.equal(r.bankName, "Ziraat Bank");
  assert.equal(r.transactions.length, 6);
  assert.equal(r.openingBalance, 328493.03);
  assert.equal(r.closingBalance, 325212.76);
  assert.equal(r.validation.computed.totalIn, 442.32);
  assert.equal(r.validation.computed.totalOut, 3722.59);
  const sfPharm = r.transactions.find((t) =>
    /SF PHARM/.test(t.counterpartyName || ""),
  );
  assert.ok(sfPharm, "SF PHARM transakcija mora postojati");
  assert.equal(sfPharm.amount, 3678.48);
  assert.equal(sfPharm.date, "2026-06-08");
});

test("Intesa (KM račun): 1 priliv, protivstrana iz više redova", async () => {
  const r = await parseFixture("INTESA banka 2.pdf");
  assertValid(r);
  assert.equal(r.bankId, "intesa");
  assert.equal(r.account, "1543002021153173");
  assert.equal(r.statementNumber, "42");
  assert.equal(r.statementDate, "2026-08-24");
  assert.equal(r.openingBalance, 12915.44);
  assert.equal(r.closingBalance, 12983.44);
  assert.equal(r.transactions.length, 1);
  const t = r.transactions[0];
  assert.equal(t.direction, "in");
  assert.equal(t.amount, 68.0);
  assert.equal(t.counterpartyAccount, "3383502200648888");
  assert.equal(t.counterpartyName, "UPRAVA ZA INDIREKTNO OPOREZIVANJE U BIH");
  assert.match(t.description, /PDV POVRAT/);
});

test("Intesa (devizni EUR): KM iznosi, validacija u EUR, zaokruživanje 0.01", async () => {
  const r = await parseFixture("INTESA banka.pdf");
  assertValid(r);
  assert.equal(r.bankId, "intesa");
  assert.equal(r.currency, "BAM");
  assert.equal(r.account, "50621210");
  assert.equal(r.statementNumber, "25");
  assert.equal(r.statementDate, "2026-08-13");
  assert.equal(r.openingBalance, 600.24);
  assert.equal(r.closingBalance, 12305.89);
  assert.equal(r.transactions.length, 2);
  assert.equal(r.validation.computed.totalIn, 11734.98);
  assert.equal(r.validation.computed.totalOut, 29.34);
  assert.match(r.transactions[0].description, /6000\.00 EUR/);
  assert.match(r.transactions[1].description, /PROVIZIJA/);
  assert.ok(r.warnings.some((w) => /zaokruživanja/.test(w)));
});

test("Nepoznat PDF vraća UNSUPPORTED_BANK", async () => {
  // KPR obrazac nije izvod — mora biti odbijen kao nepoznata banka
  const buffer = fs.readFileSync(
    path.join(__dirname, "..", "..", "frontend", "public", "templates", "KPR-1041.pdf"),
  );
  const r = await parseBankStatement(buffer);
  assert.equal(r.ok, false);
  assert.ok(
    r.error === "UNSUPPORTED_BANK" || r.error === "NO_TEXT_LAYER",
    `očekivan UNSUPPORTED_BANK/NO_TEXT_LAYER, dobiven ${r.error}`,
  );
});
