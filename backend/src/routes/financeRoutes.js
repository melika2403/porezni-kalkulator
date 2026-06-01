const express = require("express");

const financeController = require("../controllers/financeController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router();

// Sve finansije su isključivo za ADMIN-a.
router.use(requireAuth, requireRole("ADMIN"));

// Uplate klijenata (po mjesecima)
router.get("/payments", financeController.listPayments);
router.put("/payments", financeController.upsertPayment);
router.delete("/payments/:id", financeController.deletePayment);

// Troškovi / ulaganja firme
router.get("/expenses", financeController.listExpenses);
router.post("/expenses", financeController.createExpense);
router.put("/expenses/:id", financeController.updateExpense);
router.delete("/expenses/:id", financeController.deleteExpense);

// Zbirne brojke (zarada / ulaganje / profit)
router.get("/summary", financeController.getSummary);

module.exports = router;
