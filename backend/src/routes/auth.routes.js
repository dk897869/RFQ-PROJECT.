const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth");

/* ================= AUTH ================= */

// Register
router.post("/register", authController.register);

// Login
router.post("/login", authController.login);

// Get current logged-in user (Protected)
router.get("/me", verifyToken, authController.getMe);

module.exports = router;