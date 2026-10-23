/**
 * Referral Routes
 * B2B Vendor Invoicing & Rental Management Platform
 */

const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { authMiddleware } = require('../middleware/authMiddleware');

// POST /api/referrals/apply - Apply friend's referral code to get ₹15 instant fee discount
router.post('/apply', authMiddleware, referralController.applyReferralCode);

// GET /api/referrals/my-stats - View referral code, invites count, and ₹25 rewards earned
router.get('/my-stats', authMiddleware, referralController.getReferralStats);

module.exports = router;
