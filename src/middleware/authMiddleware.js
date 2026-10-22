/**
 * JWT Authentication Middleware
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Verifies Bearer JWT tokens and resolves the authenticated fintech user.
 */

const jwt = require('jsonwebtoken');
const { mockStore, isMockMode, supabase } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'fintech-jwt-secret-key-phase1-2026';

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header. Expected Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired session token.',
      });
    }

    let user = null;
    if (isMockMode || supabase.isMock) {
      user = mockStore.findUserById(decoded.id) || (decoded.mobile ? mockStore.findUserByMobile(decoded.mobile) : null);
    } else {
      const { data, error } = await supabase.from('users').select('*').eq('id', decoded.id).single();
      if (!error && data) user = data;
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User associated with token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET,
};
