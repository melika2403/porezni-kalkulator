const { Op } = require("sequelize");
const {
  Form,
  FormVersion,
  Organization,
  OrganizationMember,
} = require("../models/index");

// Helper: prihvata ID-parametar iz query/body i vraća pozitivan integer ili null.
function parseIntId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

// Pristupna kontrola: korisnik može pristupiti PLDI-ju samo za org-u kojoj je
// član (OWNER/ADMIN/MEMBER). Vraća { ok, org } ili { ok: false, reason }.
async function ensureOrgAccess(organizationId, userId) {
  if (organizationId === null) {
    // Lične PLDI forme (bez organizacije) — samo za vlastitog korisnika.
    return { ok: true, type: "personal" };
  }
  const org = await Organization.findByPk(organizationId);
  if (!org) return { ok: false, reason: "ORG_NOT_FOUND" };
  if (org.createdById === userId) return { ok: true, type: "org", org };
  const membership = await OrganizationMember.findOne({
    where: { organizationId, userId },
  });
  if (!membership) return { ok: false, reason: "FORBIDDEN" };
  return { ok: true, type: "org", org };
}

// GET /api/amortizacija/years?organizationId=X
async function getYears(req, res) {
  const orgId = parseIntId(req.query.organizationId ?? req.query.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI" };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    // Lične PLDI forme — bez organizationId i bez clientId.
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }

  const forms = await Form.findAll({
    where,
    attributes: ["year"],
    order: [["year", "DESC"]],
  });
  const years = [...new Set(forms.map((f) => f.year))];
  return res.status(200).json({ ok: true, data: years });
}

// GET /api/amortizacija?godina=YYYY&organizationId=X
async function get(req, res) {
  const { godina } = req.query;
  if (!godina) return res.status(400).json({ ok: false, error: "Missing godina" });
  const year = parseInt(godina, 10);
  if (Number.isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const orgId = parseIntId(req.query.organizationId ?? req.query.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI", year };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }

  const form = await Form.findOne({
    where,
    include: [
      { model: FormVersion, as: "versions", order: [["versionNumber", "DESC"]], limit: 1 },
    ],
  });

  if (!form || !form.versions?.length) {
    return res.status(200).json({ ok: true, data: null });
  }

  const raw = form.versions[0].data;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return res.status(200).json({ ok: true, data: parsed });
}

// POST /api/amortizacija { godina, organizationId, obveznik, rows }
async function save(req, res) {
  const { godina, obveznik, rows } = req.body;
  if (!godina) return res.status(400).json({ ok: false, error: "Missing godina" });
  const year = parseInt(godina, 10);
  if (Number.isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const orgId = parseIntId(req.body.organizationId ?? req.body.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI", year };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }

  let form = await Form.findOne({ where });

  if (!form) {
    // PLDI je gotov dokument čim se snimi (PDF se renderuje iz snimljenih
    // podataka bilo kad), pa ide odmah u GENERATED, ne DRAFT.
    form = await Form.create({
      type: "PLDI",
      year,
      status: "GENERATED",
      createdById: req.user.id,
      organizationId: orgId,
    });
  } else if (form.status === "DRAFT") {
    // Postojeći "Nacrt" iz starog ponašanja podigni na GENERATED pri snimanju.
    await Form.update({ status: "GENERATED" }, { where: { id: form.id } });
  }

  const dataStr = JSON.stringify({ obveznik, rows });
  const existing = await FormVersion.findOne({
    where: { formId: form.id, versionNumber: 1 },
  });
  if (existing) {
    await FormVersion.update(
      { data: dataStr },
      { where: { formId: form.id, versionNumber: 1 } },
    );
  } else {
    await FormVersion.create({ formId: form.id, versionNumber: 1, data: dataStr });
  }

  return res.status(200).json({ ok: true, data: { id: form.id } });
}

// DELETE /api/amortizacija?godina=YYYY&organizationId=X
async function remove(req, res) {
  const { godina } = req.query;
  const year = parseInt(godina, 10);
  if (Number.isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const orgId = parseIntId(req.query.organizationId ?? req.query.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI", year };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }

  const form = await Form.findOne({ where });
  if (!form) return res.status(200).json({ ok: true, data: null });

  await FormVersion.destroy({ where: { formId: form.id } });
  await Form.destroy({ where: { id: form.id } });
  return res.status(200).json({ ok: true, data: null });
}

// GET /api/amortizacija/org-years
// Vraća map { orgId: [year, year, ...] } za sve organizacije u kojima je
// korisnik član. Frontend koristi za "ima li podataka" indikator.
async function getOrgYears(req, res) {
  const memberships = await OrganizationMember.findAll({
    where: { userId: req.user.id },
    attributes: ["organizationId"],
  });
  const memberOrgIds = memberships.map((m) => m.organizationId);

  const ownOrgs = await Organization.findAll({
    where: { createdById: req.user.id },
    attributes: ["id"],
  });
  const ownOrgIds = ownOrgs.map((o) => o.id);

  const allOrgIds = [...new Set([...memberOrgIds, ...ownOrgIds])];
  if (allOrgIds.length === 0) {
    return res.status(200).json({ ok: true, data: {} });
  }

  const forms = await Form.findAll({
    where: {
      type: "PLDI",
      organizationId: { [Op.in]: allOrgIds },
    },
    attributes: ["organizationId", "year"],
  });
  const map = {};
  for (const f of forms) {
    const key = String(f.organizationId);
    if (!map[key]) map[key] = [];
    if (!map[key].includes(f.year)) map[key].push(f.year);
  }
  return res.status(200).json({ ok: true, data: map });
}

// POST /api/amortizacija/mark-generated { godina, organizationId }
// Preuzimanje PLDI obrasca → status DRAFT prelazi u GENERATED.
async function markGenerated(req, res) {
  const year = parseInt(req.body?.godina, 10);
  if (Number.isNaN(year)) return res.status(400).json({ ok: false, error: "Invalid godina" });

  const orgId = parseIntId(req.body.organizationId ?? req.body.orgId);
  const access = await ensureOrgAccess(orgId, req.user.id);
  if (!access.ok) {
    const status = access.reason === "ORG_NOT_FOUND" ? 404 : 403;
    return res.status(status).json({ ok: false, error: access.reason });
  }

  const where = { type: "PLDI", year };
  if (orgId !== null) {
    where.organizationId = orgId;
  } else {
    where.organizationId = null;
    where.clientId = null;
    where.createdById = req.user.id;
  }
  await Form.update({ status: "GENERATED" }, { where });
  return res.status(200).json({ ok: true });
}

module.exports = { getYears, get, save, markGenerated, remove, getOrgYears };
