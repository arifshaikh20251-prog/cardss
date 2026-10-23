/**
 * Promotional Broadcast API Routes
 * B2B Vendor Invoicing & Rental Management Platform
 * Mounted at: /api/promotions
 */

const express = require('express');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const {
  getActivePromotion,
  updateBroadcastPromotion,
  getAdminPromotions,
} = require('../controllers/promotionController');

const router = express.Router();

/**
 * @route   GET /api/promotions/active
 * @desc    Get currently active promotional broadcast modal payload
 * @access  Public / Authenticated
 */
router.get('/active', getActivePromotion);

/**
 * @route   PUT /api/promotions/admin
 * @desc    Update broadcast promotional modal config (Admin)
 * @access  Admin
 */
router.put('/admin', adminMiddleware, updateBroadcastPromotion);

/**
 * @route   GET /api/promotions/admin
 * @desc    Get broadcast promotional modal config (Admin)
 * @access  Admin
 */
router.get('/admin', adminMiddleware, getAdminPromotions);

module.exports = router;
