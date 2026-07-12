const express = require("express");
const {
  requireAuth,
  requirePlanTier,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/invoiceItemTemplatesController");

const router = express.Router();

// Šabloni stavki faktura: čitanje slobodno, izmjene traže plan (PRO+,
// efektivno) kao i same fakture.
const planGate = requirePlanTier("PRO");

router.get("/", requireAuth, ctrl.list);
router.post("/", requireAuth, planGate, ctrl.create);
router.put("/:id", requireAuth, planGate, ctrl.update);
router.delete("/:id", requireAuth, planGate, ctrl.remove);

module.exports = router;
