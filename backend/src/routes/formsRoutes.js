const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const formsController = require("../controllers/formsController");

const router = express.Router();

router.get("/", requireAuth, formsController.list);

module.exports = router;
