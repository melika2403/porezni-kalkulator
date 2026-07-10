const express = require("express");
const ctrl = require("../controllers/adminDashboardController");
const renewals = require("../controllers/renewalsController");
const invoices = require("../controllers/invoicesController");
const forms = require("../controllers/formsController");
const entities = require("../controllers/adminEntitiesController");
const detail = require("../controllers/adminDetailController");
const subscriptions = require("../controllers/subscriptionsController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// ── Admin "360" detalj organizacije i korisnika ──────────────────────────────
const admin = [requireAuth, requireRole("ADMIN")];
router.get("/organizations/:id/detail", ...admin, detail.organizationDetail);
router.get("/organizations/:id/workers-full", ...admin, detail.organizationWorkers);
router.get("/organizations/:id/payrolls", ...admin, detail.organizationPayrolls);
router.get("/organizations/:id/documents", ...admin, detail.organizationDocuments);
router.get("/users/:id/detail", ...admin, detail.userDetail);
router.get("/payroll-documents/:docId/download", ...admin, detail.downloadPayrollDocument);
router.get("/worker-documents/:docId/download", ...admin, detail.downloadWorkerDocument);

router.get("/dashboard", requireAuth, requireRole("ADMIN"), ctrl.getDashboard);
router.get("/engagement", requireAuth, requireRole("ADMIN"), ctrl.getEngagement);

// Sve korisničke fakture/predračuni (admin pregled).
router.get("/invoices", requireAuth, requireRole("ADMIN"), invoices.adminList);

// Svi sačuvani dokumenti (forms) registrovanih korisnika.
router.get("/forms", requireAuth, requireRole("ADMIN"), forms.adminList);
router.delete("/forms/:id", requireAuth, requireRole("ADMIN"), entities.deleteForm);

// Admin brisanje entiteta (puna kaskada) + pregled radnika organizacije.
router.get("/organizations/:id/workers", requireAuth, requireRole("ADMIN"), entities.listOrgWorkers);
router.delete("/organizations/:id", requireAuth, requireRole("ADMIN"), entities.deleteOrganization);
router.delete("/workers/:id", requireAuth, requireRole("ADMIN"), entities.deleteWorker);
router.delete("/clients/:id", requireAuth, requireRole("ADMIN"), entities.deletePersonClient);

// Poziv korisniku da aktivira besplatni trial (mail).
router.post("/users/:id/trial-invite", requireAuth, requireRole("ADMIN"), entities.sendTrialInvite);

// Sve pretplate (paketi, periodi, office slotovi) — admin lista.
router.get(
  "/subscriptions",
  requireAuth,
  requireRole("ADMIN"),
  subscriptions.adminList,
);

// Obnove pretplata + podsjetnici.
router.get("/renewals", requireAuth, requireRole("ADMIN"), renewals.listExpiring);
router.post(
  "/renewals/:userId/reminder",
  requireAuth,
  requireRole("ADMIN"),
  renewals.sendReminder,
);
router.patch(
  "/renewals/:userId/trial",
  requireAuth,
  requireRole("ADMIN"),
  renewals.toggleTrial,
);

module.exports = router;
