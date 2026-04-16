const { sendMail } = require('./mail.service');

// Send EP Request Created Email
const sendEPRequestCreatedEmail = async (request) => {
  const subject = `📋 New EP Request: ${request.title}`;
  
  return await sendMail({
    to: request.email,
    cc: request.ccList || [],
    subject: subject,
    epRequestData: request,
    action: 'created',
    actor: null,
    nextApprover: null
  });
};

// Send EP Request Approved Email
const sendEPRequestApprovedEmail = async (request, approver) => {
  const subject = `✅ EP Request Approved: ${request.title}`;
  
  return await sendMail({
    to: request.email,
    cc: request.ccList || [],
    subject: subject,
    epRequestData: request,
    action: 'approved',
    actor: approver,
    nextApprover: null
  });
};

// Send EP Request Rejected Email
const sendEPRequestRejectedEmail = async (request, approver) => {
  const subject = `❌ EP Request Rejected: ${request.title}`;
  
  return await sendMail({
    to: request.email,
    cc: request.ccList || [],
    subject: subject,
    epRequestData: request,
    action: 'rejected',
    actor: approver,
    nextApprover: null
  });
};

// Send New EP Request to Approver
const sendNewEPRequestEmail = async (request, approver) => {
  const subject = `⚠️ Action Required: ${request.title}`;
  
  return await sendMail({
    to: approver.email,
    cc: request.ccList || [],
    subject: subject,
    epRequestData: request,
    action: 'approval_needed',
    actor: null,
    nextApprover: approver
  });
};

// Send EP CC Notification
const sendEPCCNotificationEmail = async (request, ccEmail) => {
  const subject = `📋 CC: EP Request - ${request.title}`;
  
  return await sendMail({
    to: ccEmail,
    subject: subject,
    epRequestData: request,
    action: 'created',
    actor: null,
    nextApprover: null
  });
};

module.exports = {
  sendEPRequestCreatedEmail,
  sendEPRequestApprovedEmail,
  sendEPRequestRejectedEmail,
  sendNewEPRequestEmail,
  sendEPCCNotificationEmail
};