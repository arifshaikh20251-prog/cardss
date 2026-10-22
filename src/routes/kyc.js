/**
 * KYC Verification Routes
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Exposes protected routes for PAN verification, Aadhaar OTP initiation, and Aadhaar OTP verification.
 */

const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kycController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All KYC routes are protected via JWT
router.use(authMiddleware);

// GET /api/kyc/status
router.get('/status', kycController.getKycStatus);

// POST /api/kyc/verify-pan
router.post('/verify-pan', kycController.verifyPan);

// POST /api/kyc/initiate-aadhaar
router.post('/initiate-aadhaar', kycController.initiateAadhaar);

// POST /api/kyc/verify-aadhaar
router.post('/verify-aadhaar', kycController.verifyAadhaar);

module.exports = router;
