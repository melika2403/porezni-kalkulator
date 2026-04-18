const prisma = require("../prisma");
const { decryptJmbg } = require("../utils/encryptJmbg");

const ownerDbSelect = {
  id: true,
  firstName: true,
  lastName: true,
  jmbg: true,
  email: true,
  phone: true,
  address: true,
};

function toPublicOwner(owner) {
  if (!owner) return null;
  const { jmbg, ...rest } = owner;
  return { ...rest, jmbg: jmbg ? decryptJmbg(jmbg) : null };
}

const orgSelect = {
  id: true,
  name: true,
  type: true,
  taxNumber: true,
  email: true,
  phone: true,
  address: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: ownerDbSelect },
  members: {
    select: { role: true, userId: true },
  },
};

function toPublicOrg(org) {
  if (!org) return null;
  return { ...org, owner: toPublicOwner(org.owner) };
}

async function getUserOrganizations(userId) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: { select: orgSelect } },
    orderBy: { joinedAt: "desc" },
  });
  return memberships.map((m) => toPublicOrg({ ...m.organization, memberRole: m.role }));
}

async function createOrganization(data, ownerData, userId) {
  return prisma.$transaction(async (tx) => {
    let ownerId = null;

    if (ownerData) {
      const owner = await tx.organizationOwner.create({ data: ownerData, select: ownerDbSelect });
      ownerId = owner.id;
    }

    const org = await tx.organization.create({
      data: { ...data, ownerId, createdById: userId },
      select: orgSelect,
    });

    await tx.organizationMember.create({
      data: { organizationId: org.id, userId, role: "OWNER" },
    });

    return toPublicOrg({ ...org, memberRole: "OWNER" });
  });
}

async function updateOrganization(id, orgData, ownerData, userId) {
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: id, userId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) return null;

  return prisma.$transaction(async (tx) => {
    if (ownerData) {
      const org = await tx.organization.findUnique({ where: { id }, select: { ownerId: true } });

      if (org?.ownerId) {
        await tx.organizationOwner.update({ where: { id: org.ownerId }, data: ownerData });
      } else {
        const owner = await tx.organizationOwner.create({ data: ownerData, select: ownerSelect });
        orgData = { ...orgData, ownerId: owner.id };
      }
    }

    const updated = await tx.organization.update({ where: { id }, data: orgData, select: orgSelect });
    return toPublicOrg(updated);
  });
}

module.exports = {
  getUserOrganizations,
  createOrganization,
  updateOrganization,
};
