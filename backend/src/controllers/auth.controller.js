const User = require("../models/user");
const OTP = require("../models/otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");

/* ================= EMAIL TRANSPORTER ================= */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_APP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email transporter ready to send emails');
  }
});

/* ================= REGISTER ================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields required"
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "Manager"
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration"
    });
  }
};

/* ================= SEND OTP ================= */
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not registered with this email. Please register first." 
      });
    }

    // Generate 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      alphabets: false,
      upperCase: false,
      specialChars: false
    });

    console.log(`📧 Generated OTP for ${email}: ${otp}`);

    // Remove old OTP if exists
    await OTP.findOneAndDelete({ email: email.toLowerCase() });

    // Save new OTP (valid for 10 minutes)
    await OTP.create({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Send OTP via Email
    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: "🔐 Your LCGC RFQ Login OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #0f2a5e, #1e4a8a); padding: 30px; text-align: center; border-radius: 12px;">
            <h1 style="color: white; margin: 0;">LCGC RFQ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Resolute Group</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
            <h2 style="color: #0f2a5e; margin-top: 0;">Your Login OTP</h2>
            <p style="color: #475569;">Hello <strong>${user.name}</strong>,</p>
            <p style="color: #475569;">Use the following OTP to login to your account. This OTP is valid for <strong>10 minutes</strong>.</p>
            
            <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f2a5e;">${otp}</span>
            </div>
            
            <p style="color: #475569; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent successfully to ${email}`);

    res.json({
      success: true,
      message: "OTP sent successfully to your email"
    });

  } catch (error) {
    console.error("SEND OTP ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to send OTP. Please check your email configuration." 
    });
  }
};

/* ================= VERIFY OTP & LOGIN ================= */
exports.loginWithOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and OTP are required" 
      });
    }

    const otpRecord = await OTP.findOne({ email: email.toLowerCase() });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: "No OTP found. Please request a new OTP." 
      });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP. Please try again." 
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ email: email.toLowerCase() });
      return res.status(400).json({ 
        success: false, 
        message: "OTP has expired. Please request a new OTP." 
      });
    }

    // OTP is valid → Login user
    const user = await User.findOne({ email: email.toLowerCase() }).select("-password");

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    // Delete used OTP
    await OTP.deleteOne({ email: email.toLowerCase() });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("LOGIN WITH OTP ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during OTP verification" 
    });
  }
};

/* ================= TRADITIONAL LOGIN (Email + Password) ================= */
exports.login = async (req, res) => {
  console.log("🔥 LOGIN HIT - Body:", req.body);

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email is not registered"
      });
    }

    if (!user.password) {
      return res.status(500).json({
        success: false,
        message: "User password missing in database"
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("❌ LOGIN ERROR FULL:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error"
    });
  }
};

/* ================= GET CURRENT USER ================= */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Get Me Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};