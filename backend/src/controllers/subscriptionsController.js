const subscriptionRepository = require("../repositories/subscriptionRepository");
const userRepository = require("../repositories/userRepository");

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

async function upsert(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid user id" });
  }

  const { startDate, endDate, isActive } = req.body ?? {};

  const data = {};

  if (startDate !== undefined) {
    const d = parseDate(startDate);
    if (!d)
      return res.status(400).json({ ok: false, error: "Invalid startDate" });
    data.startDate = d;
  }
  if (endDate !== undefined) {
    const d = parseDate(endDate);
    if (!d)
      return res.status(400).json({ ok: false, error: "Invalid endDate" });
    data.endDate = d;
  }
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  if (data.isActive === false && data.endDate === undefined) {
    data.endDate = new Date();
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ ok: false, error: "No fields to update" });
  }

  // upsert requires startDate + endDate on create
  const existing = await subscriptionRepository.getByUserId(userId);
  if (!existing && (!data.startDate || !data.endDate)) {
    return res.status(400).json({
      ok: false,
      error: "startDate and endDate are required when creating a subscription",
    });
  }

  try {
    const sub = await subscriptionRepository.upsert(userId, data);
    if (data.isActive === true) {
      const user = await userRepository.getUserById(userId);

      if (user && user.role === "USER") {
        await userRepository.updateUserById(userId, { role: "ACCOUNTANT" });
      }
    }
    res.status(200).json({ ok: true, data: sub });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
}

async function remove(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid user id" });
  }

  const deleted = await subscriptionRepository.remove(userId);
  if (!deleted)
    return res.status(404).json({ ok: false, error: "Subscription not found" });
  res.status(200).json({ ok: true });
}

module.exports = { upsert, remove };
