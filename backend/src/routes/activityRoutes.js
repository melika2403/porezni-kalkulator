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

// Sklanjanje/vraćanje stavke iz pregleda (soft-hide).
router.patch(
  "/admin/:id/hidden",
  requireAuth,
  requireRole("ADMIN"),
  activityController.setHidden,
);

module.exports = router;
