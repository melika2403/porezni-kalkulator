// Pregled organizacija: broj radnika za status plata se broji po datumima
// prijave/odjave u ODABRANOM mjesecu (isto pravilo kao obračun plata), ne po
// spremljenoj koloni employmentStatus. Test vozi listWithPayrollStatus sa
// lažnim modelima i provjerava da radnik prijavljen i odjavljen usred mjeseca
// ne gura org u "partial" (bulk 2001/2002 bi je tada preskočio).
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

// lažni modeli umjesto baze
const state = { workers: [], payrolls: [], statements: [] };
const modelsPath = require.resolve("../src/models");
const fakeModels = {
  Worker: { findAll: async () => state.workers },
  Payroll: { findAll: async () => state.payrolls },
  BankStatement: { findAll: async () => state.statements },
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const resolved = (() => {
    try {
      return Module._resolveFilename(request, parent);
    } catch {
      return null;
    }
  })();
  if (resolved === modelsPath) return new Proxy(fakeModels, { get: (t, k) => t[k] ?? {} });
  if (resolved && resolved.endsWith(path.join("repositories", "organizationRepository.js"))) {
    return {
      getUserOrganizations: async () => [{ id: 1, name: "Obrt", type: "BUSINESS" }],
      getClientOrganizations: async () => [{ id: 2, name: "Firma", type: "COMPANY" }],
    };
  }
  return origLoad.apply(this, arguments);
};
const { listWithPayrollStatus } = require("../src/controllers/organizationsController");
Module._load = origLoad;

async function pozovi(year, month) {
  let body;
  const res = { status() { return this; }, json(b) { body = b; return b; } };
  await listWithPayrollStatus({ query: { year, month }, user: { id: 7 } }, res);
  return body.data;
}

test("radnik prijavljen i odjavljen u istom mjesecu ne pravi partial", async () => {
  state.workers = [
    { id: 1, organizationId: 1, role: "VLASNIK", prijavaDate: "2020-01-01", odjavaDate: null },
    { id: 2, organizationId: 1, role: "RADNIK", prijavaDate: "2024-05-01", odjavaDate: null },
    // prijavljen i odjavljen u augustu 2026, u bazi ODJAVLJEN
    { id: 3, organizationId: 1, role: "RADNIK", prijavaDate: "2026-08-03", odjavaDate: "2026-08-20" },
  ];
  state.payrolls = [1, 2, 3].map((workerId) => ({
    organizationId: 1, workerId, status: "OBRACUNATO", totalCost: 100, paymentDate: null, mipDownloadedAt: null,
  }));
  const { own } = await pozovi(2026, 8);
  assert.equal(own[0].workerCount, 3);
  assert.equal(own[0].payrollStatus, "obracunato");
  // sljedeći mjesec ga više nema, dva radnika sa dva obračuna
  state.payrolls = [1, 2].map((workerId) => ({
    organizationId: 1, workerId, status: "ISPLACENO", totalCost: 100, paymentDate: null, mipDownloadedAt: null,
  }));
  const sept = await pozovi(2026, 9);
  assert.equal(sept.own[0].workerCount, 2);
  assert.equal(sept.own[0].payrollStatus, "isplaceno");
});

test("radnik prijavljen unaprijed za sljedeći mjesec se ne broji", async () => {
  state.workers = [
    { id: 2, organizationId: 1, role: "RADNIK", prijavaDate: "2024-05-01", odjavaDate: null },
    { id: 4, organizationId: 1, role: "RADNIK", prijavaDate: "2026-09-01", odjavaDate: null },
  ];
  state.payrolls = [{ organizationId: 1, workerId: 2, status: "OBRACUNATO", totalCost: 1, paymentDate: null, mipDownloadedAt: null }];
  const { own } = await pozovi(2026, 8);
  assert.equal(own[0].workerCount, 1);
  assert.equal(own[0].payrollStatus, "obracunato");
});

test("d.o.o.: vlasnik bez prijave se ne broji, direktor sa prijavom ulazi u MIP", async () => {
  state.workers = [
    { id: 10, organizationId: 2, role: "VLASNIK", prijavaDate: "2022-01-01", odjavaDate: null }, // direktor
    { id: 11, organizationId: 2, role: "VLASNIK", prijavaDate: null, odjavaDate: null }, // suvlasnik, nije zaposlen
    { id: 12, organizationId: 2, role: "RADNIK", prijavaDate: "2023-01-01", odjavaDate: null },
  ];
  state.payrolls = [10, 12].map((workerId) => ({
    organizationId: 2, workerId, status: "OBRACUNATO", totalCost: 1, paymentDate: null, mipDownloadedAt: null,
  }));
  const { clients } = await pozovi(2026, 8);
  assert.equal(clients[0].workerCount, 2);
  assert.equal(clients[0].payrollStatus, "obracunato");
  assert.equal(clients[0].mipRelevantno, true);
});

test("obrt sa samo vlasnikom nema MIP obavezu, ali status je obračunato", async () => {
  state.workers = [{ id: 1, organizationId: 1, role: "VLASNIK", prijavaDate: "2020-01-01", odjavaDate: null }];
  state.payrolls = [{ organizationId: 1, workerId: 1, status: "OBRACUNATO", totalCost: 1, paymentDate: null, mipDownloadedAt: null }];
  const { own } = await pozovi(2026, 8);
  assert.equal(own[0].payrollStatus, "obracunato");
  assert.equal(own[0].mipRelevantno, false);
});

test("d.o.o.: obračun neprijavljenog vlasnika ne pravi MIP obavezu", async () => {
  // Zaostali VLASNIK bez datuma prijave (org prebačena na 'vlasnik nije
  // zaposlen') sa starim obračunom: graditelj MIP-a ga izbacuje, pa ni oznaka
  // "MIP nije preuzet" ne smije stajati, inače org zauvijek visi u tom filteru.
  state.workers = [
    { id: 11, organizationId: 2, role: "VLASNIK", prijavaDate: null, odjavaDate: null },
  ];
  state.payrolls = [
    { organizationId: 2, workerId: 11, status: "OBRACUNATO", totalCost: 1, paymentDate: null, mipDownloadedAt: null },
  ];
  const { clients } = await pozovi(2026, 8);
  assert.equal(clients[0].workerCount, 0);
  assert.equal(clients[0].mipRelevantno, false);
});
