require("dotenv").config();  // ✅ MOVED TO THE TOP - Must be first!

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const fs = require("fs");

const connectDB = require("./config/db");

// Helper function to safely require routes - prevents crashes if files don't exist
const safeRequire = (routePath, defaultValue) => {
  try {
    return require(routePath);
  } catch (err) {
    console.warn(`⚠️ Could not load ${routePath}: ${err.message}`);
    return defaultValue || ((req, res) => res.status(501).json({ 
      success: false, 
      message: `${routePath} API not available yet`
    }));
  }
};

// ROUTES - using safe require to prevent crashes
const authRoutes = safeRequire("./routes/auth.routes");
const dashboardRoutes = safeRequire("./routes/dashboard.routes");
const requestRoutes = safeRequire("./routes/request.routes");
const vendorRoutes = safeRequire("./routes/vendor.routes");
const partRoutes = safeRequire("./routes/part.routes");
const userRoutes = safeRequire("./routes/user.routes");

// ✅ NPP PROCUREMENT ROUTES
const paymentNppRoutes = safeRequire("./routes/paymentNpp.routes");
const poNppRoutes = safeRequire("./routes/poNpp.routes");
const prNppRoutes = safeRequire("./routes/prNpp.routes");
const rfqRoutes = safeRequire("./routes/rfq.routes");

// ✅ NEW API ROUTES - will not crash if missing
const orderHistoryRoutes = safeRequire("./routes/orderHistory.routes");
const reportRoutes = safeRequire("./routes/report.routes");
const approvalRoutes = safeRequire("./routes/approval.routes");
const serialNumberRoutes = safeRequire("./routes/serialNumber.routes");

const app = express();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "..", "uploads", "avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

/* ================= DATABASE CONNECTION ================= */
connectDB();

/* ================= MIDDLEWARE ================= */
app.use(helmet());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  maxAge: 86400
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`📌 ${req.method} ${req.url}`);
    next();
  });
}

/* ================= HEALTH CHECK ROUTES ================= */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'LCGC RFQ Server is running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

/* ================= AUTH ENDPOINTS ================= */

app.get('/api/auth/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, user: user });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

app.patch('/api/auth/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    
    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/auth/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    
    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcryptjs');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { $set: { avatar: avatarUrl, profileImage: avatarUrl } },
      { new: true }
    ).select('-password');
    
    res.json({ 
      success: true, 
      message: 'Avatar uploaded successfully',
      profileImage: avatarUrl,
      avatar: avatarUrl,
      user: updatedUser
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/auth/avatar', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    
    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { $set: { avatar: '', profileImage: '' } },
      { new: true }
    ).select('-password');
    
    res.json({ 
      success: true, 
      message: 'Avatar removed successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/remove-avatar', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    
    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { $set: { avatar: '', profileImage: '' } },
      { new: true }
    ).select('-password');
    
    res.json({ 
      success: true, 
      message: 'Avatar removed successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/update-profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    
    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/auth/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcryptjs');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/auth/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcryptjs');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require('./models/user.model');
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/request", requestRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/rfq", rfqRoutes);

// ✅ NPP PROCUREMENT ROUTES
app.use("/api/pr-npp", prNppRoutes);
app.use("/api/po-npp", poNppRoutes);
app.use("/api/payment-npp", paymentNppRoutes);

// ✅ NEW API ROUTES - will work if files exist, otherwise return 501
app.use("/api/order-history", orderHistoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/serial-number", serialNumberRoutes);

// Optional route - safe require
const otpRoutes = safeRequire("./routes/otp.routes");
app.use("/api/otp", otpRoutes);

app.use("/api/part", partRoutes);
app.use("/api/users", userRoutes);

app.use('/api/ep-approval', requestRoutes);

// User rights route - safe require
try {
  const userRightRoutes = require("./routes/userRight.routes");
  app.use("/api/user-rights", userRightRoutes);
  console.log("✅ userRight.routes loaded successfully");
} catch (error) {
  console.warn("⚠️ userRight.routes not found or failed to load. Skipping...");
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Running Successfully 🚀",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    availableApis: {
      auth: "/api/auth",
      dashboard: "/api/dashboard",
      epApproval: "/api/ep-approval",
      request: "/api/request",
      vendor: "/api/vendor",
      part: "/api/part",
      rfq: "/api/rfq",
      prNpp: "/api/pr-npp",
      poNpp: "/api/po-npp",
      paymentNpp: "/api/payment-npp",
      orderHistory: "/api/order-history",
      reports: "/api/reports",
      approvals: "/api/approvals",
      serialNumber: "/api/serial-number"
    }
  });
});

/* ================= 404 HANDLER ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    hint: 'Available routes: GET /api/health | POST /api/auth/login | GET /api/auth/me | GET /api/request | GET /api/ep-approval | GET /api/dashboard | GET /health | PATCH /api/auth/profile | POST /api/auth/change-password | POST /api/auth/upload-avatar | DELETE /api/auth/avatar | POST /api/pr-npp | POST /api/po-npp | POST /api/payment-npp | GET /api/order-history | GET /api/reports/generate | GET /api/serial-number/rfq'
  });
});

/* ================= GLOBAL ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error("Stack:", err.stack);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Auth endpoints:`);
  console.log(`   - POST   /api/auth/login`);
  console.log(`   - GET    /api/auth/me`);
  console.log(`   - GET    /api/auth/profile`);
  console.log(`   - PATCH  /api/auth/profile`);
  console.log(`   - POST   /api/auth/change-password`);
  console.log(`   - POST   /api/auth/upload-avatar`);
  console.log(`   - DELETE /api/auth/avatar`);
  console.log(`✅ EP Approval: http://localhost:${PORT}/api/ep-approval`);
  console.log(`✅ Requests: http://localhost:${PORT}/api/request`);
  console.log(`✅ NPP PROCUREMENT APIs:`);
  console.log(`   - PR NPP     : http://localhost:${PORT}/api/pr-npp`);
  console.log(`   - PO NPP     : http://localhost:${PORT}/api/po-npp`);
  console.log(`   - Payment NPP: http://localhost:${PORT}/api/payment-npp`);
  console.log(`✅ NEW APIs:`);
  console.log(`   - Order History : http://localhost:${PORT}/api/order-history`);
  console.log(`   - Reports       : http://localhost:${PORT}/api/reports/generate`);
  console.log(`   - Approvals     : http://localhost:${PORT}/api/approvals`);
  console.log(`   - Serial Number : http://localhost:${PORT}/api/serial-number/rfq`);
  console.log(`📡 CORS enabled for all origins`);
  console.log(`🛡️  Security headers enabled (Helmet)`);
});

module.exports = app;