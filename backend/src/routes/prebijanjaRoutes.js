const express = require("express");
const {
  requireAuth,
  requireOrgRole,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/prebijanjaController");

const router = express.Router();

router.post(
  "/:orgId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.create,
);
router.get(
  "/:orgId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER"),
  ctrl.list,
);
router.delete(
  "/:orgId/:id",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  ctrl.remove,
);

module.exports = router;
