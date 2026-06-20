const { Op, fn, col } = require("sequelize");
const {
  User,
  Subscription,
  ClientPayment,
  CompanyExpense,
  OtherIncome,
} = require("../models/index");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value, fallback) {
  const v = firstQueryValue(value);
  const n = Number.parseInt(typeof v === "string" ? v : String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseYear(value) {
  const n = parsePositiveInt(value, new Date().getFullYear());
  return n >= 2000 && n <= 2100 ? n : new Date().getFullYear();
}

function parseAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function parseDateOnly(value) {
  if (typeof value !== "string") return null;
  const m = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m)) return null;
  const d = new Date(m);
  return isNaN(d.getTime()) ? null : m;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

// GET /api/admin/finance/payments?year&search&page&limit
async function listPayments(req, res) {
  const year = parseYear(req.query.year);
  const search = (firstQueryValue(req.query.search) || "").trim();
  const page = parsePositiveInt(req.query.page, 1);
  const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
  const offset = (page - 1) * limit;

  // Klijenti = plaćeni paketi (Pro / Business). Obični USER i ADMIN se ne prikazuju.
  // Istekli Pro/Business ostaju (rola se ne vraća na USER kad pretplata istekne),
  // pa se vidi i historija uplata.
  const where = { role: { [Op.in]: ["PRO", "BUSINESS"] } };
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  try {
    const { count: total, rows: users } = await User.findAndCountAll({
      where,
      attributes: ["id", "firstName", "lastName", "email", "role"],
      include: [
        {
          model: Subscription,
          as: "subscription",
          attributes: ["startDate", "endDate", "isActive"],
          // Opcionalno — period pretplate se prikazuje kad postoji.
          required: false,
        },
      ],
      order: [["id", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    const userIds = users.map((u) => u.id);
    const payments = userIds.length
      ? await ClientPayment.findAll({
          where: { userId: { [Op.in]: userIds }, year },
        })
      : [];

    const byUser = new Map();
    for (const p of payments) {
      if (!byUser.has(p.userId)) byUser.set(p.userId, {});
      byUser.get(p.userId)[p.month] = {
        id: p.id,
        amount: Number(p.amount),
        isAnnual: p.isAnnual,
        note: p.note,
      };
    }

    const items = users.map((u) => {
      const plain = u.toJSON();
      const months = byUser.get(u.id) || {};
      const yearTotal = Object.values(months).reduce(
        (sum, m) => sum + (m.amount || 0),
        0,
      );
      return {
        user: {
          id: plain.id,
          firstName: plain.firstName,
          lastName: plain.lastName,
          email: plain.email,
          role: plain.role, // paket (PRO / BUSINESS / …)
          subscriptionActive: plain.subscription?.isActive ?? false,
          subscriptionStart: plain.subscription?.startDate ?? null,
          subscriptionEnd: plain.subscription?.endDate ?? null,
        },
        months,
        yearTotal: Math.round(yearTotal * 100) / 100,
      };
    });

    // Ukupno zarađeno za godinu (svi klijenti, ne samo trenutna stranica).
    const totalEarnedRow = await ClientPayment.findOne({
      where: { year },
      attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
      raw: true,
    });
    const totalEarned = Number(totalEarnedRow?.total || 0);

    return res.status(200).json({
      ok: true,
      data: { items, total, page, limit, year, summary: { totalEarned } },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

// PUT /api/admin/finance/payments
// body: { userId, year, month, amount, isAnnual, note }
// Upsert po (userId, year, month). Ako je amount prazno/0 i nema napomene → briše red.
async function upsertPayment(req, res) {
  const { userId, year, month, amount, isAnnual, note } = req.body ?? {};

  const uid = Number(userId);
  if (!Number.isInteger(uid) || uid <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid userId" });
  }
  const y = parseYear(year);
  const m = Number(month);
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    return res.status(400).json({ ok: false, error: "Invalid month" });
  }
  const amt = parseAmount(amount) ?? 0;
  const annual = Boolean(isAnnual);
  const noteVal =
    typeof note === "string" && note.trim() ? note.trim().slice(0, 255) : null;

  try {
    const user = await User.findByPk(uid, { attributes: ["id"] });
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    const existing = await ClientPayment.findOne({
      where: { userId: uid, year: y, month: m },
    });

    // Prazan unos → obriši postojeći red (ako postoji).
    if (amt === 0 && !noteVal && !annual) {
      if (existing) await existing.destroy();
      return res.status(200).json({ ok: true, data: null });
    }

    if (existing) {
      existing.amount = amt;
      existing.isAnnual = annual;
      existing.note = noteVal;
      await existing.save();
      return res.status(200).json({ ok: true, data: existing });
    }

    const created = await ClientPayment.create({
      userId: uid,
      year: y,
      month: m,
      amount: amt,
      isAnnual: annual,
      note: noteVal,
      createdById: req.user?.id ?? null,
    });
    return res.status(201).json({ ok: true, data: created });
  } catch (error) {
    if (error && error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ ok: false, error: "DUPLICATE_PAYMENT" });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

// DELETE /api/admin/finance/payments/:id
async function deletePayment(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  const deleted = await ClientPayment.destroy({ where: { id } });
  if (!deleted) return res.status(404).json({ ok: false, error: "Payment not found" });
  return res.status(200).json({ ok: true });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

// GET /api/admin/finance/expenses?year
async function listExpenses(req, res) {
  const year = parseYear(req.query.year);
  try {
    const items = await CompanyExpense.findAll({
      where: {
        date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] },
      },
      order: [
        ["date", "DESC"],
        ["id", "DESC"],
      ],
    });
    const totalInvested = items.reduce((sum, e) => sum + Number(e.amount), 0);
    return res.status(200).json({
      ok: true,
      data: {
        items,
        year,
        summary: { totalInvested: Math.round(totalInvested * 100) / 100 },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

// Dozvoljene kategorije troška. MARKETING ulazi u CAC obračun.
const EXPENSE_CATEGORIES = [
  "MARKETING",
  "INFRASTRUKTURA",
  "ALATI",
  "PLATE",
  "OSTALO",
];

function validateExpenseBody(body, { partial = false } = {}) {
  const data = {};
  const { date, amount, description, category } = body ?? {};

  if (date !== undefined || !partial) {
    const d = parseDateOnly(date);
    if (!d) return { ok: false, message: "Invalid date (YYYY-MM-DD)" };
    data.date = d;
  }
  if (amount !== undefined || !partial) {
    const a = parseAmount(amount);
    if (a === null) return { ok: false, message: "Invalid amount" };
    data.amount = a;
  }
  if (description !== undefined || !partial) {
    if (typeof description !== "string" || !description.trim()) {
      return { ok: false, message: "Description is required" };
    }
    data.description = description.trim().slice(0, 255);
  }
  if (category !== undefined) {
    const c = String(category).trim().toUpperCase();
    data.category = EXPENSE_CATEGORIES.includes(c) ? c : "OSTALO";
  } else if (!partial) {
    data.category = "OSTALO";
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, message: "No fields to update" };
  }
  return { ok: true, value: data };
}

// POST /api/admin/finance/expenses
async function createExpense(req, res) {
  const validation = validateExpenseBody(req.body);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.message });
  }
  try {
    const created = await CompanyExpense.create({
      ...validation.value,
      createdById: req.user?.id ?? null,
    });
    return res.status(201).json({ ok: true, data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

// PUT /api/admin/finance/expenses/:id
async function updateExpense(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  const validation = validateExpenseBody(req.body, { partial: true });
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.message });
  }
  try {
    const expense = await CompanyExpense.findByPk(id);
    if (!expense) return res.status(404).json({ ok: false, error: "Expense not found" });
    await expense.update(validation.value);
    return res.status(200).json({ ok: true, data: expense });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

// DELETE /api/admin/finance/expenses/:id
async function deleteExpense(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  const deleted = await CompanyExpense.destroy({ where: { id } });
  if (!deleted) return res.status(404).json({ ok: false, error: "Expense not found" });
  return res.status(200).json({ ok: true });
}

// ─── Ostali prihodi (gotovina) ─────────────────────────────────────────────────
// Isti oblik kao troškovi; validacija dijeli validateExpenseBody (date/amount/opis).

// GET /api/admin/finance/other-income?year
async function listOtherIncome(req, res) {
  const year = parseYear(req.query.year);
  try {
    const items = await OtherIncome.findAll({
      where: { date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] } },
      order: [
        ["date", "DESC"],
        ["id", "DESC"],
      ],
    });
    const totalIncome = items.reduce((sum, e) => sum + Number(e.amount), 0);
    return res.status(200).json({
      ok: true,
      data: {
        items,
        year,
        summary: { totalIncome: Math.round(totalIncome * 100) / 100 },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

// POST /api/admin/finance/other-income
async function createOtherIncome(req, res) {
  const validation = validateExpenseBody(req.body);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.message });
  }
  try {
    const created = await OtherIncome.create({
      ...validation.value,
      createdById: req.user?.id ?? null,
    });
    return res.status(201).json({ ok: true, data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

// PUT /api/admin/finance/other-income/:id
async function updateOtherIncome(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  const validation = validateExpenseBody(req.body, { partial: true });
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.message });
  }
  try {
    const row = await OtherIncome.findByPk(id);
    if (!row) return res.status(404).json({ ok: false, error: "Income not found" });
    await row.update(validation.value);
    return res.status(200).json({ ok: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

// DELETE /api/admin/finance/other-income/:id
async function deleteOtherIncome(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  const deleted = await OtherIncome.destroy({ where: { id } });
  if (!deleted) return res.status(404).json({ ok: false, error: "Income not found" });
  return res.status(200).json({ ok: true });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

// GET /api/admin/finance/summary?year
async function getSummary(req, res) {
  const year = parseYear(req.query.year);
  try {
    const earnedRow = await ClientPayment.findOne({
      where: { year },
      attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
      raw: true,
    });
    const otherRow = await OtherIncome.findOne({
      where: { date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] } },
      attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
      raw: true,
    });
    const investedRow = await CompanyExpense.findOne({
      where: { date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] } },
      attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
      raw: true,
    });
    const subscriptionsEarned = Math.round(Number(earnedRow?.total || 0) * 100) / 100;
    const totalOtherIncome = Math.round(Number(otherRow?.total || 0) * 100) / 100;
    const totalEarned = Math.round((subscriptionsEarned + totalOtherIncome) * 100) / 100;
    const totalInvested = Math.round(Number(investedRow?.total || 0) * 100) / 100;

    // Kumulativni profit: zbir (zarađeno - uloženo) svih godina <= izabrane.
    // Profit se prenosi iz godine u godinu (samo unaprijed), dok zarađeno i
    // uloženo ostaju po godini.
    const cumEarnedRow = await ClientPayment.findOne({
      where: { year: { [Op.lte]: year } },
      attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
      raw: true,
    });
    const cumOtherRow = await OtherIncome.findOne({
      where: { date: { [Op.lte]: `${year}-12-31` } },
      attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
      raw: true,
    });
    const cumInvestedRow = await CompanyExpense.findOne({
      where: { date: { [Op.lte]: `${year}-12-31` } },
      attributes: [[fn("COALESCE", fn("SUM", col("amount")), 0), "total"]],
      raw: true,
    });
    const cumEarned =
      Math.round(
        (Number(cumEarnedRow?.total || 0) + Number(cumOtherRow?.total || 0)) * 100,
      ) / 100;
    const cumInvested = Math.round(Number(cumInvestedRow?.total || 0) * 100) / 100;
    const cumulativeProfit = Math.round((cumEarned - cumInvested) * 100) / 100;

    return res.status(200).json({
      ok: true,
      data: {
        year,
        totalEarned,
        subscriptionsEarned,
        totalOtherIncome,
        totalInvested,
        profit: Math.round((totalEarned - totalInvested) * 100) / 100,
        cumulativeProfit,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}

module.exports = {
  listPayments,
  upsertPayment,
  deletePayment,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  listOtherIncome,
  createOtherIncome,
  updateOtherIncome,
  deleteOtherIncome,
  getSummary,
};
