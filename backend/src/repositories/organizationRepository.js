const prisma = require("../prisma");
const { decryptJmbg } = require("../utils/encryptJmbg");

const vlasnikSelect = {
  id: true,
  firstName: true,
  lastName: true,
  jmbg: true,
  email: true,
  phone: true,
  address: true,
};

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
  workers: {
    where: { role: "VLASNIK" },
    take: 1,
    select: vlasnikSelect,
  },
  members: {
    select: { role: true, userId: true },
  },
};

function toPublicOrg(org) {
  if (!org) return null;
  const { workers, ...rest } = org;
  const raw = workers?.[0] ?? null;
  const owner = raw ? { ...raw, jmbg: raw.jmbg ? decryptJmbg(raw.jmbg) : null } : null;
  return { ...rest, owner };
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
    const org = await tx.organization.create({
      data: { ...data, createdById: userId },
      select: { id: true },
    });

    await tx.organizationMember.create({
      data: { organizationId: org.id, userId, role: "OWNER" },
    });

    if (ownerData) {
      await tx.worker.create({
        data: { organizationId: org.id, role: "VLASNIK", ...ownerData },
      });
    } else {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, jmbg: true, email: true, phone: true, address: true },
      });
      await tx.worker.create({
        data: {
          organizationId: org.id,
          role: "VLASNIK",
          firstName: user.firstName,
          lastName: user.lastName,
          jmbg: user.jmbg ?? null,
          email: user.email ?? null,
          phone: user.phone ?? null,
          address: user.address ?? null,
        },
      });
    }

    const created = await tx.organization.findUnique({
      where: { id: org.id },
      select: orgSelect,
    });

    return toPublicOrg({ ...created, memberRole: "OWNER" });
  });
}

async function updateOrganization(id, orgData, ownerData, userId) {
  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId: id, userId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) return null;

  return prisma.$transaction(async (tx) => {
    if (ownerData) {
      const existing = await tx.worker.findFirst({
        where: { organizationId: id, role: "VLASNIK" },
      });
      if (existing) {
        await tx.worker.update({ where: { id: existing.id }, data: ownerData });
      } else {
        await tx.worker.create({
          data: { organizationId: id, role: "VLASNIK", ...ownerData },
        });
      }
    }

    if (Object.keys(orgData).length > 0) {
      await tx.organization.update({ where: { id }, data: orgData });
    }

    const updated = await tx.organization.findUnique({
      where: { id },
      select: orgSelect,
    });
    return toPublicOrg(updated);
  });
}

async function countOwnedOrganizations(userId) {
  return prisma.organizationMember.count({
    where: { userId, role: "OWNER" },
  });
}

module.exports = {
  getUserOrganizations,
  createOrganization,
  updateOrganization,
  countOwnedOrganizations,
};
