const express = require("express");

const usersController = require("../controllers/usersController");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", requireAuth, requireRole("ADMIN"), usersController.list);
router.get("/:id", requireAuth, usersController.getById);
router.put("/:id", requireAuth, usersController.update);
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  usersController.remove,
);

module.exports = router;
