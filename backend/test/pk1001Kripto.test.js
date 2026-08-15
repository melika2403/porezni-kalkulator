// JMBG izdržavanih članova (PK-1001) mora u bazu ići kriptovan, isto kao
// JMBG samog radnika. Regresija iz reviewa 15.08.2026: cijeli JSON se ranije
// snimao u čistom tekstu, pa su JMBG-ovi djece i supružnika stajali otvoreni
// u bazi dok je radnikov bio kriptovan.
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JMBG_ENCRYPT_KEY =
  process.env.JMBG_ENCRYPT_KEY || "0".repeat(64);

const { decryptJmbg } = require("../src/utils/encryptJmbg");
const ctrl = require("../src/controllers/workersController");

// Kontroler ne izvozi helpere, pa se ponašanje provjerava kroz update rutu sa
// lažnim req/res. Bez baze: presrećemo Worker.update kroz model modul.
const models = require("../src/models/index");

function lazniRes() {
  const res = {
    statusCode: 200,
    tijelo: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(v) {
      this.tijelo = v;
      return this;
    },
  };
  return res;
}

const PODACI = {
  imeRoditelja: "Salih",
  opcina: "Cazin",
  djeca: [
    { jmb: "0101015123456", imePrezime: "Prvo dijete", udioPosto: "100" },
    { jmb: "123", imePrezime: "Nepotpun JMB", udioPosto: "" },
  ],
  bracniDrug: [{ jmb: "0202990123456", imePrezime: "Supruga" }],
};

test("JMBG izdržavanih članova se kriptuje pri upisu, a dekriptuje pri čitanju", async (t) => {
  const originalni = {
    findOne: models.Worker.findOne,
    update: models.Worker.update,
    findAll: models.OrganizationMember.findOne,
  };
  let snimljeno = null;

  models.OrganizationMember.findOne = async () => ({ id: 1, role: "OWNER" });
  models.Worker.findOne = async () => ({
    id: 7,
    role: "RADNIK",
    startDate: null,
    endDate: null,
    toJSON() {
      return { id: 7, firstName: "A", lastName: "B", poreznaKarticaPodaci: snimljeno };
    },
  });
  models.Worker.update = async (data) => {
    if (data.poreznaKarticaPodaci !== undefined) {
      snimljeno = data.poreznaKarticaPodaci;
    }
    return [1];
  };
  t.after(() => {
    models.Worker.findOne = originalni.findOne;
    models.Worker.update = originalni.update;
    models.OrganizationMember.findOne = originalni.findAll;
  });

  const res = lazniRes();
  await ctrl.update(
    {
      params: { orgId: "1", workerId: "7" },
      user: { id: 1 },
      body: { poreznaKarticaPodaci: PODACI },
    },
    res,
  );
  assert.equal(res.statusCode, 200, JSON.stringify(res.tijelo));

  // u bazi: ispravan JMBG kriptovan, nepotpun ostaje kakav jeste
  assert.ok(snimljeno, "podaci nisu snimljeni");
  const uBazi = snimljeno.djeca[0].jmb;
  assert.notEqual(uBazi, "0101015123456", "JMBG djeteta je ostao u čistom tekstu");
  assert.equal(decryptJmbg(uBazi), "0101015123456");
  assert.equal(snimljeno.djeca[1].jmb, "123", "nepotpun unos se ne dira");
  assert.notEqual(snimljeno.bracniDrug[0].jmb, "0202990123456");

  // nazad prema korisniku: dekriptovano
  const vraceno = res.tijelo.data.poreznaKarticaPodaci;
  assert.equal(vraceno.djeca[0].jmb, "0101015123456");
  assert.equal(vraceno.bracniDrug[0].jmb, "0202990123456");
  assert.equal(vraceno.imeRoditelja, "Salih");
});

test("prevelik ili neispravan sadržaj se odbija", async (t) => {
  const originalni = {
    findOne: models.Worker.findOne,
    update: models.Worker.update,
    clan: models.OrganizationMember.findOne,
  };
  models.OrganizationMember.findOne = async () => ({ id: 1, role: "OWNER" });
  models.Worker.findOne = async () => ({ id: 7, role: "RADNIK", toJSON: () => ({}) });
  models.Worker.update = async () => [1];
  t.after(() => {
    models.Worker.findOne = originalni.findOne;
    models.Worker.update = originalni.update;
    models.OrganizationMember.findOne = originalni.clan;
  });

  const posalji = async (v) => {
    const res = lazniRes();
    await ctrl.update(
      { params: { orgId: "1", workerId: "7" }, user: { id: 1 }, body: { poreznaKarticaPodaci: v } },
      res,
    );
    return res;
  };

  assert.equal((await posalji([1, 2, 3])).statusCode, 400);
  assert.equal((await posalji({ djeca: "ne-lista" })).statusCode, 400);
  assert.equal(
    (await posalji({ djeca: [{ imePrezime: "x".repeat(500) }] })).statusCode,
    400,
  );
  assert.equal(
    (await posalji({ djeca: Array.from({ length: 40 }, () => ({ jmb: "1" })) }))
      .statusCode,
    400,
  );
  assert.equal((await posalji({ djeca: [{ jmb: 12345 }] })).statusCode, 400);
});
