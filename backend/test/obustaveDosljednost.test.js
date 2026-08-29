// Obustava mora dati ISTI iznos na SVA četiri mjesta gdje se plata isplaćuje:
// platni listić, pojedinačna uplatnica, mjesečne uplatnice i nalog za
// e-bankarstvo / štampu. Review 30.08.2026. je našao da su PDF uplatnice
// glasile na pun neto dok su nalozi već bili umanjeni, pa je klijent koji
// plaća preko odštampanih uplatnica isplaćivao višak.
//
// Drugi dio: sticky upis obustave na karton radnika smije se desiti samo iz
// najnovijeg mjeseca; ponovni obračun ranijeg mjeseca ne smije obrisati ili
// promijeniti trajnu obustavu.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JMBG_ENCRYPT_KEY = process.env.JMBG_ENCRYPT_KEY || "0".repeat(64);

// Generatori PDF-a se presreću PRIJE nego ih moduli destrukturiraju, da bi se
// vidjeli iznosi koje aplikacija stvarno šalje na uplatnicu.
const uplatnicaPdfPath = require.resolve("../src/utils/uplatnicaPdf");
const stvarniUplatnicaPdf = require(uplatnicaPdfPath);
const pozivi = { pojedinacne: [], zbirne: [] };
require.cache[uplatnicaPdfPath].exports = {
  ...stvarniUplatnicaPdf,
  generateUplatnica: async (opts) => {
    pozivi.pojedinacne.push(opts);
    return Buffer.from("%PDF-1.4\n");
  },
  generateUplatniceCombined: async (lista) => {
    pozivi.zbirne.push(...lista);
    return Buffer.from("%PDF-1.4\n");
  },
};

const { PDFDocument } = require("pdf-lib");
const { addPayslipPage, embedFonts } = require("../src/utils/payslipPdf");
const { generateAllUplatnice } = require("../src/utils/payrollUplatnice");
const {
  buildTkdisIzObracuna,
} = require("../src/services/paymentExport/obracunAdapter");
const models = require("../src/models/index");
const ctrl = require("../src/controllers/payrollController");

// ── zajednički podaci: neto 1.000, dvije obustave 340, obrok 170, prevoz 53 ──
const NETO = 1000;
const OBUSTAVE = 340;
const OBROK = 170;
const PREVOZ = 53;
const NETO_ZA_ISPLATU = NETO - OBUSTAVE; // 660
const UKUPNO_RADNIKU = NETO_ZA_ISPLATU + OBROK + PREVOZ; // 883

const ORG = {
  id: 1,
  type: "COMPANY",
  name: "TESTNA FIRMA d.o.o.",
  address: "Testna ulica 1",
  city: "Sarajevo",
  bankAccount: "199-049-00012345-67",
  taxNumber: "4200000000005",
  payrollAccounts: null,
  toJSON() {
    return { ...this };
  },
};

const RADNIK = {
  id: 7,
  organizationId: 1,
  firstName: "Emir",
  lastName: "Emirovic",
  jmbg: null,
  city: "Sarajevo",
  address: "Radnicka 5",
  bankAccount: "1613000099459684",
  role: "RADNIK",
  prijavaDate: "2020-01-15",
  startDate: "2020-01-15",
  contractedHours: 8,
};

const OBRACUN = {
  id: 11,
  organizationId: 1,
  workerId: 7,
  year: 2026,
  month: 7,
  gross: 1500,
  grossBase: 1500,
  minuliRadRate: 0.4,
  minuliRadYears: 6,
  minuliRadAmount: 36,
  workedMinutes: 10440,
  standardMinutes: 10440,
  sickDays: 0,
  vacationDays: 0,
  overtimeHours: 0,
  nightHours: 0,
  sundayHours: 0,
  holidayHours: 0,
  overtimeAmount: 0,
  nightAmount: 0,
  sundayAmount: 0,
  holidayAmount: 0,
  taxCoefficient: 1,
  deduction: 300,
  empPio: 255,
  empZdravstvo: 187.5,
  empNezaposlenost: 22.5,
  empTotal: 465,
  taxBase: 735,
  incomeTax: 73.5,
  net: NETO,
  erpPio: 37.5,
  erpZdravstvo: 30,
  erpNezaposlenost: 7.5,
  erpTotal: 75,
  vodnaNaknada: 5,
  naknadaNesrece: 5,
  koristNetValue: 0,
  koristBruto: 0,
  mealAllowance: OBROK,
  vacationBonus: 0,
  travelExpense: PREVOZ,
  obustave: OBUSTAVE,
  obustaveStavke: [
    { naziv: "Kredit UniCredit, rata", iznos: 200 },
    { naziv: "Kredit Raiffeisen, rata", iznos: 140 },
  ],
  totalCost: 1700,
  status: "OBRACUNATO",
  paymentDate: "2026-08-05",
};

const kmIzTeksta = (s) => Number(String(s).replace(/[^\d,]/g, "").replace(",", "."));

