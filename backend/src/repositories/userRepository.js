const prisma = require("../prisma");

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

async function listUsers() {
  return prisma.user.findMany({
    orderBy: { id: "desc" },
    select: publicUserSelect,
  });
}

async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });
}

async function createUser(data) {
  return prisma.user.create({
    data,
    select: publicUserSelect,
  });
}

async function updateUserById(id, data) {
  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: publicUserSelect,
    });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "P2025") {
      return null;
    }
    throw error;
  }
}

async function deleteUserById(id) {
  try {
    await prisma.user.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "P2025") {
      return false;
    }
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
