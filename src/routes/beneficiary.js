/**
 * Beneficiary Routes
 * B2B Vendor Invoicing & Rental Management Platform
 */

const express = require('express');
const router = express.Router();
const beneficiaryController = require('../controllers/beneficiaryController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All beneficiary routes are protected with JWT auth
router.use(authMiddleware);

// POST /api/beneficiaries
router.post('/', beneficiaryController.createBeneficiary);

// GET /api/beneficiaries
router.get('/', beneficiaryController.getBeneficiaries);

module.exports = router;
