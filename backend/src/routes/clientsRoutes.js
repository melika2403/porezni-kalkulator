const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const clientsController = require("../controllers/clientsController");

const router = express.Router();

router.get("/", requireAuth, clientsController.list);
router.post("/", requireAuth, clientsController.create);
router.put("/:id", requireAuth, clientsController.update);
router.delete("/:id", requireAuth, clientsController.remove);

module.exports = router;
