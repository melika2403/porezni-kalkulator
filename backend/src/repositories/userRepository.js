const prisma = require("../prisma");

async function listUsers() {
  return prisma.user.findMany({
    orderBy: { id: "desc" },
  });
}

async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id },
  });
}

async function createUser(data) {
  return prisma.user.create({
    data,
  });
}

async function updateUserById(id, data) {
  try {
    return await prisma.user.update({
      where: { id },
      data,
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
