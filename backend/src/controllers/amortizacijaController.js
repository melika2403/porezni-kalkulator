const { Form, FormVersion } = require("../models/index");

function parseClientId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = parseInt(raw);
  return isNaN(n) ? null : n;
}

async function getYears(req, res) {
  const clientId = parseClientId(req.query.clientId);
  const where = { type: "PLDI", createdById: req.user.id };
  if (clientId !== null) where.clientId = clientId;
  else where.clientId = null;

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
  const where = { type: "PLDI", year, createdById: req.user.id };
  if (clientId !== null) where.clientId = clientId;
  else where.clientId = null;

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
  const where = { type: "PLDI", year, createdById: req.user.id };
  if (clientId !== null) where.clientId = clientId;
  else where.clientId = null;

  let form = await Form.findOne({ where });

  if (!form) {
    form = await Form.create({ type: "PLDI", year, status: "DRAFT", createdById: req.user.id, clientId });
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
  const where = { type: "PLDI", year, createdById: req.user.id };
  if (clientId !== null) where.clientId = clientId;
  else where.clientId = null;

  const form = await Form.findOne({ where });
  if (!form) return res.status(200).json({ ok: true, data: null });

  await FormVersion.destroy({ where: { formId: form.id } });
  await Form.destroy({ where: { id: form.id } });
  return res.status(200).json({ ok: true, data: null });
}

async function getClientYears(req, res) {
  const { Op } = require("sequelize");
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

module.exports = { getYears, get, save, remove, getClientYears };
