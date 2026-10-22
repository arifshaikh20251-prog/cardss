/**
 * Developer Sandbox & Simulation Routes
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * NOTE: Active only in development/test environments (NODE_ENV !== 'production').
 * Provides controls to fast-forward cooling windows and reset demo state.
 */

const express = require('express');
const router = express.Router();
const { processCoolingReleases } = require('../services/coolingWorker');
const { mockStore, isMockMode } = require('../config/supabase');

/**
 * POST /api/dev/fast-forward-cooling
 * Simulates the passage of 24 hours to instantly release cooling holds
 */
router.post('/fast-forward-cooling', async (req, res, next) => {
  try {
    const hours = Number(req.body && req.body.hours) || 24;
    // Add extra 1 hour buffer to guarantee expiration beyond 24h
    const fastForwardTime = new Date(Date.now() + (hours + 1) * 3600 * 1000);

    const result = await processCoolingReleases(fastForwardTime);

    return res.json({
      success: true,
      released_count: result.processedCount,
      message: `Fast-forwarded ${hours} hours. Payouts settled.`,
      released_transactions: result.releasedTransactions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dev/reset-sandbox
 * Resets in-memory mock store back to default demo state
 */
router.post('/reset-sandbox', async (req, res, next) => {
  try {
    if (mockStore && typeof mockStore.reset === 'function') {
      mockStore.reset();
    }

    return res.json({
      success: true,
      message: 'Sandbox demo data has been reset to initial state.',
      users_count: mockStore ? mockStore.users.length : 0,
      beneficiaries_count: mockStore ? mockStore.beneficiaries.length : 0,
      transactions_count: mockStore ? mockStore.transactions.length : 0,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
