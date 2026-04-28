// backend/src/controllers/poNpp.controller.js

const PoNpp = require('../models/poNpp.model');
const { sendMail } = require('../services/mail.service');
const { generatePOSerial } = require('../services/serialNumber.service');

// Send PO Created Email
const sendPOCreatedEmail = async (poData) => {
  const subject = `📋 New PO Created: ${poData.orderNo || poData.titleOfActivity || 'Purchase Order'} (${poData.uniqueSerialNo})`;
  
  console.log(`📧 Sending PO creation email to: ${poData.emailId}`);
  console.log(`📧 CC recipients: ${poData.ccList?.join(', ') || 'None'}`);
  console.log(`📧 Vendor email: ${poData.vendorEmail || 'None'}`);
  
  // Send to requester with CC
  await sendMail({
    to: poData.emailId,
    cc: poData.ccList || [],
    subject: subject,
    poRequestData: poData,
    action: 'created',
    actor: null,
    nextApprover: poData.stakeholders?.[0] || null
  });
  
  // Send to vendor if email exists
  if (poData.vendorEmail) {
    await sendMail({
      to: poData.vendorEmail,
      subject: `New Purchase Order: ${poData.orderNo} (${poData.uniqueSerialNo})`,
      poRequestData: poData,
      action: 'created',
      actor: null,
      nextApprover: null
    });
    console.log(`📧 PO email sent to vendor: ${poData.vendorEmail}`);
  }
  
  // Send to all stakeholders (approvers)
  if (poData.stakeholders && poData.stakeholders.length > 0) {
    for (const approver of poData.stakeholders) {
      if (approver.email && approver.email !== poData.emailId) {
        await sendMail({
          to: approver.email,
          subject: `🔔 Approval Required: ${poData.orderNo || 'Purchase Order'} (${poData.uniqueSerialNo})`,
          poRequestData: poData,
          action: 'approval_needed',
          actor: { name: poData.purchaser || poData.requesterName },
          nextApprover: null
        });
        console.log(`📧 Approval request sent to: ${approver.email}`);
      }
    }
  }
};

// Send PO Approved Email
const sendPOApprovedEmail = async (poData, approver) => {
  const subject = `✅ PO Approved: ${poData.orderNo || poData.titleOfActivity || 'Purchase Order'} (${poData.uniqueSerialNo})`;
  
  await sendMail({
    to: poData.emailId,
    cc: poData.ccList || [],
    subject: subject,
    poRequestData: poData,
    action: 'approved',
    actor: approver,
    nextApprover: null
  });
  
  if (poData.vendorEmail) {
    await sendMail({
      to: poData.vendorEmail,
      subject: `Purchase Order Approved: ${poData.orderNo} (${poData.uniqueSerialNo})`,
      poRequestData: poData,
      action: 'approved',
      actor: approver,
      nextApprover: null
    });
  }
};

// Send PO Rejected Email
const sendPORejectedEmail = async (poData, approver) => {
  const subject = `❌ PO Rejected: ${poData.orderNo || poData.titleOfActivity || 'Purchase Order'} (${poData.uniqueSerialNo})`;
  
  await sendMail({
    to: poData.emailId,
    cc: poData.ccList || [],
    subject: subject,
    poRequestData: poData,
    action: 'rejected',
    actor: approver,
    nextApprover: null
  });
};

