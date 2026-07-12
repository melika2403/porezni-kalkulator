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
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  ctrl.list,
);
router.get(
  "/:orgId/suggestions",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  ctrl.suggestions,
);
// zbirni promet kupaca/dobavljača za period (izvještaj)
router.get(
  "/:orgId/promet",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  ctrl.promet,
);
// grupni uvoz partnera (Com_Soft XML/CSV), prije generičkih ruta
router.post(
  "/:orgId/uvoz",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.uvozPartnera,
);
// ulazni računi prije generičkih /:orgId/:partnerId ruta
router.get(
  "/:orgId/ulazni-racuni",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
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
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  ctrl.kartica,
);
router.get(
  "/:orgId/:partnerId/kartica.pdf",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  ctrl.karticaPdfDownload,
);
router.post(
  "/:orgId/:partnerId/kartica/email",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.karticaEmail,
);
// IOS: izvod otvorenih stavki na dan (usaglašavanje potraživanja/obaveza)
router.get(
  "/:orgId/:partnerId/ios.pdf",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  ctrl.iosPdfDownload,
);
router.post(
  "/:orgId/:partnerId/ios/email",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.iosEmail,
);
// opomena kupcu za dospjele neplaćene račune (nivo 1 = opomena,
// nivo 2 = pred utuženje)
router.get(
  "/:orgId/:partnerId/opomena.pdf",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  ctrl.opomenaPdfDownload,
);
router.post(
  "/:orgId/:partnerId/opomena/email",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.opomenaEmail,
);
// spajanje duplikata: sav promet izvornog prelazi na ciljnog partnera
router.post(
  "/:orgId/:partnerId/merge",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.merge,
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
