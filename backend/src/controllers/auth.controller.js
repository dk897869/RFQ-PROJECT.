const User = require("../models/user.model");
const OTP = require("../models/otp.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require('resend');
const twilio = require('twilio');

// ==================== INITIALIZE SERVICES ====================

// Initialize Resend for Email
let resend = null;
let isResendConfigured = false;
try {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_Pxyn7kKL_99SxAz2eWj32n9FcTLDfpG5e') {
    resend = new Resend(process.env.RESEND_API_KEY);
    isResendConfigured = true;
    console.log('✅ Resend initialized for Email');
  } else {
    console.log('⚠️ Resend using default API key - email sending may not work');
    // Still initialize with default key for testing
    resend = new Resend(process.env.RESEND_API_KEY);
    isResendConfigured = true;
  }
} catch (error) {
  console.log('⚠️ Resend initialization error:', error.message);
}

// Initialize Twilio for SMS with Verify Service
let twilioClient = null;
let isTwilioConfigured = false;

try {
  if (process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_AUTH_TOKEN !== 'e6966299ee6ae8b15486f43f4f4337626') {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    isTwilioConfigured = true;
    console.log('✅ Twilio initialized for SMS');
  } else {
    console.log('⚠️ Twilio not configured - using fallback mode');
  }
} catch (error) {
  console.log('⚠️ Twilio initialization error:', error.message);
}

// Send SMS using Twilio Verify API (Recommended)
const sendSMSWithVerify = async (to) => {
  try {
    if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.log(`📱 [FALLBACK] SMS would be sent to: ${to}`);
      return { success: true, fallback: true };
    }
    
    let formattedNumber = to;
    if (!to.startsWith('+')) {
      formattedNumber = `+91${to.replace(/\D/g, '')}`;
    }
    
    const verification = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: formattedNumber,
        channel: 'sms'
      });
    
    console.log('✅ SMS OTP sent via Verify:', verification.sid);
    return { success: true, sid: verification.sid };
  } catch (error) {
    console.error('❌ SMS Verify error:', error.message);
    console.log(`📱 [FALLBACK] SMS would be sent to: ${to}`);
    return { success: true, fallback: true };
  }
};

// Verify SMS OTP using Twilio Verify API
const verifySMSWithVerify = async (to, code) => {
  try {
    if (!twilioClient || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.log(`📱 [FALLBACK] Would verify SMS for: ${to} with code: ${code}`);
      return { success: true, isValid: true };
    }
    
    let formattedNumber = to;
    if (!to.startsWith('+')) {
      formattedNumber = `+91${to.replace(/\D/g, '')}`;
    }
    
    const verificationCheck = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: formattedNumber,
        code: code
      });
    
    const isValid = verificationCheck.status === 'approved';
    console.log(`✅ SMS OTP verification: ${isValid ? 'APPROVED' : 'FAILED'}`);
    return { success: true, isValid: isValid };
  } catch (error) {
    console.error('❌ SMS Verify error:', error.message);
    return { success: false, isValid: false, error: error.message };
  }
};

