const prisma = require("../prisma");

const MEMBER_ROLES = ["ADMIN", "MEMBER"];

async function assertOwner(orgId, userId) {
  return prisma.organizationMember.findFirst({
    where: { organizationId: orgId, userId, role: "OWNER" },
  });
}

async function list(req, res) {
  const orgId = Number(req.params.id);
  if (!Number.isInteger(orgId) || orgId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  // Must be a member to see member list
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, userId: req.user.id },
  });
  if (!membership) return res.status(403).json({ ok: false, error: "FORBIDDEN" });

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return res.json({
    ok: true,
    data: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
  });
}

async function add(req, res) {
  const orgId = Number(req.params.id);
  if (!Number.isInteger(orgId) || orgId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  if (!(await assertOwner(orgId, req.user.id))) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  const { email, role } = req.body ?? {};

  if (!email?.trim()) {
    return res.status(400).json({ ok: false, error: "Email je obavezan" });
  }
  if (!MEMBER_ROLES.includes(role)) {
    return res.status(400).json({ ok: false, error: "Uloga mora biti ADMIN ili MEMBER" });
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!targetUser) {
    return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
  }
  if (targetUser.id === req.user.id) {
    return res.status(400).json({ ok: false, error: "Ne možete dodati sebe" });
  }

  const existing = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: targetUser.id } },
  });
  if (existing) {
    return res.status(409).json({ ok: false, error: "ALREADY_MEMBER" });
  }

  const member = await prisma.organizationMember.create({
    data: { organizationId: orgId, userId: targetUser.id, role },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  return res.status(201).json({
    ok: true,
    data: { userId: member.userId, role: member.role, joinedAt: member.joinedAt, user: member.user },
  });
}

async function remove(req, res) {
  const orgId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  if (!Number.isInteger(orgId) || orgId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  if (!(await assertOwner(orgId, req.user.id))) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  const target = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
  });
  if (!target) {
    return res.status(404).json({ ok: false, error: "Korisnik nije pronađen u organizaciji" });
  }
  if (target.role === "OWNER") {
    return res.status(400).json({ ok: false, error: "Ne možete ukloniti vlasnika" });
  }

  await prisma.organizationMember.delete({
    where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
  });

  return res.json({ ok: true });
}

async function updateRole(req, res) {
  const orgId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  if (!Number.isInteger(orgId) || orgId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }

  if (!(await assertOwner(orgId, req.user.id))) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  const { role } = req.body ?? {};
  if (!MEMBER_ROLES.includes(role)) {
    return res.status(400).json({ ok: false, error: "Uloga mora biti ADMIN ili MEMBER" });
  }

  const target = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
  });
  if (!target) {
    return res.status(404).json({ ok: false, error: "Korisnik nije pronađen u organizaciji" });
  }
  if (target.role === "OWNER") {
    return res.status(400).json({ ok: false, error: "Ne možete mijenjati ulogu vlasnika" });
  }

  const updated = await prisma.organizationMember.update({
    where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    data: { role },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  return res.json({
    ok: true,
    data: { userId: updated.userId, role: updated.role, joinedAt: updated.joinedAt, user: updated.user },
  });
}

module.exports = { list, add, remove, updateRole };
