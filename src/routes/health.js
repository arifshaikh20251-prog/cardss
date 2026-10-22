/**
 * Health Check and Diagnostic Routes
 * B2B Vendor Invoicing & Rental Management Platform
 */

const express = require('express');
const router = express.Router();
const { checkDatabaseConnection, isMockMode } = require('../config/supabase');
const { calculateInvoiceFee, DEFAULT_PLATFORM_FEE_PERCENT, DEFAULT_GST_RATE_PERCENT } = require('../utils/feeCalculator');

/**
 * @route   GET /api/health
 * @desc    Comprehensive system health & diagnostic check
 * @access  Public
 */
router.get('/', async (req, res) => {
  const dbStatus = await checkDatabaseConnection();

  const healthData = {
    status: 'UP',
    service: 'B2B Vendor Invoicing & Rental Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(2)}s`,
    environment: process.env.NODE_ENV || 'development',
    mockMode: isMockMode,
    database: {
      provider: 'Supabase PostgreSQL',
      ...dbStatus,
    },
    engineConfig: {
      defaultPlatformFee: `${DEFAULT_PLATFORM_FEE_PERCENT}%`,
      statutoryGST: `${DEFAULT_GST_RATE_PERCENT}%`,
    },
  };

  const httpStatus = dbStatus.connected || isMockMode ? 200 : 503;
  return res.status(httpStatus).json(healthData);
});

/**
 * @route   GET /api/health/fee-preview
 * @desc    Quick testing endpoint for core fee logic verification
 * @query   amount, feePercentage, gstPercentage
 * @access  Public
 */
router.get('/fee-preview', (req, res) => {
  try {
    const amount = parseFloat(req.query.amount || '10000');
    const feePercentage = req.query.feePercentage ? parseFloat(req.query.feePercentage) : undefined;
    const gstPercentage = req.query.gstPercentage ? parseFloat(req.query.gstPercentage) : undefined;

    const breakdown = calculateInvoiceFee({
      baseAmount: amount,
      feePercentage,
      gstPercentage,
      isInterState: req.query.isInterState === 'true',
    });

    return res.json({
      success: true,
      data: breakdown,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
