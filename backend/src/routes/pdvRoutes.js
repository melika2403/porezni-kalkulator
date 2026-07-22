const express = require("express");
const {
  requireAuth,
  requireOrgRole,
  requireOfficeOrg,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/pdvController");

const router = express.Router();

// PK Office gate: obrt mora biti aktiviran u PK Office (no-op bez naplate)
const officeGate = requireOfficeOrg();

router.get(
  "/:orgId/dodatak",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.getDodatak,
);
router.put(
  "/:orgId/dodatak",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.upsertDodatak,
);

// stanje PDV-a (knjiga knjiženja prema UINO)
router.get(
  "/:orgId/stanje",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.getStanje,
);
router.post(
  "/:orgId/stanje",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.createKnjizenje,
);
router.delete(
  "/:orgId/stanje/:id",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.removeKnjizenje,
);

module.exports = router;
