const mongoose = require("mongoose");
const Request = require("../models/request");
const {
  sendNewRequestEmail,
  sendApprovedEmail,
  sendRejectedEmail,
  sendInProcessEmail,
  sendNextApproverEmail,
  sendAttachmentEmail
} = require("../services/email.service");

// GET All EP Requests
exports.getRequests = async (req, res) => {
  try {
    let query = {};
    
    if (req.user && req.user.role !== 'Admin') {
      query = {
        $or: [
          { email: req.user.email },
          { createdBy: req.user.id },
          { 'stakeholders.email': req.user.email }
        ]
      };
    }
    
    const requests = await Request.find(query).sort({ createdAt: -1 });
    
    const requestsWithPermissions = requests.map(request => {
      const requestObj = request.toObject();
      requestObj.canApprove = request.canUserApprove ? request.canUserApprove(req.user?.email) : false;
      requestObj.currentApprover = request.getCurrentApprover ? request.getCurrentApprover() : null;
      return requestObj;
    });
    
    res.json({
      success: true,
      data: requestsWithPermissions,
      count: requestsWithPermissions.length
    });
  } catch (error) {
    console.error("Get Requests Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch requests"
    });
  }
};

// GET My Pending Requests
exports.getMyPendingRequests = async (req, res) => {
  try {
    const requests = await Request.find({
      'stakeholders.email': req.user.email,
      'stakeholders.status': 'Pending',
      status: { $in: ['Pending', 'In-Process'] }
    }).sort({ createdAt: -1 });
    
    const pendingRequests = requests.filter(request => 
      request.canUserApprove ? request.canUserApprove(req.user.email) : false
    );
    
    res.json({
      success: true,
      data: pendingRequests,
      count: pendingRequests.length,
      message: `You have ${pendingRequests.length} pending approval(s)`
    });
  } catch (error) {
    console.error("Get My Pending Requests Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pending requests"
    });
  }
};

// CREATE New EP Request
exports.createRequest = async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    
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
      ccList,
      attachments
    } = req.body;
    
    // Validate required fields
    if (!requester) {
      return res.status(400).json({ success: false, message: "Requester name is required" });
    }
    if (!department) {
      return res.status(400).json({ success: false, message: "Department is required" });
    }
    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }
    if (!vendor) {
      return res.status(400).json({ success: false, message: "Vendor is required" });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "Requester email is required" });
    }
    
    // Process stakeholders
    let processedStakeholders = [];
    if (stakeholders && stakeholders.length > 0) {
      processedStakeholders = stakeholders.map((stakeholder, index) => ({
        name: stakeholder.name,
        email: stakeholder.email,
        designation: stakeholder.designation,
        line: stakeholder.line || 'Sequential',
        approvalOrder: stakeholder.approvalOrder || index,
        status: index === 0 ? 'Pending' : 'Pending',
        remarks: stakeholder.remarks || '',
        dateTime: null
      }));
    } else {
      processedStakeholders = [{
        name: "Default Approver",
        email: "approver@example.com",
        designation: "Manager",
        line: "Sequential",
        approvalOrder: 1,
        status: "Pending",
        remarks: "",
        dateTime: null
      }];
    }
    
    // Process attachments
    let processedAttachments = [];
    if (attachments && attachments.length > 0) {
      processedAttachments = attachments.map((att, index) => ({
        serialNo: att.serialNo || index + 1,
        name: att.name,
        fileSize: att.fileSize,
        remark: att.remark,
        fileUrl: att.fileUrl
      }));
    }
    
    // Process CC list
    let processedCCList = [];
    if (ccList) {
      if (typeof ccList === 'string') {
        processedCCList = ccList.split(';').map(email => email.trim()).filter(email => email);
      } else if (Array.isArray(ccList)) {
        processedCCList = ccList.filter(email => email && email.trim());
      }
    }
    
    const requestData = {
      requester,
      department,
      email,
      contactNo: contactNo || "",
      organization: organization || "Radiant",
      title,
      amount: Number(amount),
      vendor,
      priority: priority || "Medium",
      description: description || "",
      objective: objective || "",
      stakeholders: processedStakeholders,
      attachments: processedAttachments,
      ccList: processedCCList,
      status: "Pending",
      createdBy: req.user?.id,
      createdByName: req.user?.name,
      requestDate: new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: '2-digit' 
      }).replace(/\//g, '-'),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const newRequest = new Request(requestData);
    const savedRequest = await newRequest.save();
    
    // Send email to first approver
    if (processedStakeholders.length > 0 && processedStakeholders[0].email) {
      await sendNewRequestEmail(savedRequest, processedStakeholders[0]);
      console.log(`📧 New request email sent to: ${processedStakeholders[0].email}`);
    }
    
    res.status(201).json({
      success: true,
      message: "EP Request created successfully. Notification sent to approver.",
      data: savedRequest
    });
    
  } catch (error) {
    console.error("Create Request Error:", error);
    
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create request"
    });
  }
};

