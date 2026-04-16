const PDFDocument = require('pdfkit');

/**
 * Generate beautiful PDF from RFQ request data
 * @param {object} request - RFQ request object
 * @returns {Promise<Buffer>} PDF buffer
 */
const generatePDFFromRequest = async (request) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4',
        info: {
          Title: `EP-Request-${request._id || Date.now()}`,
          Author: request.requester || 'System',
          Subject: 'EP Approval Request'
        }
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header with gradient effect
      doc.rect(0, 0, doc.page.width, 140).fill('#0f2a5e');
      
      // Decorative elements
      doc.circle(doc.page.width - 60, 40, 70).fill('#1e4a8a', 0.3);
      doc.circle(-30, 110, 90).fill('#1e4a8a', 0.2);
      
      // Title
      doc.fontSize(28)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text('EP Approval Request', 50, 50);
      
      doc.fontSize(12)
         .fillColor('#94a3b8')
         .font('Helvetica')
         .text(request.title || 'N/A', 50, 90);
      
      // Status badge
      const status = request.status || 'Pending';
      const statusColor = status === 'Approved' ? '#10b981' : status === 'Rejected' ? '#ef4444' : '#d97706';
      
      doc.fontSize(11)
         .fillColor(statusColor)
         .font('Helvetica-Bold')
         .text(`●  ${status}`, doc.page.width - 150, 60, { align: 'right' });
      
      doc.fontSize(9)
         .fillColor('#94a3b8')
         .text(`Generated: ${new Date().toLocaleString()}`, doc.page.width - 150, 80, { align: 'right' });
      
      doc.fontSize(9)
         .fillColor('#94a3b8')
         .text(`Request ID: ${request._id || 'N/A'}`, doc.page.width - 150, 100, { align: 'right' });
      
      doc.moveDown(3);
      
      // Requester Information Card
      doc.roundedRect(50, doc.y, doc.page.width - 100, 120, 10)
         .fill('#f8fafc')
         .stroke('#e2e8f0');
      
      doc.fillColor('#0f2a5e')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('👤  Requester Information', 70, doc.y - 105);
      
      let startY = doc.y - 85;
      
      const drawField = (label, value, x, y) => {
        doc.fillColor('#64748b').fontSize(9).font('Helvetica').text(label, x, y);
        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(value || '—', x + 110, y);
      };
      
      drawField('Name:', request.requester, 70, startY);
      drawField('Department:', request.department, 350, startY);
      
      startY += 25;
      drawField('Email:', request.email, 70, startY);
      drawField('Contact No.:', request.contactNo, 350, startY);
      
      startY += 25;
      drawField('Organization:', request.organization || 'Radiant', 70, startY);
      drawField('Request Date:', request.requestDate || new Date().toLocaleDateString(), 350, startY);
      
      doc.moveDown(2);
      
      // Activity Details
      doc.roundedRect(50, doc.y, doc.page.width - 100, 100, 10)
         .fill('#ffffff')
         .stroke('#e2e8f0');
      
      doc.fillColor('#0f2a5e')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('🎯  Activity Details', 70, doc.y - 85);
      
      let activityY = doc.y - 65;
      
      doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('Title of Activity:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(request.title || '—', 200, activityY);
      
      activityY += 25;
      doc.fillColor('#64748b').font('Helvetica').text('Amount/Cost:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(13).text(`₹ ${(request.amount || 0).toLocaleString('en-IN')}/-`, 200, activityY);
      
      activityY += 25;
      doc.fillColor('#64748b').font('Helvetica').text('Description:', 70, activityY);
      doc.fillColor('#0f172a').font('Helvetica').text(request.description || 'No description provided', 200, activityY, { width: 400 });
      
      doc.moveDown(3);
      
      // Approval Workflow Table
      doc.fillColor('#0f2a5e')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('👥  Approval Workflow', 50, doc.y);
      
      doc.moveDown(0.8);
      
      const tableTop = doc.y;
      const colWidths = [80, 120, 100, 100, 80];
      let currentX = 50;
      
      // Table header
      doc.rect(50, tableTop - 5, doc.page.width - 100, 28).fill('#0f2a5e');
      
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('Line', 60, tableTop);
      doc.text('Stakeholder', 140, tableTop);
      doc.text('Designation', 260, tableTop);
      doc.text('Status', 360, tableTop);
      doc.text('Date/Time', 440, tableTop);
      
      let rowY = tableTop + 23;
      const stakeholders = request.stakeholders || [];
      
      stakeholders.forEach((s, idx) => {
        if (rowY > doc.page.height - 100) {
          doc.addPage();
          rowY = 50;
        }
        
        if (idx % 2 === 0) {
          doc.rect(50, rowY - 3, doc.page.width - 100, 22).fill('#f8fafc');
        }
        
        doc.fillColor('#334155').fontSize(9).font('Helvetica');
        doc.text(s.line || 'Sequential', 60, rowY);
        doc.text(s.name || '—', 140, rowY);
        doc.text(s.designation || '—', 260, rowY);
        
        const statusText = s.status || 'Pending';
        const statusColor = statusText === 'Approved' ? '#10b981' : statusText === 'Rejected' ? '#ef4444' : '#d97706';
        doc.fillColor(statusColor).text(statusText, 360, rowY);
        doc.fillColor('#334155').text(s.dateTime ? new Date(s.dateTime).toLocaleDateString() : '—', 440, rowY);
        
        rowY += 22;
      });
      
      // Footer
      const footerY = doc.page.height - 70;
      doc.rect(0, footerY, doc.page.width, 70).fill('#f8fafc');
      
      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
         .text('This is an automatically generated document from LCGC RFQ System.', 50, footerY + 20, { align: 'center', width: doc.page.width - 100 });
      
      doc.text(`© ${new Date().getFullYear()} LCGC RFQ. All rights reserved.`, 50, footerY + 38, { align: 'center', width: doc.page.width - 100 });
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePDFFromRequest };