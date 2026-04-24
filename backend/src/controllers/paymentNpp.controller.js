const PaymentNpp = require('../models/paymentNpp.model');

// Create Payment NPP
exports.createPaymentNpp = async (req, res) => {
  try {
    console.log("📥 Received Payment NPP data:", JSON.stringify(req.body, null, 2));
    
    const {
      requesterName,
      department,
      emailId,
      requestDate,
      contactNo,
      organization,
      titleOfActivity,
      purposeAndObjective,
      vendor,
      amount,
      remarks,
      priority,
      designation,
      paymentDueTo,
      level,
      paymentTo,
      expenseType,
      expenseAmount,
      balanceForPayment,
      deduction,
      bankDetails,
      sapName,
      sapCode,
      invoices,
      stakeholders,
      ccList,
      attachments,
      source,
      status
    } = req.body;

    // Validation
    if (!requesterName) {
      return res.status(400).json({ success: false, message: "Requester name is required" });
    }

    const newPayment = new PaymentNpp({
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
      designation,
      paymentDueTo,
      level,
      paymentTo,
      expenseType,
      expenseAmount,
      balanceForPayment,
      deduction,
      bankDetails,
      sapName,
      sapCode,
      invoices: invoices || [],
      stakeholders: stakeholders || [],
      ccList: ccList || [],
      attachments: attachments || [],
      source: source || 'PAYMENT-ADVISE-NPP',
      status: status || 'Pending'
    });

    const savedPayment = await newPayment.save();
    console.log("✅ Payment NPP saved successfully:", savedPayment._id);

    res.status(201).json({
      success: true,
      message: 'Payment NPP created successfully',
      data: savedPayment
    });
  } catch (err) {
    console.error("❌ Error in createPaymentNpp:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all Payment NPP
exports.listPaymentNpp = async (req, res) => {
  try {
    const rows = await PaymentNpp.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single Payment NPP by ID
exports.getPaymentNpp = async (req, res) => {
  try {
    const row = await PaymentNpp.findById(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Payment NPP not found" });
    }
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Payment NPP
exports.updatePaymentNpp = async (req, res) => {
  try {
    const updated = await PaymentNpp.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Payment NPP not found" });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete Payment NPP
exports.deletePaymentNpp = async (req, res) => {
  try {
    const deleted = await PaymentNpp.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Payment NPP not found" });
    }
    res.json({ success: true, message: "Payment NPP deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve Payment NPP
exports.approvePaymentNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    const payment = await PaymentNpp.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment NPP not found" });
    }
    
    // Update stakeholder status
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
    await payment.save();
    
    res.json({ success: true, message: "Payment NPP approved", data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reject Payment NPP
exports.rejectPaymentNpp = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    const payment = await PaymentNpp.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment NPP not found" });
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
    payment.rejectionComments = comments;
    await payment.save();
    
    res.json({ success: true, message: "Payment NPP rejected", data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};