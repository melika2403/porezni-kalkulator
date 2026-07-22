const express = require("express");
const {
  requireAuth,
  requireOrgRole,
  requireOfficeOrg,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/blagajnaController");

const router = express.Router();

// PK Office gate: obrt mora biti aktiviran u PK Office (no-op bez naplate)
const officeGate = requireOfficeOrg();
const read = [requireAuth, requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"), officeGate];
const write = [requireAuth, requireOrgRole("OWNER", "ADMIN"), officeGate];

router.get("/:orgId", read, ctrl.list);
router.post("/:orgId", write, ctrl.create);
// "maksimum" prije /:id da se ne protumači kao id naloga
router.put("/:orgId/maksimum", write, ctrl.setMaksimum);
router.put("/:orgId/:id", write, ctrl.update);
router.delete("/:orgId/:id", write, ctrl.remove);

module.exports = router;
