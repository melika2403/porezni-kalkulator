const { Subscription } = require("../models/index");

const subscriptionAttributes = ["id", "userId", "startDate", "endDate", "isActive", "createdAt", "updatedAt"];

async function getByUserId(userId) {
  return Subscription.findOne({ where: { userId }, attributes: subscriptionAttributes });
}

async function upsert(userId, data) {
  const existing = await Subscription.findOne({ where: { userId }, attributes: ["userId"] });

  if (existing) {
    await Subscription.update(data, { where: { userId } });
  } else {
    await Subscription.create({ userId, ...data });
  }

  return Subscription.findOne({ where: { userId }, attributes: subscriptionAttributes });
}

async function remove(userId) {
  const deleted = await Subscription.destroy({ where: { userId } });
  return deleted > 0;
}

module.exports = { getByUserId, upsert, remove };
