const express = require("express");
const {
  requireAuth,
  requireOrgRole,
  requireOfficeOrg,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/kalkulacijeController");

const router = express.Router();

// PK Office gate: obrt mora biti aktiviran u PK Office (no-op bez naplate)
const officeGate = requireOfficeOrg();

// šifarnik artikala (literal rute prije /:orgId/:id)
router.get(
  "/:orgId/artikli",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.listArtikli,
);
router.post(
  "/:orgId/artikli",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.createArtikal,
);
router.post(
  "/:orgId/artikli/uvoz",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.uvozArtikala,
);
// zadnja stavka artikla (predpopuna unosa), prije generičkog /artikli/:id
router.get(
  "/:orgId/artikli/:artikalId/zadnja-stavka",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.zadnjaStavka,
);
router.patch(
  "/:orgId/artikli/:id",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.updateArtikal,
);
router.delete(
  "/:orgId/artikli/:id",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.removeArtikal,
);

// izvještaj o marži (literal ruta prije /:orgId/:id)
router.get(
  "/:orgId/marza",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.marza,
);

// kalkulacije
router.get(
  "/:orgId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.list,
);
router.get(
  "/:orgId/:id",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.getOne,
);
router.post(
  "/:orgId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.create,
);
router.put(
  "/:orgId/:id",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.update,
);
router.delete(
  "/:orgId/:id",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.remove,
);

module.exports = router;
