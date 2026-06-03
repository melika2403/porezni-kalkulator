const { Op, fn, col, literal } = require("sequelize");
const formRepository = require("../repositories/formRepository");
const { Form, User, Organization } = require("../models/index");

const VALID_TYPES = ["GPD", "SPR", "ZO3", "UGOVOR", "UOD", "AMS", "PLDI", "SIH", "JS3100"];
const VALID_STATUS = ["DRAFT", "GENERATED", "SUBMITTED", "ARCHIVED"];

async function list(req, res) {
  const { type } = req.query;

  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ ok: false, error: "Invalid form type" });
  }

  const forms = await formRepository.getUserForms(req.user.id, type || null);
  res.status(200).json({ ok: true, data: forms });
}

// ── ADMIN: svi sačuvani dokumenti registrovanih korisnika ───────────────────
// GET /api/admin/forms?q&type&status&year&page&limit  (ADMIN)
async function adminList(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 25), 100);
    const where = {};
    const t = String(req.query.type || "").toUpperCase();
    if (VALID_TYPES.includes(t)) where.type = t;
    const st = String(req.query.status || "").toUpperCase();
    if (VALID_STATUS.includes(st)) where.status = st;
    const y = Number(req.query.year);
    if (Number.isInteger(y)) where.year = y;

    // Sažetak po tipu (za prikazani filter, svi redovi).
    const byTypeRows = await Form.findAll({
      where,
      attributes: ["type", [fn("COUNT", col("id")), "cnt"]],
      group: ["type"],
      order: [[literal("cnt"), "DESC"]],
      raw: true,
    });
    const byType = byTypeRows.map((r) => ({ type: r.type, count: Number(r.cnt) }));

    const { count, rows } = await Form.findAndCountAll({
      where,
      include: [
        { model: User, as: "createdBy", attributes: ["id", "firstName", "lastName", "email", "role"], required: false },
        { model: Organization, as: "organization", attributes: ["id", "name"], required: false },
      ],
      order: [["updatedAt", "DESC"]],
      offset: (page - 1) * limit,
      limit,
    });

    const items = rows.map((f) => {
      const p = f.toJSON();
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: p.title,
        year: p.year,
        month: p.month,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        organization: p.organization ? { id: p.organization.id, name: p.organization.name } : null,
        creator: p.createdBy
          ? {
              id: p.createdBy.id,
              name: `${p.createdBy.firstName ?? ""} ${p.createdBy.lastName ?? ""}`.trim() || p.createdBy.email,
              email: p.createdBy.email,
              role: p.createdBy.role,
            }
          : null,
      };
    });

    return res.json({ ok: true, data: { items, total: count, page, limit, byType } });
  } catch (e) {
    console.error("admin forms list failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

module.exports = { list, adminList };
