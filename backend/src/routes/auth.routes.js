const express = require("express");
const router = express.Router();

// Import Controllers
const authController = require("../controllers/auth.controller");

// Import Middleware
const { verifyToken } = require("../middlewares/auth");

/* ================= AUTH ROUTES ================= */

// ====================== PUBLIC ROUTES ======================

// Register New User
router.post("/register", authController.register);

// Traditional Login (Email + Password)
router.post("/login", authController.login);

// ====================== REGISTRATION OTP ROUTES ======================
// Send OTP for Registration
router.post("/send-registration-otp", authController.sendRegistrationOTP);

// Verify OTP for Registration
router.post("/verify-registration-otp", authController.verifyRegistrationOTP);

// ====================== LOGIN OTP ROUTES ======================
// Send OTP for Login
router.post("/send-otp", authController.sendOTP);

// Verify OTP for Login
router.post("/verify-otp", authController.verifyOTP);

// ====================== PROTECTED ROUTES ======================

// Get Current Logged-in User
router.get("/me", verifyToken, authController.getMe);

module.exports = router;