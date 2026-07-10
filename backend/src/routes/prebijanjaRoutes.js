const express = require("express");
const {
  requireAuth,
  requireOrgRole,
  requireOfficeOrg,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/prebijanjaController");

const router = express.Router();

// PK Office gate: obrt mora biti aktiviran u PK Office (no-op bez naplate)
const officeGate = requireOfficeOrg();

router.post(
  "/:orgId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.create,
);
router.get(
  "/:orgId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.list,
);
router.delete(
  "/:orgId/:id",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.remove,
);

module.exports = router;
