const PDFDocument = require('pdfkit');

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Generate beautiful PDF from any request data (EP, RFQ, PR, PO, Payment)
 */
const generateBeautifulPDF = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      const isEP = data.stakeholders !== undefined && !data.source;
      const isRFQ = data.items !== undefined && !data.source && !data.stakeholders;
      const isPR = data.source === 'PR-REQUEST-NPP' || (data.items && data.items[0] && data.items[0].costCenter);
      const isPO = data.source === 'PO-NPP' || (data.orderNo !== undefined);
      const isPayment = data.source === 'PAYMENT-ADVISE-NPP' || (data.invoices !== undefined);
      
      const title = isEP ? data.title : (isRFQ ? data.titleOfActivity : (isPO ? data.orderNo : (isPR ? data.titleOfActivity : (data.titleOfActivity || 'Request'))));
      const requester = isEP ? data.requester : (data.requesterName || data.purchaser || 'User');
      const department = data.department || '—';
      const email = isEP ? data.email : (data.emailId || '—');
      const amount = data.amount || 0;
      const priority = data.priority === 'H' ? 'High' : data.priority === 'M' ? 'Medium' : data.priority === 'L' ? 'Low' : (data.priority || 'Medium');
      
      // Header
      doc.rect(0, 0, doc.page.width, 140).fill('#0f2a5e');
      doc.circle(doc.page.width - 80, 40, 80).fill('#1e4a8a', 0.3);
      doc.circle(-40, 120, 100).fill('#1e4a8a', 0.2);
      
      doc.fontSize(28).fillColor('#ffffff').font('Helvetica-Bold').text('LCGC RFQ System', 50, 50);
      doc.fontSize(12).fillColor('#94a3b8').font('Helvetica').text(isEP ? 'EP Approval Request' : (isPO ? 'Purchase Order' : (isPR ? 'PR Request' : (isPayment ? 'Payment Advice' : 'Requisition RFQ'))), 50, 90);
      
      const status = data.status || 'Pending';
      const statusColor = status === 'Approved' ? '#10b981' : status === 'Rejected' ? '#ef4444' : '#d97706';
      doc.fontSize(11).fillColor(statusColor).font('Helvetica-Bold').text(`●  ${status}`, doc.page.width - 150, 80, { align: 'right' });
      doc.fontSize(9).fillColor('#94a3b8').text(`Generated: ${new Date().toLocaleString()}`, doc.page.width - 150, 100, { align: 'right' });
      doc.fontSize(9).fillColor('#94a3b8').text(`ID: ${data._id || 'N/A'}`, doc.page.width - 150, 120, { align: 'right' });
      
      doc.moveDown(4);
      
      // Requester Information
      doc.roundedRect(50, doc.y, doc.page.width - 100, 130, 12).fill('#f8fafc').stroke('#e2e8f0', 1);
      doc.fillColor('#1e3a8a').fontSize(14).font('Helvetica-Bold').text('👤  Requester Information', 70, doc.y - 115);
      
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
      drawField('Request Date:', data.requestDate || new Date().toLocaleDateString(), 70, startY);
      drawField('Contact No.:', data.contactNo || '—', 320, startY);
      
      doc.moveDown(2);
      
      // Activity Details
      doc.roundedRect(50, doc.y, doc.page.width - 100, 100, 12).fill('#ffffff').stroke('#e2e8f0', 1);
      doc.fillColor('#1e3a8a').fontSize(14).font('Helvetica-Bold').text('🎯  Activity Details', 70, doc.y - 85);
      
      let activityY = doc.y - 65;
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Title:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(title || '—', 130, activityY);
      
      const priorityColor = priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#d97706' : '#16a34a';
      doc.roundedRect(doc.page.width - 140, activityY - 3, 80, 22, 11).fill(priorityColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(`${priority} Priority`, doc.page.width - 135, activityY + 2);
      
      activityY += 25;
      doc.fillColor('#64748b').font('Helvetica').text('Vendor:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica').text(data.vendor || data.vendorName || '—', 130, activityY);
      
      activityY += 25;
      doc.fillColor('#64748b').font('Helvetica').text('Description:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica').text((data.description || data.purposeAndObjective || 'No description').substring(0, 200), 150, activityY, { width: 400 });
      
      doc.moveDown(2);
      
      // Amount
      const amountY = doc.y;
      doc.roundedRect(50, amountY, doc.page.width - 100, 60, 12).fill('#e0e7ff').stroke('#e2e8f0', 1);
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Total Amount', 70, amountY + 15);
      doc.fillColor('#1e3a8a').fontSize(28).font('Helvetica-Bold').text(`₹ ${amount.toLocaleString('en-IN')}`, 70, amountY + 30);
      
      doc.moveDown(3);
      
      // PO Items
      if (isPO && data.items && data.items.length > 0) {
        doc.fillColor('#1e3a8a').fontSize(14).font('Helvetica-Bold').text('📦  Order Items', 50, doc.y);
        doc.moveDown(0.8);
        
        const tableTop = doc.y;
        const colPositions = [60, 120, 200, 260, 310, 370, 430, 480, 530];
        doc.rect(50, tableTop - 5, doc.page.width - 100, 28).fill('#1e3a8a');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text('#', 55, tableTop);
        doc.text('Part Code', 100, tableTop);
        doc.text('Description', 160, tableTop);
        doc.text('UOM', 250, tableTop);
        doc.text('Qty', 290, tableTop);
        doc.text('Unit Price', 340, tableTop);
        doc.text('CGST', 400, tableTop);
        doc.text('SGST', 440, tableTop);
        doc.text('Total', 490, tableTop);
        
        let rowY = tableTop + 23;
        data.items.forEach((item, idx) => {
          if (rowY > doc.page.height - 80) { doc.addPage(); rowY = 50; }
          if (idx % 2 === 0) doc.rect(50, rowY - 3, doc.page.width - 100, 22).fill('#f8fafc');
          doc.fillColor('#334155').fontSize(8).font('Helvetica');
          doc.text((idx + 1).toString(), 55, rowY);
          doc.text(item.partCode || '—', 100, rowY);
          doc.text((item.partDescription || '—').substring(0, 25), 160, rowY);
          doc.text(item.uom || 'Pcs', 250, rowY);
          doc.text((item.qty || 0).toString(), 290, rowY);
          doc.text(`₹${(item.unitPrice || 0).toLocaleString('en-IN')}`, 340, rowY);
          doc.text(`${item.cgst || 0}%`, 400, rowY);
          doc.text(`${item.sgst || 0}%`, 440, rowY);
          const total = (item.qty || 0) * (item.unitPrice || 0) + ((item.cgst || 0) + (item.sgst || 0) + (item.igst || 0)) * (item.qty || 0) * (item.unitPrice || 0) / 100;
          doc.text(`₹${total.toLocaleString('en-IN')}`, 490, rowY);
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

module.exports = { generateBeautifulPDF };