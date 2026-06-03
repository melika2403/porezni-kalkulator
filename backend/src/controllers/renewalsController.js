// Obnove pretplata — lista pretplata koje uskoro ističu (ili su upravo istekle)
// + slanje podsjetnika mailom. Cilj: smanjiti churn pretvaranjem metrike u akciju.
const { Op } = require("sequelize");
const { Subscription, User } = require("../models/index");
const { sendSubscriptionReminderEmail } = require("../utils/mailer");

function clampDays(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 365 ? n : 30;
}

function dateOnly(d) {
  return d.toISOString().slice(0, 10);
}

// GET /api/admin/renewals?days=30
// Aktivne pretplate kojima endDate pada do (danas + days). Sve već istekle
// (endDate u prošlosti) UVIJEK ulaze — admin ih treba vidjeti dok ih ne riješi.
async function listExpiring(req, res) {
  try {
    const days = clampDays(req.query.days);
    const todayStr = dateOnly(new Date());
    const to = dateOnly(new Date(Date.now() + days * 86400000));

    const subs = await Subscription.findAll({
      where: {
        isActive: true,
        endDate: { [Op.lte]: to },
      },
      include: [
        {
          model: User,
          attributes: ["id", "firstName", "lastName", "email", "phone", "role"],
          required: true,
          // Ne podsjećamo admine na obnovu.
          where: { role: { [Op.ne]: "ADMIN" } },
        },
      ],
      order: [["endDate", "ASC"]],
    });

    const items = subs.map((s) => {
      const u = s.User;
      const end = s.endDate; // YYYY-MM-DD
      const daysLeft = Math.round(
        (new Date(`${end}T00:00:00`).getTime() -
          new Date(`${todayStr}T00:00:00`).getTime()) /
          86400000,
      );
      return {
        userId: u.id,
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
        email: u.email,
        phone: u.phone || null,
        role: u.role,
        plan: s.plan || (u.role === "BUSINESS" ? "BUSINESS" : u.role === "PRO" ? "PRO" : null),
        billingCycle: s.billingCycle || null,
        startDate: s.startDate,
        endDate: end,
        daysLeft,
        reminderSentAt: s.reminderSentAt,
        isTrial: Boolean(s.isTrial),
      };
    });

    return res.json({ ok: true, data: { items, days, total: items.length } });
  } catch (e) {
    console.error("renewals listExpiring failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// POST /api/admin/renewals/:userId/reminder
// Pošalji podsjetnik za obnovu i zapamti vrijeme slanja.
async function sendReminder(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid userId" });
    }

    const sub = await Subscription.findOne({
      where: { userId },
      include: [{ model: User, required: true }],
    });
    if (!sub) return res.status(404).json({ ok: false, error: "Pretplata nije pronađena" });

    const u = sub.User;
    if (!u.email) {
      return res.status(400).json({ ok: false, error: "Korisnik nema email adresu" });
    }

    const isTrial = Boolean(sub.isTrial);
    const frontendUrl = process.env.FRONTEND_URL || "https://poreznikalkulator.ba";
    // Trial → aktivacija pretplate (izbor plana) ide na /pretplate.
    // Plaćena pretplata → obnova preko profila.
    const renewUrl = isTrial
      ? `${frontendUrl}/pretplate`
      : `${frontendUrl}/profil?tab=pretplata`;
    const endStr = String(sub.endDate).slice(0, 10);
    const [y, m, d] = endStr.split("-");
    const endDateStr = y && m && d ? `${d}.${m}.${y}.` : endStr;
    const todayStr = dateOnly(new Date());
    const daysLeft = Math.round(
      (new Date(`${endStr}T00:00:00`).getTime() -
        new Date(`${todayStr}T00:00:00`).getTime()) /
        86400000,
    );

    // Plan za prikaz u mailu: subscription.plan ako je PRO/BUSINESS, inače rola.
    const planForMail =
      sub.plan === "PRO" || sub.plan === "BUSINESS"
        ? sub.plan
        : u.role === "PRO" || u.role === "BUSINESS"
          ? u.role
          : null;

    await sendSubscriptionReminderEmail(u.email, u.firstName || "korisniče", {
      plan: planForMail,
      endDateStr,
      renewUrl,
      daysLeft,
      isTrial,
    });

    sub.reminderSentAt = new Date();
    await sub.save();

    return res.json({
      ok: true,
      data: { userId, reminderSentAt: sub.reminderSentAt },
    });
  } catch (e) {
    console.error("renewals sendReminder failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// PATCH /api/admin/renewals/:userId/trial  { isTrial: boolean }
// Ručno označi/skini trial (npr. kad admin ručno da Business na mjesec za probu).
async function toggleTrial(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid userId" });
    }
    const sub = await Subscription.findOne({ where: { userId } });
    if (!sub) return res.status(404).json({ ok: false, error: "Pretplata nije pronađena" });

    sub.isTrial = Boolean(req.body?.isTrial);
    await sub.save();

    return res.json({ ok: true, data: { userId, isTrial: sub.isTrial } });
  } catch (e) {
    console.error("renewals toggleTrial failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

module.exports = { listExpiring, sendReminder, toggleTrial };
