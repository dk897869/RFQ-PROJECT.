const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth");

// ====================== PUBLIC ROUTES ======================

// Registration Routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/send-registration-otp", authController.sendRegistrationOTP);
router.post("/verify-registration-OTP", authController.verifyRegistrationOTP);

// OTP Routes
router.post("/send-email-otp", authController.sendEmailOTP);
router.post("/verify-otp", authController.verifyOTP);

// Forgot Password Routes
router.post("/forgot-password/send-otp", authController.sendForgotPasswordOTP);
router.post("/forgot-password/resend-otp", authController.resendForgotPasswordOTP);
router.post("/forgot-password/reset", authController.verifyOTPAndResetPassword);

// ====================== PROTECTED ROUTES ======================
router.get("/me", verifyToken, authController.getMe);

module.exports = router;