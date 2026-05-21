const { Op } = require("sequelize");
const { Form, FormVersion, Client, OrganizationMember } = require("../models/index");
const { canUserAccessClient } = require("../repositories/clientRepository");

function parseClientId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = parseInt(raw);
  return isNaN(n) ? null : n;
}

// Faza 3: PLDI forme su team-shared kad pripadaju klijentu vezanom za org.
// Pristup: ako klijent ima organizationId → bilo koji član te org-e;
// inače → samo creator (legacy).
async function ensureClientAccess(clientId, userId) {
  if (clientId === null) return { ok: true, type: "personal" };
  const client = await Client.findOne({ where: { id: clientId } });
  if (!client) return { ok: false, reason: "CLIENT_NOT_FOUND" };
  const allowed = await canUserAccessClient(client, userId);
  if (!allowed) return { ok: false, reason: "FORBIDDEN" };
  return { ok: true, type: client.organizationId ? "org" : "personal", client };
}

async function buildAccessibleWhereForList(userId) {
  // Lične PLDI forme + sve PLDI forme klijenata u org-ima u kojima sam član.
  const memberships = await OrganizationMember.findAll({
    where: { userId },
    attributes: ["organizationId"],
  });
  const memberOrgIds = memberships.map((m) => m.organizationId);

  const accessibleClientIds = new Set();
  if (memberOrgIds.length > 0) {
    const orgClients = await Client.findAll({
      where: { organizationId: { [Op.in]: memberOrgIds } },
      attributes: ["id"],
    });
    for (const c of orgClients) accessibleClientIds.add(c.id);
  }

  return { memberOrgIds, accessibleClientIds: [...accessibleClientIds] };
}

async function getYears(req, res) {
  const clientId = parseClientId(req.query.clientId);
  const access = await ensureClientAccess(clientId, req.user.id);
  if (!access.ok) return res.status(access.reason === "CLIENT_NOT_FOUND" ? 404 : 403).json({ ok: false, error: access.reason });

  const where = { type: "PLDI" };
  if (clientId !== null) {
    where.clientId = clientId;
    if (access.type === "personal") where.createdById = req.user.id; // legacy
  } else {
    where.clientId = null;
    where.createdById = req.user.id; // lične, bez klijenta
  }

  const forms = await Form.findAll({ where, attributes: ["year"], order: [["year", "DESC"]] });
  const years = [...new Set(forms.map((f) => f.year))];
  return res.status(200).json({ ok: true, data: years });
}

async function get(req, res) {
  const { godina } = req.query;
  if (!godina) return res.status(400).json({ ok: false, error: "Missing godina" });
  const year = parseInt(godina);
  if (isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const clientId = parseClientId(req.query.clientId);
  const access = await ensureClientAccess(clientId, req.user.id);
  if (!access.ok) return res.status(access.reason === "CLIENT_NOT_FOUND" ? 404 : 403).json({ ok: false, error: access.reason });

  const where = { type: "PLDI", year };
  if (clientId !== null) {
    where.clientId = clientId;
    if (access.type === "personal") where.createdById = req.user.id;
  } else {
    where.clientId = null;
    where.createdById = req.user.id;
  }

  const form = await Form.findOne({
    where,
    include: [{ model: FormVersion, as: "versions", order: [["versionNumber", "DESC"]], limit: 1 }],
  });

  if (!form || !form.versions?.length) return res.status(200).json({ ok: true, data: null });

  const raw = form.versions[0].data;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return res.status(200).json({ ok: true, data: parsed });
}

async function save(req, res) {
  const { godina, obveznik, rows, clientId: rawClientId } = req.body;
  if (!godina) return res.status(400).json({ ok: false, error: "Missing godina" });
  const year = parseInt(godina);
  if (isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const clientId = parseClientId(rawClientId);
  const access = await ensureClientAccess(clientId, req.user.id);
  if (!access.ok) return res.status(access.reason === "CLIENT_NOT_FOUND" ? 404 : 403).json({ ok: false, error: access.reason });

  const where = { type: "PLDI", year };
  if (clientId !== null) {
    where.clientId = clientId;
    if (access.type === "personal") where.createdById = req.user.id;
  } else {
    where.clientId = null;
    where.createdById = req.user.id;
  }

  let form = await Form.findOne({ where });

  if (!form) {
    form = await Form.create({
      type: "PLDI",
      year,
      status: "DRAFT",
      createdById: req.user.id,
      clientId,
      // PLDI nema direktan organizationId — vezuje se kroz client.organizationId
    });
  }

  const dataStr = JSON.stringify({ obveznik, rows });

  const existing = await FormVersion.findOne({ where: { formId: form.id, versionNumber: 1 } });
  if (existing) {
    await FormVersion.update({ data: dataStr }, { where: { formId: form.id, versionNumber: 1 } });
  } else {
    await FormVersion.create({ formId: form.id, versionNumber: 1, data: dataStr });
  }

  return res.status(200).json({ ok: true, data: { id: form.id } });
}

async function remove(req, res) {
  const { godina } = req.query;
  const year = parseInt(godina);
  if (isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const clientId = parseClientId(req.query.clientId);
  const access = await ensureClientAccess(clientId, req.user.id);
  if (!access.ok) return res.status(access.reason === "CLIENT_NOT_FOUND" ? 404 : 403).json({ ok: false, error: access.reason });

  const where = { type: "PLDI", year };
  if (clientId !== null) {
    where.clientId = clientId;
    if (access.type === "personal") where.createdById = req.user.id;
  } else {
    where.clientId = null;
    where.createdById = req.user.id;
  }

  const form = await Form.findOne({ where });
  if (!form) return res.status(200).json({ ok: true, data: null });

  await FormVersion.destroy({ where: { formId: form.id } });
  await Form.destroy({ where: { id: form.id } });
  return res.status(200).json({ ok: true, data: null });
}

async function getClientYears(req, res) {
  const { accessibleClientIds } = await buildAccessibleWhereForList(req.user.id);
  if (accessibleClientIds.length === 0) {
    // Fallback na samo lične (legacy createdById)
    const forms = await Form.findAll({
      where: { type: "PLDI", createdById: req.user.id, clientId: { [Op.ne]: null } },
      attributes: ["clientId", "year"],
    });
    const map = {};
    for (const f of forms) {
      if (!map[f.clientId]) map[f.clientId] = [];
      if (!map[f.clientId].includes(f.year)) map[f.clientId].push(f.year);
    }
    return res.status(200).json({ ok: true, data: map });
  }

  const forms = await Form.findAll({
    where: {
      type: "PLDI",
      clientId: { [Op.in]: accessibleClientIds },
    },
    attributes: ["clientId", "year"],
  });
  const map = {};
  for (const f of forms) {
    if (!map[f.clientId]) map[f.clientId] = [];
    if (!map[f.clientId].includes(f.year)) map[f.clientId].push(f.year);
  }
  return res.status(200).json({ ok: true, data: map });
}

module.exports = { getYears, get, save, remove, getClientYears };
