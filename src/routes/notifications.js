/**
 * In-App Notification Center Routes
 * B2B Vendor Invoicing & Rental Management Platform
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /api/notifications
router.get('/', notificationController.getNotifications);

// POST /api/notifications/read-all
router.post('/read-all', notificationController.markAllAsRead);

// POST /api/notifications/:id/read
router.post('/:id/read', notificationController.markAsRead);

module.exports = router;
