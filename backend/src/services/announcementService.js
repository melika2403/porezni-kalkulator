// Obavijesti: admin-kreirane poruke korisnicima + automatski izračun statusa
// pretplate (istek). Jedinstveni izvor istine za korisnički feed i admin CRUD.
const { Op } = require("sequelize");
const {
  Announcement,
  AnnouncementRead,
  Subscription,
  User,
} = require("../models/index");

// Da li obavijest sa datom publikom cilja ovog korisnika.
function audienceMatches(user, sub, audience) {
  if (audience === "ALL") return true;
  if (audience === "TRIAL") return Boolean(sub?.isTrial);
  return audience === user.role;
}

function serialize(a, read) {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    type: a.type,
    audience: a.audience,
    publishedAt: a.publishedAt || a.createdAt,
    read: Boolean(read),
  };
}

// Aktivne, neistekle obavijesti koje ciljaju korisnika, sa read-stanjem.
async function listForUser(user) {
  const sub = await Subscription.findOne({ where: { userId: user.id } });
  const now = new Date();
  const rows = await Announcement.findAll({
    where: {
      active: true,
      [Op.and]: [
        { [Op.or]: [{ publishedAt: null }, { publishedAt: { [Op.lte]: now } }] },
        { [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: now } }] },
      ],
    },
    include: [
      {
        model: AnnouncementRead,
        as: "reads",
        required: false,
        where: { userId: user.id },
      },
    ],
    order: [["publishedAt", "DESC"], ["createdAt", "DESC"]],
  });

  const visible = rows.filter((a) => audienceMatches(user, sub, a.audience));
  const announcements = visible.map((a) =>
    serialize(a, (a.reads || []).length > 0),
  );
  const unread = announcements.filter((a) => !a.read).length;
  return { announcements, unread, subscription: computeNotice(sub) };
}

// Status pretplate za in-app upozorenje. Vraća null ako nema aktivne pretplate.
function computeNotice(sub) {
  if (!sub || !sub.isActive || !sub.endDate) return null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const end = String(sub.endDate).slice(0, 10);
  const daysLeft = Math.round(
    (new Date(`${end}T00:00:00`).getTime() -
      new Date(`${todayStr}T00:00:00`).getTime()) /
      86400000,
  );
  let state = "OK";
  if (daysLeft < 0) state = "EXPIRED";
  else if (daysLeft === 0) state = "TODAY";
  else if (daysLeft <= 7) state = "EXPIRING";
  return { state, daysLeft, endDate: end, plan: sub.plan || null };
}

async function subscriptionNotice(userId) {
  const sub = await Subscription.findOne({ where: { userId } });
  return computeNotice(sub);
}

// Označi sve trenutno vidljive obavijesti korisnika pročitanim (upsert).
async function markAllRead(user) {
  const { announcements } = await listForUser(user);
  const now = new Date();
  for (const a of announcements) {
    if (a.read) continue;
    await AnnouncementRead.findOrCreate({
      where: { announcementId: a.id, userId: user.id },
      defaults: { announcementId: a.id, userId: user.id, readAt: now },
    });
  }
  return { ok: true };
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

async function adminList() {
  const rows = await Announcement.findAll({
    include: [
      { model: User, as: "author", attributes: ["id", "firstName", "lastName"] },
    ],
    order: [["createdAt", "DESC"]],
  });
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    type: a.type,
    audience: a.audience,
    active: a.active,
    publishedAt: a.publishedAt || a.createdAt,
    expiresAt: a.expiresAt,
    createdAt: a.createdAt,
    author: a.author
      ? [a.author.firstName, a.author.lastName].filter(Boolean).join(" ").trim()
      : null,
  }));
}

async function create({ title, body, audience, type, expiresAt, createdById }) {
  const cleanTitle = String(title || "").trim().slice(0, 200);
  const cleanBody = String(body || "").trim();
  if (!cleanTitle || !cleanBody) throw new Error("EMPTY_FIELDS");
  const validAudience = ["ALL", "USER", "PRO", "BUSINESS", "TRIAL"];
  const validType = ["INFO", "WARNING", "SUCCESS"];
  return Announcement.create({
    title: cleanTitle,
    body: cleanBody,
    audience: validAudience.includes(audience) ? audience : "ALL",
    type: validType.includes(type) ? type : "INFO",
    active: true,
    publishedAt: new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdById: createdById || null,
  });
}

async function update(id, patch) {
  const a = await Announcement.findByPk(id);
  if (!a) throw new Error("NOT_FOUND");
  const next = {};
  if (typeof patch.title === "string") next.title = patch.title.trim().slice(0, 200);
  if (typeof patch.body === "string") next.body = patch.body.trim();
  if (["ALL", "USER", "PRO", "BUSINESS", "TRIAL"].includes(patch.audience))
    next.audience = patch.audience;
  if (["INFO", "WARNING", "SUCCESS"].includes(patch.type)) next.type = patch.type;
  if (typeof patch.active === "boolean") next.active = patch.active;
  if (patch.expiresAt !== undefined)
    next.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
  await a.update(next);
  return a;
}

async function remove(id) {
  const a = await Announcement.findByPk(id);
  if (!a) throw new Error("NOT_FOUND");
  await a.destroy();
  return { ok: true };
}

module.exports = {
  audienceMatches,
  listForUser,
  subscriptionNotice,
  markAllRead,
  adminList,
  create,
  update,
  remove,
};
