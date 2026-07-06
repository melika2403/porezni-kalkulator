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

// Endpoints za trenutnog korisnika — /api/subscription/*
const currentRouter = express.Router();
currentRouter.get("/", requireAuth, subscriptionsController.getCurrent);
currentRouter.get("/plans", requireAuth, subscriptionsController.listPlans);
currentRouter.get("/invoices", requireAuth, subscriptionsController.listInvoices);
currentRouter.get("/invoices/:id/pdf", requireAuth, subscriptionsController.invoicePdf);
currentRouter.post("/change-plan", requireAuth, subscriptionsController.changePlan);
currentRouter.post("/cancel", requireAuth, subscriptionsController.cancelCurrent);
currentRouter.post("/reactivate", requireAuth, subscriptionsController.reactivateCurrent);

module.exports = router;
module.exports.trialRouter = trialRouter;
module.exports.currentRouter = currentRouter;
