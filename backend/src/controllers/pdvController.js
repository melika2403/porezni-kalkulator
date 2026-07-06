// D-PDV (Dodatak uz PDV prijavu): ručni unos stavki po poreznom periodu.
// Stavke se čuvaju kao JSON mapa (ključ → iznos u KM); frontend definiše
// katalog stavki (izlazi/ulazi + zalihe). Upsert po (org, godina, mjesec).
const { PdvDodatak } = require("../models/index");

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

module.exports = { getDodatak, upsertDodatak };
