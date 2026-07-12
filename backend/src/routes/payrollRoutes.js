const express = require("express");
const {
  requireAuth,
  requirePlanTier,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/payrollController");

const router = express.Router();

// Plan gate (PRO+, efektivno: office paket/trial ili vlasnik org-a sa planom):
// sve što KREIRA/MIJENJA/GENERIŠE dokumente ili šalje mailove. Čitanje liste
// i pregleda ostaje slobodno: poslije isteka plana podaci su read-only, a
// marketing stranica ih povlači i za korisnike bez plana (upsell prikaz).
const planGate = requirePlanTier("PRO");

router.get("/", requireAuth, ctrl.list);
router.get("/monthly-summary", requireAuth, ctrl.monthlySummary);
router.post("/monthly-uplatnice", requireAuth, planGate, ctrl.generateMonthlyUplatnice);
router.post("/mark-month-paid", requireAuth, planGate, ctrl.markMonthPaid);
router.post("/payment-date", requireAuth, planGate, ctrl.setPaymentDate);
router.post("/mark-mip-downloaded", requireAuth, planGate, ctrl.markMipDownloaded);
router.post("/monthly-payslips", requireAuth, planGate, ctrl.generateMonthlyPayslips);
router.post("/email-payslips-bulk", requireAuth, planGate, ctrl.emailMonthlyPayslipsBulk);
// Nalog za knjiženje plate + konta agencije (izmjene defaulta).
router.get("/posting-accounts", requireAuth, ctrl.getPostingAccounts);
router.put("/posting-accounts", requireAuth, planGate, ctrl.savePostingAccounts);
router.post("/posting-order", requireAuth, planGate, ctrl.generatePostingOrder);
router.put("/combine-kantonal", requireAuth, planGate, ctrl.setCombineKantonal);
router.get("/:id/payslip", requireAuth, planGate, ctrl.generateWorkerPayslip);
router.post("/:id/email-payslip", requireAuth, planGate, ctrl.emailWorkerPayslip);
router.post("/calculate", requireAuth, planGate, ctrl.calculate);
router.post("/save-inputs", requireAuth, planGate, ctrl.saveInputs);
router.post("/import", requireAuth, planGate, ctrl.importPayrolls);
router.patch("/:id", requireAuth, planGate, ctrl.patch);
router.delete("/:id", requireAuth, planGate, ctrl.remove);
router.post("/:id/uplatnice", requireAuth, planGate, ctrl.generateUplatniceForPayroll);
router.get("/:id/documents", requireAuth, ctrl.listDocuments);

module.exports = router;
