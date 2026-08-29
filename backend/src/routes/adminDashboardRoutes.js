const express = require("express");
const ctrl = require("../controllers/adminDashboardController");
const renewals = require("../controllers/renewalsController");
const invoices = require("../controllers/invoicesController");
const forms = require("../controllers/formsController");
const entities = require("../controllers/adminEntitiesController");
const detail = require("../controllers/adminDetailController");
const subscriptions = require("../controllers/subscriptionsController");
const paymentExport = require("../controllers/paymentExportController");
const twoFactor = require("../controllers/twoFactorController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// ── Admin "360" detalj organizacije i korisnika ──────────────────────────────
const admin = [requireAuth, requireRole("ADMIN")];

// ── Izvoz platnih naloga u e-bankarstvo (test harness, Faza 0) ───────────────
// Zaštita je OVDJE na serveru (requireRole ADMIN), ekran u admin panelu je
// samo pogodnost. Vidi docs/faza0-tkdis-izvoz-halcom.md.
router.get("/izvoz-naloga/organizacije", ...admin, paymentExport.listOrganizacije);
router.get("/izvoz-naloga/obracuni", ...admin, paymentExport.listObracuni);
router.post("/izvoz-naloga/generisi", ...admin, paymentExport.generisi);
// Nalozi obračuna kao JSON, za ESC/P štampu na matričnom (Faza 1, admin).
router.post("/izvoz-naloga/nalozi", ...admin, paymentExport.listNaloziZaStampu);
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

// Ručna verifikacija emaila (korisniku mail nije stigao).
router.post("/users/:id/verify-email", requireAuth, requireRole("ADMIN"), entities.verifyUserEmail);

// Otključavanje naloga kojem je 2FA postao brava: korisnik je izgubio i uređaj
// i rezervne kodove. Jedini put kojim se tuđi drugi faktor gasi bez ijednog
// dokaza od vlasnika, pa je i sam kontroler još jednom provjeri rolu.
router.post("/users/:id/2fa/disable", requireAuth, requireRole("ADMIN"), twoFactor.adminDisable);

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
