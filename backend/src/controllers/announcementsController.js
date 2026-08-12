// Obavijesti REST kontroler: korisnički feed (obavijesti + status pretplate) i
// admin CRUD. Delegira na announcementService. Tu su i postavke notifikacija
// (per član obrta + per korisnik), jer se podešavaju na istom mjestu.
const service = require("../services/announcementService");
const {
  ORG_PREF_DEFAULTS,
  USER_PREF_DEFAULTS,
  orgPrefs,
  userPrefs,
  citajPrefs,
} = require("../services/notificationsService");
const { OrganizationMember, User } = require("../models/index");

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

// ── Postavke notifikacija ────────────────────────────────────────────────────
// Org-vezane postavke žive na članstvu (svaki član podešava svoje za taj
// obrt), korisničke (podrška) na useru. Vraća se merge sa defaultima.

async function getPrefs(req, res) {
  try {
    const organizationId = Number(req.query.organizationId);
    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      return fail(res, 400, "INVALID_ORG_ID");
    }
    const member = await OrganizationMember.findOne({
      where: { organizationId, userId: req.user.id },
    });
    if (!member) return fail(res, 403, "NOT_A_MEMBER");
    const u = await User.findByPk(req.user.id, { attributes: ["notifPrefs"] });
    return ok(res, { org: orgPrefs(member), user: userPrefs(u) });
  } catch (e) {
    return fail(res, 500, e?.message || "ERROR");
  }
}

async function putPrefs(req, res) {
  try {
    const organizationId = Number(req.body?.organizationId);
    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      return fail(res, 400, "INVALID_ORG_ID");
    }
    const member = await OrganizationMember.findOne({
      where: { organizationId, userId: req.user.id },
    });
    if (!member) return fail(res, 403, "NOT_A_MEMBER");

    // primi samo poznate ključeve, samo boolean vrijednosti
    const orgPatch = {};
    for (const k of Object.keys(ORG_PREF_DEFAULTS)) {
      if (typeof req.body?.org?.[k] === "boolean") orgPatch[k] = req.body.org[k];
    }
    const userPatch = {};
    for (const k of Object.keys(USER_PREF_DEFAULTS)) {
      if (typeof req.body?.user?.[k] === "boolean") {
        userPatch[k] = req.body.user[k];
      }
    }

    // citajPrefs, a ne sirovi member.notifPrefs: ako je u koloni ostao JSON kao
    // string, spread stringa bi upisao {"0":"{","1":"\"",…} i trajno pokvario
    // postavke; ako getter pukne na neispravnom JSON-u, snimanje bi vratilo 500.
    if (Object.keys(orgPatch).length) {
      await member.update({
        notifPrefs: { ...(citajPrefs(member) || {}), ...orgPatch },
      });
    }
    const u = await User.findByPk(req.user.id, {
      attributes: ["id", "notifPrefs"],
    });
    if (Object.keys(userPatch).length) {
      await u.update({
        notifPrefs: { ...(citajPrefs(u) || {}), ...userPatch },
      });
    }
    return ok(res, { org: orgPrefs(member), user: userPrefs(u) });
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

module.exports = {
  getMine,
  markRead,
  getPrefs,
  putPrefs,
  adminList,
  create,
  update,
  remove,
};
