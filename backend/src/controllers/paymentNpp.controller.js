const PaymentNpp = require('../models/paymentNpp.model');
const { sendMail } = require('../services/mail.service');
const { generateBeautifulPDF } = require('../services/pdf.service');

// Send Payment Advice Created Email
const sendPaymentAdviceCreatedEmail = async (paymentData) => {
  const subject = `📋 New Payment Advice: ${paymentData.titleOfActivity || paymentData.paymentTo || 'Payment Request'}`;
  
  console.log(`📧 Sending Payment Advice Email to: ${paymentData.emailId}`);
  if (paymentData.ccList && paymentData.ccList.length > 0) {
    console.log(`📧 CC recipients: ${paymentData.ccList.join(', ')}`);
  }
  
  let pdfBuffer = null;
  try {
    pdfBuffer = await generateBeautifulPDF(paymentData);
  } catch (pdfErr) {
    console.error('PDF generation error:', pdfErr.message);
  }
  
  return await sendMail({
    to: paymentData.emailId,
    cc: paymentData.ccList || [],
    subject: subject,
    paymentRequestData: paymentData,
    action: 'created',
    actor: null,
    nextApprover: null,
    attachments: pdfBuffer ? [{
      filename: `Payment_${paymentData._id || Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  });
};

// Send Payment Advice Approved Email
const sendPaymentAdviceApprovedEmail = async (paymentData, approver) => {
  const subject = `✅ Payment Advice Approved: ${paymentData.titleOfActivity || paymentData.paymentTo || 'Payment Request'}`;
  
  let pdfBuffer = null;
  try {
    pdfBuffer = await generateBeautifulPDF(paymentData);
  } catch (pdfErr) {
    console.error('PDF generation error:', pdfErr.message);
  }
  
  return await sendMail({
    to: paymentData.emailId,
    cc: paymentData.ccList || [],
    subject: subject,
    paymentRequestData: paymentData,
    action: 'approved',
    actor: approver,
    nextApprover: null,
    attachments: pdfBuffer ? [{
      filename: `Payment_${paymentData._id || Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  });
};

// Send Payment Advice Rejected Email
const sendPaymentAdviceRejectedEmail = async (paymentData, approver) => {
  const subject = `❌ Payment Advice Rejected: ${paymentData.titleOfActivity || paymentData.paymentTo || 'Payment Request'}`;
  
  let pdfBuffer = null;
  try {
    pdfBuffer = await generateBeautifulPDF(paymentData);
  } catch (pdfErr) {
    console.error('PDF generation error:', pdfErr.message);
  }
  
  return await sendMail({
    to: paymentData.emailId,
    cc: paymentData.ccList || [],
    subject: subject,
    paymentRequestData: paymentData,
    action: 'rejected',
    actor: approver,
    nextApprover: null,
    attachments: pdfBuffer ? [{
      filename: `Payment_${paymentData._id || Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  });
};

// Create Payment NPP
const createPaymentNpp = async (req, res) => {
  try {
    console.log("📥 Received Payment NPP data:", JSON.stringify(req.body, null, 2));
    
    const {
      requesterName, department, emailId, requestDate, contactNo, organization,
      titleOfActivity, purposeAndObjective, vendor, amount, remarks, priority,
      designation, paymentDueTo, level, paymentTo, expenseType, expenseAmount,
      balanceForPayment, deduction, bankDetails, sapName, sapCode,
      invoices, stakeholders, ccList, attachments, source, status
    } = req.body;

    if (!requesterName) {
      return res.status(400).json({ success: false, message: "Requester name is required" });
    }

    const newPayment = new PaymentNpp({
      requesterName, department, emailId,
      requestDate: requestDate || new Date().toISOString().split('T')[0],
      contactNo, organization: organization || 'Radiant Appliances',
      titleOfActivity, purposeAndObjective, vendor, amount: amount || 0, remarks,
      priority: priority || 'M', designation, paymentDueTo, level, paymentTo,
      expenseType, expenseAmount, balanceForPayment, deduction, bankDetails, sapName, sapCode,
      invoices: invoices || [],
      stakeholders: stakeholders || [],
      ccList: ccList || [],
      attachments: attachments || [],
      source: source || 'PAYMENT-ADVISE-NPP',
      status: status || 'Pending'
    });

    const savedPayment = await newPayment.save();
    console.log("✅ Payment NPP saved successfully:", savedPayment._id);

    try {
      await sendPaymentAdviceCreatedEmail(savedPayment);
      console.log("📧 Payment advice email sent successfully");
    } catch (emailErr) {
      console.error('⚠️ Email sending error:', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Payment Advice created successfully',
      data: savedPayment
    });
  } catch (err) {
    console.error("❌ Error in createPaymentNpp:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all Payment NPP
const listPaymentNpp = async (req, res) => {
  try {
    const rows = await PaymentNpp.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single Payment NPP
const getPaymentNpp = async (req, res) => {
  try {
    const row = await PaymentNpp.findById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Payment advice not found" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Payment NPP
const updatePaymentNpp = async (req, res) => {
  try {
    const updated = await PaymentNpp.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Payment advice not found" });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Payment NPP
const deletePaymentNpp = async (req, res) => {
  try {
    const deleted = await PaymentNpp.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Payment advice not found" });
    }
    res.json({ success: true, message: "Payment advice deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve Payment NPP
const approvePaymentNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userName = req.user?.name || 'Approver';
    
    const payment = await PaymentNpp.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment advice not found" });
    }
    
    if (payment.stakeholders && payment.stakeholders.length > 0) {
      const pendingApprover = payment.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Approved';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
      const remainingPending = payment.stakeholders.filter(s => s.status === 'Pending');
      payment.status = remainingPending.length === 0 ? 'Approved' : 'In-Process';
    } else {
      payment.status = 'Approved';
    }
    
    payment.approvedAt = new Date();
    payment.approvedBy = userName;
    payment.approvalComments = comments;
    await payment.save();
    
    try {
      await sendPaymentAdviceApprovedEmail(payment, { name: userName, remarks: comments });
    } catch (emailErr) {
      console.error('Approval email error:', emailErr.message);
    }
    
    res.json({ success: true, message: "Payment advice approved", data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject Payment NPP
const rejectPaymentNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userName = req.user?.name || 'Rejecter';
    
    const payment = await PaymentNpp.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment advice not found" });
    }
    
    if (payment.stakeholders && payment.stakeholders.length > 0) {
      const pendingApprover = payment.stakeholders.find(s => s.status === 'Pending');
      if (pendingApprover) {
        pendingApprover.status = 'Rejected';
        pendingApprover.remarks = comments;
        pendingApprover.dateTime = new Date().toISOString();
      }
    }
    
    payment.status = 'Rejected';
    payment.rejectedAt = new Date();
    payment.rejectedBy = userName;
    payment.rejectionComments = comments;
    await payment.save();
    
    try {
      await sendPaymentAdviceRejectedEmail(payment, { name: userName, remarks: comments });
    } catch (emailErr) {
      console.error('Rejection email error:', emailErr.message);
    }
    
    res.json({ success: true, message: "Payment advice rejected", data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createPaymentNpp,
  listPaymentNpp,
  getPaymentNpp,
  updatePaymentNpp,
  deletePaymentNpp,
  approvePaymentNpp,
  rejectPaymentNpp
};