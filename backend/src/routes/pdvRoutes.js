const express = require("express");
const {
  requireAuth,
  requireOrgRole,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/pdvController");

const router = express.Router();

router.get(
  "/:orgId/dodatak",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER"),
  ctrl.getDodatak,
);
router.put(
  "/:orgId/dodatak",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.upsertDodatak,
);

module.exports = router;
