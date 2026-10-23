/**
 * Authentication Routes
 * B2B Vendor Invoicing & Rental Management Platform
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { authMiddleware } = require('../middleware/authMiddleware');

// POST /api/auth/send-otp
router.post('/send-otp', authController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', authController.verifyOtp);

// PUT /api/auth/profile
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;
