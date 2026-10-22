/**
 * Fee Calculation Engine
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements strict financial rounding (paise/cent-level precision)
 * for Dual Fee Rates ('INSTANT' = 3.5%, 'STANDARD' = 2.5%) and statutory 18% GST.
 *
 * Statutory Rule:
 * In fintech rental & B2B vendor payouts, GST (Goods & Services Tax)
 * is charged strictly on the service/convenience fee earned by the platform,
 * NOT on the principal base invoice or rental payment.
 */

const dotenv = require('dotenv');
dotenv.config();

// Supported Transfer Types and Platform Fee Rates
const TRANSFER_RATES = {
  INSTANT: 3.5,   // 3.5% platform fee for real-time IMPS settlement
  STANDARD: 2.5,  // 2.5% platform fee for standard next-day settlement
};

const DEFAULT_GST_RATE_PERCENT = parseFloat(process.env.GST_RATE_PERCENTAGE || '18.0');

/**
 * High precision monetary rounding to 2 decimal places (Banker's rounding safe)
 * @param {number} value
 * @returns {number}
 */
function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Format number into standard INR string format (e.g., ₹50,000.00)
 * @param {number} amount
 * @returns {string}
 */
function formatCurrencyINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculates complete fee breakdown for given amount and transfer type.
 *
 * @param {number|string} amount - Principal transaction amount in INR
 * @param {'INSTANT'|'STANDARD'} [transferType='STANDARD'] - Transfer speed mode
 * @returns {Object} Comprehensive fee breakdown
 */
function getFeeBreakdown(amount, transferType = 'STANDARD') {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid amount: Transaction amount must be a positive number greater than 0.');
  }

  const normalizedType = (transferType || 'STANDARD').toUpperCase();
  const rate = TRANSFER_RATES[normalizedType];
  if (rate === undefined) {
    throw new Error(`Invalid transferType: Expected 'INSTANT' or 'STANDARD', received '${transferType}'.`);
  }

  // 1. Calculate Base Platform Fee
  const platformFee = roundMoney(numericAmount * (rate / 100));

  // 2. Calculate 18% GST strictly on the Platform Fee
  const gstAmount = roundMoney(platformFee * (DEFAULT_GST_RATE_PERCENT / 100));

  // 3. Total convenience fee (Fee + GST)
  const totalFee = roundMoney(platformFee + gstAmount);

  // 4. Total amount to debit from payer (Credit Card)
  const totalPayable = roundMoney(numericAmount + totalFee);

  // 5. Net payout to beneficiary (100% of principal)
  const netPayoutToBeneficiary = roundMoney(numericAmount);

  return {
    amount: numericAmount,
    transferType: normalizedType,
    feeRate: rate,
    gstRate: DEFAULT_GST_RATE_PERCENT,
    platformFee,
    gstAmount,
    totalFee,
    totalPayable,
    netPayoutToBeneficiary,
    formatted: {
      amount: formatCurrencyINR(numericAmount),
      platformFee: formatCurrencyINR(platformFee),
      gstAmount: formatCurrencyINR(gstAmount),
      totalFee: formatCurrencyINR(totalFee),
      totalPayable: formatCurrencyINR(totalPayable),
      netPayoutToBeneficiary: formatCurrencyINR(netPayoutToBeneficiary),
    },
  };
}

/**
 * Backwards compatible helper for general invoice fee calculations
 */
function calculateInvoiceFee({
  baseAmount,
  feePercentage,
  transferType = 'STANDARD',
  gstPercentage = DEFAULT_GST_RATE_PERCENT,
  isInterState = false,
}) {
  const numericBase = parseFloat(baseAmount);

  if (isNaN(numericBase) || numericBase <= 0) {
    throw new Error('Invalid baseAmount: Transaction amount must be a positive number greater than 0.');
  }

  // If explicit feePercentage is provided, use it; else resolve from transferType
  const rate = feePercentage !== undefined ? parseFloat(feePercentage) : (TRANSFER_RATES[transferType] || 2.5);

  const platformFee = roundMoney(numericBase * (rate / 100));
  const totalGst = roundMoney(platformFee * (gstPercentage / 100));

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = totalGst;
  } else {
    cgst = roundMoney(totalGst / 2);
    sgst = roundMoney(totalGst - cgst);
  }

  const totalFeeWithGst = roundMoney(platformFee + totalGst);
  const totalPayableAmount = roundMoney(numericBase + totalFeeWithGst);
  const netBeneficiaryPayout = roundMoney(numericBase);

  return {
    baseAmount: numericBase,
    feePercentage: rate,
    gstPercentage,
    platformFee,
    gstBreakdown: {
      totalGst,
      isInterState,
      cgst: isInterState ? 0 : cgst,
      sgst: isInterState ? 0 : sgst,
      igst: isInterState ? igst : 0,
      rate: `${gstPercentage}%`,
    },
    totalFee: totalFeeWithGst,
    totalPayable: totalPayableAmount,
    netPayout: netBeneficiaryPayout,
    formatted: {
      baseAmount: formatCurrencyINR(numericBase),
      platformFee: formatCurrencyINR(platformFee),
      totalGst: formatCurrencyINR(totalGst),
      totalPayable: formatCurrencyINR(totalPayableAmount),
      netPayout: formatCurrencyINR(netBeneficiaryPayout),
    },
  };
}

/**
 * Reverse fee calculation:
 * When payer specifies a target total debit budget and wants to find allowable base amount.
 */
function reverseCalculateBase({
  totalAmountWithFee,
  feePercentage = 2.5,
  gstPercentage = DEFAULT_GST_RATE_PERCENT,
}) {
  const numericTotal = parseFloat(totalAmountWithFee);
  if (isNaN(numericTotal) || numericTotal <= 0) {
    throw new Error('Invalid totalAmountWithFee: Amount must be a positive number.');
  }

  const effectiveMultiplier = 1 + (feePercentage / 100) * (1 + gstPercentage / 100);
  const estimatedBase = roundMoney(numericTotal / effectiveMultiplier);

  return calculateInvoiceFee({
    baseAmount: estimatedBase,
    feePercentage,
    gstPercentage,
  });
}

module.exports = {
  TRANSFER_RATES,
  getFeeBreakdown,
  calculateInvoiceFee,
  reverseCalculateBase,
  roundMoney,
  formatCurrencyINR,
  DEFAULT_GST_RATE_PERCENT,
};
