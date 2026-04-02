const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth");

// ====================== PUBLIC ROUTES ======================

// Registration OTP Routes
router.post("/send-registration-otp", authController.sendRegistrationOTP);
router.post("/verify-registration-otp", authController.verifyRegistrationOTP);

// Email OTP Routes
router.post("/send-email-otp", authController.sendEmailOTP);
router.post("/send-sms-otp", authController.sendSMSOTP);
router.post("/verify-otp", authController.verifyOTP);

// Traditional Auth Routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Forgot Password Routes
router.post("/forgot-password/send-otp", authController.sendForgotPasswordOTP);
router.post("/forgot-password/resend-otp", authController.resendForgotPasswordOTP);
router.post("/forgot-password/reset", authController.verifyOTPAndResetPassword);

// ====================== PROTECTED ROUTES ======================
router.get("/me", verifyToken, authController.getMe);

module.exports = router;