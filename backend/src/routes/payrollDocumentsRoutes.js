const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/payrollController");

const router = express.Router();

router.get("/:docId/download", requireAuth, ctrl.downloadDocument);
router.delete("/:docId", requireAuth, ctrl.deleteDocument);

module.exports = router;
