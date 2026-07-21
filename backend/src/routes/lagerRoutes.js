const express = require("express");
const {
  requireAuth,
  requireOrgRole,
  requireOfficeOrg,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/lagerController");

const router = express.Router();

// PK Office gate: obrt mora biti aktiviran u PK Office (no-op bez naplate)
const officeGate = requireOfficeOrg();
const read = [requireAuth, requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"), officeGate];
const write = [requireAuth, requireOrgRole("OWNER", "ADMIN"), officeGate];

// popisi (literal rute prije /:orgId)
router.get("/:orgId/popisi", read, ctrl.listPopisi);
router.post("/:orgId/popisi", write, ctrl.createPopis);
// uvoz početnog stanja lagera (prije /:id da "uvoz" ne uleti u getPopis)
router.post("/:orgId/popisi/uvoz", write, ctrl.uvozPocetnogStanja);
router.get("/:orgId/popisi/:id", read, ctrl.getPopis);
router.patch("/:orgId/popisi/:id", write, ctrl.updatePopis);
router.post("/:orgId/popisi/:id/refresh", write, ctrl.refreshPopis);
router.post("/:orgId/popisi/:id/proknjizi", write, ctrl.proknjiziPopis);
router.post("/:orgId/popisi/:id/otknjizi", write, ctrl.otknjiziPopis);
router.delete("/:orgId/popisi/:id", write, ctrl.removePopis);

// kartica artikla (ulazi + popis korekcije + tekuće stanje)
router.get("/:orgId/artikal/:artikalId", read, ctrl.artikalKartica);

// TKM (trgovačka knjiga na malo), izvedena po godini
router.get("/:orgId/tkm", read, ctrl.tkm);
router.put("/:orgId/tkm/pocetno-stanje", write, ctrl.setTkmPocetnoStanje);
router.get("/:orgId/tkm/pazari", read, ctrl.listTkmPazari);
router.post("/:orgId/tkm/pazar", write, ctrl.addTkmPazar);
router.delete("/:orgId/tkm/pazar/:id", write, ctrl.removeTkmPazar);

// nivelacije (zapisnik o promjeni cijena)
router.get("/:orgId/nivelacije", read, ctrl.listNivelacije);
router.post("/:orgId/nivelacije", write, ctrl.createNivelacija);
router.delete("/:orgId/nivelacije/:id", write, ctrl.removeNivelacija);

// razduženja (povrat dobavljaču / otpis)
router.get("/:orgId/razduzenja", read, ctrl.listRazduzenja);
router.post("/:orgId/razduzenja", write, ctrl.createRazduzenje);
router.delete("/:orgId/razduzenja/:id", write, ctrl.removeRazduzenje);

// lager lista (stanje na datum)
router.get("/:orgId", read, ctrl.lager);

module.exports = router;
