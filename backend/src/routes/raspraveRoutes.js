const express = require("express");
const {
  requireAuth,
  requireRole,
  optionalAuth,
} = require("../middlewares/authMiddleware");
const teme = require("../controllers/vijestiTemeController");
const kom = require("../controllers/vijestiKomentariController");

const router = express.Router();

// Rasprave: teme otvaraju prijavljeni, čitaju svi. Odgovori idu kroz isti
// sistem komentara kao ispod članaka (glasovi, prijave, moderacija).
router.get("/", teme.lista);
router.post("/", requireAuth, teme.kreiraj);
router.get("/:slug/odgovori", optionalAuth, kom.listaTeme);
router.post("/:slug/odgovori", requireAuth, kom.dodajTeme);
router.put("/:slug/tekst", requireAuth, teme.izmijeniTekst);
router.post("/:slug/prihvati", requireAuth, teme.prihvatiOdgovor);
router.post("/:slug/admin", requireAuth, requireRole("ADMIN"), teme.adminRadnja);
router.get("/:slug", teme.detalj);

module.exports = router;
