const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const invoicesController = require("../controllers/invoicesController");

const router = express.Router();

router.get("/", requireAuth, invoicesController.list);
router.post("/", requireAuth, invoicesController.create);
router.get("/:id", requireAuth, invoicesController.getById);
router.patch("/:id", requireAuth, invoicesController.patch);
router.delete("/:id", requireAuth, invoicesController.remove);
router.get("/:id/pdf", requireAuth, invoicesController.pdf);
router.post("/:id/email", requireAuth, invoicesController.emailToBuyer);
router.post("/:id/convert", requireAuth, invoicesController.convertProforma);

module.exports = router;
