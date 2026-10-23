/**
 * Promotional Coupon & Discount Engine
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements unit-economic profit-safe tiered promotional coupons:
 * - SAVE10: ₹10 OFF on transactions >= ₹10,000 (Min fee: ₹200)
 * - SAVE25: ₹25 OFF on transactions >= ₹25,000 (Min fee: ₹500)
 * - SAVE50: ₹50 OFF on transactions >= ₹50,000 (Min fee: ₹1,000)
 * - REF15:  ₹15 instant fee discount on referee's first transaction
 * - REF25:  ₹25 discount coupon on referrer's account
 *
 * Statutory SAC 9971 Compliance Rule:
 * In fintech rental and B2B payouts, 18% GST is charged strictly on the
 * NET convenience fee earned by the platform AFTER promotional discount,
 * NOT on the principal base invoice or gross pre-discount fee.
 */

const { getFeeBreakdown, roundMoney, formatCurrencyINR, DEFAULT_GST_RATE_PERCENT } = require('../utils/feeCalculator');

const ACTIVE_COUPONS = {
  SAVE10: {
    code: 'SAVE10',
    type: 'FLAT',
    value: 10,
    minAmount: 10000,
    minFee: 200,
    description: '₹10 OFF on transactions of ₹10,000 or more (Min fee: ₹200)',
    badge: '₹10 OFF',
    eligiblePurposes: null,
  },
  SAVE25: {
    code: 'SAVE25',
    type: 'FLAT',
    value: 25,
    minAmount: 25000,
    minFee: 500,
    description: '₹25 OFF on transactions of ₹25,000 or more (Min fee: ₹500)',
    badge: '₹25 OFF',
    eligiblePurposes: null,
  },
  SAVE50: {
    code: 'SAVE50',
    type: 'FLAT',
    value: 50,
    minAmount: 50000,
    minFee: 1000,
    description: '₹50 OFF on transactions of ₹50,000 or more (Min fee: ₹1,000)',
    badge: '₹50 OFF',
    eligiblePurposes: null,
  },
  REF15: {
    code: 'REF15',
    type: 'FLAT',
    value: 15,
    minAmount: 1000,
    minFee: 25,
    description: 'Referral Welcome: ₹15 instant fee discount on your first transfer',
    badge: 'Referral ₹15 OFF',
    eligiblePurposes: null,
  },
  REF25: {
    code: 'REF25',
    type: 'FLAT',
    value: 25,
    minAmount: 5000,
    minFee: 100,
    description: 'Referral Reward: ₹25 discount coupon earned from friend referral',
    badge: 'Referral ₹25 OFF',
    eligiblePurposes: null,
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
    minFee: c.minFee,
    description: c.description,
    badge: c.badge,
    eligiblePurposes: c.eligiblePurposes,
  }));
}

/**
 * Finds and returns the highest eligible coupon for a given transaction amount
 *
 * @param {Object} params
 * @param {number|string} params.amount - Transaction amount
 * @param {'INSTANT'|'STANDARD'} [params.transferType='STANDARD']
 * @param {string} [params.purpose='']
 * @returns {Object|null} Best coupon with calculated savings, or null if none eligible
 */
function getHighestEligibleCoupon({ amount, transferType = 'STANDARD', purpose = '' }) {
  const numericAmount = parseFloat(amount || 0);
  if (isNaN(numericAmount) || numericAmount <= 0) return null;

  // Rank coupons by discount value descending (SAVE50, SAVE25, SAVE10)
  const candidateCodes = ['SAVE50', 'SAVE25', 'SAVE10'];

  for (const code of candidateCodes) {
    const res = validateAndApplyCoupon({
      code,
      amount: numericAmount,
      transferType,
      purpose,
    });
    if (res.valid) {
      return res.coupon;
    }
  }

  return null;
}

/**
 * Validates a coupon code against transaction parameters and computes the net discounted fee
 *
 * @param {Object} params
 * @param {string} params.code - Coupon code (e.g. 'SAVE10')
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

  // 1. Minimum transaction amount requirement check (must be >= coupon.minAmount)
  if (coupon.minAmount > 0 && numericAmount < coupon.minAmount) {
    return {
      valid: false,
      error: 'MinAmountNotMet',
      message: `Coupon '${coupon.code}' requires a minimum transaction amount of ${formatCurrencyINR(coupon.minAmount)}.`,
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

  // 4. Unit-Economic Minimum Platform Fee check
  if (coupon.minFee > 0 && originalFee < coupon.minFee) {
    return {
      valid: false,
      error: 'MinFeeNotMet',
      message: `Coupon '${coupon.code}' requires a minimum platform fee of ${formatCurrencyINR(coupon.minFee)}.`,
      minFee: coupon.minFee,
    };
  }

  // 5. Calculate raw discount amount
  let rawDiscount = 0;
  if (coupon.type === 'FLAT') {
    rawDiscount = coupon.value;
  } else if (coupon.type === 'PERCENTAGE') {
    rawDiscount = roundMoney(originalFee * (coupon.value / 100));
  }

  // 6. Cap discount so platform fee does not become negative
  const discountAmount = roundMoney(Math.min(rawDiscount, originalFee));
  const netFee = roundMoney(Math.max(0, originalFee - discountAmount));

  // 7. Statutory SAC 9971 GST (18%) on net fee
  const gstAmount = roundMoney(netFee * (DEFAULT_GST_RATE_PERCENT / 100));
  const totalFee = roundMoney(netFee + gstAmount);
  const totalPayable = roundMoney(numericAmount + totalFee);

  // 8. Total savings = discount on fee + GST saved
  const originalTotalFee = baseBreakdown.totalFee;
  const totalSavings = roundMoney(originalTotalFee - totalFee);

  return {
    valid: true,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
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
  getHighestEligibleCoupon,
  validateAndApplyCoupon,
};

