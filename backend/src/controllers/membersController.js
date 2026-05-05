const { Op } = require("sequelize");
const { OrganizationMember, User } = require("../models/index");

const MEMBER_ROLES = ["ADMIN", "MEMBER"];

async function assertOwner(orgId, userId) {
  return OrganizationMember.findOne({ where: { organizationId: orgId, userId, role: "OWNER" } });
}

async function list(req, res) {
  const orgId = Number(req.params.id);
  if (!Number.isInteger(orgId) || orgId <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  const membership = await OrganizationMember.findOne({ where: { organizationId: orgId, userId: req.user.id } });
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const members = await OrganizationMember.findAll({
    where: { organizationId: orgId },
    include: [{ model: User, as: "user", attributes: ["id", "firstName", "lastName", "email"] }],
    order: [["joinedAt", "ASC"]],
  });

  return res.json({
    ok: true,
    data: members.map((m) => ({ userId: m.userId, role: m.role, joinedAt: m.joinedAt, user: m.user })),
  });
}

async function add(req, res) {
  const orgId = Number(req.params.id);
  if (!Number.isInteger(orgId) || orgId <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  if (!(await assertOwner(orgId, req.user.id)))
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const { email, role } = req.body ?? {};
  if (!email?.trim()) return res.status(400).json({ ok: false, error: "Email je obavezan" });
  if (!MEMBER_ROLES.includes(role)) return res.status(400).json({ ok: false, error: "Uloga mora biti ADMIN ili MEMBER" });

  const targetUser = await User.findOne({
    where: { email: email.trim().toLowerCase() },
    attributes: ["id", "firstName", "lastName", "email"],
  });
  if (!targetUser) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
  if (targetUser.id === req.user.id) return res.status(400).json({ ok: false, error: "Ne možete dodati sebe" });

  const existing = await OrganizationMember.findOne({ where: { organizationId: orgId, userId: targetUser.id } });
  if (existing) return res.status(409).json({ ok: false, error: "ALREADY_MEMBER" });

  const member = await OrganizationMember.create({ organizationId: orgId, userId: targetUser.id, role });

  return res.status(201).json({
    ok: true,
    data: { userId: member.userId, role: member.role, joinedAt: member.joinedAt, user: targetUser },
  });
}

async function remove(req, res) {
  const orgId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  if (!Number.isInteger(orgId) || orgId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  if (!(await assertOwner(orgId, req.user.id)))
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const target = await OrganizationMember.findOne({ where: { organizationId: orgId, userId: targetUserId } });
  if (!target) return res.status(404).json({ ok: false, error: "Korisnik nije pronađen u organizaciji" });
  if (target.role === "OWNER") return res.status(400).json({ ok: false, error: "Ne možete ukloniti vlasnika" });

  await OrganizationMember.destroy({ where: { organizationId: orgId, userId: targetUserId } });
  return res.json({ ok: true });
}

async function updateRole(req, res) {
  const orgId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  if (!Number.isInteger(orgId) || orgId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });

  if (!(await assertOwner(orgId, req.user.id)))
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const { role } = req.body ?? {};
  if (!MEMBER_ROLES.includes(role)) return res.status(400).json({ ok: false, error: "Uloga mora biti ADMIN ili MEMBER" });

  const target = await OrganizationMember.findOne({ where: { organizationId: orgId, userId: targetUserId } });
  if (!target) return res.status(404).json({ ok: false, error: "Korisnik nije pronađen u organizaciji" });
  if (target.role === "OWNER") return res.status(400).json({ ok: false, error: "Ne možete mijenjati ulogu vlasnika" });

  await OrganizationMember.update({ role }, { where: { organizationId: orgId, userId: targetUserId } });

  const updated = await OrganizationMember.findOne({
    where: { organizationId: orgId, userId: targetUserId },
    include: [{ model: User, as: "user", attributes: ["id", "firstName", "lastName", "email"] }],
  });

  return res.json({
    ok: true,
    data: { userId: updated.userId, role: updated.role, joinedAt: updated.joinedAt, user: updated.user },
  });
}

module.exports = { list, add, remove, updateRole };
