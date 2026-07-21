const { OrganizationMember, Client, Form, FormVersion } = require("../models/index");

const VALID_TYPES = [
  "AMS",
  "SPR",
  "ZO3",
  "GPD",
  "PLDI",
  "JS3100",
  "UOD",
  "COK", // članarina obrtničkoj komori (Obrazac ČOK)
  "ONS", // naknade za šume (Obrazac ONŠ)
];

function parseYear(v) {
  const n = parseInt(v);
  return isNaN(n) ? null : n;
}

function parseMonth(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = parseInt(v);
  return isNaN(n) || n < 1 || n > 12 ? null : n;
}

// Faza 3: forme su team-shared kad imaju organizationId. Bilo koji član org-e
// može vidjeti / urediti / obrisati tu formu. Forme bez organizationId su
// "lične" — samo creator (`createdById`) ima pristup.
async function userCanAccessForm(form, userId) {
  if (!form) return false;
  if (form.organizationId) {
    const membership = await OrganizationMember.findOne({
      where: { organizationId: form.organizationId, userId },
    });
    return !!membership;
  }
  return form.createdById === userId;
}

async function save(req, res) {
  const { type, year, month, data, title, organizationId, clientId } = req.body;

  if (!VALID_TYPES.includes(type))
    return res.status(400).json({ ok: false, error: "Invalid type" });

  const yr = parseYear(year);
  if (yr === null) return res.status(400).json({ ok: false, error: "Invalid year" });
  const mo = parseMonth(month);

  let orgId = null;
  if (organizationId !== undefined && organizationId !== null && organizationId !== "") {
    const n = parseInt(organizationId);
    if (isNaN(n)) return res.status(400).json({ ok: false, error: "Invalid organizationId" });
    const member = await OrganizationMember.findOne({ where: { userId: req.user.id, organizationId: n } });
    if (!member) return res.status(403).json({ ok: false, error: "Not a member of organization" });
    orgId = n;
  }

  let cliId = null;
  if (clientId !== undefined && clientId !== null && clientId !== "") {
    const n = parseInt(clientId);
    if (isNaN(n)) return res.status(400).json({ ok: false, error: "Invalid clientId" });
    // Client je sad team-shared per org. Ako klijent ima organizationId, mora
    // korisnik biti član te org-e; ako nema, mora biti njegov vlasnik (legacy).
    const client = await Client.findOne({ where: { id: n } });
    if (!client) return res.status(403).json({ ok: false, error: "Client not found" });
    if (client.organizationId) {
      const member = await OrganizationMember.findOne({
        where: { userId: req.user.id, organizationId: client.organizationId },
      });
      if (!member) return res.status(403).json({ ok: false, error: "Client not found" });
    } else if (client.createdById !== req.user.id) {
      return res.status(403).json({ ok: false, error: "Client not found" });
    }
    cliId = n;
  }

  // Team-shared upsert: kad ima orgId, pretražuj bez createdById filtera tako
  // da bilo koji član vidi/updateuje istu formu.
  const where = orgId
    ? { type, year: yr, month: mo, organizationId: orgId, clientId: cliId }
    : { type, year: yr, createdById: req.user.id, month: mo, organizationId: null, clientId: cliId };

  let form = await Form.findOne({ where });

  if (!form) {
    form = await Form.create({
      type,
      year: yr,
      month: mo,
      title: title ?? null,
      status: "GENERATED",
      createdById: req.user.id,
      organizationId: orgId,
      clientId: cliId,
    });
  } else if (title && form.title !== title) {
    await Form.update({ title, status: "GENERATED" }, { where: { id: form.id } });
    form = await Form.findOne({ where: { id: form.id } });
  }

  const dataStr = JSON.stringify(data ?? {});
  const existing = await FormVersion.findOne({ where: { formId: form.id, versionNumber: 1 } });
  if (existing) {
    await FormVersion.update({ data: dataStr }, { where: { formId: form.id, versionNumber: 1 } });
  } else {
    await FormVersion.create({ formId: form.id, versionNumber: 1, data: dataStr });
  }

  return res.status(200).json({ ok: true, data: { id: form.id } });
}

async function get(req, res) {
  const formId = parseInt(req.params.id);
  if (isNaN(formId)) return res.status(400).json({ ok: false, error: "Invalid id" });

  const form = await Form.findOne({
    where: { id: formId },
    include: [{ model: FormVersion, as: "versions", order: [["versionNumber", "DESC"]], limit: 1 }],
  });

  if (!form) return res.status(404).json({ ok: false, error: "Not found" });
  if (!(await userCanAccessForm(form, req.user.id))) {
    return res.status(404).json({ ok: false, error: "Not found" });
  }

  const raw = form.versions?.[0]?.data;
  const parsed = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;

  return res.status(200).json({
    ok: true,
    data: { id: form.id, type: form.type, year: form.year, month: form.month, title: form.title, organizationId: form.organizationId, clientId: form.clientId, data: parsed },
  });
}

async function remove(req, res) {
  const formId = parseInt(req.params.id);
  if (isNaN(formId)) return res.status(400).json({ ok: false, error: "Invalid id" });

  const form = await Form.findOne({ where: { id: formId } });
  if (!form) return res.status(404).json({ ok: false, error: "Not found" });
  if (!(await userCanAccessForm(form, req.user.id))) {
    return res.status(404).json({ ok: false, error: "Not found" });
  }

  await FormVersion.destroy({ where: { formId: form.id } });
  await Form.destroy({ where: { id: form.id } });
  return res.status(200).json({ ok: true, data: null });
}

module.exports = { save, get, remove };
