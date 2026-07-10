// Blagajna: nalozi za naplatu/isplatu gotovine i izvedeni blagajnički
// dnevnik (donos + promet + saldo za dan/period). Numeracija po tipu i
// godini (unique index + retry). Uredba o uslovima i načinu plaćanja
// gotovim novcem (Sl. novine FBiH 48/15 i 82/15).

const { Op } = require("sequelize");
const { sequelize, BlagajnaNalog } = require("../models/index");

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

// Najmanji saldo blagajne na bilo kojem danu OD `datum` naprijed (uključivo),
// prema trenutnom stanju. Isplata na `datum` umanjuje sve naredne dane za
// isti iznos, pa je uslov: iznos <= ovaj minimum. Time i unazad datirana
// isplata ne može odvesti neki kasniji dan u minus.
async function minSaldoOdDatuma(organizationId, datum) {
  const base = await saldoDo(organizationId, datum);
  const [rows] = await sequelize.query(
    `SELECT tip, iznos FROM blagajna_nalozi
     WHERE organizationId = ? AND datum > ?
     ORDER BY datum ASC, id ASC`,
    { replacements: [organizationId, datum] },
  );
  let running = 0;
  let minRun = 0;
  for (const r of rows) {
    running += (r.tip === "NAPLATA" ? 1 : -1) * Number(r.iznos);
    if (running < minRun) minRun = running;
  }
  return r2(base + minRun);
}

// GET /api/blagajna/:orgId?from=&to=
// Vraća naloge za period, donos (saldo prije from), saldo na kraju perioda
// i redni broj dnevnika (broj različitih dana sa prometom u godini do from).
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
    // 1.1. zaključno sa from (dnevnik za "from" dan)
    const godina = from.slice(0, 4);
    const [dnevnikRows] = await sequelize.query(
      `SELECT COUNT(DISTINCT datum) AS cnt FROM blagajna_nalozi
       WHERE organizationId = ? AND datum >= ? AND datum <= ?`,
      { replacements: [organizationId, `${godina}-01-01`, from] },
    );
    const dnevnikBroj = Number(dnevnikRows[0]?.cnt) || 0;

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
    const datum = parseIsoDate(body.datum);
    if (!datum) return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
    const iznos = r2(Number(body.iznos));
    if (!Number.isFinite(iznos) || iznos <= 0) {
      return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
    }
    const lice = String(body.lice || "").trim().slice(0, 160);
    const osnov = String(body.osnov || "").trim().slice(0, 255);
    if (!lice) return res.status(400).json({ ok: false, error: "LICE_REQUIRED" });
    if (!osnov) return res.status(400).json({ ok: false, error: "OSNOV_REQUIRED" });

    // isplata ne smije odvesti saldo blagajne u minus ni na jednom danu od
    // svog datuma naprijed (gotovine fizički nema); provjera pokriva i
    // unazad datirane isplate koje bi kasniji dan gurnule u minus.
    // (Provjera je van transakcije: dva istovremena zahtjeva teoretski mogu
    // proći; prihvatljivo jer blagajnu vodi jedan operater.)
    if (tip === "ISPLATA") {
      const minFuture = await minSaldoOdDatuma(organizationId, datum);
      if (minFuture - iznos < 0) {
        return res.status(409).json({ ok: false, error: "NEDOVOLJAN_SALDO" });
      }
    }

    const godina = Number(datum.slice(0, 4));
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
              datum,
              iznos,
              lice,
              osnov,
              napomena: String(body.napomena || "").trim() || null,
            },
            { transaction: t },
          );
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

// DELETE /api/blagajna/:orgId/:id
async function remove(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const nalog = await BlagajnaNalog.findOne({ where: { id, organizationId } });
  if (!nalog) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await nalog.destroy();
  return res.json({ ok: true });
}

module.exports = { list, create, remove };
