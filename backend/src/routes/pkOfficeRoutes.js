const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/pkOfficeGateController");

const router = express.Router();

// pristup i slotovi (paket, limit, lista obrta sa PK Office statusom)
router.get("/pristup", requireAuth, ctrl.pristup);
// aktivacija/deaktivacija obrta u PK Office (vlasnik/admin te organizacije,
// provjera članstva je u kontroleru jer ruta nije /:orgId/* oblika)
router.post("/organizacije/:orgId/aktiviraj", requireAuth, ctrl.aktiviraj);
router.post("/organizacije/:orgId/deaktiviraj", requireAuth, ctrl.deaktiviraj);
// 30 dana besplatne probe (nivo Office Tim), jednom po korisniku
router.post("/trial", requireAuth, ctrl.startOfficeTrial);
// nivo aktivne probe: Solo (jedan obrt) ili Tim
router.post("/trial/plan", requireAuth, ctrl.setTrialPlan);

module.exports = router;
