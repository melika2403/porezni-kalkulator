const express = require("express");
const multer = require("multer");
const {
  requireAuth,
  requireOrgRole,
  requireOfficeOrg,
} = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/bankStatementsController");

const router = express.Router();

// PK Office gate: obrt mora biti aktiviran u PK Office (no-op bez naplate).
// NE ide na /bulk/analyze (nema orgId; analiza bez snimanja).
const officeGate = requireOfficeOrg();

// PDF u memoriju (parser radi nad bufferom, fajl se ne čuva na disku)
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new Error("INVALID_FILE_TYPE"));
  },
});

// Grupni uvoz (Inbox): analiza više PDF-ova odjednom, bez snimanja.
// Prepoznavanje organizacije po žiro računu; mora biti PRIJE /:orgId ruta.
router.post(
  "/bulk/analyze",
  requireAuth,
  (req, res, next) => {
    pdfUpload.array("files", 20)(req, res, (err) => {
      if (err) {
        const code =
          err.message === "INVALID_FILE_TYPE" ? "INVALID_FILE_TYPE" : "UPLOAD_ERROR";
        return res.status(400).json({ ok: false, error: code });
      }
      next();
    });
  },
  ctrl.bulkAnalyze,
);

router.post(
  "/:orgId/upload",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  (req, res, next) => {
    pdfUpload.single("file")(req, res, (err) => {
      if (err) {
        const code =
          err.message === "INVALID_FILE_TYPE" ? "INVALID_FILE_TYPE" : "UPLOAD_ERROR";
        return res.status(400).json({ ok: false, error: code });
      }
      next();
    });
  },
  ctrl.upload,
);

router.post(
  "/:orgId/manual",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.createManual,
);
// živi prijedlog kategorije pri ručnom unosu (read-only, ništa ne snima)
router.post(
  "/:orgId/suggest-category",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.suggestKategorije,
);
router.get(
  "/:orgId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.list,
);
router.get(
  "/:orgId/transactions",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.listTransactions,
);
router.get(
  "/:orgId/summary",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.summary,
);
router.get(
  "/:orgId/kpr",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.kpr,
);
router.get(
  "/:orgId/obligations",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.obligations,
);
router.get(
  "/:orgId/statement/:statementId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  officeGate,
  ctrl.getStatement,
);
router.post(
  "/:orgId/statement/:statementId/confirm-all",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.confirmAll,
);
// bulk MORA biti prije /:txId rute (inače "bulk" upadne kao txId)
router.patch(
  "/:orgId/transactions/bulk",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.bulkUpdateTransactions,
);
router.patch(
  "/:orgId/transactions/:txId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.updateTransaction,
);
router.delete(
  "/:orgId/statement/:statementId",
  requireAuth,
  requireOrgRole("OWNER", "ADMIN"),
  officeGate,
  ctrl.removeStatement,
);

module.exports = router;
