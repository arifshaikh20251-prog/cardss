/**
 * Transaction Routes
 * B2B Vendor Invoicing & Rental Management Platform
 */

const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authMiddleware } = require('../middleware/authMiddleware');

// 1. Webhook endpoints (Public gateway event callbacks with HMAC verification)
router.post('/pg-webhook', transactionController.handlePgWebhook);
router.post('/mock-pg-webhook', transactionController.mockPgWebhook);

// 2. Protected User Endpoints
router.get('/', authMiddleware, transactionController.getTransactions);
router.get('/analytics', authMiddleware, transactionController.getTransactionAnalytics);
router.post('/initiate', authMiddleware, transactionController.initiateTransaction);
router.get('/:id', authMiddleware, transactionController.getTransactionById);
router.get('/:id/invoice', authMiddleware, transactionController.downloadInvoicePdf);
router.get('/:id/voucher', authMiddleware, transactionController.downloadCommercialVoucherPdf);
router.post('/:id/send-email-invoice', authMiddleware, transactionController.sendEmailInvoice);

module.exports = router;
