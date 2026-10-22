/**
 * Production API Security Shield & Rate Limiting Middleware
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements strict, multi-tiered throttling to protect against:
 * 1. OTP SMS exhaustion & wallet draining attacks on auth endpoints
 * 2. Rapid-fire transaction initiation & brute-force card abuse
 * 3. DDoS / bot scraping on public API surfaces
 * 4. Explicit exemption for payment gateway webhooks (Cashfree / Easebuzz)
 */

const { rateLimit } = require('express-rate-limit');

/**
 * Extracts and normalizes client IP address, handling reverse proxies (Hostinger Passenger / Nginx / Cloudflare)
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * Standard Fintech Rate Limit Error Response Handler (HTTP 429)
 */
function createRateLimitHandler(customMsg) {
  return (req, res /* , next, options */) => {
    const clientIp = getClientIp(req);
    return res.status(429).json({
      success: false,
      error: 'RateLimitExceeded',
      message: customMsg || 'Too Many Requests - Security Rate Limit Exceeded. Please try again later.',
      clientIp,
      timestamp: new Date().toISOString(),
    });
  };
}

/**
 * Predicate to determine whether request should bypass rate limiting.
 * - Exempts payment gateway webhooks to prevent dropped callbacks.
 * - Exempts test runs unless 'x-test-rate-limit' header is explicitly passed.
 */
function shouldSkip(req, isWebhookExempt = true) {
  const path = req.originalUrl || req.url || '';

  // 1. Payment Gateway Webhook & Health check exemption
  if (isWebhookExempt) {
    if (
      path.includes('/pg-webhook') ||
      path.includes('/mock-pg-webhook') ||
      path.includes('/health')
    ) {
      return true;
    }
  }

  // 2. Automated test suite bypass (unless test explicitly enables limiter)
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
    return true;
  }

  return false;
}

/**
 * A. Strict Auth Limiter on /api/auth/send-otp
 * Limit: Max 5 requests per 10 minutes per IP/mobile
 * Prevents SMS gateway exhaustion, SMS bombing, and billing drainage.
 */
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false,
    trustProxy: false,
  },
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const mobile = req.body?.mobile ? String(req.body.mobile).replace(/\D/g, '') : '';
    return mobile ? `auth_${ip}_${mobile}` : `auth_${ip}`;
  },
  handler: createRateLimitHandler(
    'Too Many Requests - Security Rate Limit Exceeded. Maximum 5 OTP requests per 10 minutes permitted.'
  ),
  skip: (req) => shouldSkip(req, false),
});

/**
 * B. Financial Transaction Limiter on /api/transactions/initiate
 * Limit: Max 20 requests per hour per user/IP
 * Prevents automated order spinning, card testing bots, and duplicate checkout spam.
 */
const transactionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false,
    trustProxy: false,
  },
  keyGenerator: (req) => {
    const userId = req.user?.id;
    if (userId) return `tx_user_${userId}`;
    const ip = getClientIp(req);
    return `tx_ip_${ip}`;
  },
  handler: createRateLimitHandler(
    'Too Many Requests - Security Rate Limit Exceeded. Maximum 20 transaction initiations per hour permitted.'
  ),
  skip: (req) => shouldSkip(req, true),
});

/**
 * C. API Global Rate Limiter for general endpoints
 * Limit: 100 requests per 15 minutes per IP
 * Protects platform infrastructure against scraping and denial-of-service.
 * Webhooks are strictly exempted.
 */
const apiGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: {
    keyGeneratorIpFallback: false,
    xForwardedForHeader: false,
    trustProxy: false,
  },
  keyGenerator: (req) => `global_${getClientIp(req)}`,
  handler: createRateLimitHandler(
    'Too Many Requests - Security Rate Limit Exceeded. API request threshold reached.'
  ),
  skip: (req) => shouldSkip(req, true),
});

module.exports = {
  authLimiter,
  transactionLimiter,
  apiGlobalLimiter,
  getClientIp,
};
