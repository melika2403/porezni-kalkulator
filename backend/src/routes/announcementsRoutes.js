const express = require("express");
const c = require("../controllers/announcementsController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// ── Korisnik ──────────────────────────────────────────────────────────────────
router.get("/", requireAuth, c.getMine);
router.post("/read", requireAuth, c.markRead);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get("/admin", requireAuth, requireRole("ADMIN"), c.adminList);
router.post("/admin", requireAuth, requireRole("ADMIN"), c.create);
router.patch("/admin/:id", requireAuth, requireRole("ADMIN"), c.update);
router.delete("/admin/:id", requireAuth, requireRole("ADMIN"), c.remove);

module.exports = router;
