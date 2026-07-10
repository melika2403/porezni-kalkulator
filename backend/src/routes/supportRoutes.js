const express = require("express");
const supportController = require("../controllers/supportController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// ── Korisnik (vlasnik svojih tiketa) ─────────────────────────────────────────
router.get("/tickets", requireAuth, supportController.listMyTickets);
router.post("/tickets", requireAuth, supportController.createTicket);

// Zajedničko: vlasnik tiketa ili admin (pristup se provjerava u kontroleru).
router.get("/tickets/:id/messages", requireAuth, supportController.getMessages);
router.post("/tickets/:id/read", requireAuth, supportController.markRead);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get(
  "/admin/tickets",
  requireAuth,
  requireRole("ADMIN"),
  supportController.listAdminTickets,
);
router.patch(
  "/admin/tickets/:id",
  requireAuth,
  requireRole("ADMIN"),
  supportController.setStatus,
);

module.exports = router;
