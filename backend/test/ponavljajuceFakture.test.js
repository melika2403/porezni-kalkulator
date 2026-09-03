// Ponavljajuće fakture (dnevni job u notificationsService).
//
// Dvije stvari koje moraju držati pod svaku cijenu:
//   • idempotencija: dnevni job se istog dana zna ponoviti (do 5 puta) i može
//     ga pokrenuti drugi proces u istoj minuti, a kupac smije dobiti tačno
//     jednu fakturu mjesečno. Zaštita je mjesečni ključ u notification_log
//     (jedinstveni indeks), ne samo lastInvoicedAt.
//   • nadoknada: ako prolaz na tačan dan izostane (hosting uspava proces,
//     kratak ispad), faktura mora nastati prvog sljedećeg prolaza u mjesecu.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JMBG_ENCRYPT_KEY = process.env.JMBG_ENCRYPT_KEY || "0".repeat(64);

const models = require("../src/models/index");

// createInvoiceRecord i getOrgOwnerRole se u servisu destrukturiraju pri
// učitavanju, pa se zamjenjuju u require cache-u PRIJE nego se servis učita.
const invoicesPath = require.resolve("../src/controllers/invoicesController");
const tierPath = require.resolve("../src/services/tierService");
require(invoicesPath);
require(tierPath);

let kreirane = [];
let kreiranjePada = false;
require.cache[invoicesPath].exports.createInvoiceRecord = async (payload) => {
  if (kreiranjePada) throw new Error("simulirani pad kreiranja fakture");
  kreirane.push(payload);
  return {
    id: kreirane.length,
    fullNumber: `F-000${kreirane.length}-2026`,
    grossTotal: 117,
  };
};
let paketVlasnika = "BUSINESS";
require.cache[tierPath].exports.getOrgOwnerRole = async () => paketVlasnika;

const {
  ponavljajuceFaktureJob,
  fakturaAutoKljuc,
  FAKTURA_AUTO_TIP,
} = require("../src/services/notificationsService");

// ── okruženje ───────────────────────────────────────────────────────────────
// notification_log se glumi Set-om: findOrCreate vraća created=false kad ključ
// već postoji, isto kao jedinstveni indeks u bazi.
let log = new Set();
let obavijesti = [];
let sablon = null;

const kljucLoga = (w) => `${w.userId}|${w.type}|${w.periodKey}`;

function pripremi({ autoDan = 10, frequency = "MONTHLY", lastInvoicedAt = null, autoEmail = false, buyerEmail = null } = {}) {
  kreirane = [];
  kreiranjePada = false;
  paketVlasnika = "BUSINESS";
  log = new Set();
  obavijesti = [];
  sablon = {
    id: 7,
    organizationId: 3,
    userId: 4,
    frequency,
    active: true,
    autoDan,
    autoEmail,
    applyVat: true,
    vrstaIsporuke: "OPOREZIVA",
    currency: "BAM",
    jezik: "bs",
    buyerName: "Kupac d.o.o.",
    buyerEmail,
    buyerAddress: null,
    buyerCity: null,
    buyerPostalCode: null,
    buyerPhone: null,
    buyerIdNumber: null,
    buyerVatNumber: null,
    notes: null,
    lastInvoicedAt,
    items: [
      { ordinal: 1, name: "Usluga", unit: null, quantity: 1, unitPrice: 100, discountPct: 0, vatPct: 17 },
    ],
    update: async (v) => Object.assign(sablon, v),
  };
  return sablon;
}

const original = {
  preparedAll: models.PreparedInvoice.findAll,
  orgFind: models.Organization.findByPk,
  invFind: models.Invoice.findByPk,
  memberAll: models.OrganizationMember.findAll,
  notifCreate: models.UserNotification.create,
  logFind: models.NotificationLog.findOrCreate,
  logDestroy: models.NotificationLog.destroy,
  tx: models.sequelize.transaction,
};

test.before(() => {
  models.PreparedInvoice.findAll = async () => (sablon ? [sablon] : []);
  models.Organization.findByPk = async () => ({
    id: 3, name: "Obrt", address: null, city: null, phone: null,
    email: null, taxNumber: null, pdvNumber: null, bankAccount: null, logoUrl: null,
  });
  models.OrganizationMember.findAll = async () => [{ userId: 4 }];
  // slanje maila u testu uvijek padne (nema SMTP-a), pa se ne dira baza
  models.Invoice.findByPk = async () => null;
  models.UserNotification.create = async (v) => {
    obavijesti.push(v);
    return v;
  };
  models.NotificationLog.findOrCreate = async ({ where }) => {
    const k = kljucLoga(where);
    if (log.has(k)) return [null, false];
    log.add(k);
    return [null, true];
  };
  models.NotificationLog.destroy = async ({ where }) => {
    log.delete(kljucLoga(where));
    return 1;
  };
  models.sequelize.transaction = async (fn) => fn({});
});

test.after(() => {
  models.PreparedInvoice.findAll = original.preparedAll;
  models.Organization.findByPk = original.orgFind;
  models.Invoice.findByPk = original.invFind;
  models.OrganizationMember.findAll = original.memberAll;
  models.UserNotification.create = original.notifCreate;
  models.NotificationLog.findOrCreate = original.logFind;
  models.NotificationLog.destroy = original.logDestroy;
  models.sequelize.transaction = original.tx;
});

