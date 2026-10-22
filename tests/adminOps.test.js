/**
 * Admin Ops & Master Control Center Test Suite
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Verifies:
 * 1. Security middleware enforcement (x-admin-key / admin role)
 * 2. Mathematical accuracy of platform financial float metrics (/api/admin/metrics)
 * 3. Real-time cooling override operation with instant IMPS UTR assignment
 * 4. CA-compliant monthly GST tax report export (SAC 9971 CSV & JSON)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { mockStore } = require('../src/config/supabase');
const { ADMIN_SECRET_KEY } = require('../src/middleware/adminMiddleware');

// HTTP helper
async function makeRequest(path, options = {}) {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const bodyData = options.body ? JSON.stringify(options.body) : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(bodyData && { 'Content-Length': Buffer.byteLength(bodyData) }),
        ...options.headers,
      };

      const req = http.request(
        `http://localhost:${port}${path}`,
        {
          method: options.method || 'GET',
          headers,
        },
        (res) => {
          let chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            server.close();
            const rawBody = Buffer.concat(chunks).toString();
            let jsonBody = null;
            try {
              jsonBody = JSON.parse(rawBody);
            } catch (_) {
              jsonBody = rawBody;
            }
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: jsonBody,
            });
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (bodyData) req.write(bodyData);
      req.end();
    });
  });
}

test('Admin Ops & Master Control Center Suite', async (t) => {
  // Pre-seed mock store with realistic test transactions
  mockStore.reset();

  const user = mockStore.users[0]; // Apex Solutions (usr-1111-1111-1111)
  const ben = mockStore.beneficiaries[0]; // InfraTech (ben-1111-1111-1111)

  // Seed Transaction 1: Settled
  mockStore.createTransaction({
    id: 'tx-admin-settled-1',
    user_id: user.id,
    beneficiary_id: ben.id,
    amount: 20000,
    convenience_fee: 700,
    gst_on_fee: 126,
    total_debited: 20826,
    transfer_type: 'INSTANT',
    status: 'PAYOUT_SUCCESS',
    utr_number: 'UTR-IMPS-TEST-123456',
  });

  // Seed Transaction 2: In Cooling
  mockStore.createTransaction({
    id: 'tx-admin-cooling-2',
    user_id: user.id,
    beneficiary_id: ben.id,
    amount: 15000,
    convenience_fee: 375,
    gst_on_fee: 67.5,
    total_debited: 15442.5,
    transfer_type: 'STANDARD',
    status: 'IN_COOLING',
    cooling_release_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });

  await t.test('Test 1: Security middleware blocks unauthorized admin requests with 403', async () => {
    // No credentials
    const resNoAuth = await makeRequest('/api/admin/metrics');
    assert.equal(resNoAuth.statusCode, 403);
    assert.equal(resNoAuth.body.success, false);
    assert.equal(resNoAuth.body.error, 'Forbidden');

    // Invalid admin key
    const resBadKey = await makeRequest('/api/admin/metrics', {
      headers: { 'x-admin-key': 'invalid_secret_key' },
    });
    assert.equal(resBadKey.statusCode, 403);
    assert.equal(resBadKey.body.success, false);
  });

  await t.test('Test 2: GET /api/admin/metrics returns accurate mathematical financial aggregates', async () => {
    const res = await makeRequest('/api/admin/metrics', {
      headers: { 'x-admin-key': ADMIN_SECRET_KEY },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.metrics);

    const m = res.body.metrics;
    assert.equal(m.sacCode, '9971');
    assert.equal(m.activeCoolingCount, 1);
    assert.equal(m.activeCoolingVolume, 15000);
    assert.equal(m.settledPayoutsCount, 1);
    assert.equal(m.totalSettledPayouts, 20000);
    assert.equal(m.grossVolume, 36268.5); // 20826 + 15442.5
    assert.equal(m.totalPlatformFees, 1075); // 700 + 375
    assert.equal(m.totalGst, 193.5); // 126 + 67.5
    assert.ok(m.activeUsers >= 2);
  });

  await t.test('Test 3: POST /api/admin/transactions/:id/override-cooling clears hold & issues Bank UTR', async () => {
    const res = await makeRequest('/api/admin/transactions/tx-admin-cooling-2/override-cooling', {
      method: 'POST',
      headers: { 'x-admin-key': ADMIN_SECRET_KEY },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.utr);
    assert.ok(res.body.utr.startsWith('UTR-IMPS-'));

    // Verify state in store
    const updated = mockStore.findTransactionById('tx-admin-cooling-2');
    assert.equal(updated.status, 'PAYOUT_SUCCESS');
    assert.equal(updated.payout_status, 'PAYOUT_SUCCESS');
    assert.equal(updated.utr_number, res.body.utr);
    assert.equal(updated.admin_override, true);
  });

  await t.test('Test 4: GET /api/admin/export-gst-report generates valid SAC 9971 CSV and JSON files', async () => {
    // 1. JSON format
    const resJson = await makeRequest('/api/admin/export-gst-report?format=json', {
      headers: { 'x-admin-key': ADMIN_SECRET_KEY },
    });

    assert.equal(resJson.statusCode, 200);
    assert.equal(resJson.body.success, true);
    assert.equal(resJson.body.sacCode, '9971');
    assert.ok(resJson.body.records.length >= 2);

    const firstRecord = resJson.body.records[0];
    assert.equal(firstRecord.sacCode, '9971');
    assert.equal(firstRecord.cgstRate, '9%');
    assert.equal(firstRecord.sgstRate, '9%');
    assert.ok(firstRecord.taxableValue);
    assert.ok(firstRecord.totalInvoiceValue);

    // 2. CSV format
    const resCsv = await makeRequest('/api/admin/export-gst-report?format=csv', {
      headers: { 'x-admin-key': ADMIN_SECRET_KEY },
    });

    assert.equal(resCsv.statusCode, 200);
    assert.ok(resCsv.headers['content-type'].includes('text/csv'));
    assert.ok(resCsv.headers['content-disposition'].includes('UtilityPay_CA_GSTR1_'));

    // Validate CSV content contains expected columns
    const csvContent = typeof resCsv.body === 'string' ? resCsv.body : '';
    assert.ok(csvContent.includes('Tax Invoice Number'));
    assert.ok(csvContent.includes('SAC Code'));
    assert.ok(csvContent.includes('Taxable Platform Fee (INR)'));
    assert.ok(csvContent.includes('Total GST (18%)'));
    assert.ok(csvContent.includes('Bank IMPS UTR'));
    assert.ok(csvContent.includes('9971'));
  });
});