// Create PO NPP
const createPoNpp = async (req, res) => {
  try {
    console.log("📥 Received PO NPP data:", JSON.stringify(req.body, null, 2));
    
    const {
      requesterName, department, emailId, requestDate, contactNo, organization,
      titleOfActivity, purposeAndObjective, amount, remarks, priority,
      vendorCode, vendorName, vendorAddress, vendorGst, vendorContact, vendorEmail, vendorKindAttn,
      orderNo, orderDate, quotRef, prNo, prDate, purchaser, purchaserMobile,
      billingAddress, billingGst, shippingAddress, shippingGst,
      transporter, taxes, items, stakeholders, ccList, terms, financeRows, deliverySchedule,
      source, status
    } = req.body;

    if (!requesterName) {
      return res.status(400).json({ success: false, message: "Requester name is required" });
    }

    // Generate unique serial number
    const uniqueSerialNo = generatePOSerial();
    console.log(`📋 Generated PO Serial Number: ${uniqueSerialNo}`);

    const newPo = new PoNpp({
      uniqueSerialNo,
      requesterName,
      department,
      emailId,
      requestDate: requestDate || new Date().toISOString().split('T')[0],
      contactNo,
      organization: organization || 'Radiant Appliances',
      titleOfActivity: titleOfActivity || purposeAndObjective?.substring(0, 100) || '',
      purposeAndObjective,
      amount: amount || 0,
      remarks,
      priority: priority || 'M',
      vendorCode, vendorName, vendorAddress, vendorGst, vendorContact, vendorEmail, vendorKindAttn,
      orderNo: orderNo || `PO-${Date.now()}`,
      orderDate: orderDate || new Date().toISOString().split('T')[0],
      quotRef, prNo, prDate, purchaser, purchaserMobile,
      billingAddress, billingGst, shippingAddress, shippingGst,
      transporter, taxes,
      items: items || [],
      stakeholders: stakeholders || [],
      ccList: ccList || [],
      terms: terms || [],
      financeRows: financeRows || [],
      deliverySchedule: deliverySchedule || [],
      source: source || 'PO-NPP',
      status: status || 'Pending'
    });

    const savedPo = await newPo.save();
    console.log("✅ PO NPP saved successfully:", savedPo._id);
    console.log(`📋 PO Serial Number: ${savedPo.uniqueSerialNo}`);

    // Send emails
    try {
      await sendPOCreatedEmail(savedPo);
      console.log("📧 PO creation emails sent successfully");
    } catch (emailErr) {
      console.error('⚠️ Email sending error:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'PO NPP created successfully',
      serialNumber: savedPo.uniqueSerialNo,
      data: savedPo
    });
  } catch (err) {
    console.error("❌ Error in createPoNpp:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all PO NPP
const listPoNpp = async (req, res) => {
  try {
    const rows = await PoNpp.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single PO NPP
const getPoNpp = async (req, res) => {
  try {
    const row = await PoNpp.findById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update PO NPP
const updatePoNpp = async (req, res) => {
  try {
    const updated = await PoNpp.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete PO NPP
const deletePoNpp = async (req, res) => {
  try {
    const deleted = await PoNpp.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    res.json({ success: true, message: "PO NPP deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve PO NPP
const approvePoNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userName = req.user?.name || 'Approver';
    
    const po = await PoNpp.findById(id);
    if (!po) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    
    if (po.stakeholders && po.stakeholders.length > 0) {
      const pendingApprover = po.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Approved';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
      const remainingPending = po.stakeholders.filter(s => s.status === 'Pending');
      po.status = remainingPending.length === 0 ? 'Approved' : 'In-Process';
    } else {
      po.status = 'Approved';
    }
    
    po.approvedAt = new Date();
    po.approvedBy = userName;
    po.approvalComments = comments;
    await po.save();
    
    try {
      await sendPOApprovedEmail(po, { name: userName, remarks: comments });
      console.log("📧 Approval email sent");
    } catch (emailErr) {
      console.error('Approval email error:', emailErr.message);
    }
    
    res.json({ success: true, message: "PO NPP approved", data: po });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject PO NPP
const rejectPoNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userName = req.user?.name || 'Rejecter';
    
    const po = await PoNpp.findById(id);
    if (!po) {
      return res.status(404).json({ success: false, message: "PO NPP not found" });
    }
    
    if (po.stakeholders && po.stakeholders.length > 0) {
      const pendingApprover = po.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Rejected';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
    }
    
    po.status = 'Rejected';
    po.rejectedAt = new Date();
    po.rejectedBy = userName;
    po.rejectionComments = comments;
    await po.save();
    
    try {
      await sendPORejectedEmail(po, { name: userName, remarks: comments });
      console.log("📧 Rejection email sent");
    } catch (emailErr) {
      console.error('Rejection email error:', emailErr.message);
    }
    
    res.json({ success: true, message: "PO NPP rejected", data: po });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createPoNpp,
  listPoNpp,
  getPoNpp,
  updatePoNpp,
  deletePoNpp,
  approvePoNpp,
  rejectPoNpp
};