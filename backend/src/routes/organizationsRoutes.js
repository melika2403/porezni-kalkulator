const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");
const organizationsController = require("../controllers/organizationsController");
const workersController = require("../controllers/workersController");
const membersController = require("../controllers/membersController");
const organizationRepository = require("../repositories/organizationRepository");

const router = express.Router();

router.get("/", requireAuth, organizationsController.list);
router.get(
  "/clients",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  organizationsController.listClients,
);
router.get(
  "/workers/mine",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  workersController.listAllForUser,
);
router.post("/", requireAuth, organizationsController.create);
router.put("/:id", requireAuth, organizationsController.update);
router.delete("/:id", requireAuth, organizationsController.remove);

// Single organization detail
router.get("/:id", requireAuth, organizationsController.getById);

// Members
router.get(
  "/:id/members",
  requireAuth,
  requireRole("BUSINESS", "ADMIN"),
  membersController.list,
);
router.post(
  "/:id/members",
  requireAuth,
  requireRole("BUSINESS", "ADMIN"),
  membersController.add,
);
router.put(
  "/:id/members/:userId",
  requireAuth,
  requireRole("BUSINESS", "ADMIN"),
  membersController.updateRole,
);
router.delete(
  "/:id/members/:userId",
  requireAuth,
  requireRole("BUSINESS", "ADMIN"),
  membersController.remove,
);

// Workers
router.get(
  "/:orgId/workers",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  workersController.list,
);
router.post(
  "/:orgId/workers",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  workersController.create,
);
router.put(
  "/:orgId/workers/:workerId",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  workersController.update,
);
router.delete(
  "/:orgId/workers/:workerId",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  workersController.remove,
);

module.exports = router;
