const PrNpp = require('../models/prNpp.model');
const { sendMail } = require('../services/mail.service');
const { generateBeautifulPDF } = require('../services/pdf.service');

// Send PR NPP Created Email
const sendPRNppCreatedEmail = async (prData) => {
  const subject = `📋 New PR Request: ${prData.titleOfActivity || 'PR Request'}`;
  
  console.log(`📧 Sending PR NPP Created Email to: ${prData.emailId}`);
  if (prData.ccList && prData.ccList.length > 0) {
    console.log(`📧 CC recipients: ${prData.ccList.join(', ')}`);
  }
  
  let pdfBuffer = null;
  try {
    pdfBuffer = await generateBeautifulPDF(prData);
  } catch (pdfErr) {
    console.error('PDF generation error:', pdfErr.message);
  }
  
  return await sendMail({
    to: prData.emailId,
    cc: prData.ccList || [],
    subject: subject,
    prRequestData: prData,
    action: 'created',
    actor: null,
    nextApprover: null,
    attachments: pdfBuffer ? [{
      filename: `PR_${prData._id || Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  });
};

// Send PR NPP Approved Email
const sendPRNppApprovedEmail = async (prData, approver) => {
  const subject = `✅ PR Request Approved: ${prData.titleOfActivity || 'PR Request'}`;
  
  let pdfBuffer = null;
  try {
    pdfBuffer = await generateBeautifulPDF(prData);
  } catch (pdfErr) {
    console.error('PDF generation error:', pdfErr.message);
  }
  
  return await sendMail({
    to: prData.emailId,
    cc: prData.ccList || [],
    subject: subject,
    prRequestData: prData,
    action: 'approved',
    actor: approver,
    nextApprover: null,
    attachments: pdfBuffer ? [{
      filename: `PR_${prData._id || Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  });
};

// Send PR NPP Rejected Email
const sendPRNppRejectedEmail = async (prData, approver) => {
  const subject = `❌ PR Request Rejected: ${prData.titleOfActivity || 'PR Request'}`;
  
  let pdfBuffer = null;
  try {
    pdfBuffer = await generateBeautifulPDF(prData);
  } catch (pdfErr) {
    console.error('PDF generation error:', pdfErr.message);
  }
  
  return await sendMail({
    to: prData.emailId,
    cc: prData.ccList || [],
    subject: subject,
    prRequestData: prData,
    action: 'rejected',
    actor: approver,
    nextApprover: null,
    attachments: pdfBuffer ? [{
      filename: `PR_${prData._id || Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  });
};

// Create PR NPP
const createPrNpp = async (req, res) => {
  try {
    console.log("📥 Received PR NPP data:", JSON.stringify(req.body, null, 2));
    
    const {
      requesterName, department, emailId, requestDate, contactNo, organization,
      titleOfActivity, purposeAndObjective, vendor, amount, remarks, priority,
      items, stakeholders, ccList, attachments, source, status
    } = req.body;

    if (!requesterName) {
      return res.status(400).json({ success: false, message: "Requester name is required" });
    }

    const newPr = new PrNpp({
      requesterName,
      department,
      emailId,
      requestDate: requestDate || new Date().toISOString().split('T')[0],
      contactNo,
      organization: organization || 'Radiant Appliances',
      titleOfActivity,
      purposeAndObjective,
      vendor,
      amount: amount || 0,
      remarks,
      priority: priority || 'M',
      items: items || [],
      stakeholders: stakeholders || [],
      ccList: ccList || [],
      attachments: attachments || [],
      source: source || 'PR-REQUEST-NPP',
      status: status || 'Pending'
    });

    const savedPr = await newPr.save();
    console.log("✅ PR NPP saved successfully:", savedPr._id);

    try {
      await sendPRNppCreatedEmail(savedPr);
      console.log("📧 PR NPP email sent successfully");
    } catch (emailErr) {
      console.error('⚠️ Email sending error:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'PR NPP created successfully',
      data: savedPr
    });
  } catch (err) {
    console.error("❌ Error in createPrNpp:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all PR NPP
const listPrNpp = async (req, res) => {
  try {
    const rows = await PrNpp.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single PR NPP
const getPrNpp = async (req, res) => {
  try {
    const row = await PrNpp.findById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update PR NPP
const updatePrNpp = async (req, res) => {
  try {
    const updated = await PrNpp.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete PR NPP
const deletePrNpp = async (req, res) => {
  try {
    const deleted = await PrNpp.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    res.json({ success: true, message: "PR NPP deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve PR NPP
const approvePrNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userName = req.user?.name || 'Approver';
    
    const pr = await PrNpp.findById(id);
    if (!pr) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    
    if (pr.stakeholders && pr.stakeholders.length > 0) {
      const pendingApprover = pr.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Approved';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
      const remainingPending = pr.stakeholders.filter(s => s.status === 'Pending');
      pr.status = remainingPending.length === 0 ? 'Approved' : 'In-Process';
    } else {
      pr.status = 'Approved';
    }
    
    pr.approvedAt = new Date();
    pr.approvedBy = userName;
    pr.approvalComments = comments;
    await pr.save();
    
    try {
      await sendPRNppApprovedEmail(pr, { name: userName, remarks: comments });
    } catch (emailErr) {
      console.error('Approval email error:', emailErr.message);
    }
    
    res.json({ success: true, message: "PR NPP approved", data: pr });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject PR NPP
const rejectPrNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userName = req.user?.name || 'Rejecter';
    
    const pr = await PrNpp.findById(id);
    if (!pr) {
      return res.status(404).json({ success: false, message: "PR NPP not found" });
    }
    
    if (pr.stakeholders && pr.stakeholders.length > 0) {
      const pendingApprover = pr.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Rejected';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
    }
    
    pr.status = 'Rejected';
    pr.rejectedAt = new Date();
    pr.rejectedBy = userName;
    pr.rejectionComments = comments;
    await pr.save();
    
    try {
      await sendPRNppRejectedEmail(pr, { name: userName, remarks: comments });
    } catch (emailErr) {
      console.error('Rejection email error:', emailErr.message);
    }
    
    res.json({ success: true, message: "PR NPP rejected", data: pr });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createPrNpp,
  listPrNpp,
  getPrNpp,
  updatePrNpp,
  deletePrNpp,
  approvePrNpp,
  rejectPrNpp
};