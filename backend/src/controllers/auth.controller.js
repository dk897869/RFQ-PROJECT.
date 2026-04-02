const User = require("../models/user");
const OTP = require("../models/otp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require('resend');
const twilio = require('twilio');

// ==================== INITIALIZE SERVICES ====================

// Initialize Resend for Email
const resend = new Resend(process.env.RESEND_API_KEY);
let isResendConfigured = false;

try {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_Pxyn7kKL_99SxAz2eWj32n9FcTLDfpG5e') {
    isResendConfigured = true;
    console.log('✅ Resend initialized for Email');
  } else {
    console.log('⚠️ Resend using default API key');
    isResendConfigured = true; // Still true as we have the key
  }
} catch (error) {
  console.log('⚠️ Resend initialization error:', error.message);
}

// Initialize Twilio for SMS
let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio initialized for SMS');
  } else {
    console.log('⚠️ Twilio not configured');
  }
} catch (error) {
  console.log('⚠️ Twilio initialization error:', error.message);
}

// ==================== HELPER FUNCTIONS ====================

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Save OTP to database
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

// ==================== EMAIL FUNCTIONS (Resend) ====================

// Send Email using Resend
const sendEmail = async (to, subject, html, text, ccList = []) => {
  try {
    console.log(`📧 Sending email to: ${to}`);
    if (ccList && ccList.length > 0) {
      console.log(`📧 CC to: ${ccList.join(', ')}`);
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
    return { success: false, error: error.message };
  }
};

// Send Email OTP
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

// ==================== SMS FUNCTIONS (Twilio) ====================

// Send SMS using Twilio
const sendSMS = async (to, message) => {
  try {
    if (!twilioClient) {
      console.log(`⚠️ Twilio not configured. SMS would be sent to: ${to}`);
      return { success: false, error: 'Twilio not configured' };
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
    return { success: false, error: error.message };
  }
};

// Send SMS OTP
const sendSMSOTPCode = async (phoneNumber, otp, type) => {
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

// ==================== REGISTRATION OTP (EMAIL) ====================

exports.sendRegistrationOTP = async (req, res) => {
  try {
    const { email, ccEmails } = req.body;

    console.log("📤 sendRegistrationOTP called for:", email);

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

    const otp = generateOTP();
    console.log(`🔐 Registration OTP for ${email}: ${otp}`);

    await saveOTP(email, null, otp, 'registration');

    // Parse CC emails
    let ccArray = [];
    if (ccEmails) {
      if (typeof ccEmails === 'string') {
        ccArray = ccEmails.split(',').map(e => e.trim()).filter(e => e);
      } else if (Array.isArray(ccEmails)) {
        ccArray = ccEmails.filter(e => e && e.trim());
      }
    }

    const name = email.split('@')[0];
    const result = await sendEmailOTPCode(email, name, otp, 'registration');

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "OTP sent successfully to your email" + (ccArray.length > 0 ? ` and CC'd to ${ccArray.length} recipient(s)` : ""),
      devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error("Send Registration OTP error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== VERIFY REGISTRATION OTP ====================

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
      otp: otp,
      type: 'registration'
    });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP" 
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ 
        success: false, 
        message: "OTP has expired. Please request a new one." 
      });
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

// ==================== SEND EMAIL OTP (LOGIN) ====================

exports.sendEmailOTP = async (req, res) => {
  try {
    const { email, type = 'login', ccEmails } = req.body;

    console.log("📤 sendEmailOTP called for:", email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Email not registered. Please register first." 
      });
    }

    const otp = generateOTP();
    console.log(`📧 Email OTP for ${email}: ${otp}`);

    await saveOTP(email, null, otp, type);

    // Parse CC emails
    let ccArray = [];
    if (ccEmails) {
      if (typeof ccEmails === 'string') {
        ccArray = ccEmails.split(',').map(e => e.trim()).filter(e => e);
      } else if (Array.isArray(ccEmails)) {
        ccArray = ccEmails.filter(e => e && e.trim());
      }
    }

    const result = await sendEmailOTPCode(email, user.name, otp, type);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

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

// ==================== SEND SMS OTP ====================

exports.sendSMSOTP = async (req, res) => {
  try {
    const { mobile, type = 'login' } = req.body;

    console.log("📤 sendSMSOTP called for:", mobile);

    if (!mobile) {
      return res.status(400).json({ 
        success: false, 
        message: "Mobile number is required" 
      });
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    
    // Check if user exists
    const user = await User.findOne({ 
      $or: [
        { contactNo: { $regex: cleanMobile + '$', $options: 'i' } },
        { phone: { $regex: cleanMobile + '$', $options: 'i' } }
      ]
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Mobile number not registered. Please register first." 
      });
    }

    const otp = generateOTP();
    console.log(`📱 SMS OTP for ${mobile}: ${otp}`);

    await saveOTP(null, cleanMobile, otp, type);

    const result = await sendSMSOTPCode(mobile, otp, type);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

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

// ==================== VERIFY OTP (BOTH EMAIL & SMS) ====================

exports.verifyOTP = async (req, res) => {
  try {
    const { email, mobile, otp, method = 'email', type = 'login' } = req.body;

    if ((!email && !mobile) || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email/Mobile and OTP are required" 
      });
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

// ==================== REGISTER USER ====================

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, contactNo, department, organization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "Manager",
      department: department || 'Purchase',
      contactNo: contactNo || '',
      phone: contactNo || '',
      organization: organization || 'Radiant Appliances'
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
        organization: user.organization
      }
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== LOGIN ====================

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

    const match = await bcrypt.compare(password, user.password);
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

// ==================== GET CURRENT USER ====================

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

// ==================== PLACEHOLDER FUNCTIONS ====================

exports.sendForgotPasswordOTP = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};

exports.resendForgotPasswordOTP = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};

exports.verifyOTPAndResetPassword = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};