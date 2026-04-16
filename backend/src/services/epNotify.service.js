const { sendMail } = require('./mail.service');
const { generatePDFFromRequest } = require('./pdf.service');

// Send New Request Email to Approver
const sendNewRequestEmail = async (request, approver, approvalLink = null) => {
  const subject = `📋 New EP Approval Request: ${request.title}`;
  
  return await sendMail({
    to: approver.email,
    cc: request.ccList || [],
    subject: subject,
    rfqData: request,
    action: 'created',
    actor: null,
    nextApprover: approver
  });
};

// Send Approved Email
const sendApprovedEmail = async (request, approver) => {
  const subject = `✅ EP Request Approved: ${request.title}`;
  
  return await sendMail({
    to: request.email,
    cc: request.ccList || [],
    subject: subject,
    rfqData: request,
    action: 'approved',
    actor: approver,
    nextApprover: null
  });
};

// Send Rejected Email
const sendRejectedEmail = async (request, approver) => {
  const subject = `❌ EP Request Rejected: ${request.title}`;
  
  return await sendMail({
    to: request.email,
    cc: request.ccList || [],
    subject: subject,
    rfqData: request,
    action: 'rejected',
    actor: approver,
    nextApprover: null
  });
};

// Send In-Process Email
const sendInProcessEmail = async (request, currentApprover) => {
  const subject = `🔄 EP Request In Process: ${request.title}`;
  
  return await sendMail({
    to: request.email,
    cc: request.ccList || [],
    subject: subject,
    rfqData: request,
    action: 'inprocess',
    actor: currentApprover,
    nextApprover: null
  });
};

// Send Next Approver Notification
const sendNextApproverEmail = async (request, nextApprover, currentApprover, approvalLink = null) => {
  const subject = `🔍 Action Required: ${request.title}`;
  
  return await sendMail({
    to: nextApprover.email,
    cc: request.ccList || [],
    subject: subject,
    rfqData: request,
    action: 'inprocess',
    actor: currentApprover,
    nextApprover: nextApprover
  });
};

// Send Attachment Email
const sendAttachmentEmail = async (request, attachments) => {
  const subject = `📎 Attachments Added: ${request.title}`;
  
  return await sendMail({
    to: request.email,
    cc: request.ccList || [],
    subject: subject,
    rfqData: request,
    action: 'created',
    actor: null,
    nextApprover: null
  });
};

// Send Approval Update to CC Recipients
const sendApprovalUpdateToCC = async (request, action, actor, nextApprover) => {
  if (!request.ccList || request.ccList.length === 0) return { success: true };
  
  const subject = `EP Request Update: ${request.title}`;
  
  const results = [];
  for (const ccEmail of request.ccList) {
    const result = await sendMail({
      to: ccEmail,
      subject: subject,
      rfqData: request,
      action: action,
      actor: actor,
      nextApprover: nextApprover
    });
    results.push(result);
  }
  
  return { success: true, results };
};

module.exports = {
  sendNewRequestEmail,
  sendApprovedEmail,
  sendRejectedEmail,
  sendInProcessEmail,
  sendNextApproverEmail,
  sendAttachmentEmail,
  sendApprovalUpdateToCC
};