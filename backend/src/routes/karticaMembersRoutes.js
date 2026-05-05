const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/karticaMembersController");

const router = express.Router();

router.get("/", requireAuth, ctrl.list);
router.post("/", requireAuth, ctrl.create);
router.post("/bulk", requireAuth, ctrl.bulkUpsert);
router.put("/:id", requireAuth, ctrl.update);
router.delete("/:id", requireAuth, ctrl.remove);

module.exports = router;
