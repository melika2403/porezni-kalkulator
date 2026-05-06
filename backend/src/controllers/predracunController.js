// ──────────────────────────────────────────────────────────────────────────────
//  POST /api/predracun
//  Body: { plan: "PRO" | "BUSINESS", buyer: {...} }
//  - generira sledeći broj predračuna (atomic, po godini)
//  - snima zapis u DB
//  - generira PDF
//  - šalje email kupcu sa PDF prilogom
//  - vraća PDF kao stream (application/pdf) + meta u zaglavlju
// ──────────────────────────────────────────────────────────────────────────────
const { Op } = require("sequelize");
const { sequelize, Predracun, PredracunCounter, User } =
  require("../models/index");
const {
  generatePredracunPdf,
  calcAmounts,
  formatBroj,
} = require("../utils/predracunPdf");
const { sendPredracunEmail } = require("../utils/mailer");

const isStr = (v) => typeof v === "string" && v.trim().length > 0;

function validate(body) {
  const errors = [];
  if (!body || typeof body !== "object") errors.push("Nedostaje tijelo zahtjeva.");
  const plan = String(body?.plan || "").toUpperCase();
  if (plan !== "PRO" && plan !== "BUSINESS") errors.push("Plan mora biti PRO ili BUSINESS.");
  const b = body?.buyer || {};
  if (!isStr(b.name)) errors.push("Naziv kupca je obavezan.");
  if (!isStr(b.email)) errors.push("Email kupca je obavezan.");
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email).trim()))
    errors.push("Email nije validan.");
  return { errors, plan, buyer: b };
}

