const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const organizationsController = require("../controllers/organizationsController");
const workersController = require("../controllers/workersController");
const membersController = require("../controllers/membersController");
const organizationRepository = require("../repositories/organizationRepository");

const router = express.Router();

router.get("/", requireAuth, organizationsController.list);
router.post("/", requireAuth, organizationsController.create);
router.put("/:id", requireAuth, organizationsController.update);
router.delete("/:id", requireAuth, organizationsController.remove);

// Single organization detail
router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  const orgs = await organizationRepository.getUserOrganizations(req.user.id);
  const org = orgs.find((o) => o.id === id);
  if (!org) return res.status(404).json({ ok: false, error: "Organizacija nije pronađena" });
  return res.json({ ok: true, data: org });
});

// Members
router.get("/:id/members", requireAuth, membersController.list);
router.post("/:id/members", requireAuth, membersController.add);
router.put("/:id/members/:userId", requireAuth, membersController.updateRole);
router.delete("/:id/members/:userId", requireAuth, membersController.remove);

// Workers
router.get("/:orgId/workers", requireAuth, workersController.list);
router.post("/:orgId/workers", requireAuth, workersController.create);
router.put("/:orgId/workers/:workerId", requireAuth, workersController.update);
router.delete("/:orgId/workers/:workerId", requireAuth, workersController.remove);

module.exports = router;
