const express = require("express");
const profileController = require("../controllers/profileController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", requireAuth, profileController.get);
router.patch("/", requireAuth, profileController.update);
router.post("/change-password", requireAuth, profileController.changePassword);
router.patch("/preferences", requireAuth, profileController.updatePreferences);

module.exports = router;
