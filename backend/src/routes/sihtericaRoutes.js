const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/sihtericaController");

const router = express.Router();

router.get("/months", requireAuth, ctrl.getMonths);
router.get("/worker-months", requireAuth, ctrl.getWorkerMonths);
router.get("/", requireAuth, ctrl.get);
router.post("/", requireAuth, ctrl.save);
router.delete("/", requireAuth, ctrl.remove);

module.exports = router;
