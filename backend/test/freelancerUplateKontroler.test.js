// PK Freelancer, kontroler uplata: čuvanje statusa kod izmjene, limit
// besplatnog nivoa kod seljenja datuma u drugu godinu i zaštita od dvostrukog
// unosa iste uplate (osvježena stranica gubi id sačuvanog zapisa).
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JMBG_ENCRYPT_KEY = process.env.JMBG_ENCRYPT_KEY || "0".repeat(64);

const models = require("../src/models/index");
const ctrl = require("../src/controllers/freelancerController");

const KORISNIK = { id: 7, role: "USER" };

function napraviRed(vals) {
  const red = {
    isplatilacId: null,
    datumPlacanja: null,
    datumPredaje: null,
    status: "OBRACUNATO",
    ...vals,
    get() {
      const { get, update, ...plain } = red;
      return plain;
    },
    async update(patch) {
      Object.assign(red, patch);
      return red;
    },
  };
  return red;
}

function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
}

/** Mockuje modele koje dodiruju kreiranje/izmjena uplate i freelancerAccess. */
function mockuj({ hasAccess = false, redovi = [], brojUGodini = 0 } = {}) {
  const original = {
    userFindByPk: models.User.findByPk,
    userFindAll: models.User.findAll,
    subFindOne: models.Subscription.findOne,
    subFindAll: models.Subscription.findAll,
    uplFindOne: models.FreelancerUplata.findOne,
    uplFindAll: models.FreelancerUplata.findAll,
    uplCount: models.FreelancerUplata.count,
    uplCreate: models.FreelancerUplata.create,
    prilogCount: models.FreelancerPrilog.count,
  };
  const pozivi = { count: [], create: [] };

  // freelancerAccess: bez pretplate i bez probe = besplatni nivo
  models.User.findByPk = async () => ({
    id: KORISNIK.id,
    role: hasAccess ? "ADMIN" : "USER",
    freelancerTrialEndsAt: null,
    pkOfficeTrialEndsAt: null,
  });
  models.User.findAll = async () => [];
  models.Subscription.findOne = async () => null;
  models.Subscription.findAll = async () => [];

  models.FreelancerUplata.findOne = async ({ where }) =>
    redovi.find((r) => r.id === where.id && r.userId === where.userId) || null;
  models.FreelancerUplata.findAll = async ({ where }) =>
    redovi.filter(
      (r) =>
        r.userId === where.userId &&
        (where.datumPrimitka === undefined ||
          r.datumPrimitka === where.datumPrimitka) &&
        (where.iznosKm === undefined ||
          Number(r.iznosKm) === Number(where.iznosKm)),
    );
  models.FreelancerUplata.count = async ({ where }) => {
    pozivi.count.push(where);
    return brojUGodini;
  };
  models.FreelancerUplata.create = async (vals) => {
    pozivi.create.push(vals);
    return napraviRed({ id: 99, ...vals });
  };
  models.FreelancerPrilog.count = async () => 0;

  const vrati = () => {
    models.User.findByPk = original.userFindByPk;
    models.User.findAll = original.userFindAll;
    models.Subscription.findOne = original.subFindOne;
    models.Subscription.findAll = original.subFindAll;
    models.FreelancerUplata.findOne = original.uplFindOne;
    models.FreelancerUplata.findAll = original.uplFindAll;
    models.FreelancerUplata.count = original.uplCount;
    models.FreelancerUplata.create = original.uplCreate;
    models.FreelancerPrilog.count = original.prilogCount;
  };
  return { pozivi, vrati };
}

const OSNOVNI_RED = {
  id: 11,
  userId: KORISNIK.id,
  datumPrimitka: "2026-03-10",
  periodMjesec: 3,
  periodGodina: 2026,
  isplatilacNaziv: "Upwork Global Inc.",
  valuta: "BAM",
  iznosValuta: 2000,
  kurs: 1,
  iznosKm: 2000,
  stopaRashoda: 20,
};

