const jwt = require("jsonwebtoken");
const User = require("../models/user");

/**
 * Verify JWT Token Middleware
 * This middleware checks if the user is authenticated
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ 1. Check if header exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    // ✅ 2. Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing"
      });
    }

    // ✅ 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ 4. Check if user exists
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // ✅ 5. Attach user data
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    next();

  } catch (error) {
    console.error("JWT Verification Error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again."
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again."
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

/**
 * Optional: Role-based authorization middleware
 * @param {...string} roles - Allowed roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`
      });
    }

    next();
  };
};

/**
 * Check if user is admin
 */
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    if (req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    next();
  } catch (error) {
    console.error("Admin Check Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};