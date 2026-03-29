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
router.post("/send-registration-otp", authController.sendRegistrationOTP);
router.post("/verify-registration-otp", authController.verifyRegistrationOTP);

// ====================== LOGIN OTP ROUTES ======================
router.post("/send-otp", authController.sendOTP);
router.post("/verify-otp", authController.verifyOTP);

// ====================== PROTECTED ROUTES ======================
router.get("/me", verifyToken, authController.getMe);

module.exports = router;