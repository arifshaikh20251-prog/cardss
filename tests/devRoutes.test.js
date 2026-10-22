/**
 * Developer Sandbox Simulation Routes Tests
 * Verifies fast-forward cooling simulation and sandbox reset
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { mockStore } = require('../src/config/supabase');

// Minimal in-memory HTTP caller helper
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
            } catch (e) {
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

test('Dev Sandbox Simulation Suite', async (t) => {
  await t.test('POST /api/dev/reset-sandbox should reset mock store to defaults', async () => {
    // Modify mock store
    mockStore.transactions.push({ id: 'dummy-tx', status: 'IN_COOLING' });
    assert.ok(mockStore.transactions.length > 0);

    const res = await makeRequest('/api/dev/reset-sandbox', { method: 'POST' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(mockStore.transactions.length, 0);
  });

  await t.test('POST /api/dev/fast-forward-cooling should release cooling transactions', async () => {
    // Add transaction in cooling
    mockStore.createTransaction({
      id: 'tx-cooling-sim',
      user_id: 'usr-2222-2222-2222',
      beneficiary_id: 'ben-1111-1111-1111',
      base_amount: 10000,
      total_debited: 10413,
      platform_fee: 350,
      gst_amount: 63,
      transfer_type: 'INSTANT',
      status: 'IN_COOLING',
      cooling_release_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });

    const res = await makeRequest('/api/dev/fast-forward-cooling', {
      method: 'POST',
      body: { hours: 24 },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.released_count >= 1);

    const released = mockStore.findTransactionById('tx-cooling-sim');
    assert.equal(released.status, 'PAYOUT_SUCCESS');
    assert.ok(released.utr_number.startsWith('UTR-IMPS-'));
  });
});
