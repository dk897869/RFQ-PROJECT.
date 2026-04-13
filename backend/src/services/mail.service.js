const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const sgMail = require('@sendgrid/mail');

let transporter = null;
let resendClient = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.EMAIL_SECURE === 'true' ||
    port === 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return transporter;
}

function getFromAddress() {
  return (
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.FROM_EMAIL ||
    'noreply@localhost'
  );
}

/**
 * @param {object} opts
 * @param {string|string[]} opts.to
 * @param {string|string[]} [opts.cc]
 * @param {string|string[]} [opts.bcc]
 * @param {string} opts.subject
 * @param {string} [opts.html]
 * @param {string} [opts.text]
 * @param {{ filename: string, content: Buffer, contentType?: string }[]} [opts.attachments]
 */
async function sendMail(opts) {
  const { to, cc, bcc, subject, html, text, attachments } = opts;
  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (toList.length === 0) {
    return { success: false, error: 'No recipients' };
  }

  const from = getFromAddress();
  const normAttach =
    attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType || 'application/octet-stream',
    })) || [];

  const t = getTransporter();
  if (t) {
    try {
      await t.sendMail({
        from,
        to: toList,
        cc: cc?.length ? cc : undefined,
        bcc: bcc?.length ? bcc : undefined,
        subject,
        html,
        text: text || (html ? undefined : subject),
        attachments: normAttach,
      });
      return { success: true, via: 'smtp' };
    } catch (e) {
      console.error('SMTP send error:', e.message);
      return { success: false, error: e.message };
    }
  }

  if (process.env.RESEND_API_KEY) {
    try {
      if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
      const payload = {
        from,
        to: toList,
        subject,
        html: html || `<p>${text || subject}</p>`,
        text: text || '',
      };
      if (cc?.length) payload.cc = Array.isArray(cc) ? cc : [cc];
      if (normAttach.length) {
        payload.attachments = normAttach.map((a) => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content)
            ? a.content.toString('base64')
            : Buffer.from(a.content).toString('base64'),
        }));
      }
      const { data, error } = await resendClient.emails.send(payload);
      if (error) return { success: false, error: error.message || String(error) };
      return { success: true, via: 'resend', id: data?.id };
    } catch (e) {
      console.error('Resend error:', e.message);
      return { success: false, error: e.message };
    }
  }

  if (
    process.env.SENDGRID_API_KEY &&
    process.env.SENDGRID_API_KEY !== 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  ) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: toList,
        from: { email: from, name: process.env.FROM_NAME || 'RFQ' },
        cc: cc?.length ? cc : undefined,
        subject,
        html: html || `<p>${text || subject}</p>`,
        text: text || '',
        attachments: normAttach.map((a) => ({
          content: Buffer.isBuffer(a.content)
            ? a.content.toString('base64')
            : Buffer.from(a.content).toString('base64'),
          filename: a.filename,
          type: a.contentType,
        })),
      });
      return { success: true, via: 'sendgrid' };
    } catch (e) {
      console.error('SendGrid error:', e.message);
      return { success: false, error: e.message };
    }
  }

  console.log('[MAIL fallback — configure SMTP_HOST or RESEND_API_KEY]', {
    to: toList,
    subject,
    attachmentCount: normAttach.length,
  });
  return { success: true, via: 'console' };
}

module.exports = { sendMail, getFromAddress };
