// Putni nalozi: izdavanje, obračun troškova (dnevnice + stvarni troškovi)
// i PDF na frontendu. Numeracija po organizaciji i godini.

const { sequelize, PutniNalog } = require("../models/index");

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseIsoDate(v) {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function amt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? r2(n) : fallback;
}

function vrijeme(v) {
  const s = String(v || "").trim();
  return /^\d{1,2}:\d{2}$/.test(s) ? s.padStart(5, "0") : null;
}

function nalogJson(n) {
  const dnevnice = r2(Number(n.brojDnevnica) * Number(n.dnevnicaIznos));
  // naknada za upotrebu vlastitog vozila (posebna stavka, ne miješa se sa
  // troškovima prevoza po računima)
  const kmNaknada =
    n.predjeniKm != null && n.kmStopa != null
      ? r2(Number(n.predjeniKm) * Number(n.kmStopa))
      : 0;
  const ukupno = r2(
    dnevnice +
      kmNaknada +
      Number(n.troskoviPrevoza) +
      Number(n.troskoviSmjestaja) +
      Number(n.ostaliTroskovi),
  );
  return {
    id: n.id,
    broj: n.broj,
    godina: n.godina,
    oznaka: `${n.broj}/${String(n.godina).slice(-2)}`,
    datum: n.datum,
    workerId: n.workerId,
    radnikIme: n.radnikIme,
    relacija: n.relacija,
    svrha: n.svrha,
    prevoznoSredstvo: n.prevoznoSredstvo,
    polazakDatum: n.polazakDatum,
    polazakVrijeme: n.polazakVrijeme,
    povratakDatum: n.povratakDatum,
    povratakVrijeme: n.povratakVrijeme,
    dnevnicaIznos: Number(n.dnevnicaIznos),
    brojDnevnica: Number(n.brojDnevnica),
    akontacija: Number(n.akontacija),
    troskoviPrevoza: Number(n.troskoviPrevoza),
    troskoviSmjestaja: Number(n.troskoviSmjestaja),
    ostaliTroskovi: Number(n.ostaliTroskovi),
    ostaloOpis: n.ostaloOpis,
    izvjestaj: n.izvjestaj,
    predjeniKm: n.predjeniKm != null ? Number(n.predjeniKm) : null,
    kmStopa: n.kmStopa != null ? Number(n.kmStopa) : null,
    kmNaknada,
    isplacenoDatum: n.isplacenoDatum ?? null,
    blagajnaNalogId: n.blagajnaNalogId ?? null,
    ukupnoDnevnice: dnevnice,
    ukupno,
    zaIsplatu: r2(ukupno - Number(n.akontacija)),
  };
}

function payloadFromBody(body) {
  const datum = parseIsoDate(body.datum);
  const polazakDatum = parseIsoDate(body.polazakDatum);
  const povratakDatum = parseIsoDate(body.povratakDatum);
  const radnikIme = String(body.radnikIme || "").trim().slice(0, 160);
  const relacija = String(body.relacija || "").trim().slice(0, 255);
  const svrha = String(body.svrha || "").trim().slice(0, 255);
  if (!datum || !polazakDatum || !povratakDatum) return { error: "DATUM_INVALID" };
  if (povratakDatum < polazakDatum) return { error: "PERIOD_INVALID" };
  if (!radnikIme) return { error: "RADNIK_REQUIRED" };
  if (!relacija) return { error: "RELACIJA_REQUIRED" };
  if (!svrha) return { error: "SVRHA_REQUIRED" };
  const brojDnevnica = Number(body.brojDnevnica);
  if (!Number.isFinite(brojDnevnica) || brojDnevnica < 0) {
    return { error: "DNEVNICE_INVALID" };
  }
  return {
    value: {
      datum,
      workerId: parseId(body.workerId),
      radnikIme,
      relacija,
      svrha,
      prevoznoSredstvo:
        String(body.prevoznoSredstvo || "").trim().slice(0, 160) || null,
      polazakDatum,
      polazakVrijeme: vrijeme(body.polazakVrijeme),
      povratakDatum,
      povratakVrijeme: vrijeme(body.povratakVrijeme),
      dnevnicaIznos: amt(body.dnevnicaIznos, 25),
      brojDnevnica: Math.round(brojDnevnica * 100) / 100,
      akontacija: amt(body.akontacija),
      troskoviPrevoza: amt(body.troskoviPrevoza),
      troskoviSmjestaja: amt(body.troskoviSmjestaja),
      ostaliTroskovi: amt(body.ostaliTroskovi),
      ostaloOpis: String(body.ostaloOpis || "").trim().slice(0, 255) || null,
      izvjestaj: String(body.izvjestaj || "").trim() || null,
      predjeniKm: (() => {
        const v = Number(body.predjeniKm);
        return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
      })(),
      kmStopa: (() => {
        const v = Number(body.kmStopa);
        return Number.isFinite(v) && v > 0 ? Math.round(v * 1000) / 1000 : null;
      })(),
    },
  };
}

