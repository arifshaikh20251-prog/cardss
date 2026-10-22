/**
 * RBI Compliance Digital Audit Logger Middleware
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements mandatory 5-year digital audit trails under RBI Master Directions:
 * 1. Captures client IP (x-forwarded-for proxy-aware) and device User-Agent
 * 2. Attaches standardized req.clientIp and req.userAgent to all inbound requests
 * 3. Records immutable audit log entries for financial state changes into database
 */

const { supabase, mockStore, isMockMode } = require('../config/supabase');
const { getClientIp } = require('./rateLimiter');

/**
 * Extracts and normalizes User-Agent header
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || 'Unknown/Headless';
}

/**
 * Persists an immutable compliance audit record (RBI 5-year trail)
 *
 * @param {Object} params
 * @param {string} params.entityType - 'TRANSACTION' | 'BENEFICIARY' | 'AUTH' | 'KYC' | 'ADMIN'
 * @param {string} params.entityId - Primary UUID of the affected entity
 * @param {string} params.action - E.g. 'INITIATE_PAYMENT', 'VERIFY_OTP', 'ADD_BENEFICIARY'
 * @param {string} [params.actorId] - User or Admin UUID
 * @param {string} [params.ipAddress] - Client IP address
 * @param {string} [params.userAgent] - Browser/Device user-agent
 * @param {Object} [params.payload] - Additional contextual metadata (amount, mode, etc.)
 */
async function recordAuditLog({
  entityType,
  entityId,
  action,
  actorId = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
  payload = {},
}) {
  const auditRecord = {
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: actorId,
    ip_address: ipAddress,
    payload: {
      ...payload,
      user_agent: userAgent,
      recorded_at: new Date().toISOString(),
      compliance_ref: 'RBI_DIGITAL_PAYMENT_DIRECTIONS_2021',
    },
  };

  try {
    if (isMockMode || supabase?.isMock) {
      const saved = mockStore.createAuditLog(auditRecord);
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[AUDIT_LOG_RBI] Action: ${action} | Entity: ${entityType}:${entityId} | IP: ${ipAddress}`);
      }
      return saved;
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(auditRecord)
      .select()
      .single();

    if (error) {
      console.warn('[AUDIT_LOG_ERROR] Failed to insert audit log to Supabase:', error.message);
      return null;
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[AUDIT_LOG_RBI] Action: ${action} | Entity: ${entityType}:${entityId} | IP: ${ipAddress}`);
    }
    return data;
  } catch (err) {
    console.warn('[AUDIT_LOG_EXCEPTION]', err.message);
    return null;
  }
}

/**
 * Express Middleware: Enriches request with IP & User-Agent, and captures audit trails
 */
function auditLogger(req, res, next) {
  req.clientIp = getClientIp(req);
  req.userAgent = getUserAgent(req);

  // Intercept request completion for financial mutations to log execution status
  const start = Date.now();
  res.on('finish', () => {
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    const isFinancialRoute = req.originalUrl?.startsWith('/api/transactions') ||
                             req.originalUrl?.startsWith('/api/beneficiaries') ||
                             req.originalUrl?.startsWith('/api/auth') ||
                             req.originalUrl?.startsWith('/api/kyc');

    if (isMutation && isFinancialRoute && process.env.NODE_ENV !== 'test') {
      const duration = Date.now() - start;
      console.log(
        `[AUDIT_HTTP] ${req.method} ${req.originalUrl} -> Status ${res.statusCode} | IP: ${req.clientIp} | Duration: ${duration}ms`
      );
    }
  });

  next();
}

module.exports = {
  auditLogger,
  recordAuditLog,
  getClientIp,
  getUserAgent,
};
