const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');

// Initialize Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize SendGrid for Email
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid initialized');
}

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

/**
 * Send OTP via SMS using Twilio Verify API
 * @param {string} phoneNumber - Recipient's phone number (with country code)
 * @returns {Promise<object>}
 */
const sendSmsOtp = async (phoneNumber) => {
  try {
    // Format phone number - ensure it has country code
    let formattedNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      // Add +91 for India if no country code
      formattedNumber = `+91${phoneNumber.replace(/\D/g, '')}`;
    }

    console.log(`📱 Sending SMS OTP to: ${formattedNumber}`);

    const verification = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({
        to: formattedNumber,
        channel: 'sms'
      });

    console.log(`✅ SMS OTP sent. SID: ${verification.sid}, Status: ${verification.status}`);
    return { 
      success: true, 
      sid: verification.sid, 
      status: verification.status,
      to: formattedNumber
    };
  } catch (error) {
    console.error('❌ SMS OTP error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Verify OTP via SMS using Twilio Verify API
 * @param {string} phoneNumber - User's phone number
 * @param {string} code - OTP code entered by user
 * @returns {Promise<object>}
 */
const verifySmsOtp = async (phoneNumber, code) => {
  try {
    // Format phone number
    let formattedNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedNumber = `+91${phoneNumber.replace(/\D/g, '')}`;
    }

    console.log(`🔐 Verifying SMS OTP for: ${formattedNumber} with code: ${code}`);

    const verificationCheck = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: formattedNumber,
        code: code
      });

    const isValid = verificationCheck.status === 'approved';
    console.log(`✅ SMS OTP verification result: ${isValid ? 'APPROVED' : 'FAILED'}`);
    
    return { 
      success: true, 
      isValid, 
      status: verificationCheck.status,
      sid: verificationCheck.sid
    };
  } catch (error) {
    console.error('❌ SMS verification error:', error.message);
    return { success: false, isValid: false, error: error.message };
  }
};

/**
 * Send OTP via Email using SendGrid
 * @param {string} email - Recipient's email address
 * @param {string} name - User's name
 * @param {string} otp - OTP code
 * @param {string} type - Type of OTP (login, registration, reset)
 * @returns {Promise<object>}
 */
const sendEmailOtp = async (email, name, otp, type) => {
  try {
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
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f6f9; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #0f2a5e 0%, #1e4a8a 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; }
          .content { padding: 30px; }
          .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #0f2a5e; background: #f8fafc; padding: 15px; border-radius: 10px; font-family: monospace; text-align: center; display: inline-block; width: 100%; box-sizing: border-box; }
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
            <div class="otp-code">${otp}</div>
            <p>This OTP is valid for <strong>10 minutes</strong>.</p>
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

    const msg = {
      to: email,
      from: {
        email: process.env.FROM_EMAIL || 'noreply@lcgresolve.com',
        name: process.env.FROM_NAME || 'LCGC RFQ'
      },
      subject: subject,
      html: html,
      text: `Your OTP for ${title.toLowerCase()} is: ${otp}. Valid for 10 minutes.`
    };

    await sgMail.send(msg);
    console.log(`✅ Email OTP sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email OTP error:', error.response?.body || error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendSmsOtp,
  verifySmsOtp,
  sendEmailOtp
};