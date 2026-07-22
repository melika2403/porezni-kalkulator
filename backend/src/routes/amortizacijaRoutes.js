const express = require("express");
const {
  requireAuth,
  requireOrgRole,
  requireOfficeOrg,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/amortizacijaController");

const router = express.Router();

// KPR/PK Office upisi (interni izvod, stalna sredstva): kao sve druge KPR i
// bank-statement rute traže OWNER/ADMIN + aktivan PK Office (org iz body-ja).
const officeWrite = [
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  requireOfficeOrg(),
];

router.get("/years", requireAuth, ctrl.getYears);
router.get("/org-years", requireAuth, ctrl.getOrgYears);
router.get("/", requireAuth, ctrl.get);
router.post("/", requireAuth, ctrl.save);
router.post("/mark-generated", requireAuth, ctrl.markGenerated);
router.delete("/", requireAuth, ctrl.remove);
// PK Office veza: dodavanje sredstva sa knjiženja računa + godišnje
// knjiženje amortizacije u KPR (interni izvod)
router.post("/assets", officeWrite, ctrl.appendAsset);
router.get("/knjizenje", requireAuth, ctrl.knjizenjeStatus);
router.post("/knjizenje", officeWrite, ctrl.knjizi);

module.exports = router;
