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
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch (error) {
    if (error?.code === "P2025") return false;
    throw error;
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUserById,
  deleteUserById,
};
