// Obavijesti REST kontroler: korisnički feed (obavijesti + status pretplate) i
// admin CRUD. Delegira na announcementService.
const service = require("../services/announcementService");

function ok(res, data) {
  return res.status(200).json({ ok: true, data });
}
function fail(res, code, error) {
  return res.status(code).json({ ok: false, error });
}

// ── Korisnik ──────────────────────────────────────────────────────────────────

async function getMine(req, res) {
  try {
    const data = await service.listForUser(req.user);
    return ok(res, data);
  } catch (e) {
    return fail(res, 500, e?.message || "ERROR");
  }
}

async function markRead(req, res) {
  try {
    await service.markAllRead(req.user);
    return ok(res, { ok: true });
  } catch (e) {
    return fail(res, 500, e?.message || "ERROR");
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function adminList(_req, res) {
  try {
    const items = await service.adminList();
    return ok(res, { items });
  } catch (e) {
    return fail(res, 500, e?.message || "ERROR");
  }
}

async function create(req, res) {
  try {
    const a = await service.create({
      title: req.body?.title,
      body: req.body?.body,
      audience: req.body?.audience,
      type: req.body?.type,
      expiresAt: req.body?.expiresAt,
      createdById: req.user.id,
    });
    return ok(res, { id: a.id });
  } catch (e) {
    const code = e?.message === "EMPTY_FIELDS" ? 400 : 500;
    return fail(res, code, e?.message || "ERROR");
  }
}

async function update(req, res) {
  try {
    await service.update(Number(req.params.id), req.body || {});
    return ok(res, { id: Number(req.params.id) });
  } catch (e) {
    const code = e?.message === "NOT_FOUND" ? 404 : 500;
    return fail(res, code, e?.message || "ERROR");
  }
}

async function remove(req, res) {
  try {
    await service.remove(Number(req.params.id));
    return ok(res, { id: Number(req.params.id) });
  } catch (e) {
    const code = e?.message === "NOT_FOUND" ? 404 : 500;
    return fail(res, code, e?.message || "ERROR");
  }
}

module.exports = { getMine, markRead, adminList, create, update, remove };
