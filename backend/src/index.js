require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");   // Added for security (optional but recommended)

const connectDB = require("./config/db");

// ROUTES
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const requestRoutes = require("./routes/request.routes");
const vendorRoutes = require("./routes/vendor.routes");
const partRoutes = require("./routes/part.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

/* ================= DATABASE CONNECTION ================= */
connectDB();

/* ================= MIDDLEWARE ================= */

// Security headers
app.use(helmet());

// CORS configuration - More secure than origin: "*"
app.use(cors({
  origin: "*",                    // Change to specific frontend URL in production
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  maxAge: 86400                   // Cache preflight for 24 hours
}));

// Body parsers - MUST be before routes
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logger (for development)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`📌 ${req.method} ${req.url}`);
    next();
  });
}

/* ================= ROUTES ================= */

// Register all routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/request", requestRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/part", partRoutes);
app.use("/api/users", userRoutes);

// User Rights route with safe loading
try {
  const userRightRoutes = require("./routes/userRight.routes");
  app.use("/api/user-rights", userRightRoutes);
  console.log("✅ userRight.routes loaded successfully");
} catch (error) {
  console.warn("⚠️ userRight.routes not found or failed to load. Skipping...");
}

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Running Successfully 🚀",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

/* ================= 404 HANDLER ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
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
  console.log(`📡 CORS enabled for all origins`);
  console.log(`🛡️  Security headers enabled (Helmet)`);
});