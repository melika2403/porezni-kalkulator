const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const invoicesController = require("../controllers/invoicesController");

const router = express.Router();

router.get("/", requireAuth, invoicesController.list);
router.post("/", requireAuth, invoicesController.create);
// zbirno mjesečno knjiženje pazara u KIF (gotovinski promet, PDV 17/117)
router.post("/pazar", requireAuth, invoicesController.pazar);
// direktno "samo PDV" knjiženje u KIF (npr. posebna šema u građevinarstvu)
router.post("/kif-pdv", requireAuth, invoicesController.kifPdv);
router.get("/:id", requireAuth, invoicesController.getById);
router.patch("/:id", requireAuth, invoicesController.patch);
router.delete("/:id", requireAuth, invoicesController.remove);
router.get("/:id/pdf", requireAuth, invoicesController.pdf);
router.post("/:id/email", requireAuth, invoicesController.emailToBuyer);
router.post("/:id/convert", requireAuth, invoicesController.convertProforma);
// storno postojeće avansne fakture (jedan storno po avansnoj)
router.post("/:id/storno-avans", requireAuth, invoicesController.stornoAvans);
// knjižna obavijest (umanjenje) uz postojeću standardnu fakturu
router.post("/:id/knjizna-obavijest", requireAuth, invoicesController.knjiznaObavijest);

module.exports = router;
