const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const subscriptionRepository = require("../repositories/subscriptionRepository");
const userRepository = require("../repositories/userRepository");
const {
  Subscription,
  Invoice,
  OrganizationMember,
  Organization,
  Predracun,
} = require("../models/index");
const { PLANS, getPlan, planFromRole } = require("../config/plans");

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

// ─── /api/subscription (current user) ──────────────────────────────────────

async function computeUsage(userId) {
  const ownedOrgs = await OrganizationMember.count({
    where: { userId, role: "OWNER" },
    include: [{ model: Organization, as: "organization", where: { isClientOrg: false }, attributes: ["id"] }],
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const transactionsThisMonth = await Invoice.count({
    where: { userId, createdAt: { [Op.gte]: monthStart } },
  });

  return {
    organizations: ownedOrgs,
    transactionsThisMonth,
    users: 1,
  };
}

async function ensureSubscription(userId, role) {
  let sub = await Subscription.findOne({ where: { userId } });
  const planKey = planFromRole(role);

  if (!sub) {
    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 100); // free = "forever"
    sub = await Subscription.create({
      userId,
      startDate: start,
      endDate: end,
      isActive: planKey !== "free" ? true : true,
      plan: planKey,
      status: "active",
    });
    return sub;
  }

  // Sinhroniziraj plan iz role-a ako se razlikuje
  if (sub.plan !== planKey) {
    sub.plan = planKey;
    await sub.save();
  }
  return sub;
}

function buildSubscriptionResponse(sub, plan, usage) {
  return {
    id: sub.id,
    plan: sub.plan,
    status: sub.status,
    billingCycle: sub.billingCycle,
    isActive: sub.isActive,
    currentPeriodStart: sub.startDate,
    currentPeriodEnd: sub.endDate,
    cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd,
    cancelledAt: sub.cancelledAt,
    limits: plan.limits,
    usage,
  };
}

async function getCurrent(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const user = await userRepository.getUserById(userId);
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });

  const sub = await ensureSubscription(userId, user.role);
  const plan = getPlan(sub.plan);
  const usage = await computeUsage(userId);

  return res.json({ ok: true, data: buildSubscriptionResponse(sub, plan, usage) });
}

async function listPlans(_req, res) {
  return res.json({ ok: true, data: Object.values(PLANS) });
}

async function listInvoices(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { count, rows } = await Predracun.findAndCountAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const data = rows.map((p) => ({
    id: p.id,
    invoiceNumber: p.fullNumber,
    amount: p.grossAmount,
    currency: "BAM",
    status: p.status === "PAID" ? "paid" : p.status === "CANCELLED" ? "refunded" : "pending",
    invoiceDate: p.issueDate,
    dueDate: p.dueDate,
    plan: p.plan,
    pdfUrl: null,
  }));

  return res.json({
    ok: true,
    data: { items: data, total: count, page, limit },
  });
}

async function changePlan(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const { plan, billing_cycle, billingCycle } = req.body ?? {};
  const cycle = billingCycle || billing_cycle;

  if (!["free", "pro", "business"].includes(plan)) {
    return res.status(400).json({ ok: false, error: "INVALID_PLAN" });
  }
  if (cycle && !["monthly", "yearly"].includes(cycle)) {
    return res.status(400).json({ ok: false, error: "INVALID_BILLING_CYCLE" });
  }

  const user = await userRepository.getUserById(userId);
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });

  const newRole = plan === "pro" ? "PRO" : plan === "business" ? "BUSINESS" : "USER";
  await userRepository.updateUserById(userId, { role: newRole });

  const sub = await ensureSubscription(userId, newRole);
  sub.plan = plan;
  sub.status = "active";
  sub.cancelAtPeriodEnd = false;
  sub.cancelledAt = null;
  if (cycle) sub.billingCycle = cycle;
  sub.isActive = true;
  await sub.save();

  // Reissue JWT s novom rolom
  setAuthCookieWithRole(res, userId, newRole);

  const planConfig = getPlan(plan);
  const usage = await computeUsage(userId);
  return res.json({ ok: true, data: buildSubscriptionResponse(sub, planConfig, usage) });
}

async function cancelCurrent(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const sub = await Subscription.findOne({ where: { userId } });
  if (!sub) return res.status(404).json({ ok: false, error: "NO_SUBSCRIPTION" });
  if (sub.plan === "free") {
    return res.status(400).json({ ok: false, error: "CANNOT_CANCEL_FREE" });
  }

  sub.cancelAtPeriodEnd = true;
  sub.cancelledAt = new Date();
  await sub.save();

  const user = await userRepository.getUserById(userId);
  const plan = getPlan(sub.plan);
  const usage = await computeUsage(userId);
  return res.json({ ok: true, data: buildSubscriptionResponse(sub, plan, usage) });
}

async function reactivateCurrent(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });

  const sub = await Subscription.findOne({ where: { userId } });
  if (!sub) return res.status(404).json({ ok: false, error: "NO_SUBSCRIPTION" });

  sub.cancelAtPeriodEnd = false;
  sub.cancelledAt = null;
  sub.status = "active";
  sub.isActive = true;
  await sub.save();

  const plan = getPlan(sub.plan);
  const usage = await computeUsage(userId);
  return res.json({ ok: true, data: buildSubscriptionResponse(sub, plan, usage) });
}

module.exports = {
  upsert,
  remove,
  startTrial,
  getCurrent,
  listPlans,
  listInvoices,
  changePlan,
  cancelCurrent,
  reactivateCurrent,
};
