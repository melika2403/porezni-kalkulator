const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");
const organizationsController = require("../controllers/organizationsController");

const workersController = require("../controllers/workersController");
const membersController = require("../controllers/membersController");
const organizationRepository = require("../repositories/organizationRepository");
const { logoUpload } = require("../utils/uploads");

const router = express.Router();

router.get("/admin/all", requireAuth, requireRole("ADMIN"), organizationsController.adminListAll);
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

// PK Office: postavi aktivnu organizaciju u user_preferences
router.post("/:id/activate", requireAuth, organizationsController.activate);

// Aliases za PK Office (settings stranica) — koriste isti getById/update controller
router.get("/:id/settings", requireAuth, organizationsController.getById);
router.patch("/:id/settings", requireAuth, organizationsController.update);

// Logo upload (PRO/BUSINESS/ADMIN)
router.post(
  "/:id/logo",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
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
  requireRole("PRO", "BUSINESS", "ADMIN"),
  organizationsController.removeLogo,
);

// Members
router.get(
  "/:id/members",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  membersController.list,
);
router.post(
  "/:id/members",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  membersController.add,
);
router.put(
  "/:id/members/:userId",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  membersController.updateRole,
);
router.delete(
  "/:id/members/:userId",
  requireAuth,
  requireRole("PRO", "BUSINESS", "ADMIN"),
  membersController.remove,
);

// Workers — USER role allowed (sihterica preview, with limit enforced in controller)
router.get(
  "/:orgId/workers",
  requireAuth,
  requireRole("USER", "PRO", "BUSINESS", "ADMIN"),
  workersController.list,
);
router.post(
  "/:orgId/workers",
  requireAuth,
  requireRole("USER", "PRO", "BUSINESS", "ADMIN"),
  workersController.create,
);
router.put(
  "/:orgId/workers/:workerId",
  requireAuth,
  requireRole("USER", "PRO", "BUSINESS", "ADMIN"),
  workersController.update,
);
router.delete(
  "/:orgId/workers/:workerId",
  requireAuth,
  requireRole("USER", "PRO", "BUSINESS", "ADMIN"),
  workersController.remove,
);

module.exports = router;
