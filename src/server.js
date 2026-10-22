/**
 * Server Entry Point
 * B2B Vendor Invoicing & Rental Management Platform
 */

const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { isMockMode } = require('./config/supabase');
const { startCoolingWorker, stopCoolingWorker } = require('./services/coolingWorker');

// Support numeric ports or Hostinger / Phusion Passenger socket pipes
const rawPort = process.env.PORT || '5000';
const PORT = isNaN(rawPort) ? rawPort : parseInt(rawPort, 10);

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log('🚀 B2B VENDOR INVOICING & RENTAL MANAGEMENT ENGINE');
  console.log(`📡 Server listening on: ${typeof PORT === 'number' ? `http://localhost:${PORT}` : PORT}`);
  console.log(`🛡️  Environment:        ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Mock Mode:          ${isMockMode ? 'ENABLED (Phase 1 Sandbox)' : 'DISABLED'}`);
  console.log(`🩺 Health Diagnostic:  http://localhost:${PORT}/api/health`);
  console.log(`💰 Fee Engine Preview: http://localhost:${PORT}/api/health/fee-preview?amount=20000`);
  console.log('====================================================');

  // Start background cooling release worker (runs every 60s)
  if (process.env.NODE_ENV !== 'test') {
    startCoolingWorker(60000);
  }
});

// ==============================================================================
// Graceful Shutdown & Process Signals
// ==============================================================================
function gracefulShutdown(signal) {
  console.log(`\n[PROCESS] Received ${signal}. Closing HTTP server gracefully...`);
  stopCoolingWorker();
  server.close(() => {
    console.log('[PROCESS] HTTP server closed. Process terminating safely.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[PROCESS] Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception thrown:', err);
  process.exit(1);
});
