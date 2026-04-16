const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/auth.controller');

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// ==================== AUTHENTICATION MIDDLEWARE ====================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ==================== PUBLIC ROUTES ====================
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/send-otp', authController.sendEmailOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/send-registration-otp', authController.sendRegistrationOTP);
router.post('/verify-registration-otp', authController.verifyRegistrationOTP);
router.post('/forgot-password', authController.sendForgotPasswordOTP);
router.post('/resend-forgot-password', authController.resendForgotPasswordOTP);
router.post('/reset-password', authController.verifyOTPAndResetPassword);
router.post('/send-reset-link', authController.sendForgotPasswordLink);
router.post('/reset-password-with-token', authController.resetPasswordWithToken);
router.post('/send-sms-otp', authController.sendSmsOTP);
router.post('/verify-sms-otp', authController.verifyOTP);

// ==================== PROTECTED ROUTES (Require Auth) ====================
router.use(authMiddleware);

// User profile routes
router.get('/me', authController.getMe);
router.get('/profile', authController.getMe);
router.patch('/profile', authController.updateProfile);
router.put('/profile', authController.updateProfile);
router.post('/update-profile', authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.patch('/change-password', authController.changePassword);
router.post('/refresh-session', authController.refreshUserSession);
router.get('/departments', authController.getDepartments);
router.get('/managers', authController.getManagers);

// Profile photo routes
router.post('/upload-avatar', upload.single('avatar'), authController.uploadProfilePhoto);
router.post('/upload-profile-photo', upload.single('profileImage'), authController.uploadProfilePhoto);

// Clear avatar route - inline implementation to avoid undefined error
router.delete('/avatar', async (req, res) => {
  try {
    const User = require('../models/user.model');
    const user = await User.findById(req.user.id || req.user._id);
    if (user) {
      user.profileImage = '';
      user.avatar = '';
      await user.save();
    }
    res.json({ 
      success: true, 
      message: 'Avatar removed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: '',
        role: user.role,
        department: user.department,
        contactNo: user.contactNo,
        organization: user.organization,
        workspaces: user.workspaces || [],
        dateOfBirth: user.dateOfBirth,
        rights: user.rights || {},
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/profile-photo', async (req, res) => {
  try {
    const User = require('../models/user.model');
    const user = await User.findById(req.user.id || req.user._id);
    if (user) {
      user.profileImage = '';
      user.avatar = '';
      await user.save();
    }
    res.json({ 
      success: true, 
      message: 'Profile photo removed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: '',
        role: user.role,
        department: user.department,
        contactNo: user.contactNo,
        organization: user.organization,
        workspaces: user.workspaces || [],
        dateOfBirth: user.dateOfBirth,
        rights: user.rights || {},
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// EP Request routes
router.post('/ep-requests', authController.createEPRequest);
router.get('/ep-requests', authController.getAllEPRequests);
router.get('/ep-requests/:id', authController.getEPRequestById);
router.put('/ep-requests/:id', authController.updateEPRequest);
router.delete('/ep-requests/:id', authController.deleteEPRequest);
router.patch('/ep-requests/:id/approve', authController.approveEPRequest);
router.patch('/ep-requests/:id/reject', authController.rejectEPRequest);
router.get('/ep-requests-stats', authController.getEPRequestStats);
router.post('/ep-requests-send-email', authController.sendEPRequestEmail);

module.exports = router;