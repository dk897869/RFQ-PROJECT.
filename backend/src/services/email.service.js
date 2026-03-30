const { Resend } = require('resend');
const {
  getNewRequestTemplate,
  getCCEmailTemplate,
  getApprovedTemplate,
  getRejectedTemplate,
  getInProcessTemplate,
  getNextApproverTemplate,
  getAttachmentTemplate
} = require('./email.templates');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html, text, ccList = []) => {
  try {
    const ccAddresses = Array.isArray(ccList) ? ccList.filter(cc => cc && cc.trim()) : [];
    
    console.log(`📧 Sending email to: ${to}`);
    if (ccAddresses.length > 0) {
      console.log(`📧 CC to: ${ccAddresses.join(', ')}`);
    }
    
    const emailOptions = {
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: to,
      subject: subject,
      html: html,
      text: text
    };
    
    if (ccAddresses.length > 0) {
      emailOptions.cc = ccAddresses;
    }
    
    const { data, error } = await resend.emails.send(emailOptions);
    
    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Email sent via Resend:', data);
    return { success: true, data: data };
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Send New Request Email to Approver
const sendNewRequestEmail = async (request, approver) => {
  const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/ep-approval/request/${request._id}`;
  const html = getNewRequestTemplate(request, approver, approvalLink);
  const text = `New EP Request: ${request.title}. Please review at ${approvalLink}`;
  return await sendEmail(approver.email, `📋 New EP Approval Request: ${request.title}`, html, text, request.ccList);
};

// Send Approved Email to Requester and CC
const sendApprovedEmail = async (request, approver) => {
  const html = getApprovedTemplate(request, approver);
  const text = `Your EP request "${request.title}" has been APPROVED by ${approver.name}`;
  
  await sendEmail(request.email, `✅ EP Request Approved: ${request.title}`, html, text, request.ccList);
  
  if (request.ccList && request.ccList.length > 0) {
    const ccHtml = getCCEmailTemplate(request, 'approved', approver, approver.remarks);
    const ccText = `EP Request "${request.title}" has been APPROVED`;
    for (const ccEmail of request.ccList) {
      await sendEmail(ccEmail, `📋 EP Request Update - APPROVED: ${request.title}`, ccHtml, ccText);
    }
  }
  return { success: true };
};

// Send Rejected Email
const sendRejectedEmail = async (request, approver) => {
  const html = getRejectedTemplate(request, approver);
  const text = `Your EP request "${request.title}" has been REJECTED by ${approver.name}`;
  
  await sendEmail(request.email, `❌ EP Request Rejected: ${request.title}`, html, text, request.ccList);
  
  if (request.ccList && request.ccList.length > 0) {
    const ccHtml = getCCEmailTemplate(request, 'rejected', approver, approver.remarks);
    const ccText = `EP Request "${request.title}" has been REJECTED`;
    for (const ccEmail of request.ccList) {
      await sendEmail(ccEmail, `📋 EP Request Update - REJECTED: ${request.title}`, ccHtml, ccText);
    }
  }
  return { success: true };
};

// Send In-Process Email
const sendInProcessEmail = async (request, currentApprover) => {
  const html = getInProcessTemplate(request, currentApprover);
  const text = `Your EP request "${request.title}" is IN PROCESS`;
  
  await sendEmail(request.email, `🔄 EP Request In Process: ${request.title}`, html, text, request.ccList);
  
  if (request.ccList && request.ccList.length > 0) {
    const ccHtml = getCCEmailTemplate(request, 'inprocess', currentApprover, currentApprover.remarks);
    const ccText = `EP Request "${request.title}" is IN PROCESS`;
    for (const ccEmail of request.ccList) {
      await sendEmail(ccEmail, `📋 EP Request Update - IN PROCESS: ${request.title}`, ccHtml, ccText);
    }
  }
  return { success: true };
};

// Send Next Approver Notification
const sendNextApproverEmail = async (request, nextApprover, currentApprover) => {
  const approvalLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/ep-approval/request/${request._id}`;
  const html = getNextApproverTemplate(request, nextApprover, currentApprover, approvalLink);
  const text = `Action Required: Please review EP request "${request.title}"`;
  return await sendEmail(nextApprover.email, `🔍 Action Required: ${request.title}`, html, text, request.ccList);
};

// Send Attachment Email
const sendAttachmentEmail = async (request, attachments) => {
  const html = getAttachmentTemplate(request, attachments);
  const text = `New attachments added to EP request "${request.title}"`;
  return await sendEmail(request.email, `📎 Attachments Added: ${request.title}`, html, text, request.ccList);
};

module.exports = {
  sendNewRequestEmail,
  sendApprovedEmail,
  sendRejectedEmail,
  sendInProcessEmail,
  sendNextApproverEmail,
  sendAttachmentEmail
};