async function iznosSaListica(payroll) {
  const pdf = await PDFDocument.create();
  const fonts = await embedFonts(pdf);
  const ispisi = [];
  const origAddPage = pdf.addPage.bind(pdf);
  pdf.addPage = (...a) => {
    const page = origAddPage(...a);
    const orig = page.drawText.bind(page);
    page.drawText = (t, o) => {
      ispisi.push({ tekst: String(t), y: Math.round(o.y) });
      return orig(t, o);
    };
    return page;
  };
  addPayslipPage(pdf, payroll, ORG, RADNIK, "2026-08-05", fonts, {});
  const naslov = ispisi.find((i) => i.tekst === "UKUPNO ZA ISPLATU");
  assert.ok(naslov, "listić nema red UKUPNO ZA ISPLATU");
  const iznos = ispisi.find((i) => i.y === naslov.y && /KM$/.test(i.tekst));
  assert.ok(iznos, "uz UKUPNO ZA ISPLATU nema iznosa");
  return { ukupno: kmIzTeksta(iznos.tekst), ispisi };
}

test("isti iznos plate na listiću, uplatnicama i nalogu za banku", async () => {
  // 1) Platni listić
  const { ukupno, ispisi } = await iznosSaListica(OBRACUN);
  assert.equal(ukupno, UKUPNO_RADNIKU, "listić: pogrešno UKUPNO ZA ISPLATU");
  // Neto plata na listiću ostaje PUNA (obustava je odbitak ispod nje).
  const neto = ispisi.find((i) => i.tekst === "NETO PLATA");
  const netoIznos = ispisi.find((i) => i.y === neto.y && /KM$/.test(i.tekst));
  assert.equal(kmIzTeksta(netoIznos.tekst), NETO, "listić: neto ne smije biti umanjen");

  // 2) Pojedinačna uplatnica (dokumenti obračuna)
  pozivi.pojedinacne.length = 0;
  await generateAllUplatnice(OBRACUN, ORG, RADNIK);
  const netoUplatnica = pozivi.pojedinacne.find((o) =>
    String(o.svrha).startsWith("Isplata neto plate"),
  );
  assert.ok(netoUplatnica, "nema uplatnice za neto platu");
  assert.equal(
    netoUplatnica.kmIznos,
    NETO_ZA_ISPLATU,
    "uplatnica glasi na pun neto umjesto na iznos umanjen za obustave",
  );

  // 3) Nalog za e-bankarstvo i štampu
  const { file } = buildTkdisIzObracuna({
    org: ORG,
    payrolls: [OBRACUN],
    workerMap: new Map([[7, RADNIK]]),
    year: 2026,
    month: 7,
    datumValute: new Date(2026, 7, 5),
    combineKantonal: false,
  });
  const nalogPlata = file.nalozi.find((n) =>
    String(n.svrha).startsWith("Isplata neto plate"),
  );
  assert.equal(nalogPlata.iznosFeninga, NETO_ZA_ISPLATU * 100);
  // Obrok i prevoz se NE umanjuju.
  const nalogObrok = file.nalozi.find((n) => n.kategorija === "obrok");
  const nalogPrevoz = file.nalozi.find((n) => n.kategorija === "prevoz");
  assert.equal(nalogObrok.iznosFeninga, OBROK * 100);
  assert.equal(nalogPrevoz.iznosFeninga, PREVOZ * 100);

  // 4) Mjesečne uplatnice (dugme "Preuzmi uplatnice")
  const original = {
    orgFind: models.Organization.findByPk,
    workerAll: models.Worker.findAll,
    payrollAll: models.Payroll.findAll,
    userFind: models.User.findByPk,
    clan: models.OrganizationMember.findOne,
  };
  // createdById mora odgovarati korisniku, inače assertOrgAccess ide na
  // OrganizationMember (i pravu bazu).
  models.Organization.findByPk = async () => ({ ...ORG, createdById: 1 });
  models.OrganizationMember.findOne = async () => ({ id: 1, role: "OWNER" });
  models.Worker.findAll = async () => [RADNIK];
  models.Payroll.findAll = async () => [OBRACUN];
  models.User.findByPk = async () => ({ combineKantonalUplatnice: false });
  pozivi.zbirne.length = 0;
  try {
    const res = {
      statusCode: 200,
      headers: {},
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(v) {
        this.tijelo = v;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end() {
        return this;
      },
    };
    await ctrl.generateMonthlyUplatnice(
      { query: { organizationId: "1", year: "2026", month: "7" }, user: { id: 1 } },
      res,
    );
    assert.equal(res.statusCode, 200, JSON.stringify(res.tijelo));
  } finally {
    models.Organization.findByPk = original.orgFind;
    models.Worker.findAll = original.workerAll;
    models.Payroll.findAll = original.payrollAll;
    models.User.findByPk = original.userFind;
    models.OrganizationMember.findOne = original.clan;
  }
  const zbirnaNeto = pozivi.zbirne.find((o) =>
    String(o.svrha).startsWith("Isplata neto plate"),
  );
  assert.ok(zbirnaNeto, "mjesečne uplatnice nemaju stavku neto plate");
  assert.equal(
    zbirnaNeto.kmIznos,
    NETO_ZA_ISPLATU,
    "mjesečna uplatnica glasi na pun neto umjesto na umanjeni iznos",
  );
});

test("obustava veća od primanja: svugdje 0, nikad negativan iznos", async () => {
  const p = { ...OBRACUN, net: 500, obustave: 900, obustaveStavke: null };
  const { ukupno } = await iznosSaListica(p);
  assert.equal(ukupno, 0, "listić pokazuje negativan iznos");

  pozivi.pojedinacne.length = 0;
  await generateAllUplatnice(p, ORG, RADNIK);
  const netoUplatnica = pozivi.pojedinacne.find((o) =>
    String(o.svrha).startsWith("Isplata neto plate"),
  );
  assert.equal(netoUplatnica, undefined, "uplatnica se ne smije praviti za 0");

  const { file, preskoceni } = buildTkdisIzObracuna({
    org: ORG,
    payrolls: [p],
    workerMap: new Map([[7, RADNIK]]),
    year: 2026,
    month: 7,
    datumValute: new Date(2026, 7, 5),
    combineKantonal: false,
  });
  assert.equal(
    file.nalozi.filter((n) => n.kategorija === "plata").length,
    0,
    "nalog za platu se ne smije generisati",
  );
  assert.ok(
    preskoceni.some((s) => s.stavka === "Neto plata"),
    "preskočena plata mora biti prijavljena",
  );
  // Obrok i prevoz i dalje idu radniku.
  assert.equal(file.nalozi.filter((n) => n.kategorija === "obrok").length, 1);
});

// ── sticky karton: ponovni obračun starog mjeseca ne smije dirati radnika ──
function postaviModele({ noviji, existing, snimljeno }) {
  const original = {
    orgFind: models.Organization.findByPk,
    clan: models.OrganizationMember.findOne,
    workerFind: models.Worker.findOne,
    payrollFind: models.Payroll.findOne,
    payrollCreate: models.Payroll.create,
  };
  models.Organization.findByPk = async () => ({ ...ORG, createdById: 1 });
  models.OrganizationMember.findOne = async () => ({ id: 1, role: "OWNER" });
  models.Worker.findOne = async () => ({
    ...RADNIK,
    obustave: [{ naziv: "Obustava na platu", iznos: 340, aktivna: true }],
    update: async (data) => {
      snimljeno.push(data);
      return [1];
    },
  });
  models.Payroll.findOne = async (opts) => {
    const where = opts?.where ?? {};
    // Upit sa Op.or je provjera "postoji li noviji obračun".
    const kljucevi = Object.getOwnPropertySymbols(where);
    if (kljucevi.length > 0) return noviji ? { id: 99 } : null;
    if (where.paymentDate) return null; // peer datum isplate
    return existing;
  };
  models.Payroll.create = async (payload) => ({ ...payload, id: 12 });
  return () => {
    models.Organization.findByPk = original.orgFind;
    models.OrganizationMember.findOne = original.clan;
    models.Worker.findOne = original.workerFind;
    models.Payroll.findOne = original.payrollFind;
    models.Payroll.create = original.payrollCreate;
  };
}

async function obracunaj({ noviji, existing, obustave }) {
  const snimljeno = [];
  const vrati = postaviModele({ noviji, existing, snimljeno });
  const res = {
    statusCode: 200,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(v) {
      this.tijelo = v;
      return this;
    },
  };
  try {
    await ctrl.calculate(
      {
        body: {
          organizationId: 1,
          workerId: 7,
          year: 2026,
          month: 7,
          grossBase: 1500,
          taxCoefficient: 1,
          obustave,
        },
        user: { id: 1 },
      },
      res,
    );
  } finally {
    vrati();
  }
  assert.equal(res.statusCode, 200, JSON.stringify(res.tijelo));
  return snimljeno;
}

test("ponovni obračun RANIJEG mjeseca ne dira obustavu na kartonu radnika", async () => {
  // Juli se ponovo obračunava, a avgust već postoji: nula iz starog mjeseca
  // ranije je brisala trajnu obustavu i rata je tiho prestajala da se odbija.
  const snimljeno = await obracunaj({
    noviji: true,
    existing: { ...OBRACUN, obustave: 0, update: async () => {} },
    obustave: 0,
  });
  assert.equal(snimljeno.length, 1, "worker.update se mora pozvati (sticky stope)");
  assert.ok(
    !("obustave" in snimljeno[0]),
    "karton radnika je promijenjen iz ranijeg mjeseca",
  );
});

test("obračun NAJNOVIJEG mjeseca sa nulom skida obustavu sa kartona", async () => {
  const snimljeno = await obracunaj({
    noviji: false,
    existing: { ...OBRACUN, obustave: 340, update: async () => {} },
    obustave: 0,
  });
  assert.equal(snimljeno[0].obustave, null, "obustava nije skinuta sa kartona");
});

test("obračun najnovijeg mjeseca sa novim iznosom pamti novi iznos", async () => {
  const snimljeno = await obracunaj({
    noviji: false,
    existing: { ...OBRACUN, obustave: 340, update: async () => {} },
    obustave: 500,
  });
  assert.deepEqual(snimljeno[0].obustave, [
    { naziv: "Obustava na platu", iznos: 500, aktivna: true },
  ]);
});
