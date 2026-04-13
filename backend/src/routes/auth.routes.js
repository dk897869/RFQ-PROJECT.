const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth");
const { uploadProfilePhoto } = require("../middlewares/upload");

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
router.post("/send-sms-otp", authController.sendSmsOTP);

// Forgot Password Routes
router.post("/forgot-password", authController.sendForgotPasswordLink);
router.post("/reset-password", authController.resetPasswordWithToken);
router.post("/forgot-password/send-otp", authController.sendForgotPasswordOTP);
router.post("/forgot-password/resend-otp", authController.resendForgotPasswordOTP);
router.post("/forgot-password/reset", authController.verifyOTPAndResetPassword);

// ====================== PROTECTED ROUTES ======================
router.get("/me", verifyToken, authController.getMe);
router.patch("/profile", verifyToken, authController.updateProfile);
router.patch("/change-password", verifyToken, authController.changePassword);
router.post("/profile/photo", verifyToken, uploadProfilePhoto.single("photo"), authController.uploadProfilePhoto);
router.post("/refresh-session", verifyToken, authController.refreshUserSession);

// ====================== DROPDOWN / LOOKUP ROUTES ======================
router.get("/departments", verifyToken, authController.getDepartments);
router.get("/managers", verifyToken, authController.getManagers);

// ====================== EP REQUEST ROUTES (via auth controller) ======================
// NOTE: Stats MUST come before /:id to avoid route conflict
router.get("/ep-requests/stats", verifyToken, authController.getEPRequestStats);
router.post("/ep-requests/send-email", verifyToken, authController.sendEPRequestEmail);

// CRUD
router.post("/ep-requests", verifyToken, authController.createEPRequest);
router.get("/ep-requests", verifyToken, authController.getAllEPRequests);
router.get("/ep-requests/:id", verifyToken, authController.getEPRequestById);
router.put("/ep-requests/:id", verifyToken, authController.updateEPRequest);
router.delete("/ep-requests/:id", verifyToken, authController.deleteEPRequest);

// Approval Actions
router.patch("/ep-requests/:id/approve", verifyToken, authController.approveEPRequest);
router.patch("/ep-requests/:id/reject", verifyToken, authController.rejectEPRequest);

module.exports = router;