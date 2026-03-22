const jwt = require("jsonwebtoken");

/* ================= VERIFY TOKEN ================= */

exports.verifyToken = (req, res, next) => {

  const authHeader = req.headers.authorization;

  // ✅ CHECK HEADER
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided"
    });
  }

  const token = authHeader.split(" ")[1];

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // contains id, email, role

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });

  }

};