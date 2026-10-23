/**
 * Promotional Coupon Routes
 * B2B Vendor Invoicing & Rental Management Platform
 */

const express = require('express');
const router = express.Router();
const couponService = require('../services/couponService');

/**
 * GET /api/coupons
 * Returns list of public active promotional coupon codes
 */
router.get('/', (req, res) => {
  const coupons = couponService.getActiveCoupons();
  const { amount, transferType, purpose } = req.query;

  let bestEligible = null;
  if (amount && parseFloat(amount) > 0) {
    bestEligible = couponService.getHighestEligibleCoupon({
      amount: parseFloat(amount),
      transferType: transferType || 'STANDARD',
      purpose: purpose || '',
    });
  }

  res.json({
    success: true,
    count: coupons.length,
    coupons,
    best_eligible: bestEligible,
  });
});

/**
 * GET /api/coupons/best-eligible
 * Returns highest eligible coupon for given amount
 */
router.get('/best-eligible', (req, res) => {
  const { amount, transferType, purpose } = req.query;
  const bestEligible = couponService.getHighestEligibleCoupon({
    amount: parseFloat(amount || 0),
    transferType: transferType || 'STANDARD',
    purpose: purpose || '',
  });

  res.json({
    success: true,
    best_eligible: bestEligible,
  });
});

/**
 * POST /api/coupons/validate
 * Validates a coupon code for a given transaction amount, speed, and purpose
 */
router.post('/validate', (req, res) => {
  const { code, amount, transferType, purpose } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      valid: false,
      error: 'MissingCode',
      message: 'Please provide a coupon code.',
    });
  }

  const result = couponService.validateAndApplyCoupon({
    code,
    amount,
    transferType,
    purpose,
  });

  if (!result.valid) {
    return res.status(400).json({
      success: false,
      valid: false,
      error: result.error,
      message: result.message,
    });
  }

  return res.json({
    success: true,
    valid: true,
    message: `Coupon '${result.coupon.code}' applied successfully!`,
    ...result.coupon,
  });
});

module.exports = router;
