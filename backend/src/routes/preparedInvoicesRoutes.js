const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const c = require("../controllers/preparedInvoicesController");

const router = express.Router();

router.get("/", requireAuth, c.list);
router.post("/", requireAuth, c.create);
// batch: fakturiši sve aktivne pripremljene račune date frekvencije
router.post("/invoice", requireAuth, c.invoiceBatch);
router.put("/:id", requireAuth, c.update);
router.patch("/:id", requireAuth, c.patch);
router.delete("/:id", requireAuth, c.remove);

module.exports = router;
