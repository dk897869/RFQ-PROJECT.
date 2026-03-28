const express = require("express");
const router = express.Router();

// ✅ Import Controllers
const authController = require("../controllers/auth.controller");

// ✅ Import Middleware (using your existing verifyToken)
const { verifyToken } = require("../middlewares/auth");

/* ================= AUTH ROUTES ================= */

// ====================== PUBLIC ROUTES ======================

// Register New User
router.post("/register", authController.register);

// Traditional Login (Email + Password)
router.post("/login", authController.login);

// Send OTP for Login
router.post("/send-otp", authController.sendOTP);

// Verify OTP and Login (Fixed endpoint to match frontend)
router.post("/verify-otp", authController.loginWithOTP);

// ====================== PROTECTED ROUTES ======================

// Get Current Logged-in User
router.get(
  "/me",
  verifyToken,
  authController.getMe
);

module.exports = router;