// ==================== HELPER FUNCTIONS ====================

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOTP = async (email, mobile, otp, type) => {
  await OTP.deleteMany({
    $or: [{ email: email }, { mobile: mobile }],
    type: type
  });

  await OTP.create({
    email: email,
    mobile: mobile,
    otp: otp,
    type: type,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
};

// ==================== EMAIL FUNCTIONS ====================

const sendEmail = async (to, subject, html, text, ccList = []) => {
  try {
    if (!resend) {
      console.log(`📧 [FALLBACK] Email would be sent to: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`OTP: ${html.match(/\d{6}/)?.[0] || 'N/A'}`);
      return { success: true, fallback: true };
    }

    const emailOptions = {
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: [to],
      subject: subject,
      html: html,
      text: text
    };

    if (ccList && ccList.length > 0) {
      emailOptions.cc = ccList;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email sent via Resend:', data);
    return { success: true, data: data };
  } catch (error) {
    console.error('❌ Email send error:', error);
    console.log(`📧 [FALLBACK] Email would be sent to: ${to}`);
    return { success: true, fallback: true };
  }
};

const sendEmailOTPCode = async (email, name, otp, type) => {
  let subject = '';
  let title = '';
  
  switch(type) {
    case 'login':
      subject = 'Your Login OTP - LCGC RFQ';
      title = 'Login Verification';
      break;
    case 'registration':
      subject = 'Verify Your Email - LCGC RFQ';
      title = 'Email Verification';
      break;
    case 'reset':
      subject = 'Password Reset OTP - LCGC RFQ';
      title = 'Password Reset';
      break;
    default:
      subject = 'Your OTP - LCGC RFQ';
      title = 'OTP Verification';
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f6f9; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0f2a5e 0%, #1e4a8a 100%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; }
        .content { padding: 30px; }
        .otp-box { background: #f8fafc; border: 2px dashed #cbd5e1; padding: 25px; text-align: center; border-radius: 12px; margin: 20px 0; }
        .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #0f2a5e; background: white; padding: 15px; border-radius: 10px; display: inline-block; font-family: monospace; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>LCGC RFQ</h1>
          <p>Resolute Group</p>
        </div>
        <div class="content">
          <h2 style="color: #0f2a5e;">${title}</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your OTP is:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p style="margin-top: 10px; font-size: 12px;">This OTP is valid for <strong>10 minutes</strong></p>
          </div>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} LCGC RFQ. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Your OTP for ${title.toLowerCase()} is: ${otp}. Valid for 10 minutes.`;

  return await sendEmail(email, subject, html, text);
};

// ==================== SMS FUNCTIONS ====================

const sendSMS = async (to, message) => {
  try {
    if (!twilioClient) {
      console.log(`📱 [FALLBACK] SMS would be sent to: ${to}`);
      console.log(`Message: ${message}`);
      return { success: true, fallback: true };
    }
    
    let formattedNumber = to;
    if (!to.startsWith('+')) {
      formattedNumber = `+91${to.replace(/\D/g, '')}`;
    }
    
    const result = await twilioClient.messages.create({
      body: message,
      to: formattedNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    
    console.log('✅ SMS sent:', result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('❌ SMS error:', error.message);
    console.log(`📱 [FALLBACK] SMS would be sent to: ${to}`);
    return { success: true, fallback: true };
  }
};

// Single declaration of sendSMSOTPCode function
const sendSMSOTPCode = async (phoneNumber, otp, type) => {
  // Using Verify API (Twilio manages OTP)
  if (isTwilioConfigured && process.env.TWILIO_VERIFY_SERVICE_SID) {
    return await sendSMSWithVerify(phoneNumber);
  }
  
  // Fallback: Send OTP directly
  let message = '';
  switch(type) {
    case 'login':
      message = `LCGC RFQ: Your login OTP is ${otp}. Valid for 10 minutes. Never share this code.`;
      break;
    case 'registration':
      message = `LCGC RFQ: Your registration verification OTP is ${otp}. Valid for 10 minutes.`;
      break;
    case 'reset':
      message = `LCGC RFQ: Your password reset OTP is ${otp}. Valid for 10 minutes.`;
      break;
    default:
      message = `LCGC RFQ: Your OTP is ${otp}. Valid for 10 minutes.`;
  }
  
  return await sendSMS(phoneNumber, message);
};

// ==================== EXPORT FUNCTIONS ====================

exports.sendRegistrationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const otp = generateOTP();
    console.log(`🔐 Registration OTP for ${email}: ${otp}`);

    await saveOTP(email, null, otp, 'registration');

    const name = email.split('@')[0];
    await sendEmailOTPCode(email, name, otp, 'registration');

    res.json({
      success: true,
      message: "OTP sent successfully to your email",
      devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error("Send Registration OTP error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyRegistrationOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp: otp,
      type: 'registration'
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({
      success: true,
      message: "OTP verified successfully"
    });

  } catch (error) {
    console.error("Verify Registration OTP error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendEmailOTP = async (req, res) => {
  try {
    const { email, type = 'login' } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user && type === 'login') {
      return res.status(404).json({ success: false, message: "Email not registered" });
    }

    const otp = generateOTP();
    console.log(`📧 Email OTP for ${email}: ${otp}`);

    await saveOTP(email, null, otp, type);

    const name = user ? user.name : email.split('@')[0];
    await sendEmailOTPCode(email, name, otp, type);

    res.json({
      success: true,
      message: `OTP sent to ${email}`,
      method: 'email',
      devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error("Send Email OTP error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendSMSOTP = async (req, res) => {
  try {
    const { mobile, type = 'login' } = req.body;

    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    const user = await User.findOne({ 
      $or: [
        { contactNo: { $regex: cleanMobile + '$', $options: 'i' } },
        { phone: { $regex: cleanMobile + '$', $options: 'i' } }
      ]
    });

    if (!user && type === 'login') {
      return res.status(404).json({ success: false, message: "Mobile number not registered" });
    }

    const otp = generateOTP();
    console.log(`📱 SMS OTP for ${mobile}: ${otp}`);

    await saveOTP(null, cleanMobile, otp, type);

    await sendSMSOTPCode(mobile, otp, type);

    res.json({
      success: true,
      message: `OTP sent to ${mobile}`,
      method: 'mobile',
      devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error("Send SMS OTP error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, mobile, otp, method = 'email', type = 'login' } = req.body;

    if ((!email && !mobile) || !otp) {
      return res.status(400).json({ success: false, message: "Email/Mobile and OTP are required" });
    }

    let isValid = false;
    let user = null;

    if (method === 'email') {
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        otp: otp,
        type: type
      });

      if (!otpRecord) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }

      if (new Date() > otpRecord.expiresAt) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, message: "OTP has expired" });
      }

      isValid = true;
      user = await User.findOne({ email: email.toLowerCase() });
      await OTP.deleteOne({ _id: otpRecord._id });
    } 
    else if (method === 'mobile') {
      const cleanMobile = mobile.replace(/\D/g, '');
      const otpRecord = await OTP.findOne({
        mobile: cleanMobile,
        otp: otp,
        type: type
      });

      if (!otpRecord) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }

      if (new Date() > otpRecord.expiresAt) {
        await OTP.deleteOne({ _id: otpRecord._id });
        return res.status(400).json({ success: false, message: "OTP has expired" });
      }

      isValid = true;
      user = await User.findOne({ 
        $or: [
          { contactNo: { $regex: cleanMobile + '$', $options: 'i' } },
          { phone: { $regex: cleanMobile + '$', $options: 'i' } }
        ]
      });
      await OTP.deleteMany({ mobile: cleanMobile, type: type });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const token = generateToken(user);
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        contactNo: user.contactNo,
        organization: user.organization
      }
    });

  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, contactNo, department, organization, dateOfBirth } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: password,
      role: role || "Manager",
      department: department || 'Purchase',
      contactNo: contactNo || '',
      phone: contactNo || '',
      organization: organization || 'Radiant Appliances',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
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
        role: user.role,
        department: user.department,
        contactNo: user.contactNo,
        organization: user.organization,
        dateOfBirth: user.dateOfBirth
      }
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user);
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        contactNo: user.contactNo,
        organization: user.organization
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("Get Me error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Placeholder functions
exports.sendForgotPasswordOTP = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};

exports.resendForgotPasswordOTP = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};

exports.verifyOTPAndResetPassword = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};