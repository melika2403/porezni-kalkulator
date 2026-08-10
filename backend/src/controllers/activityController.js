// Dnevnik aktivnosti — bilježenje generisanja dokumenata (registrovani + anonimni)
// i admin pregled/statistika.
const { Op, fn, col, literal } = require("sequelize");
const { ActivityLog, User, Organization } = require("../models/index");

// POST /api/activity  (optionalAuth — radi i za anonimne)
// body: { action: string, label?: string }
async function track(req, res) {
  try {
    const action = String(req.body?.action || "").trim().slice(0, 60);
    if (!action) return res.status(400).json({ ok: false, error: "Missing action" });
    const label = req.body?.label
      ? String(req.body.label).trim().slice(0, 160)
      : null;
    const orgRaw = Number(req.body?.organizationId);
    const organizationId = Number.isInteger(orgRaw) && orgRaw > 0 ? orgRaw : null;
    await ActivityLog.create({
      userId: req.user?.id ?? null,
      action,
      label,
      organizationId,
    });
    return res.status(201).json({ ok: true });
  } catch (e) {
    // Tracking je best-effort — nikad ne ruši korisnički flow.
    console.warn("activity track failed:", e?.message || e);
    return res.status(200).json({ ok: true });
  }
}

/** Backend upis u dnevnik aktivnosti (PK Office akcije koje ne idu kroz
 *  frontend trackEvent). Best-effort: greška se samo loguje, nikad ne ruši
 *  korisnički zahtjev. Ulazi i u javnu brojku na landing stranici (osim
 *  sakrivenih zapisa; vidi publicStatsController). */
async function logEvent({ userId = null, action, label = null, organizationId = null }) {
  try {
    await ActivityLog.create({
      userId,
      action: String(action).trim().slice(0, 60),
      label: label ? String(label).trim().slice(0, 160) : null,
      organizationId: Number.isInteger(organizationId) ? organizationId : null,
    });
  } catch (e) {
    console.warn("activity logEvent failed:", e?.message || e);
  }
}

