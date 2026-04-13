const mongoose = require('mongoose');
const Request = require('../models/request');
const { sendEpMailWithPdf } = require('../services/epNotify.service');

const SENIOR = new Set(['Admin', 'Manager', 'VP', 'GM', 'MD', 'Director', 'AGM', 'Approver']);

function canActOnEp(user, doc) {
  if (!user || !doc) return false;
  if (user.rights?.epApproval) return true;
  if (SENIOR.has(user.role)) return true;
  const u = (user.email || '').toLowerCase();
  return (doc.stakeholders || []).some(
    (s) => (s.email || '').toLowerCase() === u && (s.status === 'Pending' || s.status === 'In-Process')
  );
}

// Simple middleware to simulate auth for testing
const mockAuth = (req, res, next) => {
  req.user = {
    id: 'test_user_id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'Admin'
  };
  next();
};

// GET all requests
exports.getRequests = async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    res.json({ success: true, data: requests, count: requests.length });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single request by ID
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
   
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
   
    res.json({ success: true, data: request });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE new request
exports.createRequest = async (req, res) => {
  try {
    console.log('📤 Creating request with body:', JSON.stringify(req.body, null, 2));
   
    const {
      requester,
      department,
      email,
      contactNo,
      organization,
      title,
      amount,
      vendor,
      priority,
      description,
      objective,
      stakeholders,
      ccList
    } = req.body || {};
   
    // Validate required fields
    if (!requester) return res.status(400).json({ success: false, message: 'requester is required' });
    if (!department) return res.status(400).json({ success: false, message: 'department is required' });
    if (!title) return res.status(400).json({ success: false, message: 'title is required' });
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'valid amount is required' });
    if (!vendor) return res.status(400).json({ success: false, message: 'vendor is required' });
    if (!email) return res.status(400).json({ success: false, message: 'email is required' });
   
    // Process stakeholders
    let processedStakeholders = [];
    if (stakeholders && Array.isArray(stakeholders) && stakeholders.length > 0) {
      processedStakeholders = stakeholders.map((s, idx) => ({
        name: s.name,
        email: s.email,
        designation: s.designation,
        line: s.line || 'Sequential',
        approvalOrder: s.approvalOrder || idx + 1,
        status: idx === 0 ? 'Pending' : 'Pending',
        remarks: s.remarks || '',
        dateTime: null
      }));
    } else {
      // Default stakeholders
      processedStakeholders = [
        { name: "Vijay Parashar", email: "vijay@example.com", designation: "Manager", line: "Parallel", approvalOrder: 1, status: "Pending", remarks: "", dateTime: null },
        { name: "Ravib", email: "ravib@example.com", designation: "A-GM", line: "Parallel", approvalOrder: 2, status: "Pending", remarks: "", dateTime: null }
      ];
    }
   
    // Process CC list
    let processedCCList = [];
    if (ccList) {
      if (typeof ccList === 'string') {
        processedCCList = ccList.split(',').map(e => e.trim()).filter(e => e);
      } else if (Array.isArray(ccList)) {
        processedCCList = ccList.filter(e => e && e.trim());
      }
    }
   
    const requestData = {
      requester: requester.trim(),
      department: department.trim(),
      email: email.trim().toLowerCase(),
      contactNo: contactNo || '',
      organization: organization || 'Radiant Appliances',
      title: title.trim(),
      amount: Number(amount),
      vendor: vendor.trim(),
      priority: priority || 'Medium',
      description: description || '',
      objective: objective || '',
      stakeholders: processedStakeholders,
      ccList: processedCCList,
      status: 'Pending',
      requestDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\//g, '-'),
      createdAt: new Date(),
      updatedAt: new Date()
    };
   
    const newRequest = new Request(requestData);
    const savedRequest = await newRequest.save();
   
    console.log('✅ Request created:', savedRequest._id);
   
    try {
      await sendEpMailWithPdf(
        savedRequest,
        `EP Approval Request: ${savedRequest.title}`,
        `EP: ${savedRequest.title}`
      );
    } catch (e) {
      console.error('Request create notify:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'EP Request created successfully; email with PDF sent to requester/CC',
      data: savedRequest
    });
   
  } catch (error) {
    console.error('❌ Create request error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// UPDATE request
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
   
    const updated = await Request.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
   
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
   
    res.json({ success: true, message: 'Request updated', data: updated });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE request
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
   
    const deleted = await Request.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
   
    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve request (one senior approver finalizes; all stakeholders marked approved)
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments = '' } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (['Approved', 'Rejected'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'Request already finalized' });
    }
    if (!canActOnEp(req.user, request)) {
      return res.status(403).json({ success: false, message: 'Not authorized to approve' });
    }

    const actor = req.user.name || req.user.email || 'Approver';
    const nowIso = new Date().toISOString();
    request.stakeholders.forEach((s) => {
      if (s.status === 'Pending' || s.status === 'In-Process') {
        s.status = 'Approved';
        s.remarks = comments ? `${actor}: ${comments}` : `${actor}: Approved`;
        s.dateTime = nowIso;
      }
    });
    request.status = 'Approved';
    request.approvedAt = new Date();
    request.approvedBy = actor;
    await request.save();

    try {
      await sendEpMailWithPdf(request, `EP Approved: ${request.title}`, `Approved by ${actor}`);
    } catch (e) {
      console.error(e.message);
    }

    res.json({
      success: true,
      toast: 'success',
      message: 'Request approved. CC notified with PDF.',
      data: request,
    });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments = '' } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (['Approved', 'Rejected'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'Request already finalized' });
    }
    if (!canActOnEp(req.user, request)) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject' });
    }

    const actor = req.user.name || req.user.email || 'Approver';
    const nowIso = new Date().toISOString();
    request.stakeholders.forEach((s) => {
      if (s.status === 'Pending' || s.status === 'In-Process') {
        s.status = 'Rejected';
        s.remarks = comments ? `${actor}: ${comments}` : `${actor}: Rejected`;
        s.dateTime = nowIso;
      }
    });
    request.status = 'Rejected';
    request.rejectionReason = comments || 'Rejected';
    request.rejectedBy = actor;
    request.rejectedAt = new Date();
    await request.save();

    try {
      await sendEpMailWithPdf(request, `EP Rejected: ${request.title}`, `Rejected by ${actor}`);
    } catch (e) {
      console.error(e.message);
    }

    res.json({ success: true, toast: 'error', message: 'Request rejected', data: request });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const total = await Request.countDocuments();
    const pending = await Request.countDocuments({ status: 'Pending' });
    const approved = await Request.countDocuments({ status: 'Approved' });
    const rejected = await Request.countDocuments({ status: 'Rejected' });
    const inProcess = await Request.countDocuments({ status: 'In-Process' });
   
    res.json({
      success: true,
      data: { total, pending, approved, rejected, inProcess }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get requests by status
exports.getRequestsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const requests = await Request.find({ status }).sort({ createdAt: -1 });
    res.json({ success: true, data: requests, count: requests.length });
  } catch (error) {
    console.error('Get by status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my pending requests
exports.getMyPendingRequests = async (req, res) => {
  try {
    const requests = await Request.find({
      'stakeholders.status': 'Pending',
      status: { $in: ['Pending', 'In-Process'] }
    }).sort({ createdAt: -1 });
   
    res.json({ success: true, data: requests, count: requests.length });
  } catch (error) {
    console.error('Get pending error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get requests by department
exports.getRequestsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const requests = await Request.find({
      department: { $regex: new RegExp(department, 'i') }
    }).sort({ createdAt: -1 });
   
    res.json({ success: true, data: requests, count: requests.length });
  } catch (error) {
    console.error('Get by department error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ FIXED: Get unique departments (This was causing the error)
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Request.distinct('department');
    
    // Clean empty or null values
    const cleanDepartments = departments
      .filter(dept => dept && typeof dept === 'string' && dept.trim() !== '')
      .sort();

    res.json({
      success: true,
      data: cleanDepartments,
      count: cleanDepartments.length
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
};