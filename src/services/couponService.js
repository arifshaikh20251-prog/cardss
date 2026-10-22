/**
 * Promotional Coupon & Discount Engine
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements promotional coupon validation and fee discounts:
 * - WELCOME50: Flat ₹50 off convenience fee on transfers > ₹5,000
 * - FEE10: 10% discount on convenience fee
 * - RENTMAX: Flat ₹100 off convenience fee on rental payments > ₹15,000
 *
 * Statutory SAC 9971 Compliance Rule:
 * In fintech rental and B2B payouts, 18% GST is charged strictly on the
 * NET convenience fee earned by the platform AFTER promotional discount,
 * NOT on the principal base invoice or gross pre-discount fee.
 */

const { getFeeBreakdown, roundMoney, formatCurrencyINR, DEFAULT_GST_RATE_PERCENT } = require('../utils/feeCalculator');

const ACTIVE_COUPONS = {
  WELCOME50: {
    code: 'WELCOME50',
    type: 'FLAT',
    value: 50,
    minAmount: 5000,
    description: 'Flat ₹50 off platform fee for payments above ₹5,000',
    badge: 'Flat ₹50 OFF',
    eligiblePurposes: null, // all purposes
  },
  FEE10: {
    code: 'FEE10',
    type: 'PERCENTAGE',
    value: 10,
    minAmount: 0,
    description: '10% discount on platform convenience fee',
    badge: '10% OFF',
    eligiblePurposes: null, // all purposes
  },
  RENTMAX: {
    code: 'RENTMAX',
    type: 'FLAT',
    value: 100,
    minAmount: 15000,
    description: 'Flat ₹100 off platform fee on rental payments above ₹15,000',
    badge: 'Flat ₹100 OFF Rent',
    eligiblePurposes: ['OFFICE_RENT', 'WAREHOUSE_RENT', 'COMMERCIAL_OFFICE_LEASE', 'COMMERCIAL_LEASE', 'RENT', 'RENTAL'],
  },
};

/**
 * Returns list of active public promotional coupons
 */
function getActiveCoupons() {
  return Object.values(ACTIVE_COUPONS).map((c) => ({
    code: c.code,
    type: c.type,
    value: c.value,
    minAmount: c.minAmount,
    description: c.description,
    badge: c.badge,
    eligiblePurposes: c.eligiblePurposes,
  }));
}

/**
 * Validates a coupon code against transaction parameters and computes the net discounted fee
 *
 * @param {Object} params
 * @param {string} params.code - Coupon code (e.g. 'WELCOME50')
 * @param {number|string} params.amount - Principal transaction amount
 * @param {'INSTANT'|'STANDARD'} [params.transferType='STANDARD'] - Transfer speed
 * @param {string} [params.purpose=''] - Transaction purpose (e.g. 'OFFICE_RENT')
 * @returns {Object} Validation result with detailed discounted fee breakdown
 */
function validateAndApplyCoupon({ code, amount, transferType = 'STANDARD', purpose = '' }) {
  if (!code) {
    return {
      valid: false,
      error: 'CouponRequired',
      message: 'Please provide a coupon code.',
    };
  }

  const cleanCode = String(code).trim().toUpperCase();
  const coupon = ACTIVE_COUPONS[cleanCode];

  if (!coupon) {
    return {
      valid: false,
      error: 'InvalidCoupon',
      message: `Coupon code '${cleanCode}' is invalid or expired.`,
    };
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return {
      valid: false,
      error: 'InvalidAmount',
      message: 'A valid positive transaction amount is required to apply coupon.',
    };
  }

  // 1. Minimum amount requirement check
  if (coupon.minAmount > 0 && numericAmount <= coupon.minAmount) {
    return {
      valid: false,
      error: 'MinAmountNotMet',
      message: `Coupon '${coupon.code}' requires a transaction amount greater than ${formatCurrencyINR(coupon.minAmount)}.`,
      minAmount: coupon.minAmount,
    };
  }

  // 2. Category / Purpose eligibility check
  if (coupon.eligiblePurposes && coupon.eligiblePurposes.length > 0) {
    const normPurpose = String(purpose || '').trim().toUpperCase();
    const isEligible = coupon.eligiblePurposes.some((p) => normPurpose.includes(p));
    if (!isEligible) {
      return {
        valid: false,
        error: 'IneligiblePurpose',
        message: `Coupon '${coupon.code}' is valid only for commercial rent and lease payments.`,
      };
    }
  }

  // 3. Compute base platform fee
  const baseBreakdown = getFeeBreakdown(numericAmount, transferType);
  const originalFee = baseBreakdown.platformFee;

  // 4. Calculate raw discount amount
  let rawDiscount = 0;
  if (coupon.type === 'FLAT') {
    rawDiscount = coupon.value;
  } else if (coupon.type === 'PERCENTAGE') {
    rawDiscount = roundMoney(originalFee * (coupon.value / 100));
  }

  // 5. Cap discount so platform fee does not become negative
  const discountAmount = roundMoney(Math.min(rawDiscount, originalFee));
  const netFee = roundMoney(Math.max(0, originalFee - discountAmount));

  // 6. Statutory SAC 9971 GST (18%) on net fee
  const gstAmount = roundMoney(netFee * (DEFAULT_GST_RATE_PERCENT / 100));
  const totalFee = roundMoney(netFee + gstAmount);
  const totalPayable = roundMoney(numericAmount + totalFee);

  // 7. Total savings = discount on fee + GST saved
  const originalTotalFee = baseBreakdown.totalFee;
  const totalSavings = roundMoney(originalTotalFee - totalFee);

  return {
    valid: true,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      description: coupon.description,
      badge: coupon.badge,
      principalAmount: numericAmount,
      transferType: baseBreakdown.transferType,
      originalFee,
      discountAmount,
      netFee,
      gstAmount,
      totalFee,
      totalPayable,
      totalSavings,
      formatted: {
        principalAmount: formatCurrencyINR(numericAmount),
        originalFee: formatCurrencyINR(originalFee),
        discountAmount: formatCurrencyINR(discountAmount),
        netFee: formatCurrencyINR(netFee),
        gstAmount: formatCurrencyINR(gstAmount),
        totalFee: formatCurrencyINR(totalFee),
        totalPayable: formatCurrencyINR(totalPayable),
        totalSavings: formatCurrencyINR(totalSavings),
      },
    },
  };
}

module.exports = {
  ACTIVE_COUPONS,
  getActiveCoupons,
  validateAndApplyCoupon,
};
