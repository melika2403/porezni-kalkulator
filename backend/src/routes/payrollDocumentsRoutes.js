const express = require("express");
const {
  requireAuth,
  requirePlanTier,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/payrollController");

const router = express.Router();

// Download već generisanog dokumenta = čitanje (read-only poslije isteka
// plana); brisanje je izmjena pa traži plan (PRO+, efektivno).
router.get("/:docId/download", requireAuth, ctrl.downloadDocument);
router.delete("/:docId", requireAuth, requirePlanTier("PRO"), ctrl.deleteDocument);

module.exports = router;
