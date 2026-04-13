const { sendMail } = require('./mail.service');
const { buildEpPdfBuffer } = require('../utils/epPdf');
const { generateEPApprovalEmailHTML } = require('../templates/epApprovalEmail');

function toPlain(ep) {
  if (!ep) return {};
  return ep.toObject ? ep.toObject() : { ...ep };
}

async function sendEpMailWithPdf(epDoc, subject, textFallback) {
  const ep = toPlain(epDoc);
  const html = generateEPApprovalEmailHTML(ep);
  let pdf;
  try {
    pdf = await buildEpPdfBuffer(ep);
  } catch (e) {
    console.error('EP PDF build failed:', e.message);
    pdf = null;
  }

  const seenCc = new Set();
  const cc = (ep.ccList || [])
    .map((x) => (x || '').trim())
    .filter((x) => {
      if (!x) return false;
      const k = x.toLowerCase();
      if (seenCc.has(k)) return false;
      seenCc.add(k);
      return true;
    });
  const to = (ep.email || '').trim();
  if (!to) {
    console.warn('EP notify: no requester email');
    return { success: false, error: 'No requester email' };
  }

  const attachments = pdf
    ? [
        {
          filename: `EP-${ep._id || 'approval'}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ]
    : [];

  return sendMail({
    to,
    cc: cc.length ? cc : undefined,
    subject,
    html,
    text: textFallback || `${ep.title || 'EP'} — ${ep.status || ''}`,
    attachments,
  });
}

module.exports = { sendEpMailWithPdf, generateEPApprovalEmailHTML };
