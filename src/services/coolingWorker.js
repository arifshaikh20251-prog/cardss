/**
 * 24-Hour Cooling Release Worker
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Scans transactions held under security cooling-off window.
 * When cooling expires (cooling_release_at <= now()), triggers automated
 * mock IMPS payout settlement, issues bank UTR, and marks user as cooling-cleared.
 */

const { mockStore, isMockMode, supabaseAdmin } = require('../config/supabase');
const notificationService = require('./notificationService');

let workerIntervalId = null;

/**
 * Process all eligible cooling releases
 * Can be called manually or scheduled via timer
 *
 * @param {Date|string} [asOfDate=new Date()] - Reference timestamp (useful for simulation & testing)
 * @returns {Promise<{ processedCount: number, releasedTransactions: Array }>}
 */
async function processCoolingReleases(asOfDate = new Date()) {
  const referenceTime = new Date(asOfDate);
  const releasedTransactions = [];

  try {
    if (isMockMode || !supabaseAdmin || supabaseAdmin.isMock) {
      const pending = mockStore.findCoolingTransactions(referenceTime);

      for (const tx of pending) {
        const utrNumber = `UTR-IMPS-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
        const updated = mockStore.updateTransaction(tx.id, {
          status: 'PAYOUT_SUCCESS',
          payout_status: 'PAYOUT_SUCCESS',
          utr_number: utrNumber,
          settled_at: new Date().toISOString(),
        });

        // Clear cooling flag for the user on first successful release
        const user = mockStore.updateUser(tx.user_id, { is_cooling_cleared: true });

        // Dispatch settlement notification alert
        notificationService
          .sendPayoutSettledAlert({ user: user || { id: tx.user_id }, transaction: updated, utr: utrNumber })
          .catch((err) => console.warn('[COOLING_WORKER] Failed to send settlement alert:', err.message));

        releasedTransactions.push(updated);
        console.log(`[COOLING_WORKER] Released TX ${tx.id} -> Payout Settled with ${utrNumber}`);
      }
    } else {
      const { data: pending, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('status', 'IN_COOLING')
        .lte('cooling_release_at', referenceTime.toISOString());

      if (error) {
        console.error('[COOLING_WORKER] Failed to query cooling transactions:', error.message);
        return { processedCount: 0, releasedTransactions: [] };
      }

      for (const tx of pending || []) {
        const utrNumber = `UTR-IMPS-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from('transactions')
          .update({
            status: 'PAYOUT_SUCCESS',
            payout_status: 'PAYOUT_SUCCESS',
            utr_number: utrNumber,
            settled_at: new Date().toISOString(),
          })
          .eq('id', tx.id)
          .select()
          .single();

        if (!updateErr && updated) {
          // Clear cooling flag for user
          const { data: updatedUser } = await supabaseAdmin
            .from('users')
            .update({ is_cooling_cleared: true })
            .eq('id', tx.user_id)
            .select()
            .single();

          // Dispatch settlement notification alert
          notificationService
            .sendPayoutSettledAlert({
              user: updatedUser || { id: tx.user_id },
              transaction: updated,
              utr: utrNumber,
            })
            .catch((err) => console.warn('[COOLING_WORKER] Live DB alert error:', err.message));

          releasedTransactions.push(updated);
          console.log(`[COOLING_WORKER] Live DB Released TX ${tx.id} -> UTR: ${utrNumber}`);
        }
      }
    }
  } catch (err) {
    console.error('[COOLING_WORKER] Unhandled exception during release processing:', err);
  }

  return {
    processedCount: releasedTransactions.length,
    releasedTransactions,
  };
}

/**
 * Start periodic cooling release background scheduler
 *
 * @param {number} [intervalMs=60000] - Interval between runs (defaults to 60 seconds)
 */
function startCoolingWorker(intervalMs = 60000) {
  if (workerIntervalId) {
    console.log('[COOLING_WORKER] Worker already active.');
    return workerIntervalId;
  }

  console.log(`[COOLING_WORKER] Starting background scheduler (Frequency: ${intervalMs / 1000}s)...`);
  workerIntervalId = setInterval(() => {
    processCoolingReleases().catch((err) => {
      console.error('[COOLING_WORKER] Periodic release execution failed:', err);
    });
  }, intervalMs);

  return workerIntervalId;
}

/**
 * Stop periodic cooling release scheduler
 */
function stopCoolingWorker() {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    console.log('[COOLING_WORKER] Scheduler stopped.');
  }
}

module.exports = {
  processCoolingReleases,
  startCoolingWorker,
  stopCoolingWorker,
};
