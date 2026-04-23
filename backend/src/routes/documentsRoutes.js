const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/documentsController");

const router = express.Router();

router.post("/", requireAuth, ctrl.save);
router.get("/:id", requireAuth, ctrl.get);
router.delete("/:id", requireAuth, ctrl.remove);

module.exports = router;
