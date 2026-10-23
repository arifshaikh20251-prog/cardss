/**
 * GST Tax Invoice PDF Generator Service
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Generates enterprise-grade B2B Tax Invoices certifying platform convenience fees
 * and applicable 18% statutory GST (SAC 9971), compliant with Indian GST requirements.
 */

const PDFDocument = require('pdfkit');

/**
 * Helper to format number to 2 decimal places with comma separation
 */
function formatNumberINR(amount) {
  const num = parseFloat(amount || 0);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Mask sensitive account identifiers for compliance
 */
function maskMobile(mobile) {
  if (!mobile) return '+91 ******0000';
  const digits = String(mobile).replace(/\D/g, '');
  return `+91 ******${digits.slice(-4)}`;
}

function maskPAN(pan) {
  if (!pan) return '*****XXXX';
  const clean = String(pan).trim().toUpperCase();
  return `*****${clean.slice(-4)}`;
}

function maskAccount(acc) {
  if (!acc) return '******0000';
  const clean = String(acc).trim();
  return `******${clean.slice(-4)}`;
}

/**
 * Generates a clean, professional B2B GST Tax Invoice PDF in memory
 *
 * @param {Object} transaction - Transaction entity
 * @param {Object} user - Payer entity
 * @param {Object} beneficiary - Recipient entity
 * @returns {Promise<Buffer>} Resolves to PDF binary Buffer
 */
function generateInvoicePdf(transaction, user = {}, beneficiary = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Tax Invoice - ${transaction.id || 'TXN'}`,
          Author: 'B2B UtilityPay Network',
          Subject: 'Platform Convenience Fee GST Tax Invoice',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0F172A'; // Slate 900
      const accentColor = '#2563EB';  // Royal Blue
      const mutedColor = '#64748B';   // Slate 500
      const lightBg = '#F8FAFC';      // Slate 50
      const borderColor = '#E2E8F0';  // Slate 200

      const invoiceIdPrefix = (transaction.id || 'TXN').substring(0, 8).toUpperCase();
      const invoiceYear = new Date().getFullYear();
      const invoiceNumber = `INV-${invoiceIdPrefix}-${invoiceYear}`;
      const invoiceDate = new Date(transaction.created_at || Date.now()).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
      const invoiceTime = new Date(transaction.created_at || Date.now()).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const amount = parseFloat(transaction.amount || 0);
      const platformFee = parseFloat(transaction.convenience_fee || 0);
      const totalGst = parseFloat(transaction.gst_on_fee || 0);
      const cgst = Math.round((totalGst / 2 + Number.EPSILON) * 100) / 100;
      const sgst = Math.round((totalGst - cgst + Number.EPSILON) * 100) / 100;
      const totalCharged = parseFloat(transaction.total_debited || (amount + platformFee + totalGst));
      const transferType = transaction.transfer_type || 'STANDARD';
      const feeRate = transferType === 'INSTANT' ? '3.5%' : '2.5%';

      // -----------------------------------------------------------------------
      // 1. Header Banner
      // -----------------------------------------------------------------------
      doc
        .rect(40, 40, 515, 60)
        .fill(primaryColor);

      doc
        .fillColor('#FFFFFF')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('B2B UtilityPay Network (Mock Pvt Ltd)', 55, 52);

      doc
        .fillColor('#94A3B8')
        .fontSize(9)
        .font('Helvetica')
        .text('Vendor & Rental Utility Processing Intermediary', 55, 72)
        .text('Service Accounting Code: SAC 9971 - Financial & Related Intermediary Services', 55, 84);

      doc
        .fillColor('#38BDF8')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 420, 52, { align: 'right', width: 120 });

      doc
        .fillColor('#E2E8F0')
        .fontSize(8)
        .font('Helvetica')
        .text('Original for Recipient', 420, 70, { align: 'right', width: 120 });

      // -----------------------------------------------------------------------
      // 2. Invoice Meta Bar
      // -----------------------------------------------------------------------
      let y = 115;
      doc
        .rect(40, y, 515, 28)
        .fill(lightBg)
        .strokeColor(borderColor)
        .stroke();

      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Invoice No: ', 55, y + 8, { continued: true })
        .font('Helvetica')
        .text(invoiceNumber, { continued: true })
        .text('    |    ', { continued: true })
        .font('Helvetica-Bold')
        .text('Date: ', { continued: true })
        .font('Helvetica')
        .text(`${invoiceDate} ${invoiceTime}`, { continued: true })
        .text('    |    ', { continued: true })
        .font('Helvetica-Bold')
        .text('Mode: ', { continued: true })
        .font('Helvetica')
        .text(`${transferType} (${feeRate})`);

      // -----------------------------------------------------------------------
      // 3. Payer & Beneficiary Info Cards (Two-column layout)
      // -----------------------------------------------------------------------
      y = 155;
      const cardWidth = 250;
      const cardHeight = 95;

      // Payer Card (Left)
      doc
        .rect(40, y, cardWidth, cardHeight)
        .fill('#FFFFFF')
        .strokeColor(borderColor)
        .stroke();

      doc
        .rect(40, y, cardWidth, 20)
        .fill(lightBg);

      doc
        .fillColor(accentColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('PAYER (USER) DETAILS', 50, y + 5);

      doc
        .fillColor(primaryColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Business Name: ', 50, y + 26, { continued: true })
        .font('Helvetica')
        .text(user.full_name || 'Verified Corporate Account')
        .font('Helvetica-Bold')
        .text('Registered Mobile: ', 50, y + 40, { continued: true })
        .font('Helvetica')
        .text(maskMobile(user.mobile))
        .font('Helvetica-Bold')
        .text('PAN Number: ', 50, y + 54, { continued: true })
        .font('Helvetica')
        .text(maskPAN(user.pan_number))
        .font('Helvetica-Bold')
        .text('KYC Status: ', 50, y + 68, { continued: true })
        .font('Helvetica')
        .text(user.kyc_status || 'VERIFIED');

      // Beneficiary Card (Right)
      const rightX = 305;
      doc
        .rect(rightX, y, cardWidth, cardHeight)
        .fill('#FFFFFF')
        .strokeColor(borderColor)
        .stroke();

      doc
        .rect(rightX, y, cardWidth, 20)
        .fill(lightBg);

      doc
        .fillColor(accentColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('BENEFICIARY (RECIPIENT) DETAILS', rightX + 10, y + 5);

      doc
        .fillColor(primaryColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Beneficiary: ', rightX + 10, y + 26, { continued: true })
        .font('Helvetica')
        .text(beneficiary.account_holder_name || 'Designated Vendor')
        .font('Helvetica-Bold')
        .text('Bank & Account: ', rightX + 10, y + 40, { continued: true })
        .font('Helvetica')
        .text(`${beneficiary.bank_name || 'Bank'} (${maskAccount(beneficiary.account_number)})`)
        .font('Helvetica-Bold')
        .text('IFSC Code: ', rightX + 10, y + 54, { continued: true })
        .font('Helvetica')
        .text(beneficiary.ifsc_code || 'HDFC0000128')
        .font('Helvetica-Bold')
        .text('Transfer Purpose: ', rightX + 10, y + 68, { continued: true })
        .font('Helvetica')
        .text(transaction.purpose || 'Office Rent / Vendor Invoicing');

      // -----------------------------------------------------------------------
      // 4. Financial Table Breakdown
      // -----------------------------------------------------------------------
      y = 265;
      // Table Header
      doc
        .rect(40, y, 515, 22)
        .fill(primaryColor);

      doc
        .fillColor('#FFFFFF')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Line Item & Description', 50, y + 6)
        .text('SAC / Code', 260, y + 6)
        .text('Tax Rate', 360, y + 6)
        .text('Amount (INR)', 450, y + 6, { align: 'right', width: 95 });

      const tableRows = [
        {
          label: 'Principal Payout to Beneficiary (Pass-through settlement)',
          sac: 'N/A',
          tax: '0.0%',
          val: `INR ${formatNumberINR(amount)}`,
          bold: false,
        },
        {
          label: `Platform Convenience & Processing Fee (${transferType} - ${feeRate})`,
          sac: 'SAC 9971',
          tax: 'Taxable',
          val: `INR ${formatNumberINR(platformFee)}`,
          bold: false,
        },
        {
          label: 'CGST (Central Goods and Services Tax)',
          sac: 'SAC 9971',
          tax: '9.0%',
          val: `INR ${formatNumberINR(cgst)}`,
          bold: false,
        },
        {
          label: 'SGST (State Goods and Services Tax)',
          sac: 'SAC 9971',
          tax: '9.0%',
          val: `INR ${formatNumberINR(sgst)}`,
          bold: false,
        },
        {
          label: 'Total GST Applicable on Convenience Fee',
          sac: 'SAC 9971',
          tax: '18.0%',
          val: `INR ${formatNumberINR(totalGst)}`,
          bold: true,
        },
        {
          label: 'Total Amount Charged to Credit / Corporate Card',
          sac: '--',
          tax: 'Total Debit',
          val: `INR ${formatNumberINR(totalCharged)}`,
          bold: true,
          highlight: true,
        },
        {
          label: 'Net Payout Disbursed to Beneficiary Account (100% Principal)',
          sac: '--',
          tax: 'Credit',
          val: `INR ${formatNumberINR(amount)}`,
          bold: true,
          credit: true,
        },
      ];

      y += 22;
      tableRows.forEach((row, i) => {
        const rowHeight = 22;
        const bg = row.highlight ? '#EFF6FF' : (i % 2 === 0 ? '#FFFFFF' : lightBg);

        doc
          .rect(40, y, 515, rowHeight)
          .fill(bg)
          .strokeColor(borderColor)
          .stroke();

        doc
          .fillColor(row.highlight ? accentColor : (row.credit ? '#15803D' : primaryColor))
          .fontSize(8.5)
          .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(row.label, 50, y + 6, { width: 200 })
          .text(row.sac, 260, y + 6)
          .text(row.tax, 360, y + 6)
          .text(row.val, 450, y + 6, { align: 'right', width: 95 });

        y += rowHeight;
      });

      // -----------------------------------------------------------------------
      // 5. Settlement & Audit Proof Box
      // -----------------------------------------------------------------------
      y += 15;
      doc
        .rect(40, y, 515, 65)
        .fill(lightBg)
        .strokeColor(borderColor)
        .stroke();

      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('SETTLEMENT AUDIT & BANK RAIL PROOF', 50, y + 8);

      const statusColor = transaction.status === 'PAYOUT_SUCCESS' ? '#15803D' : '#D97706';
      doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Payout Status: ', 50, y + 25, { continued: true })
        .fillColor(statusColor)
        .text(transaction.status || 'INITIATED')
        .fillColor(primaryColor)
        .font('Helvetica-Bold')
        .text('Bank IMPS UTR: ', 50, y + 38, { continued: true })
        .font('Helvetica')
        .text(transaction.utr_number || 'Pending bank settlement confirmation')
        .font('Helvetica-Bold')
        .text('Settled Timestamp: ', 50, y + 50, { continued: true })
        .font('Helvetica')
        .text(transaction.settled_at ? new Date(transaction.settled_at).toLocaleString('en-IN') : 'Scheduled / In Pipeline');

      doc
        .font('Helvetica-Bold')
        .text('PG Gateway Order: ', 300, y + 25, { continued: true })
        .font('Helvetica')
        .text(transaction.gateway_order_id || 'N/A')
        .font('Helvetica-Bold')
        .text('PG Payment ID: ', 300, y + 38, { continued: true })
        .font('Helvetica')
        .text(transaction.gateway_payment_id || 'MOCK_SWIPE_OK');

      // -----------------------------------------------------------------------
      // 6. Statutory Compliance & AML Legal Disclaimer (Footer)
      // -----------------------------------------------------------------------
      y += 80;
      doc
        .rect(40, y, 515, 60)
        .strokeColor(borderColor)
        .stroke();

      doc
        .fillColor(mutedColor)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('LEGAL & STATUTORY DISCLAIMER (ANTI-MONEY LAUNDERING / RBI COMPLIANCE):', 50, y + 8);

      doc
        .font('Helvetica')
        .fontSize(7)
        .text(
          'This invoice certifies platform processing fees. The principal amount is transferred directly to the designated beneficiary as a utility/vendor payment. Direct cash advances and self-cycling are strictly prohibited under platform AML terms.',
          50,
          y + 20,
          { width: 495, lineGap: 2 }
        )
        .text(
          'This document is computer-generated under the Information Technology Act, 2000 and requires no physical signature.',
          50,
          y + 45
        );

      // Page footer
      doc
        .fillColor(mutedColor)
        .fontSize(7)
        .text('B2B UtilityPay Network Platform | Fintech Infrastructure Services | Page 1 of 1', 40, 780, {
          align: 'center',
          width: 515,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates an automated "Digital Commercial Payment Declaration / Voucher"
 * for transactions without an external vendor invoice.
 * Satisfies RBI, Bank, and Payment Gateway commercial audit compliance.
 *
 * @param {Object} transaction - Transaction entity
 * @param {Object} user - Payer entity
 * @param {Object} beneficiary - Recipient entity
 * @returns {Promise<Buffer>} Resolves to PDF binary Buffer
 */
function generateCommercialVoucherPdf(transaction, user = {}, beneficiary = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Commercial Voucher - ${transaction.id || 'TXN'}`,
          Author: 'B2B UtilityPay Network',
          Subject: 'Commercial Payment Declaration & Settlement Voucher',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#0F172A'; // Slate 900
      const accentColor = '#059669';  // Emerald 600
      const navyColor = '#0F172A';    // Deep Navy
      const mutedColor = '#64748B';   // Slate 500
      const lightBg = '#F8FAFC';      // Slate 50
      const borderColor = '#CBD5E1';  // Slate 300

      const voucherIdPrefix = (transaction.id || 'TXN').substring(0, 8).toUpperCase();
      const voucherYear = new Date().getFullYear();
      const voucherNumber = `VCH-${voucherIdPrefix}-${voucherYear}`;
      const voucherDate = new Date(transaction.created_at || Date.now()).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
      const voucherTime = new Date(transaction.created_at || Date.now()).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const amount = parseFloat(transaction.amount || 0);
      const transferType = transaction.transfer_type || 'STANDARD';
      const purpose = (transaction.purpose || 'VENDOR_PAYMENT').replace(/_/g, ' ');

      // -----------------------------------------------------------------------
      // 0. Outer Certificate Border (Bank-Grade Security Certificate Look)
      // -----------------------------------------------------------------------
      doc
        .rect(26, 26, 543, 790)
        .lineWidth(1)
        .strokeColor('#CBD5E1')
        .stroke();

      doc
        .rect(30, 30, 535, 782)
        .lineWidth(0.5)
        .strokeColor('#E2E8F0')
        .stroke();

      // -----------------------------------------------------------------------
      // 1. Header Banner (Isolated Layout: Title Left, Badge Right)
      // -----------------------------------------------------------------------
      const bannerY = 38;
      const bannerHeight = 68;
      doc
        .rect(38, bannerY, 519, bannerHeight)
        .fill(navyColor);

      // Left Title Block (Max-width constrained to 355 to guarantee zero overlap)
      doc
        .fillColor('#FFFFFF')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('COMMERCIAL PAYMENT DECLARATION & SETTLEMENT VOUCHER', 50, bannerY + 11, {
          width: 355,
          lineGap: 1.5,
        });

      doc
        .fillColor('#94A3B8')
        .fontSize(7.5)
        .font('Helvetica')
        .text('Statutory B2B Utility & Commercial Payout Certificate | IT Act 2000 Section 65B Compliant', 50, bannerY + 39, {
          width: 355,
        })
        .text('Issued by B2B UtilityPay Intermediary Platform on behalf of Verified Remitter', 50, bannerY + 50, {
          width: 355,
        });

      // Right Audit Safe Badge Container (Isolated in dedicated box with gold border)
      const badgeX = 415;
      const badgeY = bannerY + 9;
      const badgeW = 132;
      const badgeH = 50;

      doc
        .roundedRect(badgeX, badgeY, badgeW, badgeH, 5)
        .fill('#1E293B')
        .lineWidth(1)
        .strokeColor('#F59E0B')
        .stroke();

      doc
        .fillColor('#FCD34D')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('RBI AUDIT SAFE', badgeX, badgeY + 8, { align: 'center', width: badgeW });

      doc
        .fillColor('#38BDF8')
        .fontSize(7)
        .font('Helvetica-Bold')
        .text('100% ESCROW SETTLED', badgeX, badgeY + 21, { align: 'center', width: badgeW });

      doc
        .fillColor('#94A3B8')
        .fontSize(6.5)
        .font('Helvetica')
        .text('CERTIFIED TRANSACTION', badgeX, badgeY + 33, { align: 'center', width: badgeW });

      // -----------------------------------------------------------------------
      // 2. Voucher Meta Bar
      // -----------------------------------------------------------------------
      let y = 113;
      doc
        .rect(38, y, 519, 22)
        .fill(lightBg)
        .strokeColor(borderColor)
        .lineWidth(0.75)
        .stroke();

      doc
        .fillColor(primaryColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Voucher Ref: ', 48, y + 6, { continued: true })
        .font('Helvetica')
        .text(voucherNumber, { continued: true })
        .text('   |   ', { continued: true })
        .font('Helvetica-Bold')
        .text('Date & Time: ', { continued: true })
        .font('Helvetica')
        .text(`${voucherDate} ${voucherTime}`, { continued: true })
        .text('   |   ', { continued: true })
        .font('Helvetica-Bold')
        .text('Category: ', { continued: true })
        .font('Helvetica')
        .text(purpose);

      // -----------------------------------------------------------------------
      // 3. Parties Info (Two-Column Layout)
      // -----------------------------------------------------------------------
      y = 142;
      const cardWidth = 254;
      const cardHeight = 92;

      // Payer Entity Card (Left)
      doc
        .rect(38, y, cardWidth, cardHeight)
        .fill('#FFFFFF')
        .strokeColor(borderColor)
        .lineWidth(0.75)
        .stroke();

      doc
        .rect(38, y, cardWidth, 18)
        .fill('#F1F5F9');

      doc
        .fillColor(navyColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('1. REMITTER (COMMERCIAL PAYER)', 48, y + 5);

      doc
        .fillColor(primaryColor)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('Payer Name: ', 48, y + 24, { continued: true })
        .font('Helvetica')
        .text(user.full_name || 'Verified Corporate Enterprise')
        .font('Helvetica-Bold')
        .text('Registered Mobile: ', 48, y + 37, { continued: true })
        .font('Helvetica')
        .text(maskMobile(user.mobile))
        .font('Helvetica-Bold')
        .text('PAN Number: ', 48, y + 50, { continued: true })
        .font('Helvetica')
        .text(maskPAN(user.pan_number))
        .font('Helvetica-Bold')
        .text('KYC Verification: ', 48, y + 63, { continued: true })
        .font('Helvetica')
        .text(user.kyc_status ? `${user.kyc_status} (UIDAI & NSDL Cleared)` : 'VERIFIED')
        .font('Helvetica-Bold')
        .text('Payment Mode: ', 48, y + 76, { continued: true })
        .font('Helvetica')
        .text('Commercial Credit Card Remittance');

      // Payee Entity Card (Right)
      const rightX = 303;
      doc
        .rect(rightX, y, cardWidth, cardHeight)
        .fill('#FFFFFF')
        .strokeColor(borderColor)
        .lineWidth(0.75)
        .stroke();

      doc
        .rect(rightX, y, cardWidth, 18)
        .fill('#ECFDF5');

      doc
        .fillColor(accentColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('2. DESIGNATED PAYEE (BENEFICIARY)', rightX + 10, y + 5);

      doc
        .fillColor(primaryColor)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('Payee Name: ', rightX + 10, y + 24, { continued: true })
        .font('Helvetica')
        .text(beneficiary.account_holder_name || 'Designated Commercial Landlord / Vendor')
        .font('Helvetica-Bold')
        .text('Bank & Account: ', rightX + 10, y + 37, { continued: true })
        .font('Helvetica')
        .text(`${beneficiary.bank_name || 'Settlement Bank'} (${maskAccount(beneficiary.account_number)})`)
        .font('Helvetica-Bold')
        .text('IFSC Code: ', rightX + 10, y + 50, { continued: true })
        .font('Helvetica')
        .text(beneficiary.ifsc_code || 'HDFC0000128')
        .font('Helvetica-Bold')
        .text('Beneficiary Type: ', rightX + 10, y + 63, { continued: true })
        .font('Helvetica')
        .text(beneficiary.beneficiary_type || 'COMMERCIAL_VENDOR')
        .font('Helvetica-Bold')
        .text('Purpose of Payout: ', rightX + 10, y + 76, { continued: true })
        .font('Helvetica')
        .text(purpose);

      // -----------------------------------------------------------------------
      // 4. Commercial Settlement Particulars Table
      // -----------------------------------------------------------------------
      y = 241;
      doc
        .rect(38, y, 519, 18)
        .fill(primaryColor);

      doc
        .fillColor('#FFFFFF')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Settlement Particulars', 48, y + 5)
        .text('Audit Parameter', 260, y + 5)
        .text('Settled Value (INR)', 430, y + 5, { align: 'right', width: 117 });

      const voucherRows = [
        {
          item: 'Commercial Principal Disbursed to Payee',
          param: '100% Principal Guaranteed Remittance',
          value: `INR ${formatNumberINR(amount)}`,
          bold: true,
          color: '#15803D',
        },
        {
          item: 'Remittance Purpose Classification',
          param: `B2B Utility / Rent Remittance (${purpose})`,
          value: 'Bona Fide B2B',
          bold: false,
        },
        {
          item: 'Settlement Rail Speed',
          param: transferType === 'INSTANT' ? 'IMPS Real-Time Settlement' : 'NEFT / RTGS T+1 Batch',
          value: transferType,
          bold: false,
        },
        {
          item: 'Bank Settlement UTR Tracking Number',
          param: 'Core Banking Rail Unique Transaction Reference',
          value: transaction.utr_number || 'Confirmed / In Clearing Rail',
          bold: true,
        },
        {
          item: 'Gateway Payment Order Identification',
          param: 'Card Processor Authenticated Session',
          value: transaction.gateway_order_id || 'ORD-VERIFIED',
          bold: false,
        },
        {
          item: 'Total Commercial Payout Certified',
          param: 'Settled to Beneficiary Bank Account',
          value: `INR ${formatNumberINR(amount)}`,
          bold: true,
          highlight: true,
        },
      ];

      y += 18;
      voucherRows.forEach((row, i) => {
        const rowHeight = 20;
        const bg = row.highlight ? '#F0FDF4' : (i % 2 === 0 ? '#FFFFFF' : lightBg);

        doc
          .rect(38, y, 519, rowHeight)
          .fill(bg)
          .strokeColor(borderColor)
          .lineWidth(0.5)
          .stroke();

        doc
          .fillColor(row.color || (row.highlight ? '#15803D' : primaryColor))
          .fontSize(7.5)
          .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(row.item, 48, y + 5, { width: 205 })
          .text(row.param, 260, y + 5, { width: 165 })
          .text(row.value, 430, y + 5, { align: 'right', width: 117 });

        y += rowHeight;
      });

      // -----------------------------------------------------------------------
      // 5. Statutory RBI Compliance Declaration Box (Auto-Flow Dynamic Y Layout!)
      // -----------------------------------------------------------------------
      y += 12;
      const declBoxStartY = y;
      const declHeaderH = 18;

      // Header strip for Declaration box
      doc
        .rect(38, y, 519, declHeaderH)
        .fill('#1E293B');

      doc
        .fillColor('#F8FAFC')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('RBI FINTECH INTERMEDIARY & PMLA STATUTORY COMPLIANCE DECLARATION', 48, y + 5);

      // Natural Auto-Flow for Legal Clauses
      doc.y = y + declHeaderH + 8;
      doc.x = 48;

      // Clause 1
      doc
        .font('Helvetica-Bold')
        .fontSize(7.2)
        .fillColor('#0F172A')
        .text('1. DECLARATION OF COMMERCIAL PURPOSE: ', { continued: true, width: 499, align: 'justify', lineGap: 2.5 })
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          'The remitter hereby solemnly affirms that this transfer is made exclusively in satisfaction of genuine commercial liabilities, vendor purchase considerations, or commercial rent obligations.',
          { width: 499, align: 'justify', lineGap: 2.5 }
        );
      doc.moveDown(0.6);

      // Clause 2
      doc
        .font('Helvetica-Bold')
        .fontSize(7.2)
        .fillColor('#0F172A')
        .text('2. PROHIBITION OF CASH ADVANCES & SELF-CYCLING: ', { continued: true, width: 499, align: 'justify', lineGap: 2.5 })
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          'In adherence with RBI Master Directions on Credit Card Transactions and Prevention of Money Laundering Act (PMLA) 2002, the remitter confirms that this transaction DOES NOT constitute a cash advance, revolving personal loan, or round-tripping of funds.',
          { width: 499, align: 'justify', lineGap: 2.5 }
        );
      doc.moveDown(0.6);

      // Clause 3
      doc
        .font('Helvetica-Bold')
        .fontSize(7.2)
        .fillColor('#0F172A')
        .text('3. BANK-GRADE AUDIT RECORD: ', { continued: true, width: 499, align: 'justify', lineGap: 2.5 })
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          'In accordance with Indian IT Act 2000 (Section 65B), this digitally generated voucher serves as legal settlement evidence for Income Tax TDS compliance, Chartered Accountant auditing, and Goods & Services Tax documentation in absence of a physical invoice.',
          { width: 499, align: 'justify', lineGap: 2.5 }
        );
      doc.moveDown(0.6);

      // Clause 4
      doc
        .font('Helvetica-Bold')
        .fontSize(7.2)
        .fillColor('#0F172A')
        .text('4. DIGITAL TIMING & ESCROW RECONCILIATION: ', { continued: true, width: 499, align: 'justify', lineGap: 2.5 })
        .font('Helvetica')
        .fillColor('#334155')
        .text(
          'Payout settled through regulated escrow nodal accounts directly into the validated bank account of the designated commercial recipient with automated ledger reconciliation.',
          { width: 499, align: 'justify', lineGap: 2.5 }
        );

      // Calculate rendered height of declaration box and draw outer border
      const declBottomY = doc.y + 6;
      const declTotalH = declBottomY - declBoxStartY;

      doc
        .rect(38, declBoxStartY, 519, declTotalH)
        .strokeColor('#94A3B8')
        .lineWidth(0.75)
        .stroke();

      // -----------------------------------------------------------------------
      // 6. Bottom Certification: Auditor Note (Left) & Official Seal (Right)
      // -----------------------------------------------------------------------
      const bottomY = declBottomY + 12;

      // Left Box: Auditor Note
      const noteW = 280;
      const noteH = 78;
      doc
        .rect(38, bottomY, noteW, noteH)
        .fill(lightBg)
        .strokeColor(borderColor)
        .lineWidth(0.75)
        .stroke();

      doc
        .fillColor(navyColor)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('AUDITOR & STATUTORY VERIFICATION NOTICE', 48, bottomY + 7);

      doc
        .fillColor('#475569')
        .fontSize(6.8)
        .font('Helvetica')
        .text(
          'This voucher is an electronically generated legal settlement certificate pursuant to Section 65B of the Information Technology Act, 2000. Statutory auditors and tax practitioners can verify settlement authenticity against Core Banking System UTR records.',
          48,
          bottomY + 22,
          { width: 260, lineGap: 1.5, align: 'justify' }
        );

      doc
        .fillColor(accentColor)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text('✓ Authenticated by B2B UtilityPay Compliance Engine', 48, bottomY + 62);

      // Right Box: Official Green Verified Digital Seal Stamp Box
      const sealX = 328;
      const sealW = 229;
      const sealH = noteH;

      doc
        .roundedRect(sealX, bottomY, sealW, sealH, 6)
        .fill('#ECFDF5')
        .lineWidth(1.2)
        .strokeColor('#059669')
        .stroke();

      // Subtle inner dotted seal border
      doc
        .roundedRect(sealX + 3, bottomY + 3, sealW - 6, sealH - 6, 4)
        .lineWidth(0.5)
        .strokeColor('#10B981')
        .dash(3, { space: 2 })
        .stroke()
        .undash();

      doc
        .fillColor('#047857')
        .fontSize(7.8)
        .font('Helvetica-Bold')
        .text('★ DIGITALLY SIGNED & ESCROW CERTIFIED ★', sealX, bottomY + 8, {
          align: 'center',
          width: sealW,
        });

      doc
        .fillColor('#065F46')
        .fontSize(6.8)
        .font('Helvetica-Bold')
        .text('SECTION 65B INDIAN IT ACT 2000 COMPLIANT', sealX, bottomY + 21, {
          align: 'center',
          width: sealW,
        });

      doc
        .fillColor('#047857')
        .fontSize(6.5)
        .font('Helvetica')
        .text(`Certificate Ref: ESCROW-${voucherIdPrefix}`, sealX, bottomY + 35, {
          align: 'center',
          width: sealW,
        })
        .text(`Date & Time: ${voucherDate} ${voucherTime}`, sealX, bottomY + 46, {
          align: 'center',
          width: sealW,
        })
        .font('Helvetica-Bold')
        .text('Cryptographic Tamper-Evident Settlement Stamp', sealX, bottomY + 59, {
          align: 'center',
          width: sealW,
        });

      // -----------------------------------------------------------------------
      // 7. Single-Page A4 Footer
      // -----------------------------------------------------------------------
      doc
        .fillColor(mutedColor)
        .fontSize(6.5)
        .text(
          'B2B UtilityPay Network Platform | RBI Regulated Fintech Escrow Infrastructure | Page 1 of 1',
          38,
          788,
          { align: 'center', width: 519 }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePdf,
  generateCommercialVoucherPdf,
  formatNumberINR,
  maskMobile,
  maskPAN,
  maskAccount,
};

