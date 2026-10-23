/**
 * System Health Diagnostics & Automated Cloud Ledger Backup Test Suite
 * B2B Vendor Invoicing & Rental Management Platform
 * Phase 6 - Step 3 Verification
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { mockStore } = require('../src/config/supabase');
const { backupLedger, maskPan, maskAccountNumber, maskMobile } = require('../scripts/backupLedger');

let server;
let baseUrl;
const ADMIN_KEY = 'fintech_admin_secret_key_2026';
let testBackupFilePath = null;

before(async () => {
  mockStore.reset();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (testBackupFilePath && fs.existsSync(testBackupFilePath)) {
    try {
      fs.unlinkSync(testBackupFilePath);
    } catch (_) {}
  }

  await new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
});

describe('Production System Health & Diagnostics Hub Suite', () => {
  it('Test 1: GET /api/admin/system-health rejects requests without admin authorization header', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system-health`);
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  it('Test 2: GET /api/admin/system-health returns comprehensive operational metrics with admin key', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system-health`, {
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'ALL_SYSTEMS_OPERATIONAL');

    // Node.js engine & memory
    assert.ok(data.engine);
    assert.strictEqual(data.engine.name, 'Node.js');
    assert.ok(data.engine.version);
    assert.ok(typeof data.engine.uptimeSeconds === 'number');
    assert.ok(data.engine.uptimeHuman);
    assert.ok(data.engine.memory.rssMB > 0);
    assert.ok(data.engine.memory.heapUsedMB > 0);

    // Database connection & latency
    assert.ok(data.database);
    assert.strictEqual(data.database.status, 'CONNECTED');
    assert.ok(data.database.type);
    assert.ok(typeof data.database.latencyMs === 'number');

    // Gateway mode
    assert.ok(data.gateway);
    assert.ok(['mock', 'cashfree_sandbox', 'cashfree_production'].includes(data.gateway.mode));

    // Rate Limiting
    assert.ok(data.rateLimiting);
    assert.strictEqual(data.rateLimiting.status, 'ACTIVE');
    assert.strictEqual(data.rateLimiting.limits.otp.maxRequests, 5);
    assert.strictEqual(data.rateLimiting.limits.transactions.maxRequests, 20);

    // Webhook HMAC Security
    assert.ok(data.webhookSecurity);
    assert.strictEqual(data.webhookSecurity.algorithm, 'HMAC-SHA256');

    // SAC 9971 Compliance Engine
    assert.ok(data.complianceEngine);
    assert.strictEqual(data.complianceEngine.sacCode, '9971');
    assert.strictEqual(data.complianceEngine.gstRate, '18%');
    assert.strictEqual(data.complianceEngine.status, 'OPERATIONAL');
  });

  it('Test 3: POST /api/admin/test-gateway-ping executes live diagnostic gateway ping', async () => {
    const res = await fetch(`${baseUrl}/api/admin/test-gateway-ping`, {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'HEALTHY');
    assert.ok(data.provider);
    assert.ok(typeof data.latencyMs === 'number');
  });

  it('Test 4: POST /api/admin/test-webhook-handshake executes and verifies HMAC-SHA256 signature', async () => {
    const res = await fetch(`${baseUrl}/api/admin/test-webhook-handshake`, {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.verified, true);
    assert.strictEqual(data.algorithm, 'HMAC-SHA256');
    assert.ok(data.message.includes('verified successfully'));
  });
});

describe('Automated Cloud Ledger Backup Engine Suite', () => {
  it('Test 5: Correctly masks sensitive PAN, Account, and Mobile numbers', () => {
    const maskedPan = maskPan('ABCDE1234F');
    assert.strictEqual(maskedPan, 'AB******4F');

    const maskedAcc = maskAccountNumber('98765432101234');
    assert.strictEqual(maskedAcc, '•••• •••• 1234');

    const maskedMobile = maskMobile('9988776655');
    assert.strictEqual(maskedMobile, '+91 ***** 6655');
  });

  it('Test 6: backupLedger exports sanitized records without leaking credentials', async () => {
    const testDir = path.resolve(__dirname, '..', 'backups', 'test_run');
    const result = await backupLedger(testDir);

    assert.strictEqual(result.success, true);
    assert.ok(result.filePath);
    assert.ok(fs.existsSync(result.filePath));
    testBackupFilePath = result.filePath;

    assert.ok(result.fileSizeKB > 0);
    assert.ok(result.checksum);
    assert.strictEqual(typeof result.checksum, 'string');
    assert.strictEqual(result.checksum.length, 64); // SHA-256 hex string

    // Inspect exported content
    const rawContent = fs.readFileSync(result.filePath, 'utf-8');
    const parsed = JSON.parse(rawContent);

    assert.ok(parsed.metadata);
    assert.ok(parsed.metadata.checksum_sha256);
    assert.ok(parsed.ledger);
    assert.ok(Array.isArray(parsed.ledger.users));

    // Verify sanitization on each user
    parsed.ledger.users.forEach((u) => {
      assert.strictEqual(u.otp, undefined, 'Raw OTP must not be leaked');
      assert.strictEqual(u.password, undefined, 'Password must not be leaked');
      assert.strictEqual(u.secret, undefined, 'Secrets must not be leaked');
      if (u.mobile) {
        assert.ok(u.mobile.startsWith('+91 *****'), 'Mobile must be masked');
      }
      if (u.pan_number) {
        assert.ok(u.pan_number.includes('******'), 'PAN must be masked');
      }
    });

    // Verify sanitization on each beneficiary
    parsed.ledger.beneficiaries.forEach((b) => {
      assert.ok(b.account_number.startsWith('••••'), 'Bank account must be masked');
    });

    // Clean up test run directory
    try {
      fs.unlinkSync(result.filePath);
      fs.rmdirSync(testDir);
    } catch (_) {}
  });
});
