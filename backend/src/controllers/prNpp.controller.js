// backend/src/controllers/prNpp.controller.js

const PrNpp = require('../models/prNpp.model');
const { sendMail } = require('../services/mail.service');
const { generatePRSerial } = require('../services/serialNumber.service');

// Send PR Created Email
const sendPRCreatedEmail = async (prData) => {
  const subject = `📋 New PR Request Created: ${prData.titleOfActivity || 'PR Request'} (${prData.uniqueSerialNo})`;
  
  console.log(`📧 Sending PR creation email to: ${prData.emailId}`);
  console.log(`📧 CC recipients: ${prData.ccList?.join(', ') || 'None'}`);
  
  // Send to requester with CC
  await sendMail({
    to: prData.emailId,
    cc: prData.ccList || [],
    subject: subject,
    prRequestData: prData,
    action: 'created',
    actor: null,
    nextApprover: prData.stakeholders?.[0] || null
  });
  
  // Send to all stakeholders (approvers)
  if (prData.stakeholders && prData.stakeholders.length > 0) {
    for (const approver of prData.stakeholders) {
      if (approver.email && approver.email !== prData.emailId) {
        await sendMail({
          to: approver.email,
          subject: `🔔 Approval Required: ${prData.titleOfActivity || 'PR Request'} (${prData.uniqueSerialNo})`,
          prRequestData: prData,
          action: 'approval_needed',
          actor: { name: prData.requesterName },
          nextApprover: null
        });
        console.log(`📧 Approval request sent to: ${approver.email}`);
      }
    }
  }
};

// Send PR Approved Email
const sendPRApprovedEmail = async (prData, approver) => {
  const subject = `✅ PR Request Approved: ${prData.titleOfActivity || 'PR Request'} (${prData.uniqueSerialNo})`;
  
  await sendMail({
    to: prData.emailId,
    cc: prData.ccList || [],
    subject: subject,
    prRequestData: prData,
    action: 'approved',
    actor: approver,
    nextApprover: null
  });
};

// Send PR Rejected Email
const sendPRRejectedEmail = async (prData, approver) => {
  const subject = `❌ PR Request Rejected: ${prData.titleOfActivity || 'PR Request'} (${prData.uniqueSerialNo})`;
  
  await sendMail({
    to: prData.emailId,
    cc: prData.ccList || [],
    subject: subject,
    prRequestData: prData,
    action: 'rejected',
    actor: approver,
    nextApprover: null
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

    // Generate unique serial number
    const uniqueSerialNo = generatePRSerial();
    console.log(`📋 Generated PR Serial Number: ${uniqueSerialNo}`);

    const newPr = new PrNpp({
      uniqueSerialNo,
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
    console.log(`📋 PR Serial Number: ${savedPr.uniqueSerialNo}`);

    // Send emails
    try {
      await sendPRCreatedEmail(savedPr);
      console.log("📧 PR creation emails sent successfully");
    } catch (emailErr) {
      console.error('⚠️ Email sending error:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'PR NPP created successfully',
      serialNumber: savedPr.uniqueSerialNo,
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
      await sendPRApprovedEmail(pr, { name: userName, remarks: comments });
      console.log("📧 Approval email sent");
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
      await sendPRRejectedEmail(pr, { name: userName, remarks: comments });
      console.log("📧 Rejection email sent");
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