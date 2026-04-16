const { Resend } = require('resend');
const nodemailer = require('nodemailer');

let resendClient = null;

function getFromAddress() {
  return process.env.FROM_EMAIL || 'onboarding@resend.dev';
}

// ====================== BEAUTIFUL EMAIL TEMPLATE ======================
const getBeautifulEmailHTML = (data, type, action, actor, nextApprover) => {
  const isEP = data.stakeholders !== undefined;
  const title = isEP ? data.title : data.titleOfActivity;
  const requester = isEP ? data.requester : data.requesterName;
  const department = data.department;
  const email = isEP ? data.email : data.emailId;
  const amount = data.amount || 0;
  const priority = data.priority === 'H' ? 'High' : data.priority === 'M' ? 'Medium' : data.priority === 'L' ? 'Low' : (data.priority || 'Medium');
  
  const priorityColor = priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#d97706' : '#16a34a';
  const statusColor = data.status === 'Approved' ? '#059669' : data.status === 'Rejected' ? '#dc2626' : '#d97706';
  
  let headerTitle = '';
  let headerSubtitle = '';
  let headerIcon = '';
  
  if (type === 'created') {
    headerTitle = 'New Request Created';
    headerSubtitle = 'A new procurement request requires your attention';
    headerIcon = '📋';
  } else if (type === 'approved') {
    headerTitle = 'Request Approved';
    headerSubtitle = `Approved by ${actor?.name || 'Approver'}`;
    headerIcon = '✅';
  } else if (type === 'rejected') {
    headerTitle = 'Request Rejected';
    headerSubtitle = `Rejected by ${actor?.name || 'Approver'}`;
    headerIcon = '❌';
  } else if (type === 'approval_needed') {
    headerTitle = 'Action Required';
    headerSubtitle = 'Your approval is needed for this request';
    headerIcon = '⚠️';
  }
  
  // Items HTML (for RFQ)
  const itemsHtml = (data.items || []).map((item, idx) => `
    <div style="background: ${idx % 2 === 0 ? '#f8fafc' : '#ffffff'}; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
      <div style="flex: 0.5;"><span style="font-weight: 600; color: #64748b;">${idx + 1}</span></div>
      <div style="flex: 3;"><strong style="color: #0f172a;">${escapeHtml(item.itemDescription)}</strong></div>
      <div style="flex: 1;"><span style="color: #475569;">${item.uom || 'Pcs'}</span></div>
      <div style="flex: 1;"><span style="color: #475569;">${item.quantity || 1}</span></div>
      <div style="flex: 2;"><span style="color: #475569;">${escapeHtml(item.make || '-')}</span></div>
    </div>
  `).join('');
  
  // Stakeholders HTML (for EP)
  const stakeholdersHtml = (data.stakeholders || []).map((s, idx) => `
    <div style="background: ${idx % 2 === 0 ? '#f8fafc' : '#ffffff'}; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
      <div style="flex: 0.5;"><span style="font-weight: 600; color: #64748b;">${idx + 1}</span></div>
      <div style="flex: 2;"><strong style="color: #0f172a;">${escapeHtml(s.name)}</strong></div>
      <div style="flex: 2;"><span style="color: #475569;">${escapeHtml(s.designation || '—')}</span></div>
      <div style="flex: 2;"><span style="color: #475569;">${escapeHtml(s.email)}</span></div>
      <div style="flex: 1.5;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${s.status === 'Approved' ? '#d1fae5' : s.status === 'Rejected' ? '#fee2e2' : '#fef3c7'}; color: ${s.status === 'Approved' ? '#059669' : s.status === 'Rejected' ? '#dc2626' : '#d97706'};">
          ${s.status || 'Pending'}
        </span>
      </div>
    </div>
  `).join('');
  
  const ccHtml = (data.ccList || data.ccTo || []).map(cc => `
    <span style="display: inline-block; background: #eff6ff; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin: 4px;">
      📧 ${escapeHtml(cc)}
    </span>
  `).join('');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LCGC RFQ - ${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      text-align: center;
      position: relative;
    }
    .email-header-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .email-header h1 {
      color: white;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
    }
    .email-header p {
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      margin: 0;
    }
    .email-content {
      padding: 40px;
    }
    .greeting {
      margin-bottom: 24px;
    }
    .greeting h2 {
      font-size: 20px;
      color: #0f172a;
      margin: 0 0 8px;
    }
    .info-card {
      background: #f8fafc;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
    }
    .info-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
    }
    .amount-box {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      border-radius: 12px;
      padding: 16px 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .amount-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .amount-value {
      font-size: 32px;
      font-weight: 800;
      color: #1e40af;
    }
    .priority-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 700;
    }
    .priority-high { background: #fee2e2; color: #dc2626; }
    .priority-medium { background: #fef3c7; color: #d97706; }
    .priority-low { background: #dcfce7; color: #16a34a; }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 12px;
      font-weight: 700;
    }
    .status-approved { background: #d1fae5; color: #059669; }
    .status-rejected { background: #fee2e2; color: #dc2626; }
    .status-pending { background: #fef3c7; color: #d97706; }
    .items-header {
      display: flex;
      background: #1e3a8a;
      color: white;
      padding: 12px 16px;
      border-radius: 12px 12px 0 0;
      font-weight: 600;
      font-size: 12px;
    }
    .items-container {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .cc-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .email-footer {
      background: #f8fafc;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .btn {
      display: inline-block;
      padding: 12px 28px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      text-decoration: none;
      border-radius: 40px;
      font-weight: 600;
      margin-top: 24px;
    }
    @media (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; gap: 12px; }
      .email-content { padding: 24px; }
      .email-header { padding: 24px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="email-header-icon">${headerIcon}</div>
      <h1>${headerTitle}</h1>
      <p>${headerSubtitle}</p>
    </div>
    
    <div class="email-content">
      <div class="greeting">
        <h2>Hello ${actor ? actor.name : 'Team'},</h2>
        <p style="color: #475569; margin-top: 8px;">${type === 'created' ? 'A new request has been submitted for your review.' : type === 'approved' ? 'The request has been approved.' : type === 'rejected' ? 'The request has been rejected.' : 'Please review this request.'}</p>
      </div>
      
      <div class="info-card">
        <div class="info-title">👤 Requester Information</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Name</span><span class="info-value">${escapeHtml(requester)}</span></div>
          <div class="info-item"><span class="info-label">Department</span><span class="info-value">${escapeHtml(department)}</span></div>
          <div class="info-item"><span class="info-label">Email</span><span class="info-value">${escapeHtml(email)}</span></div>
          <div class="info-item"><span class="info-label">Request Date</span><span class="info-value">${new Date().toLocaleDateString()}</span></div>
        </div>
      </div>
      
      <div class="info-card">
        <div class="info-title">🎯 Request Details</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Title</span><span class="info-value" style="font-size: 16px; font-weight: 700;">${escapeHtml(title)}</span></div>
          <div class="info-item"><span class="info-label">Priority</span><span class="info-value"><span class="priority-badge priority-${priority.toLowerCase()}">${priority}</span></span></div>
          <div class="info-item"><span class="info-label">Status</span><span class="info-value"><span class="status-badge status-${data.status?.toLowerCase() || 'pending'}">${data.status || 'Pending'}</span></span></div>
        </div>
      </div>
      
      <div class="amount-box">
        <div class="amount-label">💰 Total Amount</div>
        <div class="amount-value">₹${amount.toLocaleString('en-IN')}</div>
      </div>
      
      ${data.items && data.items.length > 0 ? `
      <div class="info-title">📦 Items</div>
      <div class="items-container">
        <div class="items-header">
          <div style="flex: 0.5;">#</div>
          <div style="flex: 3;">Description</div>
          <div style="flex: 1;">UOM</div>
          <div style="flex: 1;">Qty</div>
          <div style="flex: 2;">Make</div>
        </div>
        ${itemsHtml}
      </div>
      ` : ''}
      
      ${data.stakeholders && data.stakeholders.length > 0 ? `
      <div class="info-title">👥 Approval Chain</div>
      <div class="items-container">
        <div class="items-header">
          <div style="flex: 0.5;">#</div>
          <div style="flex: 2;">Stakeholder</div>
          <div style="flex: 2;">Designation</div>
          <div style="flex: 2;">Email</div>
          <div style="flex: 1.5;">Status</div>
        </div>
        ${stakeholdersHtml}
      </div>
      ` : ''}
      
      ${actor && actor.remarks ? `
      <div class="info-card" style="background: #fef3c7; border-left: 4px solid #d97706;">
        <div class="info-title">📝 Remarks</div>
        <p style="color: #0f172a; margin: 0;">${escapeHtml(actor.remarks)}</p>
      </div>
      ` : ''}
      
      ${(data.ccList || data.ccTo || []).length > 0 ? `
      <div class="info-card">
        <div class="info-title">📧 CC Recipients</div>
        <div class="cc-container">${ccHtml}</div>
      </div>
      ` : ''}
      
      <div style="text-align: center;">
        <a href="${process.env.APP_URL || '#'}" class="btn">🔍 View in Dashboard</a>
      </div>
    </div>
    
    <div class="email-footer">
      <p style="margin: 0 0 8px;">This is an automated message from LCGC RFQ System</p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">© ${new Date().getFullYear()} LCGC RFQ. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
};

// ====================== BEAUTIFUL PDF TEMPLATE ======================
const generateBeautifulPDF = async (data) => {
  const PDFDocument = require('pdfkit');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4',
        info: {
          Title: `Request-${data._id || Date.now()}`,
          Author: data.requester || data.requesterName,
          Subject: 'Procurement Request'
        }
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const isEP = data.stakeholders !== undefined;
      const title = isEP ? data.title : data.titleOfActivity;
      const requester = isEP ? data.requester : data.requesterName;
      const department = data.department;
      const email = isEP ? data.email : data.emailId;
      const amount = data.amount || 0;
      const priority = data.priority === 'H' ? 'High' : data.priority === 'M' ? 'Medium' : data.priority === 'L' ? 'Low' : (data.priority || 'Medium');
      
      // Gradient Header
      doc.rect(0, 0, doc.page.width, 160).fill('#667eea');
      doc.rect(0, 0, doc.page.width, 160).fill('#764ba2', 0.7);
      
      // Decorative circles
      doc.circle(doc.page.width - 80, 40, 80).fill('#ffffff', 0.08);
      doc.circle(-40, 120, 100).fill('#ffffff', 0.06);
      doc.circle(doc.page.width - 150, 130, 60).fill('#ffffff', 0.05);
      
      // Logo/Title
      doc.fontSize(12)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text('LCGC RFQ SYSTEM', 50, 45, { continued: true })
         .fillColor('#e0e7ff')
         .text('  •  PROCUREMENT EXCELLENCE');
      
      // Main Title
      doc.fontSize(32)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text(isEP ? 'EP Approval Request' : 'Requisition RFQ (NPP)', 50, 85);
      
      // Status Badge
      const status = data.status || 'Pending';
      const statusColor = status === 'Approved' ? '#10b981' : status === 'Rejected' ? '#ef4444' : '#f59e0b';
      
      doc.fontSize(11)
         .fillColor(statusColor)
         .font('Helvetica-Bold')
         .text(`●  ${status}`, doc.page.width - 150, 80, { align: 'right' });
      
      doc.fontSize(9)
         .fillColor('#c7d2fe')
         .text(`Generated: ${new Date().toLocaleString()}`, doc.page.width - 150, 100, { align: 'right' });
      
      doc.fontSize(9)
         .fillColor('#c7d2fe')
         .text(`ID: ${data._id || 'N/A'}`, doc.page.width - 150, 120, { align: 'right' });
      
      doc.moveDown(4);
      
      // Requester Information Card
      doc.roundedRect(50, doc.y, doc.page.width - 100, 130, 12)
         .fill('#f8fafc')
         .stroke('#e2e8f0', 1);
      
      doc.fillColor('#1e3a8a')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('👤  Requester Information', 70, doc.y - 115);
      
      let startY = doc.y - 95;
      
      const drawField = (label, value, x, y) => {
        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(label, x, y);
        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(value || '—', x + 100, y);
      };
      
      drawField('Name:', requester, 70, startY);
      drawField('Department:', department, 320, startY);
      startY += 25;
      drawField('Email:', email, 70, startY);
      drawField('Organization:', data.organization || 'Radiant Appliances', 320, startY);
      startY += 25;
      drawField('Request Date:', data.requestDate ? new Date(data.requestDate).toLocaleDateString() : new Date().toLocaleDateString(), 70, startY);
      drawField('Contact No.:', data.contactNo || '—', 320, startY);
      
      doc.moveDown(2);
      
      // Activity Details Card
      doc.roundedRect(50, doc.y, doc.page.width - 100, 120, 12)
         .fill('#ffffff')
         .stroke('#e2e8f0', 1);
      
      doc.fillColor('#1e3a8a')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('🎯  Activity Details', 70, doc.y - 105);
      
      let activityY = doc.y - 85;
      
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Title:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(title || '—', 130, activityY);
      
      // Priority Badge
      const priorityColor = priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#d97706' : '#16a34a';
      doc.roundedRect(doc.page.width - 140, activityY - 3, 80, 22, 11).fill(priorityColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(`${priority} Priority`, doc.page.width - 135, activityY + 2);
      
      activityY += 25;
      doc.fillColor('#64748b').font('Helvetica').text('Vendor:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica').text(data.vendor || '—', 130, activityY);
      
      activityY += 25;
      doc.fillColor('#64748b').font('Helvetica').text('Description:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica').text(data.description || 'No description', 150, activityY, { width: 400 });
      
      activityY += 25;
      doc.fillColor('#64748b').font('Helvetica').text('Objective:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica').text(data.objective || '—', 150, activityY, { width: 400 });
      
      doc.moveDown(2);
      
      // Amount Box
      const amountY = doc.y;
      doc.roundedRect(50, amountY, doc.page.width - 100, 60, 12)
         .fill('linear-gradient(135deg, #667eea15, #764ba215)')
         .stroke('#e2e8f0', 1);
      
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Total Amount', 70, amountY + 15);
      doc.fillColor('#1e3a8a').fontSize(28).font('Helvetica-Bold').text(`₹ ${amount.toLocaleString('en-IN')}`, 70, amountY + 30);
      
      doc.moveDown(3);
      
      // Items or Stakeholders Table
      if (data.items && data.items.length > 0) {
        doc.fillColor('#1e3a8a').fontSize(14).font('Helvetica-Bold').text('📦  Items', 50, doc.y);
        doc.moveDown(0.8);
        
        const tableTop = doc.y;
        const colPositions = [60, 160, 260, 340, 420];
        
        doc.rect(50, tableTop - 5, doc.page.width - 100, 30).fill('#1e3a8a');
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
        doc.text('#', colPositions[0], tableTop);
        doc.text('Item Description', colPositions[1], tableTop);
        doc.text('UOM', colPositions[2], tableTop);
        doc.text('Qty', colPositions[3], tableTop);
        doc.text('Make', colPositions[4], tableTop);
        
        let rowY = tableTop + 25;
        data.items.forEach((item, idx) => {
          if (rowY > doc.page.height - 100) { doc.addPage(); rowY = 50; }
          if (idx % 2 === 0) doc.rect(50, rowY - 3, doc.page.width - 100, 25).fill('#f8fafc');
          doc.fillColor('#334155').fontSize(9).font('Helvetica');
          doc.text((idx + 1).toString(), colPositions[0], rowY);
          doc.text(item.itemDescription || '—', colPositions[1], rowY, { width: 90 });
          doc.text(item.uom || 'Pcs', colPositions[2], rowY);
          doc.text((item.quantity || 0).toString(), colPositions[3], rowY);
          doc.text(item.make || '—', colPositions[4], rowY);
          rowY += 22;
        });
      }
      
      if (data.stakeholders && data.stakeholders.length > 0) {
        doc.addPage();
        doc.fillColor('#1e3a8a').fontSize(14).font('Helvetica-Bold').text('👥  Approval Workflow', 50, 50);
        doc.moveDown(0.8);
        
        const tableTop = doc.y;
        const colPositions = [60, 160, 280, 380, 480];
        
        doc.rect(50, tableTop - 5, doc.page.width - 100, 30).fill('#1e3a8a');
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
        doc.text('#', colPositions[0], tableTop);
        doc.text('Stakeholder', colPositions[1], tableTop);
        doc.text('Designation', colPositions[2], tableTop);
        doc.text('Email', colPositions[3], tableTop);
        doc.text('Status', colPositions[4], tableTop);
        
        let rowY = tableTop + 25;
        data.stakeholders.forEach((s, idx) => {
          if (rowY > doc.page.height - 80) { doc.addPage(); rowY = 50; }
          if (idx % 2 === 0) doc.rect(50, rowY - 3, doc.page.width - 100, 25).fill('#f8fafc');
          doc.fillColor('#334155').fontSize(9).font('Helvetica');
          doc.text((idx + 1).toString(), colPositions[0], rowY);
          doc.text(s.name || '—', colPositions[1], rowY, { width: 110 });
          doc.text(s.designation || '—', colPositions[2], rowY);
          doc.text(s.email || '—', colPositions[3], rowY, { width: 90 });
          const statusText = s.status || 'Pending';
          const statusColor = statusText === 'Approved' ? '#10b981' : statusText === 'Rejected' ? '#ef4444' : '#f59e0b';
          doc.fillColor(statusColor).text(statusText, colPositions[4], rowY);
          doc.fillColor('#334155');
          rowY += 22;
        });
      }
      
      // Footer
      const footerY = doc.page.height - 60;
      doc.rect(0, footerY, doc.page.width, 60).fill('#f8fafc');
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
         .text('This is an automatically generated document from LCGC RFQ System.', 50, footerY + 20, { align: 'center', width: doc.page.width - 100 });
      doc.text(`© ${new Date().getFullYear()} LCGC RFQ. All rights reserved.`, 50, footerY + 38, { align: 'center', width: doc.page.width - 100 });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

// ====================== MAIN SEND MAIL FUNCTION ======================
async function sendMail(opts) {
  const { to, cc, subject, html, text, rfqData, epRequestData, action, actor, nextApprover } = opts;
  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean);
  
  if (toList.length === 0) {
    return { success: false, error: 'No recipients' };
  }

  // Generate beautiful HTML if data is provided
  let finalHtml = html;
  if (!html && (rfqData || epRequestData)) {
    const data = rfqData || epRequestData;
    finalHtml = getBeautifulEmailHTML(data, action, action, actor, nextApprover);
  }

  const from = getFromAddress();
  
  // Generate PDF
  let pdfBuffer = null;
  const requestData = rfqData || epRequestData;
  if (requestData) {
    try {
      pdfBuffer = await generateBeautifulPDF(requestData);
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr.message);
    }
  }

  // Send via Resend
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
    
    const payload = {
      from: from,
      to: toList,
      subject: subject,
      html: finalHtml || `<p>${text || subject}</p>`,
      text: text || '',
    };
    
    if (cc?.length) payload.cc = Array.isArray(cc) ? cc : [cc];
    
    if (pdfBuffer) {
      payload.attachments = [{
        filename: `Request_${requestData._id || Date.now()}.pdf`,
        content: pdfBuffer.toString('base64'),
      }];
    }
    
    console.log(`📧 Sending email to: ${toList.join(', ')}`);
    const { data, error } = await resendClient.emails.send(payload);
    
    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`✅ Email sent! ID: ${data?.id}`);
    return { success: true, via: 'resend', id: data?.id };
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    return { success: false, error: e.message };
  }
}

module.exports = { sendMail, getFromAddress, generateBeautifulPDF };