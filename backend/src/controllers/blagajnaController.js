// Blagajna: nalozi za naplatu/isplatu gotovine i izvedeni blagajnički
// dnevnik (donos + promet + saldo za dan/period). Numeracija po tipu i
// godini (unique index + retry). Uredba o uslovima i načinu plaćanja
// gotovim novcem (Sl. novine FBiH 48/15 i 82/15).

const { Op } = require("sequelize");
const { sequelize, BlagajnaNalog, Organization } = require("../models/index");
const { logEvent } = require("./activityController");

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseIsoDate(v) {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function nalogJson(n) {
  return {
    id: n.id,
    tip: n.tip,
    broj: n.broj,
    godina: n.godina,
    oznaka: `${n.broj}/${String(n.godina).slice(-2)}`,
    datum: n.datum,
    iznos: Number(n.iznos),
    lice: n.lice,
    osnov: n.osnov,
    napomena: n.napomena,
  };
}

// saldo blagajne zaključno sa datumom (uključivo)
async function saldoDo(organizationId, datum) {
  const [rows] = await sequelize.query(
    `SELECT
       SUM(CASE WHEN tip = 'NAPLATA' THEN iznos ELSE 0 END) AS naplate,
       SUM(CASE WHEN tip = 'ISPLATA' THEN iznos ELSE 0 END) AS isplate
     FROM blagajna_nalozi
     WHERE organizationId = ? AND datum <= ?`,
    { replacements: [organizationId, datum] },
  );
  return r2((Number(rows[0]?.naplate) || 0) - (Number(rows[0]?.isplate) || 0));
}

// Najniži saldo blagajne na kraju bilo kojeg dana, za kompletnu vremensku
// liniju naloga org-a uz opciono isključen jedan nalog (excludeId) i dodan
// virtuelni (add). Invarijanta blagajne: saldo na kraju dana nikad < 0,
// jer gotovine fizički nema. Dnevna granulacija namjerno: redoslijed
// unutar istog dana je ionako proizvoljan, a dnevnik iskazuje saldo dana.
// (Provjera je van transakcije: dva istovremena zahtjeva teoretski mogu
// proći; prihvatljivo jer blagajnu vodi jedan operater.)
async function minDnevniSaldo(organizationId, { excludeId = null, add = null } = {}) {
  const rows = await BlagajnaNalog.findAll({
    where: { organizationId },
    attributes: ["id", "tip", "iznos", "datum"],
    raw: true,
  });
  const poDanu = new Map();
  const dodaj = (tip, iznos, datum) => {
    const delta = (tip === "NAPLATA" ? 1 : -1) * Number(iznos);
    poDanu.set(datum, (poDanu.get(datum) || 0) + delta);
  };
  for (const r of rows) {
    if (excludeId != null && r.id === excludeId) continue;
    dodaj(r.tip, r.iznos, r.datum);
  }
  if (add) dodaj(add.tip, add.iznos, add.datum);
  let running = 0;
  let min = 0;
  for (const dan of [...poDanu.keys()].sort()) {
    running += poDanu.get(dan);
    if (running < min) min = running;
  }
  return r2(min);
}

function validirajUnos(body) {
  const datum = parseIsoDate(body.datum);
  if (!datum) return { error: "DATUM_INVALID" };
  const iznos = r2(Number(body.iznos));
  if (!Number.isFinite(iznos) || iznos <= 0) return { error: "IZNOS_INVALID" };
  const lice = String(body.lice || "").trim().slice(0, 160);
  const osnov = String(body.osnov || "").trim().slice(0, 255);
  if (!lice) return { error: "LICE_REQUIRED" };
  if (!osnov) return { error: "OSNOV_REQUIRED" };
  return {
    datum,
    iznos,
    lice,
    osnov,
    napomena: String(body.napomena || "").trim() || null,
  };
}

// GET /api/blagajna/:orgId?from=&to=
// Vraća naloge za period, donos (saldo prije from), saldo na kraju perioda,
// redni broj dnevnika za from dan i broj dnevnika PRIJE from-a u godini
// (za numeraciju dnevnika po danima unutar perioda na frontendu), te
// blagajnički maksimum i prijedloge lica/osnova za brži unos.
async function list(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const danas = new Date().toISOString().slice(0, 10);
    const from = parseIsoDate(req.query.from) || danas;
    const to = parseIsoDate(req.query.to) || from;

    const nalozi = await BlagajnaNalog.findAll({
      where: { organizationId, datum: { [Op.between]: [from, to] } },
      order: [["datum", "ASC"], ["id", "ASC"]],
    });

    // donos: saldo prije početka perioda
    const prijeFrom = new Date(`${from}T00:00:00Z`);
    prijeFrom.setUTCDate(prijeFrom.getUTCDate() - 1);
    const donos = await saldoDo(
      organizationId,
      prijeFrom.toISOString().slice(0, 10),
    );

    // redni broj dnevnika u godini: broj različitih dana sa prometom od
    // 1.1. zaključno sa from (dnevnik za "from" dan) + broj prije from-a
    const godina = from.slice(0, 4);
    const [dnevnikRows] = await sequelize.query(
      `SELECT
         COUNT(DISTINCT datum) AS cnt,
         COUNT(DISTINCT CASE WHEN datum < ? THEN datum END) AS cntPrije
       FROM blagajna_nalozi
       WHERE organizationId = ? AND datum >= ? AND datum <= ?`,
      { replacements: [from, organizationId, `${godina}-01-01`, from] },
    );
    const dnevnikBroj = Number(dnevnikRows[0]?.cnt) || 0;
    const dnevnikBrojPrije = Number(dnevnikRows[0]?.cntPrije) || 0;

    // blagajnički maksimum (interna odluka)
    const org = await Organization.findByPk(organizationId, {
      attributes: ["blagajnickiMaksimum"],
    });
    const maksimum =
      org && org.blagajnickiMaksimum != null
        ? Number(org.blagajnickiMaksimum)
        : null;

    // prijedlozi za autocomplete (najskorije korištena lica i osnovi)
    const [liceRows] = await sequelize.query(
      `SELECT lice, MAX(id) AS zadnji FROM blagajna_nalozi
       WHERE organizationId = ? GROUP BY lice ORDER BY zadnji DESC LIMIT 30`,
      { replacements: [organizationId] },
    );
    const [osnovRows] = await sequelize.query(
      `SELECT osnov, MAX(id) AS zadnji FROM blagajna_nalozi
       WHERE organizationId = ? GROUP BY osnov ORDER BY zadnji DESC LIMIT 30`,
      { replacements: [organizationId] },
    );

    const naplate = r2(
      nalozi
        .filter((n) => n.tip === "NAPLATA")
        .reduce((a, n) => a + Number(n.iznos), 0),
    );
    const isplate = r2(
      nalozi
        .filter((n) => n.tip === "ISPLATA")
        .reduce((a, n) => a + Number(n.iznos), 0),
    );

    return res.json({
      ok: true,
      data: {
        from,
        to,
        donos,
        naplate,
        isplate,
        saldo: r2(donos + naplate - isplate),
        dnevnikBroj,
        dnevnikBrojPrije,
        maksimum,
        prijedloziLice: liceRows.map((r) => r.lice),
        prijedloziOsnov: osnovRows.map((r) => r.osnov),
        nalozi: nalozi.map(nalogJson),
      },
    });
  } catch (err) {
    console.error("blagajna list error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/blagajna/:orgId { tip, datum, iznos, lice, osnov, napomena? }
async function create(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const body = req.body || {};
    const tip =
      body.tip === "NAPLATA" ? "NAPLATA" : body.tip === "ISPLATA" ? "ISPLATA" : null;
    if (!tip) return res.status(400).json({ ok: false, error: "INVALID_TIP" });
    const v = validirajUnos(body);
    if (v.error) return res.status(400).json({ ok: false, error: v.error });

    // isplata ne smije odvesti saldo blagajne u minus ni na jednom danu
    // (pokriva i unazad datirane isplate koje bi kasniji dan gurnule u minus)
    if (tip === "ISPLATA") {
      const min = await minDnevniSaldo(organizationId, {
        add: { tip, iznos: v.iznos, datum: v.datum },
      });
      if (min < 0) {
        return res.status(409).json({ ok: false, error: "NEDOVOLJAN_SALDO" });
      }
    }

    const godina = Number(v.datum.slice(0, 4));
    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const created = await sequelize.transaction(async (t) => {
          const max = await BlagajnaNalog.max("broj", {
            where: { organizationId, tip, godina },
            transaction: t,
          });
          return BlagajnaNalog.create(
            {
              organizationId,
              tip,
              broj: (Number(max) || 0) + 1,
              godina,
              datum: v.datum,
              iznos: v.iznos,
              lice: v.lice,
              osnov: v.osnov,
              napomena: v.napomena,
            },
            { transaction: t },
          );
        });
        // statistika PK Office korištenja (admin Aktivnost)
        void logEvent({
          userId: req.user?.id ?? null,
          action: "OFFICE_BLAGAJNA_NALOG",
          label: `${tip === "NAPLATA" ? "Naplata" : "Isplata"} br. ${created.broj}/${godina}`,
          organizationId,
        });
        return res.status(201).json({ ok: true, data: nalogJson(created) });
      } catch (e) {
        if (e.name === "SequelizeUniqueConstraintError" && attempt < 3) continue;
        throw e;
      }
    }
  } catch (err) {
    console.error("blagajna create error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// PUT /api/blagajna/:orgId/:id { datum, iznos, lice, osnov, napomena? }
// Tip i broj naloga se ne mijenjaju; datum mora ostati u istoj godini
// (numeracija naloga je po godini).
async function update(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const nalog = await BlagajnaNalog.findOne({
      where: { id, organizationId },
    });
    if (!nalog) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    const v = validirajUnos(req.body || {});
    if (v.error) return res.status(400).json({ ok: false, error: v.error });
    if (Number(v.datum.slice(0, 4)) !== Number(nalog.godina)) {
      return res.status(400).json({ ok: false, error: "DATUM_GODINA" });
    }

    // vremenska linija sa izmijenjenim nalogom ne smije ni na jednom danu
    // otići u minus (bitno i za smanjenje naplate i za pomjeranje datuma)
    const min = await minDnevniSaldo(organizationId, {
      excludeId: id,
      add: { tip: nalog.tip, iznos: v.iznos, datum: v.datum },
    });
    if (min < 0) {
      return res.status(409).json({ ok: false, error: "NEDOVOLJAN_SALDO" });
    }

    await nalog.update({
      datum: v.datum,
      iznos: v.iznos,
      lice: v.lice,
      osnov: v.osnov,
      napomena: v.napomena,
    });
    return res.json({ ok: true, data: nalogJson(nalog) });
  } catch (err) {
    console.error("blagajna update error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/blagajna/:orgId/:id
async function remove(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const nalog = await BlagajnaNalog.findOne({ where: { id, organizationId } });
    if (!nalog) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

    // brisanje naplate koja je "finansirala" kasnije isplate ne smije
    // odvesti saldo nekog kasnijeg dana u minus
    const min = await minDnevniSaldo(organizationId, { excludeId: id });
    if (min < 0) {
      return res.status(409).json({ ok: false, error: "NEDOVOLJAN_SALDO" });
    }

    await nalog.destroy();
    return res.json({ ok: true });
  } catch (err) {
    console.error("blagajna remove error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// PUT /api/blagajna/:orgId/maksimum { iznos: number | null }
async function setMaksimum(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const raw = (req.body || {}).iznos;
    let iznos = null;
    if (raw != null && raw !== "") {
      iznos = r2(Number(raw));
      if (!Number.isFinite(iznos) || iznos < 0) {
        return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
      }
    }
    await Organization.update(
      { blagajnickiMaksimum: iznos },
      { where: { id: organizationId } },
    );
    return res.json({ ok: true, data: { maksimum: iznos } });
  } catch (err) {
    console.error("blagajna maksimum error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = { list, create, update, remove, setMaksimum };
