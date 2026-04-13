const twilio = require('twilio');
const { sendMail } = require('./mail.service');

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return null;
  }
  twilioClient = twilio(sid, token);
  return twilioClient;
}

const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

const sendSmsOtp = async (phoneNumber) => {
  try {
    const client = getTwilioClient();
    if (!client || !VERIFY_SERVICE_SID) {
      console.warn('Twilio SMS: missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID');
      return { success: false, error: 'Twilio Verify is not configured' };
    }

    let formattedNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedNumber = `+91${phoneNumber.replace(/\D/g, '')}`;
    }

    console.log(`Sending SMS OTP to: ${formattedNumber}`);

    const verification = await client.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({
        to: formattedNumber,
        channel: 'sms',
      });

    return {
      success: true,
      sid: verification.sid,
      status: verification.status,
      to: formattedNumber,
    };
  } catch (error) {
    console.error('SMS OTP error:', error.message);
    return { success: false, error: error.message };
  }
};

const verifySmsOtp = async (phoneNumber, code) => {
  try {
    const client = getTwilioClient();
    if (!client || !VERIFY_SERVICE_SID) {
      return { success: false, isValid: false, error: 'Twilio Verify is not configured' };
    }

    let formattedNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedNumber = `+91${phoneNumber.replace(/\D/g, '')}`;
    }

    const verificationCheck = await client.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: formattedNumber,
        code: code,
      });

    const isValid = verificationCheck.status === 'approved';
    return {
      success: true,
      isValid,
      status: verificationCheck.status,
      sid: verificationCheck.sid,
    };
  } catch (error) {
    console.error('SMS verification error:', error.message);
    return { success: false, isValid: false, error: error.message };
  }
};

const sendEmailOtp = async (email, name, otp, type) => {
  let subject = '';
  let title = '';

  switch (type) {
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
          .content { padding: 30px; }
          .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #0f2a5e; background: #f8fafc; padding: 15px; border-radius: 10px; font-family: monospace; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>LCGC RFQ</h1></div>
          <div class="content">
            <h2 style="color: #0f2a5e;">${title}</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your OTP is:</p>
            <div class="otp-code">${otp}</div>
            <p>This OTP is valid for <strong>10 minutes</strong>.</p>
          </div>
        </div>
      </body>
      </html>
    `;

  const r = await sendMail({
    to: email,
    subject,
    html,
    text: `Your OTP for ${title.toLowerCase()} is: ${otp}. Valid for 10 minutes.`,
  });
  if (!r.success) {
    return { success: false, error: r.error || 'Email send failed' };
  }
  return { success: true };
};

module.exports = {
  sendSmsOtp,
  verifySmsOtp,
  sendEmailOtp,
};
