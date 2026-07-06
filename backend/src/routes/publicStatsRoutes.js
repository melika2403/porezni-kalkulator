const express = require("express");
const ctrl = require("../controllers/publicStatsController");

const router = express.Router();

// Bez auth-a: javna statistika za landing.
router.get("/stats", ctrl.stats);

module.exports = router;
