/**
 * Admin API Routes
 * B2B Vendor Invoicing & Rental Management Platform
 * Mounted at: /api/admin
 */

const express = require('express');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const {
  getAdminMetrics,
  getAdminTransactions,
  overrideCooling,
  exportGstReport,
} = require('../controllers/adminController');

const router = express.Router();

// Enforce admin authorization across all /api/admin endpoints
router.use(adminMiddleware);

/**
 * @route   GET /api/admin/metrics
 * @desc    Get real-time platform financial KPIs & float analytics
 * @access  Admin
 */
router.get('/metrics', getAdminMetrics);

/**
 * @route   GET /api/admin/transactions
 * @desc    Get filterable list of all platform transactions
 * @access  Admin
 */
router.get('/transactions', getAdminTransactions);

/**
 * @route   POST /api/admin/transactions/:id/override-cooling
 * @desc    Manually clear 24h statutory cooling and trigger instant IMPS payout
 * @access  Admin
 */
router.post('/transactions/:id/override-cooling', overrideCooling);

/**
 * @route   GET /api/admin/export-gst-report
 * @desc    Export itemized SAC 9971 GSTR-1 & GSTR-3B monthly report (CSV/JSON)
 * @access  Admin
 */
router.get('/export-gst-report', exportGstReport);

module.exports = router;
