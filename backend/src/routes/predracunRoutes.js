const express = require("express");
const predracunController = require("../controllers/predracunController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// Lista svih predračuna — samo admin.
router.get("/", requireAuth, requireRole("ADMIN"), predracunController.list);

// PDF pojedinačnog predračuna (regeneriše se iz snapshota), samo admin.
router.get(
  "/:id/pdf",
  requireAuth,
  requireRole("ADMIN"),
  predracunController.pdf,
);

// Promjena statusa predračuna — samo admin.
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  predracunController.updateStatus,
);

// Brisanje predračuna — samo admin.
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  predracunController.remove,
);

// Kreiranje predračuna — bilo koji ulogovan korisnik.
router.post("/", requireAuth, predracunController.create);

module.exports = router;
