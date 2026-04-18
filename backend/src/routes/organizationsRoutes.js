const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const organizationsController = require("../controllers/organizationsController");

const router = express.Router();

router.get("/", requireAuth, organizationsController.list);
router.post("/", requireAuth, organizationsController.create);
router.put("/:id", requireAuth, organizationsController.update);

module.exports = router;
