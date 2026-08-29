// Poseban dogovor za PK Office: users.officeMaxObrta (upisuje admin) ima
// prednost nad limitom paketa, npr. 100 obrta po cijeni OFFICE_50. Bez
// upisane vrijednosti sve ostaje na limitu paketa; override ne smije curiti
// drugim korisnicima niti se smjeti postaviti kroz javne rute.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JMBG_ENCRYPT_KEY = process.env.JMBG_ENCRYPT_KEY || "0".repeat(64);
process.env.PK_OFFICE_NAPLATA = "true";

const models = require("../src/models/index");
const { getOfficeAccess } = require("../src/controllers/pkOfficeGateController");
const subs = require("../src/controllers/subscriptionsController");

function mockuj({ officeMaxObrta, plan = "office_50", aktivnihObrta = 60 }) {
  const original = {
    userFind: models.User.findByPk,
    subFind: models.Subscription.findOne,
    memberAll: models.OrganizationMember.findAll,
    orgCount: models.Organization.count,
  };
  models.User.findByPk = async () => ({
    id: 5,
    role: "USER",
    officeMaxObrta,
    pkOfficeTrialEndsAt: null,
  });
  models.Subscription.findOne = async () => ({
    userId: 5,
    isActive: true,
    plan,
    endDate: null,
    isTrial: false,
  });
  // brojAktivnihObrta: članstva pa Organization.count nad aktivnim obrtima
  models.OrganizationMember.findAll = async () =>
    Array.from({ length: aktivnihObrta }, (_, i) => ({ organizationId: i + 1 }));
  models.Organization.count = async () => aktivnihObrta;
  return () => {
    models.User.findByPk = original.userFind;
    models.Subscription.findOne = original.subFind;
    models.OrganizationMember.findAll = original.memberAll;
    models.Organization.count = original.orgCount;
  };
}

test("bez override-a važi limit paketa (60 aktivnih na OFFICE_50 = preko limita)", async () => {
  const vrati = mockuj({ officeMaxObrta: null });
  try {
    const a = await getOfficeAccess(5);
    assert.equal(a.maxObrta, 50);
    assert.equal(a.prekoLimita, true);
    assert.match(a.planNaziv, /do 50 obrta/);
  } finally {
    vrati();
  }
});

test("override 100 pobjeđuje limit paketa i popravlja labelu", async () => {
  const vrati = mockuj({ officeMaxObrta: 100 });
  try {
    const a = await getOfficeAccess(5);
    assert.equal(a.maxObrta, 100);
    assert.equal(a.prekoLimita, false);
    // Labela ne smije i dalje tvrditi "do 50 obrta".
    assert.match(a.planNaziv, /do 100 obrta/);
    assert.equal(a.plan, "office_50", "paket (i cijena) ostaju netaknuti");
  } finally {
    vrati();
  }
});

test("override manji od broja aktivnih uredno javlja preko limita", async () => {
  const vrati = mockuj({ officeMaxObrta: 55, aktivnihObrta: 60 });
  try {
    const a = await getOfficeAccess(5);
    assert.equal(a.maxObrta, 55);
    assert.equal(a.prekoLimita, true);
  } finally {
    vrati();
  }
});

test("nula ili smeće u koloni se ignoriše (važi paket)", async () => {
  for (const v of [0, -5, "abc"]) {
    const vrati = mockuj({ officeMaxObrta: v });
    try {
      const a = await getOfficeAccess(5);
      assert.equal(a.maxObrta, 50, `vrijednost ${JSON.stringify(v)}`);
    } finally {
      vrati();
    }
  }
});

test("upsert validira officeMaxObrta i piše ga na korisnika", async () => {
  // Kontroler ide kroz repository sloj, pa se presreće on, ne modeli.
  const subRepo = require("../src/repositories/subscriptionRepository");
  const userRepo = require("../src/repositories/userRepository");
  const original = {
    getByUserId: subRepo.getByUserId,
    updateUserById: userRepo.updateUserById,
  };
  let snimljeno;
  subRepo.getByUserId = async () => ({
    userId: 5,
    isActive: true,
    plan: "office_50",
  });
  userRepo.updateUserById = async (_id, data) => {
    snimljeno = data;
    return { id: 5 };
  };
  const res = () => ({
    statusCode: 200,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(v) {
      this.tijelo = v;
      return this;
    },
  });
  try {
    // neispravno: decimalno, preveliko, negativno
    for (const lose of [10.5, 5000, -1]) {
      const r = res();
      await subs.upsert(
        { params: { id: "5" }, body: { officeMaxObrta: lose }, user: { id: 1 } },
        r,
      );
      assert.equal(r.statusCode, 400, `vrijednost ${lose} je morala biti odbijena`);
    }
    // ispravno: upiše se na korisnika
    const ok = res();
    await subs.upsert(
      { params: { id: "5" }, body: { officeMaxObrta: 100 }, user: { id: 1 } },
      ok,
    );
    assert.equal(ok.statusCode, 200, JSON.stringify(ok.tijelo));
    assert.deepEqual(snimljeno, { officeMaxObrta: 100 });
    // null skida override
    const skini = res();
    await subs.upsert(
      { params: { id: "5" }, body: { officeMaxObrta: null }, user: { id: 1 } },
      skini,
    );
    assert.equal(skini.statusCode, 200);
    assert.deepEqual(snimljeno, { officeMaxObrta: null });
  } finally {
    subRepo.getByUserId = original.getByUserId;
    userRepo.updateUserById = original.updateUserById;
  }
});

test("javne rute NE primaju officeMaxObrta (samo admin ruta pretplate)", () => {
  // PUT /api/users/:id (profil) ne smije dozvoliti korisniku da sam sebi
  // digne limit: usersController mora ignorisati/odbiti to polje.
  const fs = require("fs");
  const path = require("path");
  const izvor = fs.readFileSync(
    path.join(__dirname, "..", "src", "controllers", "usersController.js"),
    "utf8",
  );
  assert.ok(
    !izvor.includes("officeMaxObrta"),
    "usersController ne smije prihvatati officeMaxObrta",
  );
});