// GET /api/putni-nalozi/:orgId?godina=
async function list(req, res) {
  const organizationId = parseId(req.params.orgId);
  if (!organizationId) {
    return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
  }
  const where = { organizationId };
  const godina = Number(req.query.godina);
  if (Number.isInteger(godina) && godina > 2000) where.godina = godina;
  const rows = await PutniNalog.findAll({
    where,
    order: [["godina", "DESC"], ["broj", "DESC"]],
  });
  return res.json({ ok: true, data: rows.map(nalogJson) });
}

// POST /api/putni-nalozi/:orgId
async function create(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: "INVALID_ORG_ID" });
    }
    const parsed = payloadFromBody(req.body || {});
    if (parsed.error) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }
    const godina = Number(parsed.value.datum.slice(0, 4));
    for (let attempt = 0; ; attempt++) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const created = await sequelize.transaction(async (t) => {
          const max = await PutniNalog.max("broj", {
            where: { organizationId, godina },
            transaction: t,
          });
          return PutniNalog.create(
            {
              organizationId,
              broj: (Number(max) || 0) + 1,
              godina,
              ...parsed.value,
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
    console.error("putni nalog create error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// PUT /api/putni-nalozi/:orgId/:id — dopuna obračuna nakon puta
async function update(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const nalog = await PutniNalog.findOne({ where: { id, organizationId } });
    if (!nalog) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const parsed = payloadFromBody(req.body || {});
    if (parsed.error) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }
    // broj/godina se ne mijenjaju (broj naloga je izdat)
    const { datum, ...rest } = parsed.value;
    await nalog.update({ ...rest, datum });
    return res.json({ ok: true, data: nalogJson(nalog) });
  } catch (err) {
    console.error("putni nalog update error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// POST /api/putni-nalozi/:orgId/:id/isplata { datum, blagajnaNalogId? }
// Evidencija isplate naloga; datum: null poništava oznaku (i vezu na
// blagajnički nalog). Sam blagajnički nalog se kreira posebno kroz
// blagajna API (frontend orkestracija, čuva guard minimalnog salda).
async function oznaciIsplatu(req, res) {
  try {
    const organizationId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!organizationId || !id) {
      return res.status(400).json({ ok: false, error: "INVALID_ID" });
    }
    const nalog = await PutniNalog.findOne({ where: { id, organizationId } });
    if (!nalog) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    if (req.body?.datum === null) {
      await nalog.update({ isplacenoDatum: null, blagajnaNalogId: null });
      return res.json({ ok: true, data: nalogJson(nalog) });
    }
    const datum = parseIsoDate(req.body?.datum);
    if (!datum) {
      return res.status(400).json({ ok: false, error: "DATUM_INVALID" });
    }
    await nalog.update({
      isplacenoDatum: datum,
      blagajnaNalogId: parseId(req.body?.blagajnaNalogId),
    });
    return res.json({ ok: true, data: nalogJson(nalog) });
  } catch (err) {
    console.error("putni nalog isplata error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// DELETE /api/putni-nalozi/:orgId/:id
async function remove(req, res) {
  const organizationId = parseId(req.params.orgId);
  const id = parseId(req.params.id);
  if (!organizationId || !id) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }
  const nalog = await PutniNalog.findOne({ where: { id, organizationId } });
  if (!nalog) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
  await nalog.destroy();
  return res.json({ ok: true });
}

module.exports = { list, create, update, remove, oznaciIsplatu };
