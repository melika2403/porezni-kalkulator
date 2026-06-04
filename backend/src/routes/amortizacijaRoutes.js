const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/amortizacijaController");

const router = express.Router();

router.get("/years", requireAuth, ctrl.getYears);
router.get("/org-years", requireAuth, ctrl.getOrgYears);
router.get("/", requireAuth, ctrl.get);
router.post("/", requireAuth, ctrl.save);
router.post("/mark-generated", requireAuth, ctrl.markGenerated);
router.delete("/", requireAuth, ctrl.remove);

module.exports = router;
