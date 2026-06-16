const express = require("express");
const {
  requireAuth,
  requireOrgRole,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/partnersController");

const router = express.Router();

router.get(
  "/:orgId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER"),
  ctrl.list,
);
router.get(
  "/:orgId/suggestions",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER"),
  ctrl.suggestions,
);
// ulazni računi prije generičkih /:orgId/:partnerId ruta
router.get(
  "/:orgId/ulazni-racuni",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER"),
  ctrl.listUlazniRacuni,
);
router.post(
  "/:orgId/ulazni-racuni",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.createUlazniRacun,
);
router.patch(
  "/:orgId/ulazni-racuni/:racunId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.updateUlazniRacun,
);
router.delete(
  "/:orgId/ulazni-racuni/:racunId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.removeUlazniRacun,
);
router.get(
  "/:orgId/:partnerId/kartica",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER"),
  ctrl.kartica,
);
router.get(
  "/:orgId/:partnerId/kartica.pdf",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER"),
  ctrl.karticaPdfDownload,
);
router.post(
  "/:orgId/:partnerId/kartica/email",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.karticaEmail,
);
router.post(
  "/:orgId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.create,
);
router.patch(
  "/:orgId/:partnerId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.update,
);
router.delete(
  "/:orgId/:partnerId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.remove,
);

module.exports = router;
