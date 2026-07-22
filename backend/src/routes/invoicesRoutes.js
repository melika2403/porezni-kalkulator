const express = require("express");
const {
  requireAuth,
  requirePlanTier,
} = require("../middlewares/authMiddleware");
const invoicesController = require("../controllers/invoicesController");

const router = express.Router();

// Plan gate (PRO+, efektivno: office paket/trial ili vlasnik org-a sa planom):
// kreiranje/izmjena/slanje faktura. Čitanje (lista, detalj, PDF postojeće
// fakture) ostaje slobodno: poslije isteka plana podaci su read-only.
const planGate = requirePlanTier("PRO");

router.get("/", requireAuth, invoicesController.list);
router.post("/", requireAuth, planGate, invoicesController.create);
// zbirno mjesečno knjiženje pazara u KIF (gotovinski promet, PDV 17/117)
router.post("/pazar", requireAuth, planGate, invoicesController.pazar);
// direktno "samo PDV" knjiženje u KIF (npr. posebna šema u građevinarstvu)
router.post("/kif-pdv", requireAuth, planGate, invoicesController.kifPdv);
router.get("/:id", requireAuth, invoicesController.getById);
router.patch("/:id", requireAuth, planGate, invoicesController.patch);
// puni edit sadržaja fakture/predračuna (kupac, stavke, iznosi) uz ponovni obračun
router.put("/:id", requireAuth, planGate, invoicesController.updateContent);
router.delete("/:id", requireAuth, planGate, invoicesController.remove);
router.get("/:id/pdf", requireAuth, invoicesController.pdf);
router.post("/:id/email", requireAuth, planGate, invoicesController.emailToBuyer);
router.post("/:id/convert", requireAuth, planGate, invoicesController.convertProforma);
// storno postojeće avansne fakture (jedan storno po avansnoj)
router.post("/:id/storno-avans", requireAuth, planGate, invoicesController.stornoAvans);
// knjižna obavijest (umanjenje) uz postojeću standardnu fakturu
router.post("/:id/knjizna-obavijest", requireAuth, planGate, invoicesController.knjiznaObavijest);

module.exports = router;
