const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { rateLimit } = require("../middlewares/rateLimit");
const { freelancerPrilogUpload } = require("../utils/uploads");
const ctrl = require("../controllers/freelancerController");
const prilozi = require("../controllers/freelancerPriloziController");

const router = express.Router();

// Kurs CBBiH je javan: koristi ga i AMS generator (bez prijave) za preračun
// iznosa u stranoj valuti. Liste se keširaju po datumu (cbbhKurs.js), a
// kontroler ograničava raspon datuma. Ograničenje po adresi je tu jer svaki
// nepoznat datum znači poziv prema CBBiH: stvarna upotreba je klik ili dva,
// pa 20 u minuti ima prostora i za kancelariju iza jedne adrese.
router.get(
  "/kurs",
  rateLimit({ prozorMs: 60 * 1000, maks: 20, imenik: "kurs" }),
  ctrl.kurs,
);

// PK Freelancer: sve ostalo traži prijavu; besplatni limiti i paket se
// rješavaju u kontroleru (freelancerAccess), ne ovdje, jer besplatni korisnik
// smije sačuvati do 3 uplate godišnje.
router.use(requireAuth);

router.get("/pristup", ctrl.pristup);
router.post("/proba", ctrl.pokreniProbu);
router.get("/godine", ctrl.godine);
router.get("/pregled", ctrl.pregled);
router.get("/gpd", ctrl.gpdPodaci);
router.get("/potvrda", ctrl.potvrda);
router.get("/postavke", ctrl.getPostavke);
router.put("/postavke", ctrl.putPostavke);

router.get("/uplate", ctrl.listaUplata);
router.post("/uplate", ctrl.kreirajUplatu);
router.get("/uplate/:id", ctrl.jednaUplata);
router.put("/uplate/:id", ctrl.izmijeniUplatu);
router.patch("/uplate/:id/status", ctrl.promijeniStatus);
router.delete("/uplate/:id", ctrl.obrisiUplatu);

// prilozi: multer greške pretvaramo u JSON kao kod dokumenata radnika
router.get("/uplate/:id/prilozi", prilozi.lista);
router.post(
  "/uplate/:id/prilozi",
  (req, res, next) => {
    freelancerPrilogUpload.single("file")(req, res, (err) => {
      if (err) {
        const code =
          err?.message === "INVALID_DOC_TYPE"
            ? "INVALID_DOC_TYPE"
            : err?.code === "LIMIT_FILE_SIZE"
              ? "LIMIT_FILE_SIZE"
              : "UPLOAD_ERROR";
        return res.status(400).json({ ok: false, error: code });
      }
      next();
    });
  },
  prilozi.upload,
);
router.get("/prilozi/:id/download", prilozi.download);
router.delete("/prilozi/:id", prilozi.remove);

module.exports = router;
