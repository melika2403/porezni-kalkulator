const express = require("express");
const activityController = require("../controllers/activityController");
const {
  requireAuth,
  requireRole,
  optionalAuth,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// Bilježenje aktivnosti — radi i za anonimne (optionalAuth veže userId ako postoji).
router.post("/", optionalAuth, activityController.track);

// Admin pregled i statistika.
router.get("/admin", requireAuth, requireRole("ADMIN"), activityController.adminList);
router.get(
  "/admin/stats",
  requireAuth,
  requireRole("ADMIN"),
  activityController.adminStats,
);

module.exports = router;
