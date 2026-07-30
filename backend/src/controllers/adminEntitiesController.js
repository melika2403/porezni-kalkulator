// Admin akcije nad entitetima: brisanje organizacija / radnika / fizičkih lica
// (puna kaskada) + pregled radnika neke organizacije + poziv na trial.
const { Worker, User } = require("../models/index");
const cascade = require("../services/adminCascade");
const { sendTrialInviteEmail } = require("../utils/mailer");

function parseId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// GET /api/admin/organizations/:id/workers
async function listOrgWorkers(req, res) {
  const orgId = parseId(req.params.id);
  if (!orgId) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const rows = await Worker.findAll({
      where: { organizationId: orgId },
      attributes: [
        "id", "firstName", "lastName", "position", "role",
        "employmentStatus", "startDate", "endDate",
      ],
      order: [["lastName", "ASC"], ["firstName", "ASC"]],
    });
    const items = rows.map((w) => ({
      id: w.id,
      name: `${w.firstName ?? ""} ${w.lastName ?? ""}`.trim() || "–",
      position: w.position,
      role: w.role,
      employmentStatus: w.employmentStatus,
      startDate: w.startDate,
      endDate: w.endDate,
    }));
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    console.error("admin listOrgWorkers failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// DELETE /api/admin/organizations/:id
async function deleteOrganization(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const ok = await cascade.deleteOrganizationCascade(id);
    if (!ok) return res.status(404).json({ ok: false, error: "Organizacija nije pronađena" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("admin deleteOrganization failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// DELETE /api/admin/workers/:id
async function deleteWorker(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const ok = await cascade.deleteWorkerCascade(id);
    if (!ok) return res.status(404).json({ ok: false, error: "Radnik nije pronađen" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("admin deleteWorker failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// DELETE /api/admin/clients/:id
async function deletePersonClient(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const ok = await cascade.deletePersonClientCascade(id);
    if (!ok) return res.status(404).json({ ok: false, error: "Fizičko lice nije pronađeno" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("admin deletePersonClient failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// DELETE /api/admin/forms/:id  — obriši sačuvani dokument (formu) + verzije/attachmente.
async function deleteForm(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const ok = await cascade.deleteFormCascade(id);
    if (!ok) return res.status(404).json({ ok: false, error: "Dokument nije pronađen" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("admin deleteForm failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// POST /api/admin/users/:id/trial-invite
// Pošalji poziv na besplatnu probu (PK Office, 30 dana): samo korisnicima
// koji je još nisu aktivirali (pkOfficeTrialEndsAt == null) i nemaju
// pretplatu. Mail vodi na link koji probu aktivira odmah.
async function sendTrialInvite(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ ok: false, error: "Korisnik nije pronađen" });
    if (!user.email) return res.status(400).json({ ok: false, error: "Korisnik nema email adresu" });
    if (user.pkOfficeTrialEndsAt) {
      return res.status(409).json({ ok: false, error: "Korisnik je već aktivirao probni period" });
    }

    const frontendUrl = process.env.FRONTEND_URL || "https://poreznikalkulator.ba";
    const trialUrl = `${frontendUrl}/prijava?next=${encodeURIComponent("/pretplate?officeTrial=auto")}`;
    await sendTrialInviteEmail(user.email, user.firstName || "korisniče", { trialUrl });

    return res.json({ ok: true, data: { userId: id } });
  } catch (e) {
    console.error("admin sendTrialInvite failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// POST /api/admin/users/:id/verify-email
// Ručna verifikacija emaila: za korisnike kojima verifikacioni mail ne
// stigne (spam, firmin mail server), admin ih pusti bez čačkanja po bazi.
async function verifyUserEmail(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ ok: false, error: "Korisnik nije pronađen" });
    }
    if (user.isEmailVerified) {
      return res.status(409).json({ ok: false, error: "Korisnik je već verifikovan" });
    }
    // Token se briše da stari link iz emaila ne ostane aktivan.
    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    });
    return res.json({ ok: true, data: { userId: id } });
  } catch (e) {
    console.error("admin verifyUserEmail failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

module.exports = { listOrgWorkers, deleteOrganization, deleteWorker, deletePersonClient, deleteForm, sendTrialInvite, verifyUserEmail };
