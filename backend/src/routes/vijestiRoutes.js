const express = require("express");
const {
  requireAuth,
  requireRole,
  optionalAuth,
} = require("../middlewares/authMiddleware");
const { vijestiUpload, avatarUpload } = require("../utils/uploads");
const { rateLimit } = require("../middlewares/rateLimit");
const ctrl = require("../controllers/vijestiController");
const kom = require("../controllers/vijestiKomentariController");
const obav = require("../controllers/vijestiObavjestenjaController");

const router = express.Router();
const admin = [requireAuth, requireRole("ADMIN")];

// Pregledi i dijeljenja su javni POST-ovi bez prijave, pa im je jedina zaštita
// bila user-agent filter. Ograničenje po adresi da petljom ne naduva brojke;
// stvarnom čitaocu je 30 u minuti nedostižno (preglednik javlja jednom po
// tekstu i sesiji).
const brojacLimit = rateLimit({
  prozorMs: 60 * 1000,
  maks: 30,
  imenik: "vijesti-brojaci",
});

// ── Admin (mora prije /:slug, inače bi "admin" bio shvaćen kao slug) ────────
router.get("/admin", ...admin, ctrl.adminLista);
router.post("/admin", ...admin, ctrl.kreiraj);
router.post("/admin/slicni", ...admin, ctrl.slicni);
router.post(
  "/admin/slika",
  ...admin,
  vijestiUpload.single("slika"),
  ctrl.uploadSlike,
);
// ── Moderacija komentara (admin) ────────────────────────────────────────────
// VAŽNO: ove rute moraju stajati PRIJE "/admin/:id", inače Express shvati
// "komentari" kao id članka i vrati grešku umjesto liste komentara.
router.get("/admin/komentari", ...admin, kom.adminLista);
router.post("/admin/komentari/:id/odluka", ...admin, kom.adminOdluka);
router.post("/admin/korisnik/:id/blokada", ...admin, kom.adminBlokada);
router.post(
  "/admin/clanak/:slug/korisnik/:userId/obrisi-sve",
  ...admin,
  kom.adminObrisiSveKorisnika,
);

router.get("/admin/:id", ...admin, ctrl.adminDetalj);
router.put("/admin/:id", ...admin, ctrl.izmijeni);
router.post("/admin/:id/status", ...admin, ctrl.promijeniStatus);
router.delete("/admin/:id", ...admin, ctrl.obrisi);

// ── Komentari ───────────────────────────────────────────────────────────────
// Čitanje je javno (optionalAuth samo da prijavljeni odmah vidi svoje glasove),
// pisanje traži prijavu.
router.get("/komentari/moje-postavke", requireAuth, kom.mojePostavke);
router.post("/komentari/potpis", requireAuth, kom.postaviPotpis);
router.post(
  "/komentari/avatar",
  requireAuth,
  avatarUpload.single("avatar"),
  kom.postaviAvatar,
);
router.delete("/komentari/avatar", requireAuth, kom.obrisiAvatar);
router.put("/komentari/:id", requireAuth, kom.izmijeni);
router.delete("/komentari/:id", requireAuth, kom.obrisi);
router.post("/komentari/:id/glas", requireAuth, kom.glasaj);
router.post("/komentari/:id/prijava", requireAuth, kom.prijavi);
router.get("/korisnik/:id", kom.javniProfil);

// ── Obavještenja (moraju prije /:slug, inače bi "obavjestenja" bio slug) ────
router.get("/obavjestenja", requireAuth, obav.lista);
router.get("/obavjestenja/broj", requireAuth, obav.broj);
router.post("/obavjestenja/procitaj", requireAuth, obav.procitaj);

// ── Javno ───────────────────────────────────────────────────────────────────
router.get("/naslovna", ctrl.naslovna);
router.get("/", ctrl.lista);
router.get("/:slug/komentari", optionalAuth, kom.lista);
router.post("/:slug/komentari", requireAuth, kom.dodaj);
router.post("/:slug/pregled", brojacLimit, ctrl.zabiljeziPregled);
router.post("/:slug/dijeljenje", brojacLimit, ctrl.zabiljeziDijeljenje);
router.get("/:slug", ctrl.detalj);

module.exports = router;
