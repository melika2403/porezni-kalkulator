// Admin overview — objedinjene KPI brojke za /admin Dashboard.
const { Op, fn, col, literal } = require("sequelize");
const {
  User,
  Subscription,
  Predracun,
  ClientPayment,
  OtherIncome,
  CompanyExpense,
  ActivityLog,
  Organization,
  Worker,
  Form,
  Invoice,
} = require("../models/index");
const { monthlyEquivalent } = require("../config/pricing");

function parseYear(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2020 && n <= 2100 ? n : new Date().getFullYear();
}

function num(v) {
  return Math.round(Number(v || 0) * 100) / 100;
}

async function getDashboard(req, res) {
  try {
    const year = parseYear(req.query.year);
    const yStart = `${year}-01-01`;
    const yEnd = `${year}-12-31`;
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const [
      usersTotal,
      usersNew30,
      usersVerified,
      usersByRole,
      activeSubs,
      expiringSoon,
      subsByCycle,
      earnedRow,
      otherRow,
      investedRow,
      predracuniByStatus,
      predracuniPaidRow,
      activity30,
      activityByAction,
      orgsTotal,
      workersTotal,
    ] = await Promise.all([
      User.count(),
      User.count({
        where: { createdAt: { [Op.gte]: literal("(NOW() - INTERVAL 30 DAY)") } },
      }),
      User.count({ where: { isEmailVerified: true } }),
      User.findAll({
        attributes: ["role", [fn("COUNT", col("id")), "count"]],
        group: ["role"],
        raw: true,
      }),
      Subscription.count({
        where: { isActive: true, endDate: { [Op.gte]: today } },
      }),
      Subscription.count({
        where: { isActive: true, endDate: { [Op.between]: [today, in30] } },
      }),
      Subscription.findAll({
        where: { isActive: true, endDate: { [Op.gte]: today } },
        attributes: ["billingCycle", [fn("COUNT", col("id")), "count"]],
        group: ["billingCycle"],
        raw: true,
      }),
      ClientPayment.findOne({
        where: { year },
        attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
        raw: true,
      }),
      OtherIncome.findOne({
        where: { date: { [Op.between]: [yStart, yEnd] } },
        attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
        raw: true,
      }),
      CompanyExpense.findOne({
        where: { date: { [Op.between]: [yStart, yEnd] } },
        attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
        raw: true,
      }),
      Predracun.findAll({
        attributes: ["status", [fn("COUNT", col("id")), "count"]],
        group: ["status"],
        raw: true,
      }),
      Predracun.findOne({
        where: { status: "PAID" },
        attributes: [[fn("COALESCE", fn("SUM", col("grossAmount")), 0), "total"]],
        raw: true,
      }),
      ActivityLog.count({
        where: { createdAt: { [Op.gte]: literal("(NOW() - INTERVAL 30 DAY)") } },
      }),
      ActivityLog.findAll({
        where: { createdAt: { [Op.gte]: literal("(NOW() - INTERVAL 30 DAY)") } },
        attributes: ["action", [fn("COUNT", col("id")), "count"]],
        group: ["action"],
        order: [[literal("count"), "DESC"]],
        limit: 5,
        raw: true,
      }),
      Organization.count({ where: { isClientOrg: false } }),
      Worker.count(),
    ]);

    // ── Trial konverzija ──────────────────────────────────────────────────
    // Konvertovan = iskoristio trial + ima aktivnu pretplatu koja traje DUŽE od
    // ~31 dana nakon početka triala (znači produžio/platio, nije samo trial).
    const trialsStarted = await User.count({
      where: { trialUsedAt: { [Op.ne]: null } },
    });
    const convertedRow = await User.findOne({
      where: { trialUsedAt: { [Op.ne]: null } },
      include: [
        {
          model: Subscription,
          as: "subscription",
          required: true,
          where: {
            isActive: true,
            endDate: {
              [Op.gt]: literal("DATE_ADD(`User`.`trialUsedAt`, INTERVAL 31 DAY)"),
            },
          },
          attributes: [],
        },
      ],
      attributes: [[fn("COUNT", literal("DISTINCT `User`.`id`")), "count"]],
      raw: true,
    });
    const trialsConverted = Number(convertedRow?.count || 0);

    // ── Mjesečni trend (za izabranu godinu) ───────────────────────────────
    // Registracije po mjesecu (User.createdAt) + prihod po mjesecu
    // (ClientPayment.month + OtherIncome MONTH(date)).
    const regRows = await User.findAll({
      where: { createdAt: { [Op.between]: [`${yStart} 00:00:00`, `${yEnd} 23:59:59`] } },
      attributes: [
        [fn("MONTH", col("createdAt")), "m"],
        [fn("COUNT", col("id")), "c"],
      ],
      group: [literal("MONTH(createdAt)")],
      raw: true,
    });
    const payRows = await ClientPayment.findAll({
      where: { year },
      attributes: ["month", [fn("COALESCE", fn("SUM", col("amount")), 0), "s"]],
      group: ["month"],
      raw: true,
    });
    const incRows = await OtherIncome.findAll({
      where: { date: { [Op.between]: [yStart, yEnd] } },
      attributes: [
        [fn("MONTH", col("date")), "m"],
        [fn("COALESCE", fn("SUM", col("amount")), 0), "s"],
      ],
      group: [literal("MONTH(date)")],
      raw: true,
    });

    const registrations = Array(12).fill(0);
    for (const r of regRows) {
      const m = Number(r.m);
      if (m >= 1 && m <= 12) registrations[m - 1] = Number(r.c);
    }
    const revenue = Array(12).fill(0);
    for (const r of payRows) {
      const m = Number(r.month);
      if (m >= 1 && m <= 12) revenue[m - 1] += Number(r.s);
    }
    for (const r of incRows) {
      const m = Number(r.m);
      if (m >= 1 && m <= 12) revenue[m - 1] += Number(r.s);
    }
    const revenueRounded = revenue.map((v) => Math.round(v * 100) / 100);

    // ── MRR / ARR ─────────────────────────────────────────────────────────
    // Iz aktivnih pretplata: plan (sub.plan ili rola korisnika) + ciklus
    // (sub.billingCycle, default godišnje). Stare pretplate bez plana koriste
    // rolu kao fallback. Cijene iz config/pricing.js (gross).
    const activeSubRows = await Subscription.findAll({
      where: { isActive: true, endDate: { [Op.gte]: today } },
      include: [{ model: User, attributes: ["role"], required: false }],
      attributes: ["plan", "billingCycle"],
    });
    let mrr = 0;
    for (const s of activeSubRows) {
      const role = s.User?.role;
      const plan =
        s.plan ||
        (role === "BUSINESS" ? "BUSINESS" : role === "PRO" ? "PRO" : null);
      if (!plan) continue;
      const cycle = s.billingCycle || "yearly";
      mrr += monthlyEquivalent(plan, cycle);
    }
    mrr = Math.round(mrr * 100) / 100;

    // ── Churn (zadnjih 30 dana) ───────────────────────────────────────────
    // Pretplate kojima je endDate prošao u zadnjih 30 dana i nisu obnovljene
    // (jedna pretplata po korisniku — obnova bi pomjerila endDate u budućnost).
    const churned30 = await Subscription.count({
      where: {
        endDate: {
          [Op.between]: [
            literal("(NOW() - INTERVAL 30 DAY)"),
            literal("(NOW() - INTERVAL 1 DAY)"),
          ],
        },
      },
    });

    // ── Konverzioni lijevak (za godinu) ───────────────────────────────────
    // anonimno → registracija → trial → plaćeno. NAPOMENA: anonimno je broj
    // GENERACIJA (eventi), ne jedinstvenih ljudi (njih ne pratimo).
    const dtStart = `${yStart} 00:00:00`;
    const dtEnd = `${yEnd} 23:59:59`;
    const [funnelAnon, funnelReg, funnelTrial] = await Promise.all([
      ActivityLog.count({
        where: { userId: null, createdAt: { [Op.between]: [dtStart, dtEnd] } },
      }),
      User.count({ where: { createdAt: { [Op.between]: [dtStart, dtEnd] } } }),
      User.count({ where: { trialUsedAt: { [Op.between]: [dtStart, dtEnd] } } }),
    ]);
    const funnelPaidRow = await User.findOne({
      where: { trialUsedAt: { [Op.between]: [dtStart, dtEnd] } },
      include: [
        {
          model: Subscription,
          as: "subscription",
          required: true,
          where: {
            isActive: true,
            endDate: {
              [Op.gt]: literal("DATE_ADD(`User`.`trialUsedAt`, INTERVAL 31 DAY)"),
            },
          },
          attributes: [],
        },
      ],
      attributes: [[fn("COUNT", literal("DISTINCT `User`.`id`")), "count"]],
      raw: true,
    });
    const funnelPaid = Number(funnelPaidRow?.count || 0);

    // ── Registracije po izvoru (UTM, za godinu) ───────────────────────────
    // Grupisano po utmSource; prazno/NULL ide u "direktno".
    const sourceRows = await User.findAll({
      where: { createdAt: { [Op.between]: [dtStart, dtEnd] } },
      attributes: ["utmSource", [fn("COUNT", col("id")), "count"]],
      group: ["utmSource"],
      raw: true,
    });
    const bySource = sourceRows
      .map((r) => ({
        source: r.utmSource && String(r.utmSource).trim() ? r.utmSource : "direktno",
        count: Number(r.count),
      }))
      .sort((a, b) => b.count - a.count);

    // ── CAC (Customer Acquisition Cost) ───────────────────────────────────
    // Marketing trošak (kategorija MARKETING) / broj novih plaćenih korisnika
    // (trial konvertovani) u godini. Bez plaćenih → null (ne dijeli s nulom).
    const marketingRow = await CompanyExpense.findOne({
      where: { date: { [Op.between]: [yStart, yEnd] }, category: "MARKETING" },
      attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
      raw: true,
    });
    const marketingSpend = num(marketingRow?.total);
    const cac = funnelPaid > 0 ? Math.round((marketingSpend / funnelPaid) * 100) / 100 : null;

    const roleCounts = { USER: 0, PRO: 0, BUSINESS: 0, ADMIN: 0 };
    for (const r of usersByRole) {
      if (roleCounts[r.role] !== undefined) roleCounts[r.role] = Number(r.count);
    }

    const cycle = { monthly: 0, yearly: 0 };
    for (const r of subsByCycle) {
      if (r.billingCycle === "monthly") cycle.monthly = Number(r.count);
      else if (r.billingCycle === "yearly") cycle.yearly = Number(r.count);
    }

    const statusCounts = { ISSUED: 0, PAID: 0, CANCELLED: 0 };
    for (const r of predracuniByStatus) {
      if (statusCounts[r.status] !== undefined) statusCounts[r.status] = Number(r.count);
    }

    const subscriptionsEarned = num(earnedRow?.total);
    const otherIncome = num(otherRow?.total);
    const totalEarned = num(subscriptionsEarned + otherIncome);
    const totalInvested = num(investedRow?.total);

    return res.json({
      ok: true,
      data: {
        year,
        users: {
          total: usersTotal,
          new30: usersNew30,
          verified: usersVerified,
          byRole: roleCounts,
        },
        subscriptions: {
          active: activeSubs,
          expiringSoon,
          byCycle: cycle,
          pro: roleCounts.PRO,
          business: roleCounts.BUSINESS,
        },
        finance: {
          subscriptionsEarned,
          otherIncome,
          totalEarned,
          totalInvested,
          profit: num(totalEarned - totalInvested),
        },
        predracuni: {
          byStatus: statusCounts,
          paidAmount: num(predracuniPaidRow?.total),
        },
        activity: {
          last30: activity30,
          topActions: activityByAction.map((r) => ({
            action: r.action,
            count: Number(r.count),
          })),
        },
        orgs: { total: orgsTotal, workers: workersTotal },
        trials: {
          started: trialsStarted,
          converted: trialsConverted,
          rate: trialsStarted
            ? Math.round((trialsConverted / trialsStarted) * 1000) / 10
            : 0,
        },
        monthly: { registrations, revenue: revenueRounded },
        recurring: {
          mrr,
          arr: Math.round(mrr * 12 * 100) / 100,
          churned30,
          churnRate:
            activeSubs + churned30 > 0
              ? Math.round((churned30 / (activeSubs + churned30)) * 1000) / 10
              : 0,
        },
        funnel: {
          anonymous: funnelAnon,
          registrations: funnelReg,
          trials: funnelTrial,
          paid: funnelPaid,
        },
        acquisition: {
          bySource,
          marketingSpend,
          newPaid: funnelPaid,
          cac,
        },
      },
    });
  } catch (e) {
    console.error("admin dashboard failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ── Engagement: ko aktivno koristi, ko "spava" ──────────────────────────────
// GET /api/admin/engagement
// Aktivnost se računa iz STVARNIH zapisa: sačuvani dokumenti (forms), fakture
// (invoices) i event-log (ActivityLog) — kombinovano. ActivityLog sam ne hvata
// sve in-app akcije (npr. šihtericu/ugovore), pa se oslanjamo i na forms/invoices.
async function getEngagement(req, res) {
  try {
    const D90 = literal("(NOW() - INTERVAL 90 DAY)");
    const D60 = literal("(NOW() - INTERVAL 60 DAY)");

    // ── Skupi aktivnost po korisniku (90 dana) iz tri izvora ──────────────
    const [formRows, invoiceRows, activityRows] = await Promise.all([
      Form.findAll({
        where: { createdById: { [Op.ne]: null }, updatedAt: { [Op.gte]: D90 } },
        attributes: [
          ["createdById", "userId"],
          [fn("COUNT", col("id")), "cnt"],
          [fn("MAX", col("updatedAt")), "lastAt"],
        ],
        group: ["createdById"],
        raw: true,
      }),
      Invoice.findAll({
        where: { userId: { [Op.ne]: null }, createdAt: { [Op.gte]: D90 } },
        attributes: [
          "userId",
          [fn("COUNT", col("id")), "cnt"],
          [fn("MAX", col("createdAt")), "lastAt"],
        ],
        group: ["userId"],
        raw: true,
      }),
      ActivityLog.findAll({
        where: { userId: { [Op.ne]: null }, createdAt: { [Op.gte]: D90 } },
        attributes: [
          "userId",
          [fn("COUNT", col("id")), "cnt"],
          [fn("MAX", col("createdAt")), "lastAt"],
        ],
        group: ["userId"],
        raw: true,
      }),
    ]);

    // Spoji u jednu mapu po userId: documents, invoices, events, lastActivity.
    const agg = new Map();
    const bump = (uid, kind, cnt, lastAt) => {
      const id = Number(uid);
      if (!id) return;
      const cur = agg.get(id) || { documents: 0, invoices: 0, events: 0, lastActivity: null };
      if (kind === "doc") cur.documents += cnt;
      else if (kind === "inv") cur.invoices += cnt;
      cur.events += cnt;
      if (lastAt && (!cur.lastActivity || new Date(lastAt) > new Date(cur.lastActivity))) {
        cur.lastActivity = lastAt;
      }
      agg.set(id, cur);
    };
    for (const r of formRows) bump(r.userId, "doc", Number(r.cnt), r.lastAt);
    for (const r of invoiceRows) bump(r.userId, "inv", Number(r.cnt), r.lastAt);
    for (const r of activityRows) bump(r.userId, "evt", Number(r.cnt), r.lastAt);

    const ranked = [...agg.entries()]
      .sort((a, b) => b[1].events - a[1].events)
      .slice(0, 10);
    const topIds = ranked.map(([id]) => id);

    let topActive = [];
    if (topIds.length) {
      const users = await User.findAll({
        where: { id: { [Op.in]: topIds } },
        attributes: ["id", "firstName", "lastName", "email", "role"],
        raw: true,
      });
      const uMap = new Map(users.map((u) => [u.id, u]));
      topActive = ranked.map(([id, v]) => {
        const u = uMap.get(id);
        return {
          userId: id,
          name: u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : `#${id}`,
          email: u?.email ?? null,
          role: u?.role ?? null,
          events: v.events,
          documents: v.documents,
          invoices: v.invoices,
          lastActivity: v.lastActivity,
        };
      });
    }

    // ── Uspavani: bez ijedne aktivnosti (forms/invoices/activity) 60 dana ──
    const [formActive, invoiceActive, logActive] = await Promise.all([
      Form.findAll({
        where: { createdById: { [Op.ne]: null }, updatedAt: { [Op.gte]: D60 } },
        attributes: [[fn("DISTINCT", col("createdById")), "userId"]],
        raw: true,
      }),
      Invoice.findAll({
        where: { userId: { [Op.ne]: null }, createdAt: { [Op.gte]: D60 } },
        attributes: [[fn("DISTINCT", col("userId")), "userId"]],
        raw: true,
      }),
      ActivityLog.findAll({
        where: { userId: { [Op.ne]: null }, createdAt: { [Op.gte]: D60 } },
        attributes: [[fn("DISTINCT", col("userId")), "userId"]],
        raw: true,
      }),
    ]);
    const recentIds = [
      ...new Set(
        [...formActive, ...invoiceActive, ...logActive]
          .map((r) => Number(r.userId))
          .filter(Boolean),
      ),
    ];

    const dormantRows = await User.findAll({
      where: {
        role: { [Op.in]: ["USER", "PRO", "BUSINESS"] },
        ...(recentIds.length ? { id: { [Op.notIn]: recentIds } } : {}),
        createdAt: { [Op.lte]: literal("(NOW() - INTERVAL 14 DAY)") },
      },
      attributes: ["id", "firstName", "lastName", "email", "role", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 15,
      raw: true,
    });
    const dormant = dormantRows.map((u) => ({
      userId: u.id,
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));

    return res.json({ ok: true, data: { topActive, dormant } });
  } catch (e) {
    console.error("admin engagement failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

module.exports = { getDashboard, getEngagement };
