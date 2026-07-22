// D-PDV (Dodatak uz PDV prijavu): ručni unos stavki po poreznom periodu.
// Stavke se čuvaju kao JSON mapa (ključ → iznos u KM); frontend definiše
// katalog stavki (izlazi/ulazi + zalihe). Upsert po (org, godina, mjesec).
// Tu je i STANJE PDV-a: knjiga knjiženja prema UINO (obaveze po prijavama,
// uplate, pretplate, povrati, korekcije) sa prijedlozima sa izvoda.
const { Op } = require("sequelize");
const {
  PdvDodatak,
  PdvKnjizenje,
  BankTransaction,
} = require("../models/index");

const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function parsePeriod(query) {
  const year = Number(query.year);
  const month = Number(query.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

// MariaDB vraća JSON kolonu kao string
function parseFields(raw) {
  let v = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}

function toPublic(row) {
  if (!row) return null;
  const plain = row.toJSON ? row.toJSON() : row;
  return { ...plain, fields: parseFields(plain.fields) };
}

// GET /api/pdv/:orgId/dodatak?year=&month=
async function getDodatak(req, res) {
  const organizationId = parseId(req.params.orgId);
  const period = parsePeriod(req.query);
  if (!organizationId || !period) {
    return res.status(400).json({ ok: false, error: "INVALID_PARAMS" });
  }
  const row = await PdvDodatak.findOne({
    where: { organizationId, ...period },
  });
  return res.json({ ok: true, data: toPublic(row) });
}

// PUT /api/pdv/:orgId/dodatak  { year, month, preteznaDjelatnost, fields }
async function upsertDodatak(req, res) {
  const organizationId = parseId(req.params.orgId);
  const body = req.body || {};
  const period = parsePeriod(body);
  if (!organizationId || !period) {
    return res.status(400).json({ ok: false, error: "INVALID_PARAMS" });
  }
  // sanitizacija: samo konačni brojevi, nule se ne čuvaju (štedi prostor)
  const fields = {};
  if (body.fields && typeof body.fields === "object") {
    for (const [key, value] of Object.entries(body.fields)) {
      const n = Number(value);
      if (!Number.isFinite(n) || n === 0) continue;
      fields[String(key).slice(0, 40)] = Math.round(n * 100) / 100;
    }
  }
  const preteznaDjelatnost =
    String(body.preteznaDjelatnost || "").trim() || null;

  const existing = await PdvDodatak.findOne({
    where: { organizationId, ...period },
  });
  const payload = { preteznaDjelatnost, fields };
  const row = existing
    ? await existing.update(payload)
    : await PdvDodatak.create({ organizationId, ...period, ...payload });
  return res.json({ ok: true, data: toPublic(row) });
}

// ─── Stanje PDV-a (knjiga knjiženja prema UINO) ──────────────────────────────

// zaduženje (dug raste) ili odobrenje (dug pada / pretplata raste) po vrsti;
// KOREKCIJA nosi svoj smjer iz zahtjeva
const VRSTA_ZADUZENJE = {
  OBAVEZA: true,
  POVRAT: true,
  PRETPLATA: false,
  UPLATA: false,
};

const parseIsoDate = (v) => {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const parsePeriodStr = (v) => {
  const s = String(v || "").trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : null;
};

function knjizenjeJson(k) {
  return {
    id: k.id,
    datum: k.datum,
    period: k.period,
    vrsta: k.vrsta,
    zaduzenje: Boolean(k.zaduzenje),
    iznos: Number(k.iznos) || 0,
    opis: k.opis,
    transactionId: k.transactionId,
  };
}

// GET /api/pdv/:orgId/stanje — sva knjiženja + saldo + prijedlozi sa izvoda.
// Prijedlozi: potvrđene stavke izvoda kategorije PDV_UIO (uplata) odnosno
// POVRAT_PDV (povrat) koje još nisu vezane ni za jedno knjiženje.
async function getStanje(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const rows = await PdvKnjizenje.findAll({
      where: { organizationId },
      order: [["datum", "ASC"], ["id", "ASC"]],
    });
    const knjizenja = rows.map(knjizenjeJson);
    const saldo =
      Math.round(
        knjizenja.reduce(
          (s, k) => s + (k.zaduzenje ? k.iznos : -k.iznos),
          0,
        ) * 100,
      ) / 100;

    const vezane = new Set(
      knjizenja.map((k) => k.transactionId).filter(Boolean),
    );
    const kandidati = await BankTransaction.findAll({
      where: {
        organizationId,
        status: "CONFIRMED",
        category: { [Op.in]: ["PDV_UIO", "POVRAT_PDV"] },
      },
      attributes: [
        "id",
        "date",
        "description",
        "counterpartyName",
        "amount",
        "direction",
        "category",
      ],
      order: [["date", "DESC"], ["id", "DESC"]],
      raw: true,
    });
    const prijedlozi = kandidati
      .filter((t) => !vezane.has(t.id))
      .map((t) => ({
        transactionId: t.id,
        datum: t.date,
        opis: t.description || t.counterpartyName || "",
        iznos: Number(t.amount) || 0,
        // uplata PDV-a je odliv (UPLATA), povrat je priliv (POVRAT)
        vrsta: t.category === "POVRAT_PDV" ? "POVRAT" : "UPLATA",
      }));

    return res.json({ ok: true, data: { saldo, knjizenja, prijedlozi } });
  } catch (err) {
    console.error("pdv stanje error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/pdv/:orgId/stanje
// { datum, vrsta, iznos, period?, opis?, zaduzenje? (KOREKCIJA), transactionId? }
async function createKnjizenje(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const body = req.body || {};
    const datum = parseIsoDate(body.datum);
    if (!datum) {
      return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
    }
    const vrsta = String(body.vrsta || "");
    if (!["OBAVEZA", "PRETPLATA", "UPLATA", "POVRAT", "KOREKCIJA"].includes(vrsta)) {
      return res.status(400).json({ ok: false, error: "VRSTA_INVALID" });
    }
    const iznos = Math.round((Number(body.iznos) || 0) * 100) / 100;
    if (!(iznos > 0)) {
      return res.status(400).json({ ok: false, error: "IZNOS_INVALID" });
    }
    const period = parsePeriodStr(body.period);
    const zaduzenje =
      vrsta === "KOREKCIJA"
        ? Boolean(body.zaduzenje)
        : VRSTA_ZADUZENJE[vrsta];

    // obaveza/pretplata po prijavi: jedno knjiženje po periodu (izmjena =
    // obriši staro pa proknjiži novo)
    if ((vrsta === "OBAVEZA" || vrsta === "PRETPLATA") && period) {
      const postoji = await PdvKnjizenje.findOne({
        where: {
          organizationId,
          period,
          vrsta: { [Op.in]: ["OBAVEZA", "PRETPLATA"] },
        },
      });
      if (postoji) {
        return res.status(409).json({ ok: false, error: "PERIOD_PROKNJIZEN" });
      }
    }

    const transactionId = parseId(body.transactionId);
    if (transactionId) {
      const tx = await BankTransaction.findOne({
        where: { id: transactionId, organizationId },
      });
      if (!tx) {
        return res.status(404).json({ ok: false, error: "TX_NOT_FOUND" });
      }
      const vec = await PdvKnjizenje.findOne({
        where: { organizationId, transactionId },
      });
      if (vec) {
        return res.status(409).json({ ok: false, error: "TX_PROKNJIZENA" });
      }
    }

    const created = await PdvKnjizenje.create({
      organizationId,
      datum,
      period,
      vrsta,
      zaduzenje,
      iznos,
      opis: String(body.opis || "").trim().slice(0, 255) || null,
      transactionId: transactionId || null,
    });
    return res.status(201).json({ ok: true, data: knjizenjeJson(created) });
  } catch (err) {
    console.error("pdv knjizenje create error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/pdv/:orgId/stanje/:id
async function removeKnjizenje(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const row = await PdvKnjizenje.findOne({ where: { id, organizationId } });
    if (!row) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    await row.destroy();
    return res.json({ ok: true });
  } catch (err) {
    console.error("pdv knjizenje delete error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = {
  getDodatak,
  upsertDodatak,
  getStanje,
  createKnjizenje,
  removeKnjizenje,
};
