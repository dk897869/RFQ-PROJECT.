const User = require("../models/user");
const OTP = require("../models/otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require('resend');

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

/* ================= HELPER FUNCTIONS ================= */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
};

// Email sending function using Resend with CC support
const sendEmailWithResend = async (to, subject, html, text, ccList = []) => {
  try {
    const emailOptions = {
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject: subject,
      html: html,
      text: text
    };
    
    // Add CC if provided
    if (ccList && ccList.length > 0) {
      emailOptions.cc = ccList;
    }
    
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email sent via Resend:', data);
    return { success: true, data: data };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// New function to send emails with multiple recipients
const sendEmailToMultipleRecipients = async (recipients, subject, html, text, ccList = []) => {
  try {
    const emailOptions = {
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: recipients,
      subject: subject,
      html: html,
      text: text
    };
    
    // Add CC if provided
    if (ccList && ccList.length > 0) {
      emailOptions.cc = ccList;
    }
    
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email sent to multiple recipients via Resend:', data);
    return { success: true, data: data };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

/* ================= SEND OTP FOR REGISTRATION ================= */
exports.sendRegistrationOTP = async (req, res) => {
  try {
    const { email, ccEmails } = req.body; // Added ccEmails support

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    console.log(`📤 Processing registration OTP request for: ${email}`);

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
    console.log(`🔐 ========================================`);
    console.log(`🔐 REGISTRATION OTP FOR ${email}: ${otp}`);
    console.log(`🔐 ========================================`);

    // Remove old OTP for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Save new OTP (valid for 10 minutes)
    await OTP.create({
      email: email.toLowerCase(),
      otp: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LCGC RFQ - Email Verification</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f6f9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #0f2a5e 0%, #1e4a8a 100%);
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 32px;
          }
          .header p {
            color: rgba(255,255,255,0.9);
            margin: 10px 0 0;
          }
          .content {
            padding: 40px 30px;
          }
          .otp-box {
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            padding: 25px;
            text-align: center;
            border-radius: 12px;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 42px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #0f2a5e;
            background: white;
            padding: 15px;
            border-radius: 10px;
            display: inline-block;
            font-family: monospace;
          }
          .footer {
            text-align: center;
            padding: 20px;
            background: #f8fafc;
            font-size: 12px;
            color: #64748b;
          }
          h2 {
            color: #0f2a5e;
            margin-top: 0;
          }
          p {
            color: #475569;
            font-size: 16px;
            line-height: 1.5;
          }
          .small-text {
            font-size: 12px;
            color: #64748b;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LCGC RFQ</h1>
            <p>Resolute Group</p>
          </div>
          
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for registering with LCGC RFQ. Please use the following One-Time Password (OTP) to complete your registration.</p>
            
            <div class="otp-box">
              <p style="margin: 0 0 10px; color: #475569; font-size: 14px;">Your OTP is:</p>
              <div class="otp-code">${otp}</div>
              <p class="small-text">This OTP is valid for <strong>10 minutes</strong></p>
            </div>
            
            <p>If you didn't request this OTP, please ignore this email.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; 2026 LCGC RFQ. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `Your OTP for registration is: ${otp}. This OTP is valid for 10 minutes.`;

    // Send email using Resend with CC support
    const ccArray = ccEmails ? (Array.isArray(ccEmails) ? ccEmails : [ccEmails]) : [];
    const emailResult = await sendEmailWithResend(email, "🔐 Verify Your LCGC RFQ Registration", emailHtml, emailText, ccArray);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: "OTP sent successfully to your email" + (ccArray.length > 0 ? ` and CC'd to ${ccArray.length} recipients` : "")
      });
    } else {
      // Fallback: Return OTP in response if email fails
      res.json({
        success: true,
        message: `OTP generated. Please use: ${otp} (Email delivery failed: ${emailResult.error})`,
        devOTP: otp
      });
    }

  } catch (error) {
    console.error("SEND REGISTRATION OTP ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to send OTP" 
    });
  }
};

/* ================= SEND OTP FOR LOGIN ================= */
exports.sendOTP = async (req, res) => {
  try {
    const { email, ccEmails } = req.body; // Added ccEmails support

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    console.log(`📤 Processing login OTP request for: ${email}`);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not registered with this email. Please register first." 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔐 ========================================`);
    console.log(`🔐 LOGIN OTP FOR ${email}: ${otp}`);
    console.log(`🔐 ========================================`);

    // Remove old OTP
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Save new OTP (valid for 10 minutes)
    await OTP.create({
      email: email.toLowerCase(),
      otp: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LCGC RFQ - Login OTP</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f6f9;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #0f2a5e 0%, #1e4a8a 100%);
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 32px;
          }
          .header p {
            color: rgba(255,255,255,0.9);
            margin: 10px 0 0;
          }
          .content {
            padding: 40px 30px;
          }
          .otp-box {
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            padding: 25px;
            text-align: center;
            border-radius: 12px;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 42px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #0f2a5e;
            background: white;
            padding: 15px;
            border-radius: 10px;
            display: inline-block;
            font-family: monospace;
          }
          .footer {
            text-align: center;
            padding: 20px;
            background: #f8fafc;
            font-size: 12px;
            color: #64748b;
          }
          h2 {
            color: #0f2a5e;
            margin-top: 0;
          }
          p {
            color: #475569;
            font-size: 16px;
            line-height: 1.5;
          }
          .small-text {
            font-size: 12px;
            color: #64748b;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LCGC RFQ</h1>
            <p>Resolute Group</p>
          </div>
          
          <div class="content">
            <h2>Your Login OTP</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Use the following OTP to login to your account. This OTP is valid for <strong>10 minutes</strong>.</p>
            
            <div class="otp-box">
              <p style="margin: 0 0 10px; color: #475569; font-size: 14px;">Your OTP is:</p>
              <div class="otp-code">${otp}</div>
              <p class="small-text">This OTP is valid for <strong>10 minutes</strong></p>
            </div>
            
            <p>If you didn't request this OTP, please ignore this email.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email, please do not reply.</p>
            <p>&copy; 2026 LCGC RFQ. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `Your OTP for login is: ${otp}. This OTP is valid for 10 minutes.`;

    // Send email using Resend with CC support
    const ccArray = ccEmails ? (Array.isArray(ccEmails) ? ccEmails : [ccEmails]) : [];
    const emailResult = await sendEmailWithResend(email, "🔐 Your LCGC RFQ Login OTP", emailHtml, emailText, ccArray);
    
    if (emailResult.success) {
      res.json({
        success: true,
        message: "OTP sent successfully to your email" + (ccArray.length > 0 ? ` and CC'd to ${ccArray.length} recipients` : "")
      });
    } else {
      res.json({
        success: true,
        message: `OTP generated. Please use: ${otp} (Email delivery failed: ${emailResult.error})`,
        devOTP: otp
      });
    }

  } catch (error) {
    console.error("SEND OTP ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to send OTP" 
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

    user.lastLogin = new Date();
    await user.save();

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

    await OTP.deleteMany({ email: email.toLowerCase() });

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

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

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

/* ================= SEND BULK EMAIL NOTIFICATION ================= */
// New function to send bulk email notifications for EP Approval
exports.sendBulkEmailNotification = async (recipients, subject, htmlContent, textContent, ccList = []) => {
  try {
    const result = await sendEmailToMultipleRecipients(recipients, subject, htmlContent, textContent, ccList);
    return result;
  } catch (error) {
    console.error("Bulk email error:", error);
    return { success: false, error: error.message };
  }
};

/* ================= SEND APPROVAL REQUEST EMAIL ================= */
// New function for EP Approval email with CC
exports.sendApprovalRequestEmail = async (toEmail, requesterName, requestTitle, requestDetails, ccEmails = []) => {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0f2a5e, #1e4a8a); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .button { display: inline-block; padding: 10px 20px; background: #0f2a5e; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>EP Approval Request</h2>
          </div>
          <div class="content">
            <p>Dear Approver,</p>
            <p><strong>${requesterName}</strong> has submitted a new EP request for your approval.</p>
            <p><strong>Title:</strong> ${requestTitle}</p>
            <p><strong>Details:</strong> ${requestDetails}</p>
            <p>Please login to the system to review and take action.</p>
            <a href="${process.env.FRONTEND_URL}/ep-approval" class="button">Review Request</a>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const emailText = `${requesterName} has submitted a new EP request: ${requestTitle}. Please login to review.`;
    
    const result = await sendEmailWithResend(toEmail, "EP Approval Request - Action Required", emailHtml, emailText, ccEmails);
    return result;
  } catch (error) {
    console.error("Approval request email error:", error);
    return { success: false, error: error.message };
  }
};

// Export the new email functions
exports.sendEmailWithResend = sendEmailWithResend;
exports.sendEmailToMultipleRecipients = sendEmailToMultipleRecipients;