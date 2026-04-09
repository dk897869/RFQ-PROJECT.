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
router.post("/send-otp", authController.sendEmailOTP); // alias
router.post("/verify-otp", authController.verifyOTP);

// Forgot Password Routes
router.post("/forgot-password/send-otp", authController.sendForgotPasswordOTP);
router.post("/forgot-password/resend-otp", authController.resendForgotPasswordOTP);
router.post("/forgot-password/reset", authController.verifyOTPAndResetPassword);

// ====================== PROTECTED ROUTES ======================
router.get("/me", verifyToken, authController.getMe);
router.post("/refresh-session", verifyToken, authController.refreshUserSession);

// ====================== DROPDOWN / LOOKUP ROUTES ======================
router.get("/departments", verifyToken, authController.getDepartments);
router.get("/managers", verifyToken, authController.getManagers);

// ====================== EP REQUEST ROUTES ======================
// Stats (before /:id to avoid conflict)
router.get("/ep-requests/stats", verifyToken, authController.getEPRequestStats);

// CRUD
router.post("/ep-requests", verifyToken, authController.createEPRequest);
router.get("/ep-requests", verifyToken, authController.getAllEPRequests);
router.get("/ep-requests/:id", verifyToken, authController.getEPRequestById);
router.put("/ep-requests/:id", verifyToken, authController.updateEPRequest);
router.delete("/ep-requests/:id", verifyToken, authController.deleteEPRequest);

// Approval Actions
router.patch("/ep-requests/:id/approve", verifyToken, authController.approveEPRequest);
router.patch("/ep-requests/:id/reject", verifyToken, authController.rejectEPRequest);

// Email / Notification
router.post("/ep-requests/send-email", verifyToken, authController.sendEPRequestEmail);

module.exports = router;