// ── 1) idempotencija ────────────────────────────────────────────────────────
test("prolaz na dan iz šablona pravi tačno jednu fakturu", async () => {
  pripremi({ autoDan: 10 });
  await ponavljajuceFaktureJob(new Date(2026, 8, 10, 8, 0));
  assert.equal(kreirane.length, 1);
  assert.ok(sablon.lastInvoicedAt, "lastInvoicedAt se upisuje uz fakturu");
  assert.ok(log.has(`0|${FAKTURA_AUTO_TIP}|${fakturaAutoKljuc(7, new Date(2026, 8, 10))}`));
});

test("ponovljeni prolaz istog dana ne pravi drugu fakturu", async () => {
  pripremi({ autoDan: 10 });
  const now = new Date(2026, 8, 10, 8, 0);
  await ponavljajuceFaktureJob(now);
  await ponavljajuceFaktureJob(now);
  await ponavljajuceFaktureJob(new Date(2026, 8, 10, 8, 30));
  assert.equal(kreirane.length, 1);
});

test("mjesečni ključ drži i kad lastInvoicedAt nije vidljiv (paralelan proces)", async () => {
  pripremi({ autoDan: 10 });
  await ponavljajuceFaktureJob(new Date(2026, 8, 10, 8, 0));
  assert.equal(kreirane.length, 1);
  // drugi proces čita šablon prije upisa: lastInvoicedAt mu je još prazan
  sablon.lastInvoicedAt = null;
  await ponavljajuceFaktureJob(new Date(2026, 8, 10, 8, 0, 30));
  assert.equal(kreirane.length, 1, "ključ mjeseca mora zaustaviti dupli upis");
});

test("sljedeći mjesec ima svoj ključ, pa faktura ponovo nastaje", async () => {
  pripremi({ autoDan: 10 });
  await ponavljajuceFaktureJob(new Date(2026, 8, 10, 8, 0));
  sablon.lastInvoicedAt = new Date(2026, 8, 10);
  await ponavljajuceFaktureJob(new Date(2026, 9, 10, 8, 0));
  assert.equal(kreirane.length, 2);
});

test("pad kreiranja vraća ključ, pa sljedeći prolaz nadoknadi fakturu", async () => {
  pripremi({ autoDan: 10 });
  kreiranjePada = true;
  await ponavljajuceFaktureJob(new Date(2026, 8, 10, 8, 0));
  assert.equal(kreirane.length, 0);
  assert.equal(log.size, 0, "ključ se poništava kad faktura nije nastala");
  kreiranjePada = false;
  await ponavljajuceFaktureJob(new Date(2026, 8, 10, 9, 0));
  assert.equal(kreirane.length, 1);
});

// ── 2) nadoknada ────────────────────────────────────────────────────────────
test("prolaz poslije dana iz šablona nadoknadi fakturu", async () => {
  pripremi({ autoDan: 5 });
  await ponavljajuceFaktureJob(new Date(2026, 8, 12, 8, 0));
  assert.equal(kreirane.length, 1, "zakašnjeli prolaz mora nadoknaditi mjesec");
});

test("prije dana iz šablona faktura ne nastaje", async () => {
  pripremi({ autoDan: 20 });
  await ponavljajuceFaktureJob(new Date(2026, 8, 12, 8, 0));
  assert.equal(kreirane.length, 0);
});

test("nadoknada u kratkom mjesecu: dan 28 u februaru", async () => {
  pripremi({ autoDan: 28 });
  await ponavljajuceFaktureJob(new Date(2027, 1, 28, 8, 0));
  assert.equal(kreirane.length, 1);
});

test("nadoknada ne pravi drugu fakturu ako je mjesec već fakturisan", async () => {
  pripremi({ autoDan: 5, lastInvoicedAt: new Date(2026, 8, 5) });
  await ponavljajuceFaktureJob(new Date(2026, 8, 12, 8, 0));
  assert.equal(kreirane.length, 0);
});

test("kvartalno se nadoknađuje samo u mjesecima kvartala", async () => {
  pripremi({ autoDan: 5, frequency: "QUARTERLY" });
  await ponavljajuceFaktureJob(new Date(2026, 4, 20, 8, 0)); // maj
  assert.equal(kreirane.length, 0);
  await ponavljajuceFaktureJob(new Date(2026, 6, 20, 8, 0)); // juli
  assert.equal(kreirane.length, 1);
});

// ── 3) pretplata obrta ──────────────────────────────────────────────────────
test("obrt bez paketa se preskače", async () => {
  pripremi({ autoDan: 10 });
  paketVlasnika = "FREE";
  await ponavljajuceFaktureJob(new Date(2026, 8, 10, 8, 0));
  assert.equal(kreirane.length, 0);
  assert.equal(log.size, 0, "ključ se ne troši na obrt bez paketa");
});

// ── 12) obavijest kad slanje padne ──────────────────────────────────────────
test("neuspjelo slanje se izričito javi vlasniku", async () => {
  pripremi({ autoDan: 10, autoEmail: true, buyerEmail: "kupac@primjer.ba" });
  await ponavljajuceFaktureJob(new Date(2026, 8, 10, 8, 0));
  assert.equal(kreirane.length, 1);
  const o = obavijesti.at(-1);
  assert.match(o.title, /email nije poslan/i);
  assert.match(o.body, /NIJE uspjelo/);
  assert.match(o.body, /ručno/);
});
