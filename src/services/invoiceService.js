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
      const navyColor = '#1E3A8A';    // Deep Navy
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
      // 1. Header Banner
      // -----------------------------------------------------------------------
      doc
        .rect(40, 40, 515, 68)
        .fill(navyColor);

      doc
        .fillColor('#FFFFFF')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('COMMERCIAL PAYMENT DECLARATION & SETTLEMENT VOUCHER', 55, 50, { width: 490 });

      doc
        .fillColor('#93C5FD')
        .fontSize(8.5)
        .font('Helvetica')
        .text('Statutory B2B Utility & Commercial Payout Certificate | IT Act 2000 Section 65B Compliant', 55, 70)
        .text('Issued by B2B UtilityPay Intermediary Platform on behalf of Verified Payer', 55, 83);

      doc
        .fillColor('#FCD34D')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('RBI AUDIT SAFE', 430, 52, { align: 'right', width: 110 });

      // -----------------------------------------------------------------------
      // 2. Voucher Meta Bar
      // -----------------------------------------------------------------------
      let y = 120;
      doc
        .rect(40, y, 515, 26)
        .fill(lightBg)
        .strokeColor(borderColor)
        .stroke();

      doc
        .fillColor(primaryColor)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('Voucher Ref: ', 55, y + 8, { continued: true })
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
      y = 158;
      const cardWidth = 250;
      const cardHeight = 100;

      // Payer Entity Card (Left)
      doc
        .rect(40, y, cardWidth, cardHeight)
        .fill('#FFFFFF')
        .strokeColor(borderColor)
        .stroke();

      doc
        .rect(40, y, cardWidth, 20)
        .fill('#EFF6FF');

      doc
        .fillColor(navyColor)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('1. REMITTER (COMMERCIAL PAYER)', 50, y + 5);

      doc
        .fillColor(primaryColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Payer Name: ', 50, y + 26, { continued: true })
        .font('Helvetica')
        .text(user.full_name || 'Verified Corporate Enterprise')
        .font('Helvetica-Bold')
        .text('Registered Mobile: ', 50, y + 40, { continued: true })
        .font('Helvetica')
        .text(maskMobile(user.mobile))
        .font('Helvetica-Bold')
        .text('PAN Number: ', 50, y + 54, { continued: true })
        .font('Helvetica')
        .text(maskPAN(user.pan_number))
        .font('Helvetica-Bold')
        .text('KYC Verification: ', 50, y + 68, { continued: true })
        .font('Helvetica')
        .text(user.kyc_status ? `${user.kyc_status} (UIDAI & NSDL Cleared)` : 'VERIFIED')
        .font('Helvetica-Bold')
        .text('Payment Mode: ', 50, y + 82, { continued: true })
        .font('Helvetica')
        .text('Commercial Credit Card Remittance');

      // Payee Entity Card (Right)
      const rightX = 305;
      doc
        .rect(rightX, y, cardWidth, cardHeight)
        .fill('#FFFFFF')
        .strokeColor(borderColor)
        .stroke();

      doc
        .rect(rightX, y, cardWidth, 20)
        .fill('#ECFDF5');

      doc
        .fillColor(accentColor)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('2. DESIGNATED PAYEE (BENEFICIARY)', rightX + 10, y + 5);

      doc
        .fillColor(primaryColor)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('Payee Name: ', rightX + 10, y + 26, { continued: true })
        .font('Helvetica')
        .text(beneficiary.account_holder_name || 'Designated Commercial Landlord / Vendor')
        .font('Helvetica-Bold')
        .text('Bank & Account: ', rightX + 10, y + 40, { continued: true })
        .font('Helvetica')
        .text(`${beneficiary.bank_name || 'Settlement Bank'} (${maskAccount(beneficiary.account_number)})`)
        .font('Helvetica-Bold')
        .text('IFSC Code: ', rightX + 10, y + 54, { continued: true })
        .font('Helvetica')
        .text(beneficiary.ifsc_code || 'HDFC0000128')
        .font('Helvetica-Bold')
        .text('Beneficiary Type: ', rightX + 10, y + 68, { continued: true })
        .font('Helvetica')
        .text(beneficiary.beneficiary_type || 'COMMERCIAL_VENDOR')
        .font('Helvetica-Bold')
        .text('Purpose of Payout: ', rightX + 10, y + 82, { continued: true })
        .font('Helvetica')
        .text(purpose);

      // -----------------------------------------------------------------------
      // 4. Commercial Settlement Particulars Table
      // -----------------------------------------------------------------------
      y = 270;
      doc
        .rect(40, y, 515, 20)
        .fill(primaryColor);

      doc
        .fillColor('#FFFFFF')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('Settlement Particulars', 50, y + 6)
        .text('Audit Parameter', 270, y + 6)
        .text('Settled Value (INR)', 430, y + 6, { align: 'right', width: 115 });

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

      y += 20;
      voucherRows.forEach((row, i) => {
        const rowHeight = 22;
        const bg = row.highlight ? '#F0FDF4' : (i % 2 === 0 ? '#FFFFFF' : lightBg);

        doc
          .rect(40, y, 515, rowHeight)
          .fill(bg)
          .strokeColor(borderColor)
          .stroke();

        doc
          .fillColor(row.color || (row.highlight ? '#15803D' : primaryColor))
          .fontSize(8)
          .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(row.item, 50, y + 6, { width: 210 })
          .text(row.param, 270, y + 6, { width: 160 })
          .text(row.value, 430, y + 6, { align: 'right', width: 115 });

        y += rowHeight;
      });

      // -----------------------------------------------------------------------
      // 5. Statutory RBI Compliance Declaration Box
      // -----------------------------------------------------------------------
      y += 15;
      doc
        .rect(40, y, 515, 140)
        .fill('#F8FAFC')
        .strokeColor('#94A3B8')
        .stroke();

      doc
        .fillColor(navyColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('RBI FINTECH INTERMEDIARY & PMLA STATUTORY COMPLIANCE DECLARATION', 50, y + 10);

      doc
        .fillColor(primaryColor)
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          '1. DECLARATION OF COMMERCIAL PURPOSE: The remitter hereby solemnly affirms that this transfer is made exclusively in satisfaction of genuine commercial liabilities, vendor purchase considerations, or commercial rent obligations.',
          50,
          y + 28,
          { width: 495, lineGap: 1.5 }
        )
        .text(
          '2. PROHIBITION OF CASH ADVANCES & SELF-CYCLING: In adherence with RBI Master Directions on Credit Card Transactions and Prevention of Money Laundering Act (PMLA) 2002, the remitter confirms that this transaction DOES NOT constitute a cash advance, revolving personal loan, or round-tripping of funds.',
          50,
          y + 52,
          { width: 495, lineGap: 1.5 }
        )
        .text(
          '3. BANK-GRADE AUDIT RECORD: In accordance with Indian IT Act 2000 (Section 65B), this digitally generated voucher serves as legal settlement evidence for Income Tax TDS compliance, Chartered Accountant auditing, and Goods & Services Tax documentation in absence of a physical invoice.',
          50,
          y + 76,
          { width: 495, lineGap: 1.5 }
        )
        .text(
          '4. DIGITAL TIMING & ESCROW RECONCILIATION: Payout settled through regulated escrow nodal accounts directly into the validated bank account of the designated commercial recipient.',
          50,
          y + 100,
          { width: 495, lineGap: 1.5 }
        );

      doc
        .fillColor('#059669')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('✓ DIGITALLY CERTIFIED & ATTACHED TO TRANSACTION AUDIT TRAIL', 50, y + 124);

      // -----------------------------------------------------------------------
      // 6. Footer Digital Stamp
      // -----------------------------------------------------------------------
      doc
        .fillColor(mutedColor)
        .fontSize(7)
        .text(
          'B2B UtilityPay Network Platform | RBI Regulated Fintech Escrow Infrastructure | Page 1 of 1',
          40,
          780,
          { align: 'center', width: 515 }
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

