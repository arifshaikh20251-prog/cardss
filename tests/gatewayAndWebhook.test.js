/**
 * Payment Gateway & Webhook Signature Verification Tests
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Verifies gateway order generation, strict HMAC-SHA256 webhook security,
 * and automated IMPS disbursement routing with 24h cooling rules.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/app');
const gatewayFactory = require('../src/services/gateway/gatewayFactory');
const payoutFactory = require('../src/services/payout/payoutFactory');
const mockGateway = require('../src/services/gateway/mockGateway');
const { mockStore } = require('../src/config/supabase');

// Helper to make test HTTP requests to Express app
function makeRequest(path, options = {}) {
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

test('Gateway Adapter & HMAC Webhook Verification Suite', async (t) => {
  await t.test('Test 1: Verify mock gateway generates order and payment session ID', async () => {
    const order = await gatewayFactory.createPaymentOrder({
      orderId: 'ORD_TEST_101',
      amount: 20826.00,
      customerInfo: {
        id: 'usr-1111-1111-1111',
        name: 'Apex Solutions Pvt Ltd',
        phone: '9876543210',
      },
    });

    assert.equal(order.success, true);
    assert.equal(order.order_id, 'ORD_TEST_101');
    assert.ok(order.payment_session_id.startsWith('session_'));
    assert.equal(order.order_status, 'ACTIVE');
    assert.equal(order.order_amount, 20826.00);
  });

  await t.test('Test 2: Verify webhook rejects forged or missing signature with HTTP 401', async () => {
    const payload = {
      order_id: 'ORD_FORGED_102',
      payment_status: 'SUCCESS',
    };

    // Case A: Missing signature
    const resNoSig = await makeRequest('/api/transactions/pg-webhook', {
      method: 'POST',
      body: payload,
    });
    assert.equal(resNoSig.statusCode, 401);
    assert.equal(resNoSig.body.error, 'InvalidSignature');

    // Case B: Forged/Tampered signature
    const resBadSig = await makeRequest('/api/transactions/pg-webhook', {
      method: 'POST',
      headers: {
        'x-webhook-signature': 'forged_fake_signature_hash',
        'x-webhook-timestamp': String(Date.now()),
      },
      body: payload,
    });
    assert.equal(resBadSig.statusCode, 401);
    assert.equal(resBadSig.body.error, 'InvalidSignature');
  });

  await t.test('Test 3: Verify webhook with valid HMAC signature processes transaction and applies cooling window properly', async () => {
    // 1. Pre-seed unverified user in mockStore (needs 24h cooling)
    const coolingTxId = 'tx-gateway-cooling-test';
    mockStore.createTransaction({
      id: coolingTxId,
      gateway_order_id: 'ORD_COOLING_999',
      user_id: 'usr-2222-2222-2222', // Rohan Verma (is_cooling_cleared: false)
      beneficiary_id: 'ben-1111-1111-1111',
      amount: 15000,
      convenience_fee: 525,
      gst_on_fee: 94.50,
      total_debited: 15619.50,
      transfer_type: 'INSTANT',
      status: 'INITIATED',
    });

    const timestamp = String(Date.now());
    const webhookPayload = {
      order_id: 'ORD_COOLING_999',
      gateway_payment_id: 'PAY_CF_SANDBOX_888',
      payment_status: 'SUCCESS',
    };

    const validSignature = mockGateway.generateMockSignature(webhookPayload, timestamp);

    const res = await makeRequest('/api/transactions/pg-webhook', {
      method: 'POST',
      headers: {
        'x-webhook-signature': validSignature,
        'x-webhook-timestamp': timestamp,
      },
      body: webhookPayload,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.transaction.status, 'IN_COOLING');
    assert.ok(res.body.transaction.cooling_release_at);
  });

  await t.test('Test 4: Verify webhook for verified user executes automated IMPS payout and assigns Bank UTR', async () => {
    // 1. Pre-seed verified user transaction (is_cooling_cleared: true)
    const instantTxId = 'tx-gateway-instant-payout';
    mockStore.createTransaction({
      id: instantTxId,
      gateway_order_id: 'ORD_INSTANT_777',
      user_id: 'usr-1111-1111-1111', // Apex Solutions (is_cooling_cleared: true)
      beneficiary_id: 'ben-1111-1111-1111',
      amount: 20000,
      convenience_fee: 700,
      gst_on_fee: 126,
      total_debited: 20826,
      transfer_type: 'INSTANT',
      status: 'INITIATED',
    });

    const timestamp = String(Date.now());
    const webhookPayload = {
      order_id: 'ORD_INSTANT_777',
      gateway_payment_id: 'PAY_CF_INSTANT_999',
      payment_status: 'SUCCESS',
    };

    const validSignature = mockGateway.generateMockSignature(webhookPayload, timestamp);

    const res = await makeRequest('/api/transactions/pg-webhook', {
      method: 'POST',
      headers: {
        'x-webhook-signature': validSignature,
        'x-webhook-timestamp': timestamp,
      },
      body: webhookPayload,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.transaction.status, 'PAYOUT_SUCCESS');
    assert.ok(res.body.transaction.utr_number.startsWith('UTR-IMPS-'));
  });

  await t.test('Test 5: Verify payout adapter executes IMPS payout directly', async () => {
    const payoutResult = await payoutFactory.executeImpsPayout({
      transferId: 'TRF_TEST_444',
      amount: 10000,
      beneficiaryAccount: '100234908123',
      beneficiaryIfsc: 'HDFC0000128',
      remarks: 'Test IMPS Payout',
    });

    assert.equal(payoutResult.success, true);
    assert.equal(payoutResult.transfer_id, 'TRF_TEST_444');
    assert.ok(payoutResult.utr_number.startsWith('UTR-IMPS-'));
    assert.equal(payoutResult.amount, 10000);
  });
});
