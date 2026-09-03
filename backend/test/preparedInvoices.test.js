// Pripremljeni (ponavljajući) računi: provjere koje čuvaju korisnika od tihih
// grešaka.
//   • autoDan izvan opsega 1-28 mora vratiti razumljivu poruku, ne tiho null
//     (polje prima dvije cifre, pa je 30 lako upisati),
//   • autoEmail bez adrese kupca se odbija (inače se faktura pravi svaki
//     mjesec i nikad ne ode),
//   • valuta i vrsta isporuke se izmjenom ne smiju vratiti na BAM/OPOREZIVA,
//   • grupno fakturisanje preskače šablone već fakturisane u tekućem periodu.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JMBG_ENCRYPT_KEY = process.env.JMBG_ENCRYPT_KEY || "0".repeat(64);

const models = require("../src/models/index");
const c = require("../src/controllers/preparedInvoicesController");

// ADMIN prolazi kroz provjeru paketa bez ijednog upita u bazu, pa se u testu
// gleda samo validacija tijela zahtjeva.
const admin = { id: 1, role: "ADMIN" };

function lazniRes() {
  const r = { statusCode: 200, body: null };
  r.status = (s) => {
    r.statusCode = s;
    return r;
  };
  r.json = (b) => {
    r.body = b;
    return r;
  };
  return r;
}

const validnoTijelo = (extra = {}) => ({
  organizationId: 5,
  frequency: "MONTHLY",
  buyer: { name: "Kupac d.o.o.", email: "kupac@primjer.ba" },
  items: [{ name: "Usluga", quantity: 1, unitPrice: 100, vatPct: 17 }],
  ...extra,
});

// ── snimanje (create/update) ───────────────────────────────────────────────
const original = {
  tx: models.sequelize.transaction,
  prepCreate: models.PreparedInvoice.create,
  prepFind: models.PreparedInvoice.findByPk,
  itemCreate: models.PreparedInvoiceItem.create,
  itemDestroy: models.PreparedInvoiceItem.destroy,
};
let snimljeno = null;

test.before(() => {
  models.sequelize.transaction = async (fn) => fn({});
  models.PreparedInvoice.create = async (v) => {
    snimljeno = { ...v, id: 11, items: [] };
    return snimljeno;
  };
  models.PreparedInvoice.findByPk = async () => snimljeno;
  models.PreparedInvoiceItem.create = async (v) => v;
  models.PreparedInvoiceItem.destroy = async () => 0;
});
test.after(() => {
  models.sequelize.transaction = original.tx;
  models.PreparedInvoice.create = original.prepCreate;
  models.PreparedInvoice.findByPk = original.prepFind;
  models.PreparedInvoiceItem.create = original.itemCreate;
  models.PreparedInvoiceItem.destroy = original.itemDestroy;
});

test("autoDan 30 vraća 400 sa razumljivom porukom", async () => {
  const res = lazniRes();
  await c.create({ user: admin, body: validnoTijelo({ autoDan: 30 }) }, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /1 do 28/);
});

test("autoDan 0 i necijeli broj se odbijaju", async () => {
  for (const v of [0, -3, 12.5, "abc"]) {
    const res = lazniRes();
    await c.create({ user: admin, body: validnoTijelo({ autoDan: v }) }, res);
    assert.equal(res.statusCode, 400, `autoDan ${v} mora pasti`);
    assert.match(res.body.error, /1 do 28/);
  }
});

test("prazan autoDan znači samo ručno, nije greška", async () => {
  for (const v of ["", null, undefined]) {
    const res = lazniRes();
    await c.create({ user: admin, body: validnoTijelo({ autoDan: v }) }, res);
    assert.equal(res.statusCode, 201, `autoDan ${v} mora proći`);
    assert.equal(res.body.data.autoDan, null);
  }
});

test("autoDan 1 i 28 prolaze i snime se", async () => {
  for (const v of [1, 28, "28"]) {
    const res = lazniRes();
    await c.create({ user: admin, body: validnoTijelo({ autoDan: v }) }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.autoDan, Number(v));
  }
});

test("autoEmail bez adrese kupca se odbija", async () => {
  const res = lazniRes();
  await c.create(
    {
      user: admin,
      body: validnoTijelo({ autoDan: 10, autoEmail: true, buyer: { name: "Kupac" } }),
    },
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /email adresu kupca/i);
});

test("valuta i vrsta isporuke se snime i ne gube se izmjenom", async () => {
  const res = lazniRes();
  await c.create(
    {
      user: admin,
      body: validnoTijelo({ currency: "EUR", vrstaIsporuke: "IZVOZ", jezik: "en" }),
    },
    res,
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.currency, "EUR");
  assert.equal(res.body.data.vrstaIsporuke, "IZVOZ");

  // stariji klijent koji ne šalje ta polja ne smije vratiti šablon na BAM
  const postojeci = {
    id: 11,
    organizationId: 5,
    currency: "EUR",
    vrstaIsporuke: "IZVOZ",
    items: [],
    update: async (v) => Object.assign(postojeci, v),
  };
  models.PreparedInvoice.findByPk = async () => postojeci;
  const res2 = lazniRes();
  await c.update({ user: admin, params: { id: "11" }, body: validnoTijelo() }, res2);
  assert.equal(res2.statusCode, 200);
  assert.equal(postojeci.currency, "EUR");
  assert.equal(postojeci.vrstaIsporuke, "IZVOZ");
  models.PreparedInvoice.findByPk = async () => snimljeno;
});
