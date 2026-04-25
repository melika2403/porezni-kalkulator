const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/amortizacijaController");

const router = express.Router();

router.get("/years", requireAuth, ctrl.getYears);
router.get("/client-years", requireAuth, ctrl.getClientYears);
router.get("/", requireAuth, ctrl.get);
router.post("/", requireAuth, ctrl.save);
router.delete("/", requireAuth, ctrl.remove);

module.exports = router;
