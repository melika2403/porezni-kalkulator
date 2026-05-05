const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/documentsController");

const router = express.Router();

// Guard za tipove dokumenata koji su dostupni samo višim ulogama.
// Pošto je POST /api/documents dijeljena ruta za sve obrasce, kondicionalno
// pozivamo requireRole tek kad type spada u zaštićene tipove.
const RESTRICTED_TYPES = {
  JS3100: ["BUSINESS", "ADMIN"],
};

function guardRestrictedType(req, res, next) {
  const allowed = RESTRICTED_TYPES[req.body?.type];
  if (!allowed) return next();
  return requireRole(...allowed)(req, res, next);
}

router.post("/", requireAuth, guardRestrictedType, ctrl.save);
router.get("/:id", requireAuth, ctrl.get);
router.delete("/:id", requireAuth, ctrl.remove);

module.exports = router;
