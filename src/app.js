/**
 * Express Application Configuration
 * B2B Vendor Invoicing & Rental Management Platform
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Route imports
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const beneficiaryRoutes = require('./routes/beneficiary');
const transactionRoutes = require('./routes/transactions');
const devRoutes = require('./routes/dev');
const kycRoutes = require('./routes/kyc');
const adminRoutes = require('./routes/admin');

// Security & Audit Middleware imports
const { authLimiter, transactionLimiter, apiGlobalLimiter } = require('./middleware/rateLimiter');
const { auditLogger } = require('./middleware/auditLogger');

const app = express();

// Trust reverse proxy (Hostinger Passenger / Nginx / Cloudflare)
app.set('trust proxy', 1);

// ==============================================================================
// 1. Security & Production CORS Middleware
// ==============================================================================
app.use(helmet());

// Dynamic CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, Postman, test runner, server-to-server)
    if (!origin) return callback(null, true);

    // Check explicit origins or Vercel preview deployments (*.vercel.app)
    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/.*\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }

    // In local development or testing, permit all origins gracefully
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    return callback(new Error(`CORS error: Origin ${origin} not permitted.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// RBI Compliance Digital Audit Logger (IP & Device Fingerprinting)
app.use(auditLogger);

// ==============================================================================
// 2. Routing Setup & Rate Limiters
// ==============================================================================
// Production API Security Shield (Rate Limiters)
app.use('/api', apiGlobalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/transactions', transactionLimiter);

app.get('/', (req, res) => {
  res.json({
    name: 'B2B Vendor Invoicing & Rental Management Engine',
    status: 'ACTIVE',
    version: '1.3.0',
    phase: 'Phase 2: Production Client & Supabase Live Bridge',
    capabilities: [
      'Dual Fee Rates (INSTANT 3.5%, STANDARD 2.5%) + 18% GST',
      'Beneficiary Vault with Penny Drop Verification',
      'Anti-Self-Transfer AML Guardrails (PAN & Fuzzy Name Matching)',
      'Single Ticket Cap strictly max ₹25,000',
      '24-Hour Security Cooling Window & Background Release Worker',
      'Automated SAC 9971 GST Tax Invoice PDF Generator',
      'Mobile-First Next.js Client & Vercel / Hostinger Production Config',
    ],
    endpoints: {
      health: 'GET /api/health',
      authSendOtp: 'POST /api/auth/send-otp',
      authVerifyOtp: 'POST /api/auth/verify-otp',
      beneficiaries: 'GET, POST /api/beneficiaries',
      transactions: 'GET, POST /api/transactions',
      invoicePdf: 'GET /api/transactions/:id/invoice',
      mockPgWebhook: 'POST /api/transactions/mock-pg-webhook',
    },
    documentation: 'See database/schema.sql and README.md for full specs.',
  });
});

// Mount Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

// Sandbox simulation endpoints (active only in non-production)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
}

// ==============================================================================
// 3. Fallback & Global Error Handlers
// ==============================================================================
// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'RouteNotFound',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  console.error('[UNHANDLED_ERROR]', err);

  res.status(statusCode).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected server error occurred.',
    ...(isDev && { stack: err.stack }),
  });
});

module.exports = app;
