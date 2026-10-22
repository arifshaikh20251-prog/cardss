/**
 * Test Suite: Transaction History, Countdown, and GST Tax Invoice PDF Generator
 * B2B Vendor Invoicing & Rental Management Platform (Phase 1 - Step 3)
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { mockStore } = require('../src/config/supabase');

let server;
let baseUrl;

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
  await new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
});

describe('Transaction History & GST Tax Invoice PDF Tests', () => {
  let authToken = '';
  let transactionId = '';
  let beneficiaryId = '';

  before(async () => {
    // 1. Authenticate user with is_cooling_cleared: false (New user / in cooling window)
    const authRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '9123456780', // Pre-seeded unverified cooling user
        otp: '123456',
        full_name: 'Rohan Verma',
        pan_number: 'BAPPR5678K',
      }),
    });
    const authData = await authRes.json();
    authToken = authData.token;

    // 2. Add vendor beneficiary
    const benRes = await fetch(`${baseUrl}/api/beneficiaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        account_holder_name: 'Starlight Tech Solutions',
        account_number: '50100234567890',
        ifsc_code: 'HDFC0000128',
        bank_name: 'HDFC Bank Ltd',
        pan_number: 'BBBCB9999P',
        beneficiary_type: 'VENDOR',
      }),
    });
    const benData = await benRes.json();
    beneficiaryId = benData.beneficiary.id;

    // 3. Initiate ₹15,000 transaction (INSTANT 3.5%)
    const txRes = await fetch(`${baseUrl}/api/transactions/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        beneficiary_id: beneficiaryId,
        amount: 15000,
        transfer_type: 'INSTANT',
        purpose: 'OFFICE_RENT',
      }),
    });
    const txData = await txRes.json();
    transactionId = txData.checkout.order_id;

    // 4. Simulate PG card swipe webhook to trigger 24-hr cooling
    await fetch(`${baseUrl}/api/transactions/mock-pg-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: transactionId,
        gateway_payment_id: 'PAY_TEST_COOLING_123',
      }),
    });
  });

  // --------------------------------------------------------------------------
  // Test 1: GET /api/transactions (History & Countdown)
  // --------------------------------------------------------------------------
  it('Test 1: should fetch user transaction history with cooling countdown and masked beneficiary details', async () => {
    const res = await fetch(`${baseUrl}/api/transactions`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.transactions));
    assert.ok(data.transactions.length >= 1);

    const tx = data.transactions.find((t) => t.id === transactionId);
    assert.ok(tx, 'Created transaction should exist in history');
    assert.strictEqual(tx.amount, 15000);
    assert.strictEqual(tx.transfer_type, 'INSTANT');
    assert.strictEqual(tx.status, 'IN_COOLING');
    assert.strictEqual(tx.total_charged, 15619.5); // 15000 + 525 + 94.50
    assert.strictEqual(tx.platform_fee, 525.0);    // 3.5% of 15,000
    assert.strictEqual(tx.gst_amount, 94.5);       // 18% of 525
    assert.ok(tx.created_at);

    // Verify Beneficiary Details & Masked Account
    assert.ok(tx.beneficiary);
    assert.strictEqual(tx.beneficiary.name, 'Starlight Tech Solutions');
    assert.strictEqual(tx.beneficiary.masked_account, '******7890');
    assert.strictEqual(tx.beneficiary.bank_name, 'HDFC Bank Ltd');

    // Verify Cooling Countdown calculation
    assert.ok(tx.cooling_seconds_remaining > 80000, 'Remaining seconds should be around 24 hours (~86400s)');
    assert.ok(tx.cooling_message.includes('Security cooling active'));
    assert.ok(tx.cooling_message.includes('hours'));
    assert.strictEqual(tx.invoice_url, `/api/transactions/${transactionId}/invoice`);
  });

  // --------------------------------------------------------------------------
  // Test 2: GET /api/transactions/:id (Single Transaction Details)
  // --------------------------------------------------------------------------
  it('Test 2: should fetch single transaction details including fee breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/transactions/${transactionId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    const tx = data.transaction;
    assert.strictEqual(tx.id, transactionId);
    assert.strictEqual(tx.amount, 15000);
    assert.ok(tx.fee_breakdown);
    assert.strictEqual(tx.fee_breakdown.platformFee, 525.0);
    assert.strictEqual(tx.fee_breakdown.gstAmount, 94.5);
    assert.strictEqual(tx.fee_breakdown.totalPayable, 15619.5);
    assert.strictEqual(tx.fee_breakdown.netPayoutToBeneficiary, 15000.0);
    assert.ok(tx.cooling_seconds_remaining > 0);
  });

  // --------------------------------------------------------------------------
  // Test 3: GET /api/transactions/:id/invoice (GST Tax Invoice PDF Download)
  // --------------------------------------------------------------------------
  it('Test 3: should download valid GST Tax Invoice PDF with Content-Type application/pdf', async () => {
    const res = await fetch(`${baseUrl}/api/transactions/${transactionId}/invoice`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    assert.strictEqual(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.ok(
      contentType && contentType.includes('application/pdf'),
      `Expected application/pdf, got ${contentType}`
    );

    const disposition = res.headers.get('content-disposition');
    assert.ok(
      disposition && disposition.includes(`Invoice-${transactionId}.pdf`),
      `Expected attachment filename with Invoice-${transactionId}.pdf`
    );

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Assert non-empty PDF byte stream
    assert.ok(buffer.length > 2000, `PDF size should be substantial, received: ${buffer.length} bytes`);

    // Verify PDF Magic Bytes (%PDF-)
    const pdfMagicBytes = buffer.subarray(0, 5).toString('ascii');
    assert.strictEqual(pdfMagicBytes, '%PDF-', 'Buffer must begin with valid PDF magic bytes (%PDF-)');
  });

  // --------------------------------------------------------------------------
  // Test 4: Security Check: Reject unauthorized invoice download
  // --------------------------------------------------------------------------
  it('Test 4: should reject downloading invoice for unauthenticated or non-existent transaction', async () => {
    // 4A: Without Auth Header -> 401
    const unauthRes = await fetch(`${baseUrl}/api/transactions/${transactionId}/invoice`);
    assert.strictEqual(unauthRes.status, 401);

    // 4B: Non-existent ID -> 404
    const notFoundRes = await fetch(`${baseUrl}/api/transactions/mock-non-existent-id/invoice`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(notFoundRes.status, 404);
  });
});
