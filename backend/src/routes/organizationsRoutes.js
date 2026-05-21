const express = require("express");
const {
  requireAuth,
  requireRole,
  requireOrgRole,
  requireOwnerTier,
} = require("../middlewares/authMiddleware");
const organizationsController = require("../controllers/organizationsController");

const workersController = require("../controllers/workersController");
const membersController = require("../controllers/membersController");
const organizationRepository = require("../repositories/organizationRepository");
const { logoUpload } = require("../utils/uploads");

const router = express.Router();

router.get("/admin/all", requireAuth, requireRole("ADMIN"), organizationsController.adminListAll);
router.get("/", requireAuth, organizationsController.list);
// Cross-org listings — gated by membership (filtered in repository).
// A USER may legitimately be a member of a BUSINESS owner's org, so we don't
// gate by user role here.
router.get("/clients", requireAuth, organizationsController.listClients);
router.get("/workers/mine", requireAuth, workersController.listAllForUser);
router.post("/", requireAuth, organizationsController.create);
router.put("/:id", requireAuth, organizationsController.update);
router.delete("/:id", requireAuth, organizationsController.remove);

// Single organization detail
router.get("/:id", requireAuth, organizationsController.getById);

// Logo upload — owner of org must be PRO or BUSINESS, and caller must be OWNER/ADMIN
router.post(
  "/:id/logo",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  requireOwnerTier("PRO", "BUSINESS"),
  (req, res, next) => {
    logoUpload.single("logo")(req, res, (err) => {
      if (err) {
        const code = err?.message === "INVALID_IMAGE_TYPE" ? "INVALID_IMAGE_TYPE" : "UPLOAD_ERROR";
        return res.status(400).json({ ok: false, error: code });
      }
      next();
    });
  },
  organizationsController.uploadLogo,
);
router.delete(
  "/:id/logo",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  requireOwnerTier("PRO", "BUSINESS"),
  organizationsController.removeLogo,
);

// Members — only OWNER may manage; owner's plan must be BUSINESS
router.get(
  "/:id/members",
  requireAuth,
  requireOrgRole("OWNER"),
  requireOwnerTier("BUSINESS"),
  membersController.list,
);
router.post(
  "/:id/members",
  requireAuth,
  requireOrgRole("OWNER"),
  requireOwnerTier("BUSINESS"),
  membersController.add,
);
router.put(
  "/:id/members/:userId",
  requireAuth,
  requireOrgRole("OWNER"),
  requireOwnerTier("BUSINESS"),
  membersController.updateRole,
);
router.delete(
  "/:id/members/:userId",
  requireAuth,
  requireOrgRole("OWNER"),
  requireOwnerTier("BUSINESS"),
  membersController.remove,
);

// Workers — any org member can read; OWNER/ADMIN can write. Limits applied in controller via owner tier.
router.get(
  "/:orgId/workers",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER"),
  workersController.list,
);
router.post(
  "/:orgId/workers",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  workersController.create,
);
router.put(
  "/:orgId/workers/:workerId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  workersController.update,
);
router.delete(
  "/:orgId/workers/:workerId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  workersController.remove,
);

// Contract counter (UoR) — peek & take next number per organization+year.
// BUSINESS feature: tier check via owner; OWNER/ADMIN of org may use it.
router.get(
  "/:orgId/contract-counter",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  requireOwnerTier("BUSINESS"),
  workersController.peekContractNumber,
);
router.post(
  "/:orgId/contract-counter/take",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  requireOwnerTier("BUSINESS"),
  workersController.takeContractNumber,
);

module.exports = router;
