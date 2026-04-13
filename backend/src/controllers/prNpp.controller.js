const PrNpp = require('../models/prNpp.model');
const { sendMail } = require('../services/mail.service');
const { buildPrNppPdfBuffer } = require('../utils/prNppPdf');

const SENIOR = new Set(['Admin', 'Manager', 'VP', 'GM', 'MD', 'Director', 'AGM', 'Approver']);

function canAct(user, doc) {
  if (!user || !doc) return false;
  if (user.rights?.nppProcurement || user.rights?.epApproval) return true;
  if (SENIOR.has(user.role)) return true;
  const u = (user.email || '').toLowerCase();
  return (doc.stakeholders || []).some(
    (s) => (s.email || '').toLowerCase() === u && (s.status === 'Pending' || s.status === 'In-Process')
  );
}

exports.createPrNpp = async (req, res) => {
  try {
    const body = req.body;
    if (!body.requester || !body.activityTitle || !body.email) {
      return res.status(400).json({ success: false, message: 'requester, activityTitle, email required' });
    }
    const stakeholders = (body.stakeholders || []).map((s, i) => ({
      ...s,
      approvalOrder: s.approvalOrder || i + 1,
      status: 'Pending',
    }));
    const pr = await PrNpp.create({
      ...body,
      email: body.email.toLowerCase(),
      stakeholders,
      status: 'In-Process',
      createdBy: req.user?._id,
    });

    let pdf;
    try {
      pdf = await buildPrNppPdfBuffer(pr);
    } catch (e) {
      console.error(e.message);
    }
    const html = `<p>PR (NPP): <strong>${pr.activityTitle}</strong></p><p>Status: ${pr.status}</p>`;
    await sendMail({
      to: pr.email,
      cc: pr.ccList?.length ? pr.ccList : undefined,
      subject: `PR (NPP): ${pr.activityTitle}`,
      html,
      text: pr.activityTitle,
      attachments: pdf
        ? [{ filename: 'PR-NPP.pdf', content: pdf, contentType: 'application/pdf' }]
        : [],
    });

    res.status(201).json({ success: true, data: pr });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.listPrNpp = async (req, res) => {
  try {
    const rows = await PrNpp.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getPrNpp = async (req, res) => {
  try {
    const row = await PrNpp.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.approvePrNpp = async (req, res) => {
  try {
    const doc = await PrNpp.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    if (['Approved', 'Rejected'].includes(doc.status)) {
      return res.status(400).json({ success: false, message: 'Already finalized' });
    }
    if (!canAct(req.user, doc)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const label = req.user.name || req.user.email;
    const now = new Date().toISOString();
    doc.stakeholders.forEach((s) => {
      if (s.status === 'Pending' || s.status === 'In-Process') {
        s.status = 'Approved';
        s.remarks = `${label}: ${req.body.comments || 'Approved'}`;
        s.dateTime = now;
      }
    });
    doc.status = 'Approved';
    await doc.save();
    let pdf;
    try {
      pdf = await buildPrNppPdfBuffer(doc);
    } catch (_) {}
    await sendMail({
      to: doc.email,
      cc: doc.ccList?.length ? doc.ccList : undefined,
      subject: `PR (NPP) Approved: ${doc.activityTitle}`,
      html: `<p>Approved by ${label}</p>`,
      attachments: pdf ? [{ filename: 'PR-NPP.pdf', content: pdf }] : [],
    });
    res.json({ success: true, toast: 'success', message: 'Approved', data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.rejectPrNpp = async (req, res) => {
  try {
    const doc = await PrNpp.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    if (['Approved', 'Rejected'].includes(doc.status)) {
      return res.status(400).json({ success: false, message: 'Already finalized' });
    }
    if (!canAct(req.user, doc)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const label = req.user.name || req.user.email;
    const now = new Date().toISOString();
    doc.stakeholders.forEach((s) => {
      if (s.status === 'Pending' || s.status === 'In-Process') {
        s.status = 'Rejected';
        s.remarks = `${label}: ${req.body.comments || 'Rejected'}`;
        s.dateTime = now;
      }
    });
    doc.status = 'Rejected';
    await doc.save();
    let pdf;
    try {
      pdf = await buildPrNppPdfBuffer(doc);
    } catch (_) {}
    await sendMail({
      to: doc.email,
      cc: doc.ccList?.length ? doc.ccList : undefined,
      subject: `PR (NPP) Rejected: ${doc.activityTitle}`,
      html: `<p>Rejected by ${label}</p>`,
      attachments: pdf ? [{ filename: 'PR-NPP.pdf', content: pdf }] : [],
    });
    res.json({ success: true, toast: 'error', message: 'Rejected', data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
