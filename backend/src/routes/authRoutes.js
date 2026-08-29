const express = require("express");

const authController = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { rateLimit } = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

// Drugi korak prijave. Bez requireAuth (korisnik JOŠ nije prijavljen), identitet
// nosi twofa_challenge cookie. Brojač pokušaja je u bazi, ovo je dopunska brana.
router.post(
  "/2fa/verify",
  rateLimit({ prozorMs: 60 * 1000, maks: 20, imenik: "2fa-verify" }),
  authController.verifyTwoFactor,
);
router.post(
  "/2fa/resend",
  rateLimit({ prozorMs: 60 * 1000, maks: 5, imenik: "2fa-resend" }),
  authController.resendTwoFactor,
);

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);

router.post("/change-password", requireAuth, authController.changePassword);

router.get("/google", authController.googleStart);
router.get("/google/callback", authController.googleCallback);

module.exports = router;
