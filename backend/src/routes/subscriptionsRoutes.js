const express = require("express");
const subscriptionsController = require("../controllers/subscriptionsController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router({ mergeParams: true });

router.put(
  "/:id/subscription",
  requireAuth,
  requireRole("ADMIN"),
  subscriptionsController.upsert,
);
router.delete(
  "/:id/subscription",
  requireAuth,
  requireRole("ADMIN"),
  subscriptionsController.remove,
);

module.exports = router;
