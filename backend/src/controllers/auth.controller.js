const User = require("../models/user");
const OTP = require("../models/otp.model");
const EPRequest = require("../models/request");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require('resend');

// ==================== INITIALIZE RESEND FOR EMAIL ====================
let resend = null;
let isResendConfigured = false;

try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    isResendConfigured = true;
    console.log('✅ Resend initialized for Email');
  } else {
    console.log('⚠️ Resend API key missing. Email OTP will use console fallback.');
  }
} catch (error) {
  console.log('⚠️ Resend initialization error:', error.message);
}

// ==================== HELPER FUNCTIONS ====================

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, rights: user.rights || {} },
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

// ==================== EMAIL FUNCTIONS WITH RESEND ====================

const sendEmailWithResend = async (to, subject, html, text, ccList = []) => {
  try {
    if (!resend || !isResendConfigured) {
      console.log(`📧 [FALLBACK] Email would be sent to: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML Preview: ${html?.substring(0, 200)}...`);
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

    console.log('✅ Email sent via Resend:', data?.id);
    return { success: true, data: data };
  } catch (error) {
    console.error('❌ Email send error:', error);
    console.log(`📧 [FALLBACK] Email would be sent to: ${to}`);
    return { success: true, fallback: true };
  }
};

const sendEmailOTPCode = async (email, name, otp, type, ccList = []) => {
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

  return await sendEmailWithResend(email, subject, html, text, ccList);
};

// ==================== EP APPROVAL EMAIL ====================

const generateEPApprovalEmailHTML = (epData) => {
  const approverRows = (epData.stakeholders || []).map((a, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${a.line || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${a.name || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${a.designation || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${a.email || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
        <span style="padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${a.status === 'Approved' ? '#d1fae5' : a.status === 'Rejected' ? '#fee2e2' : '#fef3c7'};color:${a.status === 'Approved' ? '#10b981' : a.status === 'Rejected' ? '#ef4444' : '#d97706'};">
          ${a.status || 'Pending'}
        </span>
      </td>
    </tr>
  `).join('');

  const attachmentRows = (epData.attachments || []).map((att, i) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${att.name || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${att.fileSize || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${att.remark || ''}</td>
    </tr>
  `).join('');

  const ccRows = (epData.ccList || []).map(cc => `
    <tr><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">${cc}</td></tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>EP Approval Request - ${epData.title || ''}</title>
    </head>
    <body style="font-family:Arial,sans-serif;margin:0;padding:20px;background:#f4f6f9;color:#1e293b;">
      <div style="max-width:900px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.1);">
        
        <div style="background:linear-gradient(135deg,#0f2a5e,#1e4a8a);padding:28px 32px;color:white;">
          <h1 style="margin:0 0 6px;font-size:22px;">EP Approval Request</h1>
          <p style="margin:0;opacity:0.8;font-size:13px;">Radiant Appliances &bull; ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:140px;padding:10px 16px;background:#f8fafc;font-weight:700;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">Requester</td>
            <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">${epData.requester || ''}</td>
            <td style="width:140px;padding:10px 16px;background:#f8fafc;font-weight:700;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">Request Date</td>
            <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">${epData.requestDate || ''}</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;background:#f8fafc;font-weight:700;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">Department</td>
            <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">${epData.department || ''}</td>
            <td style="padding:10px 16px;background:#f8fafc;font-weight:700;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">Contact No.</td>
            <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">${epData.contactNo || ''}</td>
          </tr>
          <tr>
            <td style="padding:10px 16px;background:#f8fafc;font-weight:700;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">Email ID</td>
            <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">${epData.email || ''}</td>
            <td style="padding:10px 16px;background:#f8fafc;font-weight:700;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0;">Organization</td>
            <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;">${epData.organization || ''}</td>
          </tr>
        </table>

        <div style="padding:20px 24px;background:#f0f4ff;border-bottom:1px solid #e2e8f0;">
          <h3 style="margin:0 0 12px;color:#0f2a5e;font-size:15px;border-left:4px solid #0f2a5e;padding-left:10px;">Activity Overview</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="width:140px;padding:6px 0;font-weight:700;font-size:13px;color:#475569;">Title:</td>
              <td style="padding:6px 0;font-size:13px;">${epData.title || ''}</td>
              <td style="width:140px;padding:6px 0;font-weight:700;font-size:13px;color:#475569;">Vendor:</td>
              <td style="padding:6px 0;font-size:13px;">${epData.vendor || ''}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-weight:700;font-size:13px;color:#475569;">Amount:</td>
              <td style="padding:6px 0;font-size:13px;font-weight:700;color:#1e40af;">₹${Number(epData.amount || 0).toLocaleString('en-IN')}</td>
              <td style="padding:6px 0;font-weight:700;font-size:13px;color:#475569;">Priority:</td>
              <td style="padding:6px 0;font-size:13px;">
                <span style="padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${epData.priority === 'High' || epData.priority === 'Urgent' ? '#fee2e2' : epData.priority === 'Low' ? '#ecfdf5' : '#fef3c7'};color:${epData.priority === 'High' || epData.priority === 'Urgent' ? '#ef4444' : epData.priority === 'Low' ? '#10b981' : '#d97706'};">
                  ${epData.priority || 'Medium'}
                </span>
              </td>
            </tr>
          </table>
          ${epData.description ? `<p style="margin:10px 0 4px;font-weight:700;color:#475569;font-size:13px;">Description / Purpose:</p><p style="margin:0;font-size:13px;">${epData.description}</p>` : ''}
          ${epData.objective ? `<p style="margin:10px 0 4px;font-weight:700;color:#475569;font-size:13px;">Objective:</p><p style="margin:0;font-size:13px;">${epData.objective}</p>` : ''}
        </div>

        <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
          <h3 style="margin:0 0 12px;color:#0f2a5e;font-size:15px;border-left:4px solid #0f2a5e;padding-left:10px;">Approval Chain</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">#</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Line</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Stakeholder</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Designation</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Email</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Status</th>
              </tr>
            </thead>
            <tbody>${approverRows}</tbody>
          </table>
        </div>

        ${(epData.attachments || []).length > 0 ? `
        <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
          <h3 style="margin:0 0 12px;color:#0f2a5e;font-size:15px;border-left:4px solid #0f2a5e;padding-left:10px;">Attachments</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">S.No.</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Attachment</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">File Size</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Remark</th>
              </tr>
            </thead>
            <tbody>${attachmentRows}</tbody>
          </table>
        </div>` : ''}

        ${(epData.ccList || []).length > 0 ? `
        <div style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
          <h3 style="margin:0 0 12px;color:#0f2a5e;font-size:15px;border-left:4px solid #0f2a5e;padding-left:10px;">CC Recipients</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Mail ID</th>
              </tr>
            </thead>
            <tbody>${ccRows}</tbody>
          </table>
        </div>` : ''}

        <div style="padding:14px 24px;background:#0f2a5e;color:rgba(255,255,255,0.7);font-size:11px;text-align:center;">
          This document was auto-generated by Radiant Appliances EP Approval System on ${new Date().toLocaleString('en-IN')}
        </div>
      </div>
    </body>
    </html>
  `;
};

// ==================== REGISTRATION OTP ====================

exports.sendRegistrationOTP = async (req, res) => {
  try {
    const { email, ccEmails } = req.body;

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

    let ccArray = [];
    if (ccEmails) {
      if (typeof ccEmails === 'string') {
        ccArray = ccEmails.split(',').map(e => e.trim()).filter(e => e);
      } else if (Array.isArray(ccEmails)) {
        ccArray = ccEmails.filter(e => e && e.trim());
      }
    }

    const name = email.split('@')[0];
    await sendEmailOTPCode(email, name, otp, 'registration', ccArray);

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

// ==================== SEND EMAIL OTP (LOGIN) ====================

exports.sendEmailOTP = async (req, res) => {
  try {
    const { email, type = 'login', ccEmails } = req.body;

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

    let ccArray = [];
    if (ccEmails) {
      if (typeof ccEmails === 'string') {
        ccArray = ccEmails.split(',').map(e => e.trim()).filter(e => e);
      } else if (Array.isArray(ccEmails)) {
        ccArray = ccEmails.filter(e => e && e.trim());
      }
    }

    const name = user ? user.name : email.split('@')[0];
    await sendEmailOTPCode(email, name, otp, type, ccArray);

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

// ==================== VERIFY OTP ====================

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, method = 'email', type = 'login' } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
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
        organization: user.organization,
        rights: user.rights || {}
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
    const { name, email, password, role, contactNo, department, organization, dateOfBirth } = req.body;

    console.log("📤 Register request:", { name, email, role });

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "User",
      department: department || 'Purchase',
      contactNo: contactNo || '',
      organization: organization || 'Radiant Appliances',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      rights: {}
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
        rights: user.rights || {}
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

    console.log("📤 Login request for:", email);

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
        organization: user.organization,
        rights: user.rights || {}
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

// ==================== REFRESH USER SESSION ====================

exports.refreshUserSession = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    const newToken = generateToken(user);
    
    res.json({
      success: true,
      message: "Session refreshed successfully",
      token: newToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        contactNo: user.contactNo,
        organization: user.organization,
        rights: user.rights || {}
      }
    });
  } catch (error) {
    console.error("Refresh session error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET DEPARTMENTS DROPDOWN ====================

exports.getDepartments = async (req, res) => {
  try {
    const departments = [
      'Purchase', 'IT', 'Finance', 'HR', 'Operations', 'Production',
      'Quality', 'Logistics', 'Sales', 'Marketing', 'R&D', 'Admin',
      'Legal', 'Supply Chain', 'Engineering'
    ];

    // Also get unique departments from users
    const userDepts = await User.distinct('department');
    const allDepts = [...new Set([...departments, ...userDepts.filter(Boolean)])].sort();

    res.json({
      success: true,
      departments: allDepts
    });
  } catch (error) {
    console.error("Get departments error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET MANAGERS DROPDOWN ====================

exports.getManagers = async (req, res) => {
  try {
    const managers = await User.find(
      { role: { $in: ['Admin', 'Manager', 'VP', 'GM', 'Director', 'MD'] } },
      'name email role department'
    ).lean();

    // Also include hardcoded default approvers
    const defaultApprovers = [
      { name: 'Vijay Parashar', email: 'vijay.parashar@radiant.com', designation: 'Manager', department: 'Purchase' },
      { name: 'Ravib', email: 'ravib@radiant.com', designation: 'A-GM', department: 'Operations' },
      { name: 'Shailendra Chothe', email: 'shailendra.chothe@radiant.com', designation: 'VP', department: 'Finance' },
      { name: 'Sanjay Munshi', email: 'sanjay.munshi@radiant.com', designation: 'S-VP', department: 'Operations' },
      { name: 'Wang Xianwen', email: 'wang.xianwen@radiant.com', designation: 'GM', department: 'General' },
      { name: 'Raminder Singh', email: 'raminder.singh@radiant.com', designation: 'MD', department: 'General' }
    ];

    res.json({
      success: true,
      managers: managers.length > 0 ? managers.map(m => ({
        name: m.name,
        email: m.email,
        designation: m.role,
        department: m.department
      })) : defaultApprovers,
      defaultApprovers
    });
  } catch (error) {
    console.error("Get managers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== CREATE EP REQUEST ====================

exports.createEPRequest = async (req, res) => {
  try {
    const {
      requester, department, email, contactNo, organization,
      title, amount, vendor, priority, description, objective,
      requestDate, stakeholders, ccList, attachments
    } = req.body;

    if (!title || !amount || !vendor || !email) {
      return res.status(400).json({ success: false, message: "Title, amount, vendor and email are required" });
    }

    // Determine initial status based on stakeholders
    const validStakeholders = (stakeholders || []).filter(s => s.name && s.email);
    const initialStatus = validStakeholders.length > 0 ? 'In-Process' : 'Pending';

    // Try to use EPRequest model if it exists, otherwise use a basic object
    let epRequest;
    try {
      epRequest = new EPRequest({
        requester: requester || '',
        department: department || '',
        email: email || '',
        contactNo: contactNo || '',
        organization: organization || 'Radiant Appliances',
        title,
        amount: Number(amount),
        vendor,
        priority: priority || 'Medium',
        description: description || '',
        objective: objective || '',
        requestDate: requestDate || new Date().toISOString().split('T')[0],
        status: initialStatus,
        stakeholders: validStakeholders.map((s, i) => ({
          ...s,
          approvalOrder: s.approvalOrder || i + 1,
          status: 'Pending'
        })),
        ccList: ccList || [],
        attachments: (attachments || []).map(att => ({
          name: att.name,
          fileSize: att.fileSize,
          remark: att.remark,
          fileUrl: att.fileUrl || ''
        })),
        createdBy: req.user ? req.user.id : null
      });
      await epRequest.save();
    } catch (modelErr) {
      console.error('EPRequest model error:', modelErr);
      return res.status(500).json({ success: false, message: 'EP Request model not found. Please check your request.js model.' });
    }

    // Send emails to CC list with EP form
    if (ccList && ccList.length > 0) {
      const emailHtml = generateEPApprovalEmailHTML({
        ...req.body,
        status: initialStatus,
        stakeholders: validStakeholders
      });

      const emailText = `EP Approval Request: ${title} | Amount: ₹${Number(amount).toLocaleString('en-IN')} | Priority: ${priority || 'Medium'}`;

      for (const ccEmail of ccList) {
        try {
          await sendEmailWithResend(
            ccEmail,
            `EP Approval Request: ${title} - ${requester || email}`,
            emailHtml,
            emailText
          );
          console.log(`✅ EP email sent to CC: ${ccEmail}`);
        } catch (emailErr) {
          console.error(`❌ Failed to send email to ${ccEmail}:`, emailErr);
        }
      }
    }

    // Notify first stakeholder in approval chain
    if (validStakeholders.length > 0) {
      const firstApprover = validStakeholders.sort((a, b) => (a.approvalOrder || 0) - (b.approvalOrder || 0))[0];
      if (firstApprover && firstApprover.email) {
        const approverHtml = generateEPApprovalEmailHTML({ ...req.body, stakeholders: validStakeholders });
        await sendEmailWithResend(
          firstApprover.email,
          `Action Required: EP Approval Request - ${title}`,
          approverHtml,
          `You have a pending EP approval request: ${title}`
        );
      }
    }

    res.status(201).json({
      success: true,
      message: `EP Request created successfully!${ccList?.length > 0 ? ` Email notifications sent to ${ccList.length} CC recipient(s).` : ''}`,
      data: { ...epRequest.toObject(), id: epRequest._id }
    });

  } catch (error) {
    console.error("Create EP Request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET ALL EP REQUESTS ====================

exports.getAllEPRequests = async (req, res) => {
  try {
    const { department, status, priority, startDate, endDate, vendor } = req.query;

    let filter = {};
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (vendor) filter.vendor = { $regex: vendor, $options: 'i' };
    if (startDate || endDate) {
      filter.requestDate = {};
      if (startDate) filter.requestDate.$gte = startDate;
      if (endDate) filter.requestDate.$lte = endDate;
    }

    const epRequests = await EPRequest.find(filter).sort({ createdAt: -1 }).lean();

    const data = epRequests.map(req => ({
      ...req,
      id: req._id
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error("Get EP Requests error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET EP REQUEST BY ID ====================

exports.getEPRequestById = async (req, res) => {
  try {
    const epRequest = await EPRequest.findById(req.params.id).lean();
    if (!epRequest) {
      return res.status(404).json({ success: false, message: "EP Request not found" });
    }
    res.json({ success: true, data: { ...epRequest, id: epRequest._id } });
  } catch (error) {
    console.error("Get EP Request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== UPDATE EP REQUEST ====================

exports.updateEPRequest = async (req, res) => {
  try {
    const epRequest = await EPRequest.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!epRequest) {
      return res.status(404).json({ success: false, message: "EP Request not found" });
    }

    res.json({ success: true, message: "EP Request updated successfully", data: epRequest });
  } catch (error) {
    console.error("Update EP Request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== DELETE EP REQUEST ====================

exports.deleteEPRequest = async (req, res) => {
  try {
    const epRequest = await EPRequest.findByIdAndDelete(req.params.id);
    if (!epRequest) {
      return res.status(404).json({ success: false, message: "EP Request not found" });
    }
    res.json({ success: true, message: "EP Request deleted successfully" });
  } catch (error) {
    console.error("Delete EP Request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== APPROVE EP REQUEST ====================

exports.approveEPRequest = async (req, res) => {
  try {
    const { comments } = req.body;
    const userEmail = req.user ? req.user.email : null;

    const epRequest = await EPRequest.findById(req.params.id);
    if (!epRequest) {
      return res.status(404).json({ success: false, message: "EP Request not found" });
    }

    // Find the current pending approver
    const pendingApprovers = epRequest.stakeholders
      .filter(s => s.status === 'Pending')
      .sort((a, b) => (a.approvalOrder || 0) - (b.approvalOrder || 0));

    if (pendingApprovers.length === 0) {
      return res.status(400).json({ success: false, message: "No pending approvers found" });
    }

    const currentApprover = pendingApprovers[0];

    // Update the current approver's status
    const approverIndex = epRequest.stakeholders.findIndex(
      s => s.email === currentApprover.email && s.status === 'Pending'
    );

    if (approverIndex !== -1) {
      epRequest.stakeholders[approverIndex].status = 'Approved';
      epRequest.stakeholders[approverIndex].remarks = comments || '';
      epRequest.stakeholders[approverIndex].dateTime = new Date().toISOString();
    }

    // Check if all approvers have approved
    const remainingPending = epRequest.stakeholders.filter(s => s.status === 'Pending');
    if (remainingPending.length === 0) {
      epRequest.status = 'Approved';
    } else {
      epRequest.status = 'In-Process';
    }

    await epRequest.save();

    // Send email notification to requester
    const approvalHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px;color:white;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;">✅ EP Request ${epRequest.status === 'Approved' ? 'Fully Approved' : 'Partially Approved'}</h2>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
          <p>Your EP Approval Request "<strong>${epRequest.title}</strong>" has been approved by <strong>${currentApprover.name}</strong>.</p>
          <p><strong>Comments:</strong> ${comments || 'No comments'}</p>
          <p><strong>Current Status:</strong> ${epRequest.status}</p>
          ${remainingPending.length > 0 ? `<p><strong>Next Approver:</strong> ${remainingPending[0].name} (${remainingPending[0].designation})</p>` : '<p>🎉 All approvals completed!</p>'}
        </div>
      </div>
    `;

    await sendEmailWithResend(
      epRequest.email,
      `EP Request ${epRequest.status === 'Approved' ? 'Approved' : 'Partially Approved'}: ${epRequest.title}`,
      approvalHtml,
      `Your EP request "${epRequest.title}" has been approved by ${currentApprover.name}.`
    );

    // Notify next approver if any
    if (remainingPending.length > 0) {
      const nextApprover = remainingPending[0];
      const nextApproverHtml = generateEPApprovalEmailHTML(epRequest.toObject());
      await sendEmailWithResend(
        nextApprover.email,
        `Action Required: EP Approval Request - ${epRequest.title}`,
        nextApproverHtml,
        `You have a pending EP approval request: ${epRequest.title}`
      );
    }

    res.json({
      success: true,
      message: epRequest.status === 'Approved'
        ? '✅ Request fully approved! All stakeholders notified.'
        : `✅ Approval recorded. Next approver (${remainingPending[0]?.name}) has been notified.`,
      data: epRequest
    });
  } catch (error) {
    console.error("Approve EP Request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== REJECT EP REQUEST ====================

exports.rejectEPRequest = async (req, res) => {
  try {
    const { comments } = req.body;

    const epRequest = await EPRequest.findById(req.params.id);
    if (!epRequest) {
      return res.status(404).json({ success: false, message: "EP Request not found" });
    }

    const pendingApprovers = epRequest.stakeholders
      .filter(s => s.status === 'Pending')
      .sort((a, b) => (a.approvalOrder || 0) - (b.approvalOrder || 0));

    const currentApprover = pendingApprovers[0];

    if (currentApprover) {
      const approverIndex = epRequest.stakeholders.findIndex(
        s => s.email === currentApprover.email && s.status === 'Pending'
      );
      if (approverIndex !== -1) {
        epRequest.stakeholders[approverIndex].status = 'Rejected';
        epRequest.stakeholders[approverIndex].remarks = comments || '';
        epRequest.stakeholders[approverIndex].dateTime = new Date().toISOString();
      }
    }

    epRequest.status = 'Rejected';
    await epRequest.save();

    // Notify requester of rejection
    const rejectionHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:24px;color:white;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;">❌ EP Request Rejected</h2>
        </div>
        <div style="padding:24px;background:white;border:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
          <p>Your EP Approval Request "<strong>${epRequest.title}</strong>" has been rejected by <strong>${currentApprover?.name || 'Approver'}</strong>.</p>
          <p><strong>Reason:</strong> ${comments || 'No reason provided'}</p>
          <p>Please review and resubmit if necessary.</p>
        </div>
      </div>
    `;

    await sendEmailWithResend(
      epRequest.email,
      `EP Request Rejected: ${epRequest.title}`,
      rejectionHtml,
      `Your EP request "${epRequest.title}" has been rejected. Reason: ${comments}`
    );

    res.json({
      success: true,
      message: '❌ Request rejected. Requester has been notified.',
      data: epRequest
    });
  } catch (error) {
    console.error("Reject EP Request error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET EP REQUEST STATS ====================

exports.getEPRequestStats = async (req, res) => {
  try {
    const total = await EPRequest.countDocuments();
    const pending = await EPRequest.countDocuments({ status: 'Pending' });
    const approved = await EPRequest.countDocuments({ status: 'Approved' });
    const rejected = await EPRequest.countDocuments({ status: 'Rejected' });
    const inProcess = await EPRequest.countDocuments({ status: 'In-Process' });

    const departmentStats = await EPRequest.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      stats: { total, pending, approved, rejected, inProcess },
      departmentStats
    });
  } catch (error) {
    console.error("Get EP stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== SEND EP REQUEST PDF EMAIL ====================

exports.sendEPRequestEmail = async (req, res) => {
  try {
    const { toEmails, ccEmails, epData } = req.body;

    if (!toEmails || !toEmails.length) {
      return res.status(400).json({ success: false, message: "Recipient emails required" });
    }

    const emailHtml = generateEPApprovalEmailHTML(epData);
    const emailText = `EP Approval Request: ${epData.title} | Amount: ₹${Number(epData.amount || 0).toLocaleString('en-IN')}`;

    const results = [];
    for (const toEmail of toEmails) {
      const result = await sendEmailWithResend(
        toEmail,
        `EP Approval Request: ${epData.title}`,
        emailHtml,
        emailText,
        ccEmails || []
      );
      results.push({ email: toEmail, ...result });
    }

    res.json({
      success: true,
      message: `Email sent to ${toEmails.length} recipient(s)`,
      results
    });
  } catch (error) {
    console.error("Send EP email error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== FORGOT PASSWORD PLACEHOLDERS ====================

exports.sendForgotPasswordOTP = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};

exports.resendForgotPasswordOTP = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};

exports.verifyOTPAndResetPassword = async (req, res) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};