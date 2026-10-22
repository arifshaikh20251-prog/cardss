/**
 * Security Rate Limiter & RBI Audit Trail Test Suite
 * B2B Vendor Invoicing & Rental Management Platform
 * Phase 5 - Step 1 Verification
 */

const { test, describe, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { authLimiter, transactionLimiter, apiGlobalLimiter, getClientIp } = require('../src/middleware/rateLimiter');
const { auditLogger, recordAuditLog, getUserAgent } = require('../src/middleware/auditLogger');
const { mockStore } = require('../src/config/supabase');

describe('Phase 5 Security Shield & Rate Limiter Suite', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  test('Test 1: Client IP resolver extracts first IP from x-forwarded-for header', () => {
    const mockReq = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      },
    };
    const ip = getClientIp(mockReq);
    assert.equal(ip, '203.0.113.195');

    const singleIpReq = {
      headers: {
        'x-forwarded-for': '49.207.210.45',
      },
    };
    assert.equal(getClientIp(singleIpReq), '49.207.210.45');
  });

  test('Test 2: User-Agent resolver extracts client browser fingerprint', () => {
    const mockReq = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 UtilityPayPWA/1.0',
      },
    };
    const ua = getUserAgent(mockReq);
    assert.equal(ua, 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 UtilityPayPWA/1.0');
  });

  test('Test 3: authLimiter throttles after 5 requests and returns 429 Fintech JSON payload', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/auth/send-otp', authLimiter, (req, res) => {
      res.json({ success: true, message: 'OTP dispatched' });
    });

    const server = app.listen(0);
    const port = server.address().port;

    try {
      // Send 5 valid requests
      for (let i = 1; i <= 5; i++) {
        const response = await fetch(`http://127.0.0.1:${port}/api/auth/send-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-rate-limit': 'true',
            'x-forwarded-for': '198.51.100.10',
          },
          body: JSON.stringify({ mobile: '9988776655' }),
        });
        assert.equal(response.status, 200, `Request ${i} should succeed`);
      }

      // 6th request should trigger 429 RateLimitExceeded
      const blockedRes = await fetch(`http://127.0.0.1:${port}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-rate-limit': 'true',
          'x-forwarded-for': '198.51.100.10',
        },
        body: JSON.stringify({ mobile: '9988776655' }),
      });

      assert.equal(blockedRes.status, 429);
      const blockedBody = await blockedRes.json();
      assert.equal(blockedBody.success, false);
      assert.equal(blockedBody.error, 'RateLimitExceeded');
      assert.match(blockedBody.message, /Security Rate Limit Exceeded/);
    } finally {
      server.close();
    }
  });

  test('Test 4: Payment gateway webhook endpoints are exempt from rate limiting', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', apiGlobalLimiter);
    app.post('/api/transactions/pg-webhook', (req, res) => {
      res.json({ success: true, status: 'WEBHOOK_ACK' });
    });

    const server = app.listen(0);
    const port = server.address().port;

    try {
      // Send rapid requests to webhook (simulating Cashfree high-frequency settlement batch)
      for (let i = 0; i < 15; i++) {
        const response = await fetch(`http://127.0.0.1:${port}/api/transactions/pg-webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-rate-limit': 'true',
            'x-forwarded-for': '52.66.101.40',
          },
          body: JSON.stringify({ event: 'PAYMENT_SUCCESS', order_id: `ORD_${i}` }),
        });
        assert.equal(response.status, 200, `Webhook request ${i} should never be throttled`);
      }
    } finally {
      server.close();
    }
  });

  test('Test 5: recordAuditLog creates compliant RBI 5-year digital audit record', async () => {
    const audit = await recordAuditLog({
      entityType: 'TRANSACTION',
      entityId: '0c71e151-cab5-411d-ba44-a49a1b4b92f1',
      action: 'TRANSACTION_INITIATED',
      actorId: 'usr-1111-1111-1111',
      ipAddress: '103.21.244.2',
      userAgent: 'UtilityPayAndroidNative/1.0',
      payload: {
        amount: 25000,
        purpose: 'OFFICE_RENT',
        transfer_type: 'INSTANT',
      },
    });

    assert.ok(audit, 'Audit record should be created');
    assert.equal(audit.entity_type, 'TRANSACTION');
    assert.equal(audit.entity_id, '0c71e151-cab5-411d-ba44-a49a1b4b92f1');
    assert.equal(audit.action, 'TRANSACTION_INITIATED');
    assert.equal(audit.ip_address, '103.21.244.2');
    assert.equal(audit.payload.compliance_ref, 'RBI_DIGITAL_PAYMENT_DIRECTIONS_2021');
    assert.equal(audit.payload.user_agent, 'UtilityPayAndroidNative/1.0');

    // Verify stored in mockStore
    const logs = mockStore.getAuditLogs({ entity_type: 'TRANSACTION' });
    assert.ok(logs.length >= 1);
    assert.equal(logs[logs.length - 1].action, 'TRANSACTION_INITIATED');
  });
});