// GET Single Request by ID
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }
    
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    
    const requestObj = request.toObject();
    requestObj.canApprove = request.canUserApprove ? request.canUserApprove(req.user?.email) : false;
    requestObj.currentApprover = request.getCurrentApprover ? request.getCurrentApprover() : null;
    
    if (requestObj.canApprove && req.user) {
      const currentApprover = request.stakeholders.find(
        s => s.email === req.user.email && s.status === 'Pending'
      );
      if (currentApprover && !currentApprover.viewedAt) {
        currentApprover.viewedAt = new Date();
        await request.save();
      }
    }
    
    res.json({ success: true, data: requestObj });
  } catch (error) {
    console.error("Get Request By ID Error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// UPDATE Request
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }
    
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    
    if (request.createdBy?.toString() !== req.user?.id && req.user?.role !== 'Admin') {
      return res.status(403).json({ success: false, message: "Only the creator can edit this request" });
    }
    
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: "Cannot edit a request that is already in process or completed" });
    }
    
    const updateData = { ...req.body, updatedAt: new Date() };
    const updated = await Request.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    
    res.json({ success: true, message: "Request updated successfully", data: updated });
  } catch (error) {
    console.error("Update Request Error:", error);
    
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    
    res.status(500).json({ success: false, message: error.message || "Failed to update request" });
  }
};

// Approve Request
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }
    
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    
    if (!request.canUserApprove(req.user.email)) {
      return res.status(403).json({ success: false, message: "You are not authorized to approve this request at this time" });
    }
    
    const currentApprover = request.stakeholders.find(
      s => s.email === req.user.email && s.status === 'Pending'
    );
    
    if (!currentApprover) {
      return res.status(400).json({ success: false, message: "No pending approval found for you" });
    }
    
    currentApprover.status = 'Approved';
    currentApprover.remarks = comments || currentApprover.remarks;
    currentApprover.dateTime = new Date();
    currentApprover.approvedBy = req.user.name;
    
    const nextApprover = request.stakeholders.find(s => s.status === 'Pending');
    
    if (nextApprover) {
      request.status = 'In-Process';
      await request.save();
      
      await sendInProcessEmail(request, currentApprover);
      console.log(`📧 In-process email sent to: ${request.email}`);
      
      await sendNextApproverEmail(request, nextApprover, currentApprover);
      console.log(`📧 Next approver notification sent to: ${nextApprover.email}`);
      
      res.json({
        success: true,
        message: `Request approved by ${currentApprover.name}. Next approver: ${nextApprover.name} has been notified.`,
        data: request
      });
    } else {
      request.status = 'Approved';
      request.approvedAt = new Date();
      request.approvedBy = req.user.name;
      request.approvalComments = comments;
      request.completionDate = new Date();
      await request.save();
      
      await sendApprovedEmail(request, currentApprover);
      console.log(`📧 Approval email sent to: ${request.email}`);
      
      res.json({
        success: true,
        message: "Request fully approved! All approvals completed.",
        data: request
      });
    }
  } catch (error) {
    console.error("Approve Request Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to approve request" });
  }
};

// Reject Request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }
    
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    
    if (!request.canUserApprove(req.user.email)) {
      return res.status(403).json({ success: false, message: "You are not authorized to reject this request" });
    }
    
    const currentApprover = request.stakeholders.find(
      s => s.email === req.user.email && s.status === 'Pending'
    );
    
    if (currentApprover) {
      currentApprover.status = 'Rejected';
      currentApprover.remarks = comments;
      currentApprover.dateTime = new Date();
      currentApprover.approvedBy = req.user.name;
    }
    
    request.status = 'Rejected';
    request.rejectedAt = new Date();
    request.rejectedBy = req.user.name;
    request.rejectionReason = comments || 'Rejected by approver';
    
    await request.save();
    
    await sendRejectedEmail(request, currentApprover);
    console.log(`📧 Rejection email sent to: ${request.email}`);
    
    res.json({
      success: true,
      message: "Request rejected successfully",
      data: request
    });
  } catch (error) {
    console.error("Reject Request Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to reject request" });
  }
};

// DELETE Request
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }
    
    const request = await Request.findByIdAndDelete(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    
    res.json({ success: true, message: "Request deleted successfully" });
  } catch (error) {
    console.error("Delete Request Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete request" });
  }
};

// Get Requests by Status
exports.getRequestsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'In-Process', 'Completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }
    
    const requests = await Request.find({ status }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error("Get Requests By Status Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch requests by status"
    });
  }
};

// Get Requests by Department
exports.getRequestsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const requests = await Request.find({ 
      department: { $regex: new RegExp(department, 'i') } 
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error("Get Requests By Department Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch requests by department"
    });
  }
};

