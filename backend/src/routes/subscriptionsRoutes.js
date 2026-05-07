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

// Self-service 30-day PRO trial
const trialRouter = express.Router();
trialRouter.post("/trial", requireAuth, subscriptionsController.startTrial);

module.exports = router;
module.exports.trialRouter = trialRouter;
