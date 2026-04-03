require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

// ROUTES
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const requestRoutes = require("./routes/request.routes");
const vendorRoutes = require("./routes/vendor.routes");
const partRoutes = require("./routes/part.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

/* ================= DATABASE ================= */
connectDB();

/* ================= MIDDLEWARE ================= */
// CORS middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

/* ================= ROUTES ================= */
// Register all routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/request", requestRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/part", partRoutes);
app.use("/api/users", userRoutes);

// Check if user-rights route exists before using it
try {
  const userRightRoutes = require("./routes/userRight.routes");
  app.use("/api/user-rights", userRightRoutes);
} catch (error) {
  console.log("⚠️ userRight.routes not found, skipping...");
}

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Running Successfully 🚀",
    timestamp: new Date().toISOString()
  });
});

/* ================= 404 HANDLER ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
});

/* ================= ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 CORS enabled for all origins`);
});