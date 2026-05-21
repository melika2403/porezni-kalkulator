const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/authMiddleware");
const controller = require("../controllers/workerDocumentsController");
const { workerDocUpload } = require("../utils/uploads");

const router = express.Router();

// POST /api/workers/:workerId/documents — upload (multipart, polje "file")
router.post(
  "/:workerId/documents",
  requireAuth,
  requireRole("USER", "PRO", "BUSINESS", "ADMIN"),
  (req, res, next) => {
    workerDocUpload.single("file")(req, res, (err) => {
      if (err) {
        const code = err?.message === "INVALID_DOC_TYPE" ? "INVALID_DOC_TYPE" : "UPLOAD_ERROR";
        return res.status(400).json({ ok: false, error: code });
      }
      next();
    });
  },
  controller.create,
);

// GET /api/workers/:workerId/documents — lista metapodataka
router.get(
  "/:workerId/documents",
  requireAuth,
  requireRole("USER", "PRO", "BUSINESS", "ADMIN"),
  controller.list,
);

// GET /api/workers/documents/:docId/download — preuzmi fajl
router.get(
  "/documents/:docId/download",
  requireAuth,
  requireRole("USER", "PRO", "BUSINESS", "ADMIN"),
  controller.download,
);

// DELETE /api/workers/documents/:docId
router.delete(
  "/documents/:docId",
  requireAuth,
  requireRole("USER", "PRO", "BUSINESS", "ADMIN"),
  controller.remove,
);

module.exports = router;
