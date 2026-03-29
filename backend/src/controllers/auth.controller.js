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

/* ================= HELPER FUNCTIONS ================= */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
};

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
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "Manager"
    });

    await user.save();

    const token = generateToken(user);

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

/* ================= SEND OTP FOR REGISTRATION ================= */
exports.sendRegistrationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already registered. Please login instead." 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`📧 Generated Registration OTP for ${email}: ${otp}`);

    // Remove old OTP for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Save new OTP (valid for 10 minutes)
    await OTP.create({
      email: email.toLowerCase(),
      otp: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Send OTP via Email
    const mailOptions = {
      from: `"LCGC RFQ" <${process.env.SMTP_MAIL}>`,
      to: email,
      subject: "🔐 Verify Your LCGC RFQ Registration",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #0f2a5e 0%, #1e4a8a 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">LCGC RFQ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Resolute Group</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <h2 style="color: #0f2a5e; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.5;">Thank you for registering with LCGC RFQ. Please use the following One-Time Password (OTP) to complete your registration.</p>
            
            <div style="background: #f8fafc; border: 2px dashed #cbd5e1; padding: 25px; text-align: center; border-radius: 12px; margin: 30px 0;">
              <p style="margin: 0 0 10px; color: #475569; font-size: 14px;">Your OTP is:</p>
              <div style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #0f2a5e; background: white; padding: 15px; border-radius: 10px; display: inline-block; font-family: monospace;">${otp}</div>
              <p style="margin: 15px 0 0; color: #64748b; font-size: 12px;">This OTP is valid for <strong>10 minutes</strong></p>
            </div>
            
            <p style="color: #475569; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Registration OTP sent successfully to ${email}`);

    res.json({
      success: true,
      message: "OTP sent successfully to your email"
    });

  } catch (error) {
    console.error("SEND REGISTRATION OTP ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to send OTP. Please check your email configuration." 
    });
  }
};

/* ================= VERIFY OTP FOR REGISTRATION ================= */
exports.verifyRegistrationOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and OTP are required" 
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP format. OTP must be 6 digits." 
      });
    }

    const otpRecord = await OTP.findOne({ 
      email: email.toLowerCase(), 
      otp: otp
    });

    if (!otpRecord) {
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

    // OTP is valid, return success
    res.json({
      success: true,
      message: "OTP verified successfully"
    });

  } catch (error) {
    console.error("VERIFY REGISTRATION OTP ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during OTP verification" 
    });
  }
};

/* ================= SEND OTP FOR LOGIN ================= */
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`📧 Generated Login OTP for ${email}: ${otp}`);

    // Remove old OTP
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Save new OTP (valid for 10 minutes)
    await OTP.create({
      email: email.toLowerCase(),
      otp: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Send OTP via Email
    const mailOptions = {
      from: `"LCGC RFQ" <${process.env.SMTP_MAIL}>`,
      to: email,
      subject: "🔐 Your LCGC RFQ Login OTP",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #0f2a5e 0%, #1e4a8a 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px;">LCGC RFQ</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Resolute Group</p>
          </div>
          
          <div style="padding: 40px 30px;">
            <h2 style="color: #0f2a5e; margin-top: 0;">Your Login OTP</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.5;">Hello <strong>${user.name}</strong>,</p>
            <p style="color: #475569;">Use the following OTP to login to your account. This OTP is valid for <strong>10 minutes</strong>.</p>
            
            <div style="background: #f8fafc; border: 2px dashed #cbd5e1; padding: 25px; text-align: center; border-radius: 12px; margin: 30px 0;">
              <p style="margin: 0 0 10px; color: #475569; font-size: 14px;">Your OTP is:</p>
              <div style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #0f2a5e; background: white; padding: 15px; border-radius: 10px; display: inline-block; font-family: monospace;">${otp}</div>
              <p style="margin: 15px 0 0; color: #64748b; font-size: 12px;">This OTP is valid for <strong>10 minutes</strong></p>
            </div>
            
            <p style="color: #475569; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Login OTP sent successfully to ${email}`);

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

/* ================= VERIFY OTP FOR LOGIN ================= */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and OTP are required" 
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP format. OTP must be 6 digits." 
      });
    }

    const otpRecord = await OTP.findOne({ 
      email: email.toLowerCase(), 
      otp: otp
    });

    if (!otpRecord) {
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

    const user = await User.findOne({ email: email.toLowerCase() }).select("-password");

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const token = generateToken(user);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

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
    console.error("VERIFY OTP ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during OTP verification" 
    });
  }
};

/* ================= TRADITIONAL LOGIN ================= */
exports.login = async (req, res) => {
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
        message: "Invalid email or password"
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
        message: "Invalid email or password"
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

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
    console.error("LOGIN ERROR:", error);
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