const prisma = require("../prisma");

const subscriptionSelect = {
  id: true,
  userId: true,
  startDate: true,
  endDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

async function getByUserId(userId) {
  return prisma.subscription.findUnique({
    where: { userId },
    select: subscriptionSelect,
  });
}

async function upsert(userId, data) {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { userId: true },
  });

  if (existing) {
    return prisma.subscription.update({
      where: { userId },
      data,
      select: subscriptionSelect,
    });
  }

  return prisma.subscription.create({
    data: { userId, ...data },
    select: subscriptionSelect,
  });
}

async function remove(userId) {
  try {
    await prisma.subscription.delete({ where: { userId } });
    return true;
  } catch (error) {
    if (error?.code === "P2025") return false;
    throw error;
  }
}

module.exports = { getByUserId, upsert, remove };
