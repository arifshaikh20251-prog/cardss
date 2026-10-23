/**
 * Promotional Broadcast Engine & Pop-Up Modal Test Suite
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Verifies:
 * 1. Public client resolution of active broadcast campaign (/api/promotions/active)
 * 2. Security shield enforcement on admin update endpoint (/api/admin/promotions)
 * 3. Operator dynamic updates (title, subtitle, coupon_code, target_amount, badge)
 * 4. Real-time master toggle switch [ON / OFF] functionality
 * 5. High-volume audience targeting filters
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { mockStore } = require('../src/config/supabase');
const { JWT_SECRET } = require('../src/middleware/authMiddleware');

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'fintech_admin_secret_key_2026';

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

test('Promotional Broadcast Engine & Pop-Up Modal Suite', async (t) => {
  // Reset mock store before suite
  mockStore.reset();

  await t.test('Test 1: GET /api/promotions/active returns default active promotional broadcast', async () => {
    const res = await makeRequest('/api/promotions/active');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.promotion, 'Promotion should be present');
    assert.strictEqual(res.body.promotion.is_active, true);
    assert.strictEqual(res.body.promotion.coupon_code, 'SAVE25');
    assert.strictEqual(res.body.promotion.target_amount, 25000);
    assert.ok(res.body.promotion.title.includes('Commercial Bill Rush'));
  });

  await t.test('Test 2: PUT /api/admin/promotions rejects requests without valid admin authorization (403)', async () => {
    const res = await makeRequest('/api/admin/promotions', {
      method: 'PUT',
      body: { title: 'Unauthorized Override' },
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'Forbidden');
  });

  await t.test('Test 3: PUT /api/admin/promotions successfully updates campaign payload with admin key', async () => {
    const updatePayload = {
      title: '🔥 Super Saturday Flash Incentive',
      subtitle: 'Disburse commercial invoices above ₹50,000 & save flat ₹50!',
      coupon_code: 'SAVE50',
      badge_text: 'WEEKEND SPECIAL',
      cta_label: 'Claim ₹50 OFF & Disburse',
      target_amount: 50000,
      target_audience: 'ALL',
      is_active: true,
    };

    const res = await makeRequest('/api/admin/promotions', {
      method: 'PUT',
      headers: { 'x-admin-key': ADMIN_KEY },
      body: updatePayload,
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.promotion.title, '🔥 Super Saturday Flash Incentive');
    assert.strictEqual(res.body.promotion.coupon_code, 'SAVE50');
    assert.strictEqual(res.body.promotion.target_amount, 50000);

    // Verify GET /api/promotions/active reflects update
    const activeRes = await makeRequest('/api/promotions/active');
    assert.strictEqual(activeRes.statusCode, 200);
    assert.strictEqual(activeRes.body.promotion.coupon_code, 'SAVE50');
    assert.strictEqual(activeRes.body.promotion.target_amount, 50000);
    assert.strictEqual(activeRes.body.promotion.cta_label, 'Claim ₹50 OFF & Disburse');
  });

  await t.test('Test 4: Master toggle OFF: updating is_active: false results in GET /api/promotions/active returning null', async () => {
    const res = await makeRequest('/api/admin/promotions', {
      method: 'PUT',
      headers: { 'x-admin-key': ADMIN_KEY },
      body: { is_active: false },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.promotion.is_active, false);

    // Verify client gets null active promotion
    const activeRes = await makeRequest('/api/promotions/active');
    assert.strictEqual(activeRes.statusCode, 200);
    assert.strictEqual(activeRes.body.promotion, null);
  });

  await t.test('Test 5: Master toggle ON: updating is_active: true restores active promotional broadcast', async () => {
    const res = await makeRequest('/api/admin/promotions', {
      method: 'PUT',
      headers: { 'x-admin-key': ADMIN_KEY },
      body: { is_active: true },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.promotion.is_active, true);

    const activeRes = await makeRequest('/api/promotions/active');
    assert.strictEqual(activeRes.statusCode, 200);
    assert.ok(activeRes.body.promotion);
    assert.strictEqual(activeRes.body.promotion.is_active, true);
  });

  await t.test('Test 6: High-volume target audience filtering works accurately', async () => {
    // Set audience to HIGH_VOLUME
    await makeRequest('/api/admin/promotions', {
      method: 'PUT',
      headers: { 'x-admin-key': ADMIN_KEY },
      body: { target_audience: 'HIGH_VOLUME', is_active: true },
    });

    // 1. Unauthenticated request should receive null
    const guestRes = await makeRequest('/api/promotions/active');
    assert.strictEqual(guestRes.statusCode, 200);
    assert.strictEqual(guestRes.body.promotion, null);

    // 2. User with 0 transactions should receive null
    const user2 = mockStore.users[1]; // usr-2222-2222-2222
    const tokenLowVolume = jwt.sign(
      { id: user2.id, mobile: user2.mobile, role: 'USER' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const lowVolRes = await makeRequest('/api/promotions/active', {
      headers: { Authorization: `Bearer ${tokenLowVolume}` },
    });
    assert.strictEqual(lowVolRes.statusCode, 200);
    assert.strictEqual(lowVolRes.body.promotion, null);

    // 3. User with >= 3 transactions should receive the promotion
    const user1 = mockStore.users[0]; // usr-1111-1111-1111
    // Seed 3 completed transactions for user1
    for (let i = 1; i <= 3; i++) {
      mockStore.createTransaction({
        id: `tx-vol-test-${i}`,
        user_id: user1.id,
        beneficiary_id: 'ben-1111-1111-1111',
        amount: 10000 * i,
        status: 'PAYOUT_SUCCESS',
      });
    }

    const tokenHighVolume = jwt.sign(
      { id: user1.id, mobile: user1.mobile, role: 'USER' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const highVolRes = await makeRequest('/api/promotions/active', {
      headers: { Authorization: `Bearer ${tokenHighVolume}` },
    });
    assert.strictEqual(highVolRes.statusCode, 200);
    assert.ok(highVolRes.body.promotion);
    assert.strictEqual(highVolRes.body.promotion.target_audience, 'HIGH_VOLUME');
  });
});
