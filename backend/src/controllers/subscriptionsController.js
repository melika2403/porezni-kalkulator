const jwt = require("jsonwebtoken");
const subscriptionRepository = require("../repositories/subscriptionRepository");
const userRepository = require("../repositories/userRepository");

function setAuthCookieWithRole(res, userId, role) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in environment");
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  const token = jwt.sign({ role }, secret, {
    subject: String(userId),
    expiresIn,
  });
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

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
        await userRepository.updateUserById(userId, { role: "PRO" });
      }
    }
    res.status(200).json({ ok: true, data: sub });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
}

// POST /api/subscriptions/trial — self-service 30-day PRO trial
// One trial per user, gated by users.trialUsedAt
async function startTrial(req, res) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
  }

  const user = await userRepository.getUserById(userId);
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });

  if (user.trialUsedAt) {
    return res.status(409).json({ ok: false, error: "TRIAL_ALREADY_USED" });
  }
  if (user.role !== "USER") {
    return res.status(409).json({ ok: false, error: "ALREADY_SUBSCRIBED" });
  }

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);

  try {
    const sub = await subscriptionRepository.upsert(userId, {
      startDate: start,
      endDate: end,
      isActive: true,
    });
    await userRepository.updateUserById(userId, {
      role: "PRO",
      trialUsedAt: start,
    });
    // Reissue JWT so the new role is reflected on subsequent requests
    setAuthCookieWithRole(res, userId, "PRO");
    return res.status(200).json({ ok: true, data: sub });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
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

module.exports = { upsert, remove, startTrial };
