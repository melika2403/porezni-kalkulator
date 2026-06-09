const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/payrollController");

const router = express.Router();

router.get("/", requireAuth, ctrl.list);
router.get("/monthly-summary", requireAuth, ctrl.monthlySummary);
router.post("/monthly-uplatnice", requireAuth, ctrl.generateMonthlyUplatnice);
router.post("/mark-month-paid", requireAuth, ctrl.markMonthPaid);
router.post("/payment-date", requireAuth, ctrl.setPaymentDate);
router.post("/monthly-payslips", requireAuth, ctrl.generateMonthlyPayslips);
router.post("/email-payslips-bulk", requireAuth, ctrl.emailMonthlyPayslipsBulk);
router.get("/:id/payslip", requireAuth, ctrl.generateWorkerPayslip);
router.post("/:id/email-payslip", requireAuth, ctrl.emailWorkerPayslip);
router.post("/calculate", requireAuth, ctrl.calculate);
router.post("/save-inputs", requireAuth, ctrl.saveInputs);
router.patch("/:id", requireAuth, ctrl.patch);
router.delete("/:id", requireAuth, ctrl.remove);
router.post("/:id/uplatnice", requireAuth, ctrl.generateUplatniceForPayroll);
router.get("/:id/documents", requireAuth, ctrl.listDocuments);

module.exports = router;
