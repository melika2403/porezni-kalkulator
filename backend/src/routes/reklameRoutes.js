const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");
const { reklameUpload } = require("../utils/uploads");
const { rateLimit } = require("../middlewares/rateLimit");
const ctrl = require("../controllers/reklameController");

const router = express.Router();

// Promoter (oglašivač) upravlja SAMO svojim reklamama. ADMIN je tu zbog
// podrške i vidi sve; PROMOTER ne dobija pristup nijednoj admin ruti.
const promoter = [requireAuth, requireRole("PROMOTER", "ADMIN")];

// Javni brojači bez prijave: ograničenje po adresi da petlja ne naduva
// statistiku koju banka plaća. Stranica sa 5 slotova šalje do 5 prikaza.
const prikazLimit = rateLimit({ prozorMs: 60 * 1000, maks: 60, imenik: "reklame-prikaz" });
const klikLimit = rateLimit({ prozorMs: 60 * 1000, maks: 20, imenik: "reklame-klik" });

// Klik je redirect: posjetilac preko limita i dalje mora stići do banke, samo
// se klik više ne broji. Zato se 429 iz rateLimit-a pretvara u zastavicu.
function klikBrojac(req, _res, next) {
  const tihiRes = {
    set() {},
    status() {
      return {
        json() {
          req.bezBrojanja = true;
          next();
        },
      };
    },
  };
  klikLimit(req, tihiRes, next);
}

// ── Promoter dashboard (mora prije /:id) ────────────────────────────────────
router.get("/promoter", ...promoter, ctrl.lista);
router.post("/promoter", ...promoter, ctrl.kreiraj);
router.post("/promoter/slika", ...promoter, reklameUpload.single("slika"), ctrl.uploadSlike);
router.get("/promoter/:id", ...promoter, ctrl.detalj);
router.put("/promoter/:id", ...promoter, ctrl.izmijeni);
router.post("/promoter/:id/status", ...promoter, ctrl.promijeniStatus);
router.get("/promoter/:id/statistika", ...promoter, ctrl.statistika);
router.delete("/promoter/:id", ...promoter, ctrl.obrisi);

// ── Javno ───────────────────────────────────────────────────────────────────
router.get("/aktivne", ctrl.aktivne);
router.post("/:id/prikaz", prikazLimit, ctrl.zabiljeziPrikaz);
router.get("/:id/klik", klikBrojac, ctrl.klik);

module.exports = router;
