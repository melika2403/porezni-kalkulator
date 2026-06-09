const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const meStatsController = require("../controllers/meStatsController");

const router = express.Router();

router.get("/stats", requireAuth, meStatsController.getStats);

module.exports = router;
