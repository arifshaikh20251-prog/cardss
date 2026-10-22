/**
 * Admin Security Middleware
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Enforces admin authorization via:
 * 1. Dedicated `x-admin-key` header matching ADMIN_SECRET_KEY (Ops / Server-to-server)
 * 2. Authenticated user JWT with role === 'ADMIN' or is_admin === true
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./authMiddleware');
const { mockStore, isMockMode, supabase } = require('../config/supabase');

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'fintech_admin_secret_key_2026';

async function adminMiddleware(req, res, next) {
  try {
    const adminKeyHeader = req.headers['x-admin-key'] || req.query.admin_key;

    // 1. Direct Admin API Key verification
    if (adminKeyHeader && adminKeyHeader === ADMIN_SECRET_KEY) {
      req.isAdmin = true;
      req.adminSource = 'ADMIN_KEY';
      return next();
    }

    // 2. JWT Bearer token check
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        let user = null;

        if (isMockMode || supabase.isMock) {
          user = mockStore.findUserById(decoded.id) || (decoded.mobile ? mockStore.findUserByMobile(decoded.mobile) : null);
        } else {
          const { data, error } = await supabase.from('users').select('*').eq('id', decoded.id).single();
          if (!error && data) user = data;
        }

        if (user && (user.role === 'ADMIN' || user.is_admin === true || decoded.role === 'ADMIN')) {
          req.user = user;
          req.isAdmin = true;
          req.adminSource = 'JWT_ADMIN';
          return next();
        }
      } catch (_) {
        // Fall through to unauthorized
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Admin access required. Provide valid x-admin-key or admin authenticated session.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminMiddleware,
  ADMIN_SECRET_KEY,
};
