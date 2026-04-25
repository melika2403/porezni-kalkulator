const prisma = require("../prisma");
const { decryptJmbg } = require("../utils/encryptJmbg");

const userDbSelect = {
  id: true,
  email: true,
  jmbg: true,
  idCardNumber: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  isEmailVerified: true,
  subscription: {
    select: {
      id: true,
      startDate: true,
      endDate: true,
      isActive: true,
    },
  },
};

function toPublicUser(user) {
  if (!user) return null;
  const { jmbg, ...rest } = user;
  return { ...rest, jmbg: jmbg ? decryptJmbg(jmbg) : null };
}

async function listUsers({ firstName, lastName, email, page = 1, limit = 20 }) {
  const where = {
    AND: [
      firstName ? { firstName: { contains: firstName.trim() } } : undefined,
      lastName ? { lastName: { contains: lastName.trim() } } : undefined,
      email ? { email: { contains: email.trim() } } : undefined,
    ].filter(Boolean),
  };

  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take: limit,
      select: userDbSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return { items: items.map(toPublicUser), total };
}

async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userDbSelect,
  });
  return toPublicUser(user);
}

async function createUser(data) {
  const user = await prisma.user.create({ data, select: userDbSelect });
  return toPublicUser(user);
}

async function updateUserById(id, data) {
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: userDbSelect,
    });
    return toPublicUser(user);
  } catch (error) {
    if (error?.code === "P2025") return null;
    throw error;
  }
}

async function deleteUserById(id) {
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return false;

  await prisma.$transaction(async (tx) => {
    // Nullify nullable FK references so later deletes don't fail
    await tx.form.updateMany({ where: { updatedById: id }, data: { updatedById: null } });

    // Delete organisations created by this user (and all their children)
    const orgIds = (
      await tx.organization.findMany({ where: { createdById: id }, select: { id: true } })
    ).map((o) => o.id);

    if (orgIds.length > 0) {
      // Collect all form IDs belonging to these orgs
      const orgFormIds = (
        await tx.form.findMany({ where: { organizationId: { in: orgIds } }, select: { id: true } })
      ).map((f) => f.id);
      if (orgFormIds.length > 0) {
        await tx.formAttachment.deleteMany({ where: { formId: { in: orgFormIds } } });
        await tx.formVersion.deleteMany({ where: { formId: { in: orgFormIds } } });
        await tx.form.deleteMany({ where: { id: { in: orgFormIds } } });
      }

      await tx.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } });
      await tx.worker.deleteMany({ where: { organizationId: { in: orgIds } } });

      // Collect clients of these orgs and delete their forms + themselves
      const orgClientIds = (
        await tx.client.findMany({ where: { organizationId: { in: orgIds } }, select: { id: true } })
      ).map((c) => c.id);
      if (orgClientIds.length > 0) {
        const clientFormIds = (
          await tx.form.findMany({ where: { clientId: { in: orgClientIds } }, select: { id: true } })
        ).map((f) => f.id);
        if (clientFormIds.length > 0) {
          await tx.formAttachment.deleteMany({ where: { formId: { in: clientFormIds } } });
          await tx.formVersion.deleteMany({ where: { formId: { in: clientFormIds } } });
          await tx.form.deleteMany({ where: { id: { in: clientFormIds } } });
        }
        await tx.client.deleteMany({ where: { id: { in: orgClientIds } } });
      }

      await tx.organization.deleteMany({ where: { id: { in: orgIds } } });
    }

    // Delete remaining forms created by the user (not inside deleted orgs)
    const userFormIds = (
      await tx.form.findMany({ where: { createdById: id }, select: { id: true } })
    ).map((f) => f.id);
    if (userFormIds.length > 0) {
      await tx.formAttachment.deleteMany({ where: { formId: { in: userFormIds } } });
      await tx.formVersion.deleteMany({ where: { formId: { in: userFormIds } } });
      await tx.form.deleteMany({ where: { id: { in: userFormIds } } });
    }

    // Delete remaining clients created by the user
    const userClientIds = (
      await tx.client.findMany({ where: { createdById: id }, select: { id: true } })
    ).map((c) => c.id);
    if (userClientIds.length > 0) {
      const clientFormIds = (
        await tx.form.findMany({ where: { clientId: { in: userClientIds } }, select: { id: true } })
      ).map((f) => f.id);
      if (clientFormIds.length > 0) {
        await tx.formAttachment.deleteMany({ where: { formId: { in: clientFormIds } } });
        await tx.formVersion.deleteMany({ where: { formId: { in: clientFormIds } } });
        await tx.form.deleteMany({ where: { id: { in: clientFormIds } } });
      }
      await tx.client.deleteMany({ where: { id: { in: userClientIds } } });
    }

    // Remove user from other organisations, delete subscription, delete user
    await tx.organizationMember.deleteMany({ where: { userId: id } });
    await tx.subscription.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  return true;
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUserById,
  deleteUserById,
};
