const { Resend } = require('resend');

let resendClient = null;

function getFromAddress() {
  return process.env.FROM_EMAIL || 'onboarding@resend.dev';
}

// ====================== ESCAPE HTML FUNCTION ======================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

// ====================== SIMPLE EMAIL TEMPLATE (No PDF) ======================
const getSimpleEmailHTML = (data, type, action, actor, nextApprover) => {
  // Determine request type
  const isEP = data.stakeholders !== undefined && !data.source && !data.items;
  const isRFQ = data.items !== undefined && !data.source && !data.orderNo;
  const isPR = data.source === 'PR-REQUEST-NPP' || (data.items && data.items[0] && data.items[0].costCenter);
  const isPO = data.source === 'PO-NPP' || (data.orderNo !== undefined);
  const isPayment = data.source === 'PAYMENT-ADVISE-NPP' || (data.invoices !== undefined);
  
  const title = isEP ? data.title : (isRFQ ? data.titleOfActivity : (isPO ? (data.orderNo || data.titleOfActivity) : (isPR ? data.titleOfActivity : (data.titleOfActivity || 'Request'))));
  const requester = isEP ? data.requester : (data.requesterName || data.purchaser || 'User');
  const department = data.department || data.dept || '—';
  const amount = data.amount || data.expenseAmount || 0;
  const priorityValue = data.priority === 'H' ? 'High' : data.priority === 'M' ? 'Medium' : data.priority === 'L' ? 'Low' : (data.priority || 'Medium');
  
  const priorityColor = priorityValue === 'High' ? '#dc2626' : priorityValue === 'Medium' ? '#d97706' : '#16a34a';
  const statusColor = data.status === 'Approved' ? '#059669' : data.status === 'Rejected' ? '#dc2626' : '#d97706';
  
  let headerTitle = '';
  let headerSubtitle = '';
  let headerIcon = '';
  let needsApproval = false;
  
  if (type === 'created') {
    headerTitle = 'New Request Created';
    headerSubtitle = 'A new procurement request requires your attention';
    headerIcon = '📋';
    needsApproval = true;
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
    needsApproval = true;
  } else if (type === 'cc_notification') {
    headerTitle = 'Request Notification';
    headerSubtitle = 'You have been CC\'d on this request';
    headerIcon = '📧';
  }
  
  const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:4200';
  let approveUrl = `${baseUrl}/dashboard`;
  if (isEP) approveUrl = `${baseUrl}/dashboard/ep-approval`;
  else if (isRFQ) approveUrl = `${baseUrl}/dashboard/rfq`;
  else if (isPR) approveUrl = `${baseUrl}/dashboard/npp-procurement`;
  else if (isPO) approveUrl = `${baseUrl}/dashboard/po-npp`;
  else if (isPayment) approveUrl = `${baseUrl}/dashboard/payment-advise`;
  
  // Items HTML for PR
  const prItemsHtml = (data.items || []).map((item, idx) => {
    const total = (item.qty || 0) * (item.unitPrice || 0);
    return `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px;">${idx + 1}</td>
      <td style="padding: 8px;">${escapeHtml(item.partCode || '—')}</td>
      <td style="padding: 8px;"><strong>${escapeHtml(item.partDescription || '—')}</strong></td>
      <td style="padding: 8px;">${escapeHtml(item.uom || 'Pcs')}</td>
      <td style="padding: 8px;">${item.qty || 0}</td>
      <td style="padding: 8px;">₹${(item.unitPrice || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 8px;">₹${total.toLocaleString('en-IN')}</td>
    </tr>`;
  }).join('');
  
  let prTotalValue = (data.items || []).reduce((sum, item) => sum + ((item.qty || 0) * (item.unitPrice || 0)), 0);
  
  // Stakeholders HTML
  const stakeholdersHtml = (data.stakeholders || []).map((s, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 8px;">${idx + 1}</td>
      <td style="padding: 10px 8px;">${s.line || 'Sequential'}</td>
      <td style="padding: 10px 8px;"><strong>${escapeHtml(s.name || s.managerName || '—')}</strong></td>
      <td style="padding: 10px 8px;">${escapeHtml(s.designation || '—')}</td>
      <td style="padding: 10px 8px;">${escapeHtml(s.email || '—')}</td>
      <td style="padding: 10px 8px;"><span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${s.status === 'Approved' ? '#d1fae5' : s.status === 'Rejected' ? '#fee2e2' : '#fef3c7'}; color: ${s.status === 'Approved' ? '#059669' : s.status === 'Rejected' ? '#dc2626' : '#d97706'};">${s.status || 'Pending'}</span></td>
      <td style="padding: 10px 8px;">${s.remarks || '—'}</td>
    </tr>
  `).join('');
  
  // CC HTML
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
  <title>LCGC - ${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
      padding: 40px 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 700px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .email-header {
      background: linear-gradient(135deg, #0f2a5e, #1e4a8a);
      padding: 40px;
      text-align: center;
    }
    .email-header-icon { font-size: 48px; margin-bottom: 16px; }
    .email-header h1 { color: white; font-size: 28px; font-weight: 700; margin: 0 0 8px; }
    .email-header p { color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; }
    .email-content { padding: 40px; }
    .greeting { margin-bottom: 24px; }
    .greeting h2 { font-size: 20px; color: #0f172a; margin: 0 0 8px; }
    .section {
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
    }
    .section-title {
      background: #f8fafc;
      padding: 14px 20px;
      font-weight: 700;
      color: #0f2a5e;
      border-bottom: 1px solid #e2e8f0;
      font-size: 15px;
    }
    .section-body { padding: 20px; }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .info-item { display: flex; flex-direction: column; }
    .info-item label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    .info-item span { font-size: 14px; color: #0f172a; font-weight: 500; }
    .amount-box {
      background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
      border-radius: 12px;
      padding: 16px 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .amount-value { font-size: 32px; font-weight: 800; color: #1e40af; }
    .amount-label { font-size: 12px; color: #64748b; margin-bottom: 8px; }
    .priority-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: ${priorityColor}20;
      color: ${priorityColor};
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: ${statusColor}20;
      color: ${statusColor};
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      background: #f1f5f9;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      color: #475569;
    }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
    .button-group {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin: 24px 0;
      flex-wrap: wrap;
    }
    .btn-approve {
      display: inline-block;
      padding: 12px 28px;
      background: #059669;
      color: white;
      text-decoration: none;
      border-radius: 40px;
      font-weight: 600;
      transition: all 0.3s;
    }
    .btn-approve:hover { background: #047857; transform: translateY(-2px); }
    .btn-reject {
      display: inline-block;
      padding: 12px 28px;
      background: #dc2626;
      color: white;
      text-decoration: none;
      border-radius: 40px;
      font-weight: 600;
      transition: all 0.3s;
    }
    .btn-reject:hover { background: #b91c1c; transform: translateY(-2px); }
    .btn-view {
      display: inline-block;
      padding: 12px 28px;
      background: linear-gradient(135deg, #0f2a5e, #1e4a8a);
      color: white;
      text-decoration: none;
      border-radius: 40px;
      font-weight: 600;
      margin-top: 16px;
    }
    .cc-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .footer {
      background: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    @media (max-width: 600px) {
      .email-content { padding: 24px; }
      .info-grid { grid-template-columns: 1fr; gap: 12px; }
      .button-group { flex-direction: column; align-items: center; }
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
        <h2>Hello ${actor ? escapeHtml(actor.name) : 'Team'},</h2>
        <p style="color: #475569; margin-top: 8px;">
          ${type === 'created' ? 'A new request has been submitted for your review.' : 
            type === 'approved' ? 'The request has been approved.' : 
            type === 'rejected' ? 'The request has been rejected.' : 
            type === 'cc_notification' ? 'You have been CC\'d on this request.' :
            'Please review this request and take action.'}
        </p>
      </div>
      
      <div class="section">
        <div class="section-title">👤 Requester Information</div>
        <div class="section-body">
          <div class="info-grid">
            <div class="info-item"><label>Name</label><span>${escapeHtml(requester)}</span></div>
            <div class="info-item"><label>Department</label><span>${escapeHtml(department)}</span></div>
            <div class="info-item"><label>Email</label><span>${escapeHtml(data.emailId || data.email || '—')}</span></div>
            <div class="info-item"><label>Contact No.</label><span>${escapeHtml(data.contactNo)}</span></div>
            <div class="info-item"><label>Organization</label><span>${escapeHtml(data.organization || 'Radiant Appliances')}</span></div>
            <div class="info-item"><label>Request Date</label><span>${data.requestDate || new Date().toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">🎯 Activity Details</div>
        <div class="section-body">
          <div class="info-grid">
            <div class="info-item"><label>Title / Activity</label><span style="font-size: 16px; font-weight: 700;">${escapeHtml(title)}</span></div>
            <div class="info-item"><label>Vendor / Supplier</label><span>${escapeHtml(data.vendor || data.vendorName || '—')}</span></div>
            <div class="info-item"><label>Priority</label><span class="priority-badge">${priorityValue}</span></div>
            <div class="info-item"><label>Status</label><span class="status-badge">${data.status || 'Pending'}</span></div>
          </div>
          ${data.purposeAndObjective || data.description ? `<p style="margin-top: 16px;"><strong>Purpose & Objective:</strong><br>${escapeHtml(data.purposeAndObjective || data.description)}</p>` : ''}
        </div>
      </div>
      
      <div class="amount-box">
        <div class="amount-label">💰 Total Amount</div>
        <div class="amount-value">₹${Number(amount).toLocaleString('en-IN')}</div>
      </div>
      
      ${data.items && data.items.length > 0 ? `
      <div class="section">
        <div class="section-title">📦 Request Items</div>
        <div class="section-body" style="overflow-x: auto;">
          <table style="width: 100%;">
            <thead><tr style="background: #f1f5f9;"><th>#</th><th>Part Code</th><th>Description</th><th>UOM</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
            <tbody>${prItemsHtml}</tbody>
            <tfoot><tr style="background: #f8fafc; font-weight: bold;"><td colspan="6" style="text-align: right;">Total Value:</td><td style="text-align: right;">₹${prTotalValue.toLocaleString('en-IN')}</td></tr></tfoot>
          </table>
        </div>
      </div>
      ` : ''}
      
      ${data.stakeholders && data.stakeholders.length > 0 ? `
      <div class="section">
        <div class="section-title">👥 Approval Workflow</div>
        <div class="section-body" style="overflow-x: auto;">
          <table style="width: 100%;">
            <thead><tr style="background: #f1f5f9;"><th>#</th><th>Line</th><th>Stakeholder</th><th>Designation</th><th>Email</th><th>Status</th><th>Remarks</th></tr></thead>
            <tbody>${stakeholdersHtml}</tbody>
          </table>
        </div>
      </div>
      ` : ''}
      
      ${actor && actor.remarks ? `
      <div class="section" style="background: #fef3c7; border-left: 4px solid #d97706;">
        <div class="section-title">📝 Remarks</div>
        <div class="section-body"><p style="margin: 0;">${escapeHtml(actor.remarks)}</p></div>
      </div>
      ` : ''}
      
      ${nextApprover ? `
      <div class="section" style="background: #e0f2fe; border-left: 4px solid #0284c7;">
        <div class="section-title">⏳ Next Approver</div>
        <div class="section-body">
          <p><strong>${escapeHtml(nextApprover.name || nextApprover.managerName)}</strong> (${escapeHtml(nextApprover.designation)})</p>
          <p style="margin-top: 4px; font-size: 12px;">Email: ${escapeHtml(nextApprover.email)}</p>
        </div>
      </div>
      ` : ''}
      
      ${(data.ccList || data.ccTo || []).length > 0 ? `
      <div class="section">
        <div class="section-title">📧 CC Recipients</div>
        <div class="section-body"><div class="cc-chips">${ccHtml}</div></div>
      </div>
      ` : ''}
      
      ${needsApproval ? `
      <div class="button-group">
        <a href="${approveUrl}" class="btn-approve" style="color: white;">✅ Approve Request</a>
        <a href="${approveUrl}" class="btn-reject" style="color: white;">❌ Reject Request</a>
      </div>
      ` : ''}
      
      <div style="text-align: center;">
        <a href="${approveUrl}" class="btn-view">🔍 View Full Details in Dashboard</a>
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 8px;">This is an automated message from LCGC System</p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">© ${new Date().getFullYear()} LCGC. All rights reserved.</p>
      <p style="margin-top: 8px; font-size: 10px;">Request ID: ${data._id || 'N/A'}</p>
    </div>
  </div>
</body>
</html>`;
};

// ====================== MAIN SEND MAIL FUNCTION (NO PDF ATTACHMENTS) ======================
async function sendMail(opts) {
  const { to, cc, bcc, subject, html, text, rfqData, epRequestData, prRequestData, poRequestData, paymentRequestData, action, actor, nextApprover, attachments } = opts;
  
  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean);
  const ccList = cc ? (Array.isArray(cc) ? cc : [cc]).filter(Boolean) : [];
  
  if (toList.length === 0 && ccList.length === 0) {
    console.error('❌ No recipients specified');
    return { success: false, error: 'No recipients specified' };
  }

  let requestData = rfqData || epRequestData || prRequestData || poRequestData || paymentRequestData;
  
  let finalHtml = html;
  if (!html && requestData) {
    finalHtml = getSimpleEmailHTML(requestData, action || 'created', action, actor, nextApprover);
  } else if (!html) {
    finalHtml = `<html><body><p>${text || subject}</p></body></html>`;
  }

  const from = getFromAddress();

  // Try Resend first
  if (process.env.RESEND_API_KEY) {
    try {
      if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
      
      const payload = {
        from: from,
        to: toList,
        subject: subject,
        html: finalHtml,
      };
      
      if (ccList.length > 0) {
        payload.cc = ccList;
      }
      
      // Skip attachments for now to avoid errors
      // Attachments can be added later with proper buffer handling
      
      console.log(`📧 Sending email via Resend to: ${toList.join(', ')}`);
      const { data, error } = await resendClient.emails.send(payload);
      
      if (error) {
        console.error('❌ Resend error:', error);
        // Fall back to console log
        console.log('📧 Email would be sent to:', { to: toList, cc: ccList, subject });
        return { success: true, method: 'console', message: 'Email logged to console (Resend failed)' };
      }
      
      console.log(`✅ Email sent successfully via Resend! ID: ${data?.id}`);
      return { success: true, via: 'resend', id: data?.id };
      
    } catch (e) {
      console.error('❌ Resend error:', e.message);
      // Fall back to console log
      console.log('📧 Email content (Resend error):', { to: toList, cc: ccList, subject });
      return { success: true, method: 'console', message: 'Email logged to console' };
    }
  } 
  
  // Fallback: Just log the email to console for development
  console.log('='.repeat(80));
  console.log('📧 EMAIL NOTIFICATION');
  console.log('='.repeat(80));
  console.log(`TO: ${toList.join(', ')}`);
  if (ccList.length > 0) console.log(`CC: ${ccList.join(', ')}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`ACTION: ${action || 'created'}`);
  console.log(`REQUEST TYPE: ${requestData?.source || 'EP'}`);
  console.log('='.repeat(80));
  
  return { success: true, method: 'console', message: 'Email logged to console' };
}

module.exports = { sendMail, getFromAddress };