// ── Tačka 2: izmjena ne smije obarati status i datume ────────────────────────
test("izmjena bez polja statusa ne gubi već zabilježeno plaćanje", async () => {
  const red = napraviRed({
    ...OSNOVNI_RED,
    status: "PLACENO",
    datumPlacanja: "2026-03-12",
  });
  const { vrati } = mockuj({ redovi: [red] });
  try {
    const res = fakeRes();
    await ctrl.izmijeniUplatu(
      {
        user: KORISNIK,
        params: { id: "11" },
        body: {
          datumPrimitka: "2026-03-10",
          isplatilacNaziv: "Upwork Global Inc.",
          iznosKm: 2100,
        },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(red.iznosKm, 2100, "iznos se mijenja");
    assert.equal(red.status, "PLACENO", "status ostaje");
    assert.equal(red.datumPlacanja, "2026-03-12", "datum plaćanja ostaje");
  } finally {
    vrati();
  }
});

test("izmjena koja pošalje status i datume ih mijenja kao i do sada", async () => {
  const red = napraviRed({
    ...OSNOVNI_RED,
    status: "PLACENO",
    datumPlacanja: "2026-03-12",
  });
  const { vrati } = mockuj({ redovi: [red] });
  try {
    const res = fakeRes();
    await ctrl.izmijeniUplatu(
      {
        user: KORISNIK,
        params: { id: "11" },
        body: {
          datumPrimitka: "2026-03-10",
          isplatilacNaziv: "Upwork Global Inc.",
          iznosKm: 2000,
          status: "OBRACUNATO",
          datumPlacanja: null,
        },
      },
      res,
    );
    assert.equal(red.status, "OBRACUNATO");
    assert.equal(red.datumPlacanja, null);
  } finally {
    vrati();
  }
});

// ── Tačka 3: limit besplatnog nivoa i kod izmjene ────────────────────────────
test("izmjena datuma u punu godinu vraća LIMIT_BESPLATNO", async () => {
  const red = napraviRed({ ...OSNOVNI_RED, datumPrimitka: "2025-12-20" });
  const { pozivi, vrati } = mockuj({ redovi: [red], brojUGodini: 3 });
  try {
    const res = fakeRes();
    await ctrl.izmijeniUplatu(
      {
        user: KORISNIK,
        params: { id: "11" },
        body: {
          datumPrimitka: "2026-05-05",
          isplatilacNaziv: "Upwork Global Inc.",
          iznosKm: 2000,
        },
      },
      res,
    );
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, "LIMIT_BESPLATNO");
    assert.deepEqual(res.body.data, { limit: 3, godina: 2026 });
    assert.equal(red.datumPrimitka, "2025-12-20", "zapis ostaje nepromijenjen");
    // tekući zapis se ne broji u ciljnoj godini
    assert.ok(pozivi.count[0].id, "brojanje isključuje tekući zapis");
  } finally {
    vrati();
  }
});

test("izmjena datuma u godinu sa slobodnim mjestom prolazi", async () => {
  const red = napraviRed({ ...OSNOVNI_RED, datumPrimitka: "2025-12-20" });
  const { vrati } = mockuj({ redovi: [red], brojUGodini: 2 });
  try {
    const res = fakeRes();
    await ctrl.izmijeniUplatu(
      {
        user: KORISNIK,
        params: { id: "11" },
        body: {
          datumPrimitka: "2026-05-05",
          isplatilacNaziv: "Upwork Global Inc.",
          iznosKm: 2000,
        },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(red.datumPrimitka, "2026-05-05");
  } finally {
    vrati();
  }
});

test("izmjena unutar iste godine ne dira limit ni kad je godina puna", async () => {
  const red = napraviRed(OSNOVNI_RED);
  const { pozivi, vrati } = mockuj({ redovi: [red], brojUGodini: 3 });
  try {
    const res = fakeRes();
    await ctrl.izmijeniUplatu(
      {
        user: KORISNIK,
        params: { id: "11" },
        body: {
          datumPrimitka: "2026-03-15",
          isplatilacNaziv: "Upwork Global Inc.",
          iznosKm: 2000,
        },
      },
      res,
    );
    assert.equal(res.statusCode, 200);
    assert.equal(pozivi.count.length, 0, "nema brojanja za istu godinu");
    assert.equal(red.datumPrimitka, "2026-03-15");
  } finally {
    vrati();
  }
});

// ── Tačka 4: dvostruki unos iste uplate ──────────────────────────────────────
test("ponovno slanje iste uplate ažurira postojeći zapis (200, bez novog)", async () => {
  const red = napraviRed({
    ...OSNOVNI_RED,
    isplatilacNaziv: "  upwork   global   inc. ",
    status: "PLACENO",
    datumPlacanja: "2026-03-12",
  });
  const { pozivi, vrati } = mockuj({ redovi: [red], brojUGodini: 3 });
  try {
    const res = fakeRes();
    await ctrl.kreirajUplatu(
      {
        user: KORISNIK,
        body: {
          datumPrimitka: "2026-03-10",
          isplatilacNaziv: "Upwork Global Inc.",
          iznosKm: 2000,
          napomena: "drugi put preuzet obrazac",
        },
      },
      res,
    );
    assert.equal(res.statusCode, 200, "ažuriranje, ne novi zapis");
    assert.equal(pozivi.create.length, 0);
    assert.equal(res.body.data.id, 11);
    assert.equal(red.napomena, "drugi put preuzet obrazac");
    assert.equal(red.status, "PLACENO", "duplikat ne obara status");
  } finally {
    vrati();
  }
});

test("uplata drugog iznosa istog dana je novi zapis (201)", async () => {
  const red = napraviRed(OSNOVNI_RED);
  const { pozivi, vrati } = mockuj({ redovi: [red], brojUGodini: 1 });
  try {
    const res = fakeRes();
    await ctrl.kreirajUplatu(
      {
        user: KORISNIK,
        body: {
          datumPrimitka: "2026-03-10",
          isplatilacNaziv: "Upwork Global Inc.",
          iznosKm: 1500,
        },
      },
      res,
    );
    assert.equal(res.statusCode, 201);
    assert.equal(pozivi.create.length, 1);
    assert.equal(pozivi.create[0].iznosKm, 1500);
  } finally {
    vrati();
  }
});

test("nova uplata preko besplatnog limita i dalje vraća LIMIT_BESPLATNO", async () => {
  const { pozivi, vrati } = mockuj({ redovi: [], brojUGodini: 3 });
  try {
    const res = fakeRes();
    await ctrl.kreirajUplatu(
      {
        user: KORISNIK,
        body: {
          datumPrimitka: "2026-03-10",
          isplatilacNaziv: "Fiverr",
          iznosKm: 800,
        },
      },
      res,
    );
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, "LIMIT_BESPLATNO");
    assert.equal(pozivi.create.length, 0);
  } finally {
    vrati();
  }
});

// ── Tačka 7: GPD predpopuna je dio paketa ────────────────────────────────────
test("GPD podaci: bez paketa 403, sa paketom zbir plaćenog zdravstvenog", async () => {
  const bez = mockuj({ hasAccess: false });
  try {
    const res = fakeRes();
    await ctrl.gpdPodaci({ user: KORISNIK, query: { godina: 2026 } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, "NEMA_PRISTUPA");
  } finally {
    bez.vrati();
  }

  const sa = mockuj({ hasAccess: true });
  try {
    // uplateGodine ide preko findAll sa Op.between, pa vraćamo fiksnu listu
    models.FreelancerUplata.findAll = async () => [
      napraviRed({
        ...OSNOVNI_RED,
        id: 1,
        zdravstveno: 64,
        razlika: 153.6,
        dohodak: 1600,
        status: "PLACENO",
      }),
      napraviRed({
        ...OSNOVNI_RED,
        id: 2,
        zdravstveno: 40,
        razlika: 96,
        dohodak: 1000,
        status: "OBRACUNATO",
      }),
    ];
    const res = fakeRes();
    await ctrl.gpdPodaci({ user: KORISNIK, query: { godina: 2026 } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.zdravstveno, 104, "ukupno ostaje za prikaz");
    assert.equal(res.body.data.zdravstvenoPlaceno, 64, "red 19 GPD-a");
    assert.equal(res.body.data.porezPlacen, 153.6);
  } finally {
    sa.vrati();
  }
});
