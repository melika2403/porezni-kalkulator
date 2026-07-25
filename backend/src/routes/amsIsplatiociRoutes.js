const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/amsIsplatiociController");

const router = express.Router();

// Adresar isplatilaca za AMS obrazac: samo prijava, bez provjere plana.
router.get("/", requireAuth, ctrl.list);
router.post("/", requireAuth, ctrl.create);
router.put("/:id", requireAuth, ctrl.update);
router.delete("/:id", requireAuth, ctrl.remove);

module.exports = router;
