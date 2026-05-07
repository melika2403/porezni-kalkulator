const { InvoiceItemTemplate } = require("../models/index");

const ALLOWED_ROLES = ["PRO", "BUSINESS", "ADMIN"];

function checkRole(req, res) {
  if (!ALLOWED_ROLES.includes(req.user?.role)) {
    res.status(403).json({ ok: false, error: "FORBIDDEN" });
    return false;
  }
  return true;
}

function publicTemplate(t) {
  if (!t) return null;
  const plain = t.toJSON ? t.toJSON() : t;
  return plain;
}

function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function list(req, res) {
  if (!checkRole(req, res)) return;
  const items = await InvoiceItemTemplate.findAll({
    where: { userId: req.user.id },
    order: [["updatedAt", "DESC"]],
  });
  return res.status(200).json({ ok: true, data: items.map(publicTemplate) });
}

function normalizePayload(body) {
  const errors = [];
  const name = String(body?.name ?? "").trim();
  if (!name) errors.push("Naziv je obavezan.");
  const unit = body?.unit != null ? String(body.unit).trim() : "kom";
  const num = (v, fallback) => {
    if (v === undefined || v === null || v === "") return fallback;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };
  const quantity = num(body?.quantity, 1);
  const unitPrice = num(body?.unitPrice, 0);
  const discountPct = num(body?.discountPct, 0);
  const vatPct = num(body?.vatPct, 17);
  if ([quantity, unitPrice, discountPct, vatPct].some((n) => Number.isNaN(n))) {
    errors.push("Numerička polja moraju biti validna.");
  }
  return { name, unit, quantity, unitPrice, discountPct, vatPct, errors };
}

async function create(req, res) {
  if (!checkRole(req, res)) return;
  const payload = normalizePayload(req.body);
  if (payload.errors.length) {
    return res.status(400).json({ ok: false, error: payload.errors.join(" ") });
  }
  const { errors, ...data } = payload;
  void errors;
  const created = await InvoiceItemTemplate.create({
    userId: req.user.id,
    ...data,
  });
  return res.status(201).json({ ok: true, data: publicTemplate(created) });
}

async function update(req, res) {
  if (!checkRole(req, res)) return;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const tpl = await InvoiceItemTemplate.findOne({
    where: { id, userId: req.user.id },
  });
  if (!tpl) return res.status(404).json({ ok: false, error: "Not found" });
  const payload = normalizePayload(req.body);
  if (payload.errors.length) {
    return res.status(400).json({ ok: false, error: payload.errors.join(" ") });
  }
  const { errors, ...data } = payload;
  void errors;
  await tpl.update(data);
  return res.status(200).json({ ok: true, data: publicTemplate(tpl) });
}

async function remove(req, res) {
  if (!checkRole(req, res)) return;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  const deleted = await InvoiceItemTemplate.destroy({
    where: { id, userId: req.user.id },
  });
  if (!deleted) return res.status(404).json({ ok: false, error: "Not found" });
  return res.status(200).json({ ok: true });
}

module.exports = { list, create, update, remove };