// Atomic next number za godinu — koristi transaction sa SELECT FOR UPDATE
async function nextSequence(year) {
  return await sequelize.transaction(async (t) => {
    let row = await PredracunCounter.findOne({
      where: { year },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!row) {
      row = await PredracunCounter.create({ year, lastNumber: 0 }, { transaction: t });
      // re-lock
      row = await PredracunCounter.findOne({
        where: { year },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
    }
    const next = row.lastNumber + 1;
    row.lastNumber = next;
    await row.save({ transaction: t });
    return next;
  });
}

async function create(req, res) {
  const { errors, plan, buyer } = validate(req.body);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: errors.join(" ") });
  }

  try {
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const year = issueDate.getFullYear();
    const seq = await nextSequence(year);
    const fullNumber = formatBroj(seq, year);

    const { net, vat, gross } = calcAmounts(plan);

    // snimi predracun
    const pad6 = (n) => String(n).padStart(6, "0");
    const buyerCode = pad6(seq); // jednostavan kod kupca = sekvenca

    const record = await Predracun.create({
      year,
      sequence: seq,
      fullNumber,
      plan,
      netAmount: net,
      vatAmount: vat,
      grossAmount: gross,
      issueDate,
      dueDate,
      buyerCode,
      buyerName: String(buyer.name).trim(),
      buyerAddress: buyer.address ? String(buyer.address).trim() : null,
      buyerCity: buyer.city ? String(buyer.city).trim() : null,
      buyerPostalCode: buyer.postalCode ? String(buyer.postalCode).trim() : null,
      buyerPhone: buyer.phone ? String(buyer.phone).trim() : null,
      buyerEmail: String(buyer.email).trim(),
      buyerIdNumber: buyer.idNumber ? String(buyer.idNumber).trim() : null,
      buyerVatNumber: buyer.vatNumber ? String(buyer.vatNumber).trim() : null,
      userId: req.user?.id || null,
      status: "ISSUED",
    });

    // generiraj PDF
    const pdfBuffer = await generatePredracunPdf({
      plan,
      fullNumber,
      issueDate,
      dueDate,
      buyer: {
        code: buyerCode,
        name: record.buyerName,
        address: record.buyerAddress,
        city: record.buyerCity,
        postalCode: record.buyerPostalCode,
        phone: record.buyerPhone,
        idNumber: record.buyerIdNumber,
        vatNumber: record.buyerVatNumber,
        email: record.buyerEmail,
      },
    });

    // pošalji email u pozadini (ne blokiramo odgovor više nego treba)
    sendPredracunEmail({
      to: record.buyerEmail,
      buyerName: record.buyerName,
      fullNumber,
      plan,
      gross,
      pdfBuffer,
    }).catch((e) => console.error("predracun email error:", e));

    // vrati PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Predracun-${fullNumber.replace(/\//g, "-")}.pdf"`,
    );
    res.setHeader("X-Predracun-Number", fullNumber);
    res.setHeader("X-Predracun-Plan", plan);
    res.setHeader("X-Predracun-Gross", String(gross));
    res.setHeader("Access-Control-Expose-Headers",
      "X-Predracun-Number, X-Predracun-Plan, X-Predracun-Gross");
    return res.status(200).end(pdfBuffer);
  } catch (e) {
    console.error("predracun create error:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/predracun  (admin only)
//  Query: ?q=<search>&plan=PRO|BUSINESS&page=1&limit=20
//  Vraća listu predračuna sa snapshotom kupca i osnovnim podacima usera (ako je
//  bio ulogovan kad je predračun napravljen).
// ─────────────────────────────────────────────────────────────────────────────
function parseInt1(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

async function list(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const plan = String(req.query.plan || "").toUpperCase();
    const page = parseInt1(req.query.page, 1);
    const limit = Math.min(parseInt1(req.query.limit, 20), 100);
    const offset = (page - 1) * limit;

    const where = {};
    if (plan === "PRO" || plan === "BUSINESS") where.plan = plan;
    if (q) {
      where[Op.or] = [
        { fullNumber: { [Op.like]: `%${q}%` } },
        { buyerName: { [Op.like]: `%${q}%` } },
        { buyerEmail: { [Op.like]: `%${q}%` } },
        { buyerIdNumber: { [Op.like]: `%${q}%` } },
        { buyerCity: { [Op.like]: `%${q}%` } },
      ];
    }

    const { count, rows } = await Predracun.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "role"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      offset,
      limit,
    });

    return res.status(200).json({
      ok: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          fullNumber: r.fullNumber,
          plan: r.plan,
          netAmount: Number(r.netAmount),
          vatAmount: Number(r.vatAmount),
          grossAmount: Number(r.grossAmount),
          issueDate: r.issueDate,
          dueDate: r.dueDate,
          status: r.status,
          buyer: {
            code: r.buyerCode,
            name: r.buyerName,
            address: r.buyerAddress,
            city: r.buyerCity,
            postalCode: r.buyerPostalCode,
            phone: r.buyerPhone,
            email: r.buyerEmail,
            idNumber: r.buyerIdNumber,
            vatNumber: r.buyerVatNumber,
          },
          user: r.user
            ? {
                id: r.user.id,
                firstName: r.user.firstName,
                lastName: r.user.lastName,
                email: r.user.email,
                role: r.user.role,
              }
            : null,
          createdAt: r.createdAt,
        })),
        total: count,
        page,
        limit,
      },
    });
  } catch (e) {
    console.error("predracun list error:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PATCH /api/predracun/:id/status  (admin only)
//  Body: { status: "ISSUED" | "PAID" | "CANCELLED" }
//  Mijenja status predračuna i vraća ažurirani zapis.
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_STATUSES = ["ISSUED", "PAID", "CANCELLED"];

async function updateStatus(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: "Nevažeći ID." });
    }
    const status = String(req.body?.status || "").toUpperCase();
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: `Status mora biti jedan od: ${ALLOWED_STATUSES.join(", ")}.`,
      });
    }
    const record = await Predracun.findByPk(id);
    if (!record) {
      return res
        .status(404)
        .json({ ok: false, error: "Predračun nije pronađen." });
    }
    record.status = status;
    await record.save();
    return res.status(200).json({
      ok: true,
      data: {
        id: record.id,
        fullNumber: record.fullNumber,
        status: record.status,
        updatedAt: record.updatedAt,
      },
    });
  } catch (e) {
    console.error("predracun updateStatus error:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

module.exports = { create, list, updateStatus };
