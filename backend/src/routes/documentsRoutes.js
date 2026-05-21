const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");
const { getOrgOwnerRole } = require("../services/tierService");
const ctrl = require("../controllers/documentsController");

const router = express.Router();

// Restricted document types: which plan is required to save them.
// When a document is saved against an `organizationId`, the OWNER's plan tier
// is the source of truth (so a free MEMBER of a BUSINESS owner's org can save
// JS3100 forms for that org). Without orgId, we fall back to the caller's role.
const RESTRICTED_TYPES = {
  JS3100: ["PRO", "BUSINESS", "ADMIN"],
  UOD: ["BUSINESS", "ADMIN"], // Ugovor o djelu — BUSINESS-only (Faza 3)
};

async function guardRestrictedType(req, res, next) {
  const allowed = RESTRICTED_TYPES[req.body?.type];
  if (!allowed) return next();

  if (req.user?.role === "ADMIN") return next();

  const orgId = Number(req.body?.organizationId);
  if (Number.isInteger(orgId) && orgId > 0) {
    const ownerRole = await getOrgOwnerRole(orgId);
    if (!ownerRole) return res.status(404).json({ ok: false, error: "ORG_NOT_FOUND" });
    if (!allowed.includes(ownerRole)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN_OWNER_TIER" });
    }
    return next();
  }

  return requireRole(...allowed)(req, res, next);
}

router.post("/", requireAuth, guardRestrictedType, ctrl.save);
router.get("/:id", requireAuth, ctrl.get);
router.delete("/:id", requireAuth, ctrl.remove);

module.exports = router;