// Get Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalRequests = await Request.countDocuments();
    const pendingRequests = await Request.countDocuments({ status: "Pending" });
    const approvedRequests = await Request.countDocuments({ status: "Approved" });
    const rejectedRequests = await Request.countDocuments({ status: "Rejected" });
    const inProcessRequests = await Request.countDocuments({ status: "In-Process" });
    
    let myPendingApprovals = 0;
    if (req.user) {
      const myPendingRequests = await Request.find({
        'stakeholders.email': req.user.email,
        'stakeholders.status': 'Pending',
        status: { $in: ['Pending', 'In-Process'] }
      });
      myPendingApprovals = myPendingRequests.filter(r => 
        r.canUserApprove ? r.canUserApprove(req.user.email) : false
      ).length;
    }
    
    const totalAmount = await Request.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    const recentRequests = await Request.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('requester title amount status requestDate');
    
    res.json({
      success: true,
      data: {
        totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        inProcess: inProcessRequests,
        myPendingApprovals,
        totalAmount: totalAmount[0]?.total || 0,
        successRate: totalRequests > 0 ? ((approvedRequests / totalRequests) * 100).toFixed(1) : 0,
        recentRequests
      }
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard stats"
    });
  }
};

// Add Attachment to Request
exports.addAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fileSize, remark, fileUrl } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }
    
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    
    const newAttachment = {
      serialNo: request.attachments.length + 1,
      name,
      fileSize: fileSize || 'N/A',
      remark: remark || '',
      fileUrl: fileUrl || ''
    };
    
    request.attachments.push(newAttachment);
    await request.save();
    
    await sendAttachmentEmail(request, [newAttachment]);
    
    res.json({
      success: true,
      message: "Attachment added successfully",
      data: request
    });
  } catch (error) {
    console.error("Add Attachment Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to add attachment" });
  }
};

// Get Approval Workflow Status
exports.getApprovalWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }
    
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    
    const workflow = {
      requestId: request._id,
      title: request.title,
      status: request.status,
      currentApprover: request.getCurrentApprover ? request.getCurrentApprover() : null,
      stakeholders: request.stakeholders,
      completedAt: request.completionDate,
      createdAt: request.createdAt
    };
    
    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error("Get Approval Workflow Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch workflow" });
  }
};

// ====================== TEST EMAIL ENDPOINT ======================
exports.testEmail = async (req, res) => {
  try {
    const { email, ccEmails, type } = req.body;
    
    console.log("📧 Test Email Request Received:", { email, ccEmails, type });
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }
    
    // Parse CC emails
    let ccArray = [];
    if (ccEmails) {
      if (typeof ccEmails === 'string') {
        ccArray = ccEmails.split(',').map(e => e.trim()).filter(e => e);
      } else if (Array.isArray(ccEmails)) {
        ccArray = ccEmails.filter(e => e && e.trim());
      }
    }
    
    console.log("📧 Test Email Details:", {
      to: email,
      cc: ccArray,
      type: type || 'new'
    });
    
    // Create a simple email service if not exists
    let sendEmailFunction;
    try {
      const emailService = require("../services/email.service");
      sendEmailFunction = emailService.sendNewRequestEmail;
    } catch (err) {
      console.log("Email service not found, using fallback");
    }
    
    // Simple HTML email template for testing
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0f2a5e, #1e4a8a); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0f2a5e; }
          .label { font-weight: bold; color: #0f2a5e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>LCGC RFQ - Test Email</h2>
            <p>CC Email Functionality Test</p>
          </div>
          <div class="content">
            <h3>✅ Test Email with CC Working!</h3>
            <div class="info">
              <p><span class="label">Email Type:</span> ${type || 'New Request'}</p>
              <p><span class="label">Primary Recipient:</span> ${email}</p>
              <p><span class="label">CC Recipients:</span> ${ccArray.join(', ') || 'None'}</p>
              <p><span class="label">Timestamp:</span> ${new Date().toLocaleString()}</p>
            </div>
            <p>This is a test email to verify that CC functionality is working properly in the EP Approval system.</p>
            <p>If you received this email, the CC feature is working correctly!</p>
          </div>
          <div class="footer">
            <p>This is an automated test email from LCGC RFQ System</p>
            <p>&copy; ${new Date().getFullYear()} LCGC RFQ. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const emailText = `Test Email from LCGC RFQ\n\nType: ${type || 'New Request'}\nPrimary: ${email}\nCC: ${ccArray.join(', ') || 'None'}\n\nThis is a test to verify CC functionality.`;
    
    // Send email using Resend
    const { Resend } = require('resend');
    const resendClient = new Resend(process.env.RESEND_API_KEY);
    
    const emailOptions = {
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: `🔐 LCGC RFQ Test Email - ${type || 'New Request'} (CC Test)`,
      html: emailHtml,
      text: emailText
    };
    
    if (ccArray.length > 0) {
      emailOptions.cc = ccArray;
    }
    
    console.log("📧 Sending test email with options:", { to: email, cc: ccArray });
    
    const { data, error } = await resendClient.emails.send(emailOptions);
    
    if (error) {
      console.error("❌ Resend error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
        details: { to: email, cc: ccArray, type: type || 'new' }
      });
    }
    
    console.log("✅ Test email sent successfully:", data);
    
    res.status(200).json({
      success: true,
      message: `Test ${type || 'new'} email sent successfully`,
      details: {
        to: email,
        cc: ccArray,
        type: type || 'new',
        emailId: data?.id
      }
    });
    
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};