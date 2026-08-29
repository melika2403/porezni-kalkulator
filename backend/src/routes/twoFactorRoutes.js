const express = require("express");

const twoFactorController = require("../controllers/twoFactorController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { rateLimit } = require("../middlewares/rateLimit");

const router = express.Router();

// Podešavanje 2FA je uvijek iza prijave. Ograničenje po IP-u je dopuna, pravu
// granicu drže brojači u bazi (otpAttempts) i cooldown na slanju.
router.use(requireAuth);

router.get("/status", twoFactorController.status);
router.post(
  "/setup/start",
  rateLimit({ prozorMs: 60 * 1000, maks: 10, imenik: "2fa-setup" }),
  twoFactorController.setupStart,
);
router.post(
  "/setup/confirm",
  rateLimit({ prozorMs: 60 * 1000, maks: 20, imenik: "2fa-confirm" }),
  twoFactorController.setupConfirm,
);
router.post(
  "/setup/resend",
  rateLimit({ prozorMs: 60 * 1000, maks: 5, imenik: "2fa-setup-resend" }),
  twoFactorController.resendSetupCode,
);
router.post(
  "/send-code",
  rateLimit({ prozorMs: 60 * 1000, maks: 5, imenik: "2fa-send-code" }),
  twoFactorController.sendCurrentMethodCode,
);
router.post("/backup-codes", twoFactorController.regenerateBackupCodes);
router.post("/trusted-devices/clear", twoFactorController.clearTrustedDevices);
router.post("/disable", twoFactorController.disable);

module.exports = router;
