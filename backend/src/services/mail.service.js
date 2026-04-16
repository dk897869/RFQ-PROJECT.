const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const sgMail = require('@sendgrid/mail');

let transporter = null;
let resendClient = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = String(process.env.SMTP_HOST || process.env.EMAIL_HOST || '').trim();
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.EMAIL_SECURE === 'true' ||
    port === 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return transporter;
}

function getFromAddress() {
  return (
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.FROM_EMAIL ||
    'noreply@localhost'
  );
}

// Professional Email Template Wrapper
const getEmailWrapper = (content, title, statusColor = '#0f2a5e') => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LCGC RFQ - ${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          padding: 40px 20px;
          line-height: 1.6;
        }
        .container {
          max-width: 700px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.5s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .header {
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
          padding: 32px 40px;
          position: relative;
          text-align: center;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -40%;
          right: -10%;
          width: 250px;
          height: 250px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: -40%;
          left: -10%;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 50%;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.5px;
          position: relative;
          z-index: 1;
        }
        .header p {
          color: rgba(255, 255, 255, 0.85);
          margin: 8px 0 0;
          font-size: 14px;
          position: relative;
          z-index: 1;
        }
        .content {
          padding: 40px;
        }
        .status-banner {
          text-align: center;
          padding: 16px;
          margin: -20px 20px 20px 20px;
          background: white;
          border-radius: 60px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          position: relative;
          z-index: 2;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 24px;
          border-radius: 60px;
          font-size: 14px;
          font-weight: 700;
        }
        .status-approved { background: #d1fae5; color: #059669; }
        .status-rejected { background: #fee2e2; color: #dc2626; }
        .status-pending { background: #fef3c7; color: #d97706; }
        .status-inprocess { background: #dbeafe; color: #2563eb; }
        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e3a8a;
          margin: 28px 0 16px 0;
          padding-bottom: 10px;
          border-bottom: 2px solid #3b82f6;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .section-title:first-of-type {
          margin-top: 0;
        }
        .section-icon {
          font-size: 22px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
          margin: 15px 0;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .info-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
        }
        .info-value {
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
        }
        .amount-highlight {
          font-size: 24px;
          font-weight: 800;
          color: #1e3a8a;
          background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
          padding: 16px 24px;
          border-radius: 16px;
          display: inline-block;
          margin: 15px 0;
        }
        .workflow-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 13px;
          border-radius: 12px;
          overflow: hidden;
        }
        .workflow-table th {
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          padding: 12px 14px;
          text-align: left;
          font-weight: 600;
        }
        .workflow-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .workflow-table tr:hover td {
          background: #f8fafc;
        }
        .attachments-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 13px;
          border-radius: 12px;
          overflow: hidden;
        }
        .attachments-table th {
          background: #f1f5f9;
          color: #1e3a8a;
          padding: 10px 12px;
          text-align: left;
          border-bottom: 2px solid #e2e8f0;
        }
        .attachments-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .remarks-box {
          background: #fef3c7;
          padding: 16px 20px;
          border-radius: 12px;
          margin: 20px 0;
          border-left: 4px solid #d97706;
        }
        .next-approver {
          background: linear-gradient(135deg, #e0f2fe, #bae6fd);
          padding: 16px 20px;
          border-radius: 12px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 32px;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          text-decoration: none;
          border-radius: 40px;
          margin: 20px 0;
          font-weight: 600;
          font-size: 14px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }
        .footer {
          text-align: center;
          padding: 24px;
          background: #f8fafc;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
        @media (max-width: 600px) {
          .content { padding: 24px; }
          .info-grid { grid-template-columns: 1fr; gap: 12px; }
          .header h1 { font-size: 24px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>LCGC RFQ System</h1>
          <p>Resolute Group - Procurement Excellence</p>
        </div>
        ${content}
        <div class="footer">
          <p>This is an automated message from LCGC RFQ System. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} LCGC RFQ. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Professional Email Template for RFQ
const getBeautifulRFQEmailHTML = (rfqData, action = 'created', actor = null, nextApprover = null) => {
  const priorityMap = { 'H': 'High', 'M': 'Medium', 'L': 'Low' };
  const priorityText = priorityMap[rfqData.priority] || 'Medium';
  const priorityClass = rfqData.priority === 'H' ? 'status-pending' : rfqData.priority === 'M' ? 'status-inprocess' : 'status-approved';
  
  const itemsHtml = (rfqData.items || []).map((item, idx) => `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;"><strong>${escapeHtml(item.itemDescription)}</strong></td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.uom || 'Pcs')}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${item.quantity || 1}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.make || '-')}</td>
    </tr>
  `).join('');
  
  let statusBadge = '';
  let actionText = '';
  
  switch(action) {
    case 'created':
      statusBadge = '<div class="status-badge status-inprocess"><span>🔄</span> New Request Created</div>';
      actionText = 'A new RFQ request has been created and is awaiting your review.';
      break;
    case 'approved':
      statusBadge = '<div class="status-badge status-approved"><span>✅</span> Request Approved</div>';
      actionText = `The RFQ request has been APPROVED by ${actor?.name || 'the approver'}.`;
      break;
    case 'rejected':
      statusBadge = '<div class="status-badge status-rejected"><span>❌</span> Request Rejected</div>';
      actionText = `The RFQ request has been REJECTED by ${actor?.name || 'the approver'}.`;
      break;
    default:
      statusBadge = '<div class="status-badge status-pending"><span>📋</span> Request Update</div>';
  }
  
  const content = `
    <div class="status-banner">
      ${statusBadge}
    </div>
    
    <p style="margin-bottom: 20px;">Dear ${actor ? actor.name : 'Team'},</p>
    <p style="margin-bottom: 20px;">${actionText}</p>
    
    <!-- Requestor Information -->
    <div class="section-title">
      <span class="section-icon">👤</span>
      <span>Requester Information</span>
    </div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Full Name</span>
        <span class="info-value">${escapeHtml(rfqData.requesterName)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Department</span>
        <span class="info-value">${escapeHtml(rfqData.department)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Email Address</span>
        <span class="info-value">${escapeHtml(rfqData.emailId)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Contact Number</span>
        <span class="info-value">${escapeHtml(rfqData.contactNo)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Organization</span>
        <span class="info-value">${escapeHtml(rfqData.organization)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Request Date</span>
        <span class="info-value">${rfqData.requestDate ? new Date(rfqData.requestDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
      </div>
    </div>
    
    <!-- Activity Details -->
    <div class="section-title">
      <span class="section-icon">🎯</span>
      <span>Activity Details</span>
    </div>
    <div class="info-grid">
      <div class="info-item">
        <span class="info-label">Title of Activity</span>
        <span class="info-value" style="font-size: 16px; font-weight: 700;">${escapeHtml(rfqData.titleOfActivity)}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Priority Level</span>
        <span class="info-value"><span class="status-badge ${priorityClass}" style="padding: 4px 12px;">${priorityText}</span></span>
      </div>
      <div class="info-item">
        <span class="info-label">Approval For</span>
        <span class="info-value">${escapeHtml(rfqData.approvalFor || 'Operational Support and Action plan')}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Purpose & Objective</span>
        <span class="info-value">${escapeHtml(rfqData.purposeAndObjective || '—')}</span>
      </div>
    </div>
    
    <!-- Items Table -->
    <div class="section-title">
      <span class="section-icon">📦</span>
      <span>Item Details</span>
    </div>
    <table class="workflow-table" style="width: 100%;">
      <thead>
        <tr>
          <th>#</th>
          <th>Item Description</th>
          <th>UOM</th>
          <th>Quantity</th>
          <th>Make / Model</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="5" style="text-align: center;">No items found</td></tr>'}
      </tbody>
    </table>
    
    ${actor && actor.remarks ? `
    <div class="remarks-box">
      <strong>📝 Remarks:</strong>
      <p style="margin: 8px 0 0;">${escapeHtml(actor.remarks)}</p>
    </div>
    ` : ''}
    
    ${nextApprover ? `
    <div class="next-approver">
      <strong>⏳ Next Approver:</strong> ${escapeHtml(nextApprover.name)} (${escapeHtml(nextApprover.designation)})<br>
      <strong>Email:</strong> ${escapeHtml(nextApprover.email)}
    </div>
    ` : ''}
    
    ${rfqData.ccTo && rfqData.ccTo.length > 0 ? `
    <div style="margin-top: 20px; padding: 12px; background: #f1f5f9; border-radius: 12px; font-size: 12px;">
      <strong>CC Recipients:</strong> ${rfqData.ccTo.join('; ')}
    </div>
    ` : ''}
    
    <div style="margin-top: 30px; text-align: center;">
      <a href="${process.env.APP_URL || '#'}" class="button">🔍 View in Dashboard</a>
    </div>
  `;
  
  return getEmailWrapper(content, `RFQ ${action === 'created' ? 'Created' : action === 'approved' ? 'Approved' : 'Updated'}`);
};

// Generate Beautiful PDF Buffer (using pdfkit)
const generateBeautifulPDF = async (rfqData) => {
  const PDFDocument = require('pdfkit');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4',
        info: {
          Title: `RFQ-${rfqData._id || Date.now()}`,
          Author: rfqData.requesterName,
          Subject: 'RFQ NPP Requisition'
        }
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header with gradient effect
      doc.rect(0, 0, doc.page.width, 140).fill('#1e3a8a');
      
      // Decorative circles
      doc.circle(doc.page.width - 60, 40, 70).fill('#3b82f6', 0.15);
      doc.circle(-30, 110, 90).fill('#3b82f6', 0.1);
      doc.circle(doc.page.width - 100, 120, 50).fill('#60a5fa', 0.1);
      
      // Logo/Title
      doc.fontSize(10)
         .fillColor('#94a3b8')
         .font('Helvetica-Bold')
         .text('LCGC RFQ SYSTEM', 50, 35, { continued: true })
         .fillColor('#60a5fa')
         .text('  •  PROCUREMENT EXCELLENCE');
      
      // Main Title
      doc.fontSize(28)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text('Requisition RFQ (NPP)', 50, 65);
      
      // Status Badge
      const status = rfqData.status || 'In-Process';
      const statusColor = status === 'Approved' ? '#10b981' : status === 'Rejected' ? '#ef4444' : '#d97706';
      
      doc.fontSize(11)
         .fillColor(statusColor)
         .font('Helvetica-Bold')
         .text(`●  ${status}`, doc.page.width - 150, 55, { align: 'right' });
      
      // Date generated
      doc.fontSize(9)
         .fillColor('#94a3b8')
         .font('Helvetica')
         .text(`Generated: ${new Date().toLocaleString()}`, doc.page.width - 150, 75, { align: 'right' });
      
      // Reference ID
      doc.fontSize(9)
         .fillColor('#94a3b8')
         .text(`RFQ ID: ${rfqData._id || 'N/A'}`, doc.page.width - 150, 95, { align: 'right' });
      
      doc.moveDown(3);
      
      // Requester Information Card
      doc.roundedRect(50, doc.y, doc.page.width - 100, 140, 12)
         .fill('#f8fafc')
         .stroke('#e2e8f0', 1);
      
      doc.fillColor('#1e3a8a')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('👤  Requester Information', 70, doc.y - 125);
      
      let startY = doc.y - 105;
      
      // Grid layout for requester info
      const drawInfoRow = (label, value, x, y) => {
        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(label, x, y);
        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(value || '—', x + 100, y);
      };
      
      drawInfoRow('Full Name:', rfqData.requesterName, 70, startY);
      drawInfoRow('Department:', rfqData.department, 320, startY);
      
      startY += 25;
      drawInfoRow('Email:', rfqData.emailId, 70, startY);
      drawInfoRow('Contact No.:', rfqData.contactNo, 320, startY);
      
      startY += 25;
      drawInfoRow('Organization:', rfqData.organization, 70, startY);
      drawInfoRow('Request Date:', rfqData.requestDate ? new Date(rfqData.requestDate).toLocaleDateString() : new Date().toLocaleDateString(), 320, startY);
      
      doc.moveDown(2);
      
      // Activity Details Card
      doc.roundedRect(50, doc.y, doc.page.width - 100, 110, 12)
         .fill('#ffffff')
         .stroke('#e2e8f0', 1);
      
      doc.fillColor('#1e3a8a')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('🎯  Activity Details', 70, doc.y - 95);
      
      let activityY = doc.y - 75;
      
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Title of Activity:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(rfqData.titleOfActivity || '—', 200, activityY);
      
      // Priority badge
      const priorityMap = { 'H': 'High', 'M': 'Medium', 'L': 'Low' };
      const priorityText = priorityMap[rfqData.priority] || 'Medium';
      const priorityColor = rfqData.priority === 'H' ? '#dc2626' : rfqData.priority === 'M' ? '#d97706' : '#10b981';
      
      doc.roundedRect(doc.page.width - 140, activityY - 3, 80, 22, 11)
         .fill(priorityColor);
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(`${priorityText} Priority`, doc.page.width - 135, activityY + 2);
      
      activityY += 25;
      doc.fillColor('#64748b').font('Helvetica').fontSize(9).text('Approval For:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica').text(rfqData.approvalFor || 'Operational Support and Action plan', 170, activityY);
      
      activityY += 25;
      doc.fillColor('#64748b').font('Helvetica').text('Purpose & Objective:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica').text(rfqData.purposeAndObjective || '—', 190, activityY);
      
      doc.moveDown(2);
      
      // Items Table
      doc.fillColor('#1e3a8a')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('📦  Item Details', 50, doc.y);
      
      doc.moveDown(0.8);
      
      // Table headers
      const tableTop = doc.y;
      const colPositions = [60, 180, 280, 360, 440];
      
      doc.rect(50, tableTop - 5, doc.page.width - 100, 30)
         .fill('#1e3a8a');
      
      doc.fillColor('#ffffff')
         .fontSize(10)
         .font('Helvetica-Bold');
      
      doc.text('#', colPositions[0], tableTop);
      doc.text('Item Description', colPositions[1], tableTop);
      doc.text('UOM', colPositions[2], tableTop);
      doc.text('Qty', colPositions[3], tableTop);
      doc.text('Make / Model', colPositions[4], tableTop);
      
      // Table rows
      let rowY = tableTop + 25;
      const items = rfqData.items || [];
      
      items.forEach((item, idx) => {
        if (rowY > doc.page.height - 100) {
          doc.addPage();
          rowY = 50;
        }
        
        if (idx % 2 === 0) {
          doc.rect(50, rowY - 3, doc.page.width - 100, 25)
             .fill('#f8fafc');
        }
        
        doc.fillColor('#334155')
           .fontSize(9)
           .font('Helvetica');
        
        doc.text((idx + 1).toString(), colPositions[0], rowY);
        doc.text(item.itemDescription || '—', colPositions[1], rowY, { width: 90 });
        doc.text(item.uom || 'Pcs', colPositions[2], rowY);
        doc.text((item.quantity || 0).toString(), colPositions[3], rowY);
        doc.text(item.make || '—', colPositions[4], rowY);
        
        rowY += 25;
      });
      
      // Footer
      const footerY = doc.page.height - 70;
      
      doc.rect(0, footerY, doc.page.width, 70)
         .fill('#f8fafc');
      
      doc.fillColor('#64748b')
         .fontSize(8)
         .font('Helvetica')
         .text('This is an automatically generated RFQ document.', 50, footerY + 20, { align: 'center', width: doc.page.width - 100 });
      
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, footerY + 38, { align: 'center', width: doc.page.width - 100 });
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Main sendMail function with professional templates
 * @param {object} opts
 * @param {string|string[]} opts.to
 * @param {string|string[]} [opts.cc]
 * @param {string|string[]} [opts.bcc]
 * @param {string} opts.subject
 * @param {string} [opts.html]
 * @param {string} [opts.text]
 * @param {object} [opts.rfqData] - RFQ data for auto-generating beautiful template
 * @param {string} [opts.action] - 'created', 'approved', 'rejected'
 * @param {object} [opts.actor] - Person who performed action
 * @param {object} [opts.nextApprover] - Next approver if any
 * @param {{ filename: string, content: Buffer, contentType?: string }[]} [opts.attachments]
 */
async function sendMail(opts) {
  const { to, cc, bcc, subject, html, text, rfqData, action, actor, nextApprover, attachments } = opts;
  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (toList.length === 0) {
    return { success: false, error: 'No recipients' };
  }

  // Generate beautiful HTML if rfqData is provided
  let finalHtml = html;
  if (rfqData && !html) {
    finalHtml = getBeautifulRFQEmailHTML(rfqData, action || 'created', actor, nextApprover);
  }

  const from = getFromAddress();
  const normAttach = attachments || [];

  // Generate PDF if rfqData provided and no attachments
  let finalAttachments = [...normAttach];
  if (rfqData && !normAttach.some(a => a.filename === 'RFQ-NPP.pdf')) {
    try {
      const pdfBuffer = await generateBeautifulPDF(rfqData);
      finalAttachments.push({
        filename: `RFQ-${rfqData._id || Date.now()}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr.message);
    }
  }

  // Try SMTP first
  const t = getTransporter();
  if (t) {
    try {
      await t.sendMail({
        from,
        to: toList,
        cc: cc?.length ? cc : undefined,
        bcc: bcc?.length ? bcc : undefined,
        subject,
        html: finalHtml,
        text: text || (finalHtml ? undefined : subject),
        attachments: finalAttachments.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType
        })),
      });
      return { success: true, via: 'smtp' };
    } catch (e) {
      console.error('SMTP send error:', e.message);
    }
  }

  // Try Resend
  if (process.env.RESEND_API_KEY) {
    try {
      if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
      const resendFrom = from && from !== 'noreply@localhost' ? from : 'onboarding@resend.dev';
      const payload = {
        from: resendFrom,
        to: toList,
        subject,
        html: finalHtml || `<p>${text || subject}</p>`,
        text: text || '',
      };
      if (cc?.length) payload.cc = Array.isArray(cc) ? cc : [cc];
      if (finalAttachments.length) {
        payload.attachments = finalAttachments.map(a => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content).toString('base64'),
        }));
      }
      const { data, error } = await resendClient.emails.send(payload);
      if (error) return { success: false, error: error.message || String(error) };
      return { success: true, via: 'resend', id: data?.id };
    } catch (e) {
      console.error('Resend error:', e.message);
    }
  }

  // Try SendGrid
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: toList,
        from: { email: from, name: process.env.FROM_NAME || 'LCGC RFQ' },
        cc: cc?.length ? cc : undefined,
        subject,
        html: finalHtml || `<p>${text || subject}</p>`,
        text: text || '',
        attachments: finalAttachments.map(a => ({
          content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(a.content).toString('base64'),
          filename: a.filename,
          type: a.contentType,
        })),
      });
      return { success: true, via: 'sendgrid' };
    } catch (e) {
      console.error('SendGrid error:', e.message);
    }
  }

  console.warn('[MAIL] No provider configured', { to: toList, subject });
  return {
    success: false,
    via: 'none',
    error: 'No email provider configured. Set SMTP_HOST, RESEND_API_KEY, or SENDGRID_API_KEY in .env',
  };
}

module.exports = { sendMail, getFromAddress, generateBeautifulPDF, getBeautifulRFQEmailHTML };