// GET /api/activity/moje (requireAuth): zadnja aktivnost KORISNIKA za
// dashboard profila + agregati (najčešći alat, korišteni alati, brojevi za
// tekući mjesec) za "Predstoji" logiku i personalizovan "najčešće" badge.
async function myActivity(req, res) {
  try {
    const userId = req.user.id;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    // PRIJAVA (login eventi) ne ulazi u korisnički dashboard: nije alat,
    // a po broju bi odmah postala "najčešća aktivnost"
    const bezPrijava = { userId, hiddenAt: null, action: { [Op.ne]: "PRIJAVA" } };
    const [items, monthRows, allRows] = await Promise.all([
      ActivityLog.findAll({
        where: bezPrijava,
        order: [["id", "DESC"]],
        limit: 8,
        attributes: ["action", "label", "createdAt"],
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["name"],
            required: false,
          },
        ],
      }),
      ActivityLog.findAll({
        where: { ...bezPrijava, createdAt: { [Op.gte]: monthStart } },
        attributes: ["action", [fn("COUNT", col("id")), "c"]],
        group: ["action"],
        raw: true,
      }),
      ActivityLog.findAll({
        where: bezPrijava,
        attributes: ["action", [fn("COUNT", col("id")), "c"]],
        group: ["action"],
        raw: true,
      }),
    ]);
    let topAction = null;
    let topCount = 0;
    for (const r of allRows) {
      const c = Number(r.c) || 0;
      if (c > topCount) {
        topCount = c;
        topAction = r.action;
      }
    }
    return res.json({
      ok: true,
      data: {
        items: items.map((i) => ({
          action: i.action,
          label: i.label,
          organization: i.organization?.name ?? null,
          createdAt: i.createdAt,
        })),
        month: Object.fromEntries(
          monthRows.map((r) => [r.action, Number(r.c) || 0]),
        ),
        usedActions: allRows.map((r) => r.action),
        topAction,
      },
    });
  } catch (e) {
    console.error("activity myActivity failed:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

function parsePositiveInt(v, fallback) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// GET /api/activity/admin?action&scope&q&page&limit  (ADMIN)
async function adminList(req, res) {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 50), 200);
    const action = req.query.action ? String(req.query.action) : null;
    const scope = String(req.query.scope || "all"); // all | registered | anon
    const q = req.query.q ? String(req.query.q).trim() : null;
    const userId = Number(req.query.userId);
    const hasUserId = Number.isInteger(userId) && userId > 0;
    // Skrivene stavke se ne prikazuju osim ako admin eksplicitno traži.
    const includeHidden =
      String(req.query.includeHidden || "") === "1" ||
      String(req.query.includeHidden || "") === "true";

    const where = {};
    if (action) where.action = action;
    if (!includeHidden) where.hiddenAt = null;
    if (hasUserId) {
      // Drill-down za jednog korisnika — ignoriše scope.
      where.userId = userId;
    } else if (scope === "registered") where.userId = { [Op.ne]: null };
    else if (scope === "anon") where.userId = null;

    const include = [
      {
        model: User,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "role"],
        required: false,
      },
      {
        model: Organization,
        as: "organization",
        attributes: ["id", "name"],
        required: false,
      },
    ];

    // Pretraga po imenu/emailu korisnika (samo registrovani pogođeni).
    if (q) {
      include[0].where = {
        [Op.or]: [
          { firstName: { [Op.like]: `%${q}%` } },
          { lastName: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
        ],
      };
      include[0].required = true;
    }

    const { rows, count } = await ActivityLog.findAndCountAll({
      where,
      include,
      order: [["createdAt", "DESC"]],
      offset: (page - 1) * limit,
      limit,
    });

    const items = rows.map((r) => {
      const plain = r.toJSON();
      const u = plain.user;
      return {
        id: plain.id,
        action: plain.action,
        label: plain.label,
        createdAt: plain.createdAt,
        hidden: plain.hiddenAt != null,
        organization: plain.organization
          ? { id: plain.organization.id, name: plain.organization.name }
          : null,
        user: u
          ? {
              id: u.id,
              name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
              email: u.email,
              role: u.role,
            }
          : null,
      };
    });

    return res.json({ ok: true, data: { items, total: count, page, limit } });
  } catch (e) {
    console.error("activity adminList failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// GET /api/activity/admin/stats?days  (ADMIN)
// Agregat: broj po akciji + ukupno + registrovani/anonimni, za zadnjih N dana.
async function adminStats(req, res) {
  try {
    // days=0 (ili "all") → zauvijek (bez vremenskog filtera).
    const raw = String(req.query.days ?? "30");
    const allTime = raw === "0" || raw === "all";
    const days = allTime ? 0 : Math.min(parsePositiveInt(raw, 30), 3650);
    // sakrivene stavke (uklj. tehnički OFFICE_BACKFILL marker) ne ulaze u
    // statistiku, isto kao što ih ni lista ne prikazuje
    const where = allTime
      ? { hiddenAt: null }
      : {
          hiddenAt: null,
          createdAt: { [Op.gte]: literal(`(NOW() - INTERVAL ${days} DAY)`) },
        };

    const byAction = await ActivityLog.findAll({
      where,
      attributes: ["action", [fn("COUNT", col("id")), "count"]],
      group: ["action"],
      order: [[literal("count"), "DESC"]],
      raw: true,
    });

    // PRIJAVA (login) nije dokument: ostaje u byAction (pilula + filter),
    // ali ne ulazi u ukupno/registrovani/neregistrovani, da se admin brojke
    // poklapaju sa javnim brojačem na početnoj (publicStatsController).
    const total = byAction
      .filter((r) => r.action !== "PRIJAVA")
      .reduce((s, r) => s + Number(r.count), 0);

    const anonRow = await ActivityLog.findOne({
      where: { ...where, userId: null, action: { [Op.ne]: "PRIJAVA" } },
      attributes: [[fn("COUNT", col("id")), "count"]],
      raw: true,
    });
    const anon = Number(anonRow?.count || 0);

    return res.json({
      ok: true,
      data: {
        days,
        total,
        registered: total - anon,
        anonymous: anon,
        byAction: byAction.map((r) => ({ action: r.action, count: Number(r.count) })),
      },
    });
  } catch (e) {
    console.error("activity adminStats failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

// PATCH /api/activity/admin/:id/hidden  (ADMIN)
// body: { hidden: boolean }, sklanja/vraća stavku u pregled (soft-hide).
async function setHidden(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: "Nevažeći ID." });
    }
    const row = await ActivityLog.findByPk(id);
    if (!row) {
      return res.status(404).json({ ok: false, error: "Stavka nije pronađena." });
    }
    const hidden = req.body?.hidden !== false; // default true (sakrij)
    row.hiddenAt = hidden ? new Date() : null;
    await row.save();
    return res.json({ ok: true, data: { id, hidden } });
  } catch (e) {
    console.error("activity setHidden failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

module.exports = { track, logEvent, myActivity, adminList, adminStats, setHidden };
