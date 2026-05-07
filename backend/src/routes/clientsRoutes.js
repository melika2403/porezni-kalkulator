const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");
const clientsController = require("../controllers/clientsController");

const router = express.Router();

router.get("/admin/all", requireAuth, requireRole("ADMIN"), clientsController.adminListAll);
router.get("/", requireAuth, clientsController.list);
router.post("/", requireAuth, clientsController.create);
router.get("/amortizacija", requireAuth, clientsController.listAmortizacija);
router.post("/amortizacija", requireAuth, clientsController.createAmortizacija);
router.put("/:id", requireAuth, clientsController.update);
router.delete("/:id", requireAuth, clientsController.remove);

module.exports = router;
