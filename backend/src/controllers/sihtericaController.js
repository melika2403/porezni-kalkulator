const { Form, FormVersion, Worker } = require("../models/index");

const ALLOWED_ROLES = ["USER", "PRO", "BUSINESS", "ADMIN"];

function checkRole(req, res) {
  if (!ALLOWED_ROLES.includes(req.user?.role)) {
    res.status(403).json({ ok: false, error: "FORBIDDEN" });
    return false;
  }
  return true;
}

function parseId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = parseInt(raw);
  return isNaN(n) ? null : n;
}

async function ensureWorkerOwned(workerId, userId) {
  const worker = await Worker.findByPk(workerId);
  if (!worker) return null;
  // Worker is accessible if its organization was created by the user
  // (organizations are owned by the user who created them)
  const { Organization } = require("../models/index");
  const org = await Organization.findByPk(worker.organizationId);
  if (!org || org.createdById !== userId) return null;
  return worker;
}

// GET /api/sihterica/months?workerId=X — list { year, month } that have data
async function getMonths(req, res) {
  if (!checkRole(req, res)) return;
  const workerId = parseId(req.query.workerId);
  if (!workerId) return res.status(400).json({ ok: false, error: "Missing workerId" });

  const worker = await ensureWorkerOwned(workerId, req.user.id);
  if (!worker) return res.status(404).json({ ok: false, error: "Worker not found" });

  const forms = await Form.findAll({
    where: { type: "SIH", workerId, createdById: req.user.id },
    attributes: ["year", "month"],
    order: [["year", "DESC"], ["month", "DESC"]],
  });

  const data = forms.map((f) => ({ year: f.year, month: f.month }));
  return res.status(200).json({ ok: true, data });
}

// GET /api/sihterica/worker-months?orgId=X — { [workerId]: [{year, month}, ...] }
async function getWorkerMonths(req, res) {
  if (!checkRole(req, res)) return;
  const orgId = parseId(req.query.orgId);
  if (!orgId) return res.status(400).json({ ok: false, error: "Missing orgId" });

  const { Organization } = require("../models/index");
  const org = await Organization.findByPk(orgId);
  if (!org || org.createdById !== req.user.id) {
    return res.status(404).json({ ok: false, error: "Organization not found" });
  }

  const forms = await Form.findAll({
    where: { type: "SIH", organizationId: orgId, createdById: req.user.id },
    attributes: ["workerId", "year", "month"],
  });

  const map = {};
  for (const f of forms) {
    if (!f.workerId) continue;
    if (!map[f.workerId]) map[f.workerId] = [];
    map[f.workerId].push({ year: f.year, month: f.month });
  }
  return res.status(200).json({ ok: true, data: map });
}

// GET /api/sihterica?workerId=X&year=Y&month=M
async function get(req, res) {
  if (!checkRole(req, res)) return;
  const workerId = parseId(req.query.workerId);
  const year = parseId(req.query.year);
  const month = parseId(req.query.month);
  if (!workerId || !year || !month) {
    return res.status(400).json({ ok: false, error: "Missing workerId/year/month" });
  }

  const worker = await ensureWorkerOwned(workerId, req.user.id);
  if (!worker) return res.status(404).json({ ok: false, error: "Worker not found" });

  const form = await Form.findOne({
    where: { type: "SIH", workerId, year, month, createdById: req.user.id },
    include: [{ model: FormVersion, as: "versions", order: [["versionNumber", "DESC"]], limit: 1 }],
  });

  if (!form || !form.versions?.length) {
    return res.status(200).json({ ok: true, data: null });
  }

  const raw = form.versions[0].data;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return res.status(200).json({ ok: true, data: parsed });
}

// POST /api/sihterica  body: { workerId, year, month, days }
async function save(req, res) {
  if (!checkRole(req, res)) return;
  const { workerId: rawWorkerId, year: rawYear, month: rawMonth, days } = req.body ?? {};
  const workerId = parseId(rawWorkerId);
  const year = parseId(rawYear);
  const month = parseId(rawMonth);
  if (!workerId || !year || !month) {
    return res.status(400).json({ ok: false, error: "Missing workerId/year/month" });
  }
  if (!Array.isArray(days)) {
    return res.status(400).json({ ok: false, error: "days must be an array" });
  }

  const worker = await ensureWorkerOwned(workerId, req.user.id);
  if (!worker) return res.status(404).json({ ok: false, error: "Worker not found" });

  let form = await Form.findOne({
    where: { type: "SIH", workerId, year, month, createdById: req.user.id },
  });

  if (!form) {
    form = await Form.create({
      type: "SIH",
      year,
      month,
      status: "DRAFT",
      createdById: req.user.id,
      organizationId: worker.organizationId,
      workerId,
    });
  }

  const dataStr = JSON.stringify({ days });

  const existing = await FormVersion.findOne({ where: { formId: form.id, versionNumber: 1 } });
  if (existing) {
    await FormVersion.update({ data: dataStr }, { where: { formId: form.id, versionNumber: 1 } });
  } else {
    await FormVersion.create({ formId: form.id, versionNumber: 1, data: dataStr });
  }

  return res.status(200).json({ ok: true, data: { id: form.id } });
}

// DELETE /api/sihterica?workerId=X&year=Y&month=M
async function remove(req, res) {
  if (!checkRole(req, res)) return;
  const workerId = parseId(req.query.workerId);
  const year = parseId(req.query.year);
  const month = parseId(req.query.month);
  if (!workerId || !year || !month) {
    return res.status(400).json({ ok: false, error: "Missing workerId/year/month" });
  }

  const worker = await ensureWorkerOwned(workerId, req.user.id);
  if (!worker) return res.status(404).json({ ok: false, error: "Worker not found" });

  const form = await Form.findOne({
    where: { type: "SIH", workerId, year, month, createdById: req.user.id },
  });
  if (!form) return res.status(200).json({ ok: true, data: null });

  await FormVersion.destroy({ where: { formId: form.id } });
  await Form.destroy({ where: { id: form.id } });
  return res.status(200).json({ ok: true, data: null });
}

module.exports = { getMonths, getWorkerMonths, get, save, remove };
