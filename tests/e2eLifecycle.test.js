/**
 * End-to-End Integration Test: Fintech Transaction Lifecycle
 * B2B Vendor Invoicing & Rental Management Platform (Phase 1 - Step 2)
 *
 * Verifies:
 * 1. User authentication via Mock Mobile OTP -> JWT issuance
 * 2. Anti-Self-Transfer AML check blocks user adding themselves
 * 3. Adding valid 3rd-party vendor beneficiary (Penny-Drop mock verified)
 * 4. Dual Fee Calculation: ₹20,000 INSTANT -> 3.5% fee (₹700) + 18% GST (₹126) = ₹20,826
 * 5. Payment Gateway Webhook triggers 24-hour security cooling (status: 'IN_COOLING')
 * 6. 24-Hour Cooling Release Worker settles transaction -> status: 'PAYOUT_SUCCESS' + IMPS UTR
 * 7. Enforces ₹25,000 single ticket cap
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { mockStore } = require('../src/config/supabase');
const { processCoolingReleases } = require('../src/services/coolingWorker');

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

describe('E2E Fintech Business Engine Lifecycle', () => {
  let authToken = '';
  let userId = '';
  let vendorBeneficiaryId = '';
  let transactionOrderId = '';

  // --------------------------------------------------------------------------
  // Step 1: User Login via Mock OTP
  // --------------------------------------------------------------------------
  it('Step 1: should send mock OTP and authenticate user, returning valid JWT', async () => {
    const mobile = '9988776655';

    // 1A. Request OTP
    const sendRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    });
    const sendData = await sendRes.json();
    assert.strictEqual(sendRes.status, 200);
    assert.strictEqual(sendData.success, true);
    assert.strictEqual(sendData.otp, '123456');

    // 1B. Verify OTP and Register/Login
    const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile,
        otp: '123456',
        full_name: 'Vikram Malhotra',
        pan_number: 'ABCDE1234F',
      }),
    });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyData.success, true);
    assert.ok(verifyData.token, 'Token must be present');
    assert.strictEqual(verifyData.user.full_name, 'Vikram Malhotra');
    assert.strictEqual(verifyData.user.is_cooling_cleared, false); // New user starts in cooling

    authToken = verifyData.token;
    userId = verifyData.user.id;
  });

  // --------------------------------------------------------------------------
  // Step 2: Anti-Self-Transfer AML Enforcement
  // --------------------------------------------------------------------------
  it('Step 2: should reject adding user themselves as beneficiary under AML rules', async () => {
    // Attempt to add matching PAN & Name
    const benRes = await fetch(`${baseUrl}/api/beneficiaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        account_holder_name: 'Vikram Malhotra',
        account_number: '123456789012',
        ifsc_code: 'HDFC0000128',
        pan_number: 'ABCDE1234F', // Matches user's PAN!
      }),
    });

    const benData = await benRes.json();
    assert.strictEqual(benRes.status, 400);
    assert.strictEqual(benData.success, false);
    assert.strictEqual(benData.error, 'SelfTransferProhibited');
    assert.ok(benData.message.includes('Self-transfer prohibited under AML guidelines'));
  });

  // --------------------------------------------------------------------------
  // Step 3: Add Valid Third-Party Vendor Beneficiary
  // --------------------------------------------------------------------------
  it('Step 3: should register valid third-party vendor beneficiary with mock penny-drop verification', async () => {
    const benRes = await fetch(`${baseUrl}/api/beneficiaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        account_holder_name: 'CloudWorks Technologies LLP',
        account_number: '987654321098',
        ifsc_code: 'ICIC0001824',
        bank_name: 'ICICI Bank Ltd',
        pan_number: 'XYZPA9999Z',
        beneficiary_type: 'VENDOR',
      }),
    });

    const benData = await benRes.json();
    assert.strictEqual(benRes.status, 201);
    assert.strictEqual(benData.success, true);
    assert.strictEqual(benData.beneficiary.account_holder_name, 'CloudWorks Technologies LLP');
    assert.strictEqual(benData.beneficiary.penny_drop_verified, true);
    assert.strictEqual(benData.beneficiary.is_verified, true);

    vendorBeneficiaryId = benData.beneficiary.id;
  });

  // --------------------------------------------------------------------------
  // Step 4: Initiate Transaction of ₹20,000 (INSTANT - 3.5% + 18% GST)
  // --------------------------------------------------------------------------
  it('Step 4: should initiate ₹20,000 INSTANT transfer with exact ₹700 fee + ₹126 GST = ₹20,826', async () => {
    const txRes = await fetch(`${baseUrl}/api/transactions/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        beneficiary_id: vendorBeneficiaryId,
        amount: 20000,
        transfer_type: 'INSTANT',
        purpose: 'VENDOR_INVOICE',
      }),
    });

    const txData = await txRes.json();
    assert.strictEqual(txRes.status, 201);
    assert.strictEqual(txData.success, true);

    // Verify exact fee breakdown
    const checkout = txData.checkout;
    assert.strictEqual(checkout.principal_amount, 20000);
    assert.strictEqual(checkout.transfer_type, 'INSTANT');
    assert.strictEqual(checkout.fee_breakdown.platformFee, 700.0); // 3.5% of 20,000
    assert.strictEqual(checkout.fee_breakdown.gstAmount, 126.0); // 18% on 700
    assert.strictEqual(checkout.fee_breakdown.totalFee, 826.0);
    assert.strictEqual(checkout.total_amount, 20826.0); // 20,000 + 826
    assert.strictEqual(checkout.fee_breakdown.netPayoutToBeneficiary, 20000.0);

    // Verify transaction status is INITIATED
    assert.strictEqual(txData.transaction.status, 'INITIATED');
    transactionOrderId = txData.transaction.id;
  });

  // --------------------------------------------------------------------------
  // Step 4B: Enforce ₹25,000 Single Ticket Cap
  // --------------------------------------------------------------------------
  it('Step 4B: should reject transaction exceeding ₹25,000 single ticket cap', async () => {
    const capRes = await fetch(`${baseUrl}/api/transactions/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        beneficiary_id: vendorBeneficiaryId,
        amount: 25000.01,
        transfer_type: 'STANDARD',
      }),
    });

    const capData = await capRes.json();
    assert.strictEqual(capRes.status, 400);
    assert.strictEqual(capData.error, 'TicketCapExceeded');
  });

  // --------------------------------------------------------------------------
  // Step 5: Simulate Payment Gateway Webhook -> Triggers 24-hr Cooling
  // --------------------------------------------------------------------------
  it('Step 5: should process PG webhook and route new user to IN_COOLING (24-hour hold)', async () => {
    const webhookRes = await fetch(`${baseUrl}/api/transactions/mock-pg-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: transactionOrderId,
        gateway_payment_id: 'PAY_MOCK_SWIPE_101',
      }),
    });

    const webhookData = await webhookRes.json();
    assert.strictEqual(webhookRes.status, 200);
    assert.strictEqual(webhookData.success, true);
    assert.strictEqual(webhookData.transaction.status, 'IN_COOLING');
    assert.strictEqual(webhookData.transaction.payout_status, 'IN_COOLING');
    assert.ok(webhookData.transaction.cooling_release_at, 'cooling_release_at must be populated');
    assert.ok(webhookData.message.includes('cooling-off active'));
  });

  // --------------------------------------------------------------------------
  // Step 6: Simulate 24-Hour Cooling Expiry -> Payout Release Worker
  // --------------------------------------------------------------------------
  it('Step 6: should release cooling transaction to PAYOUT_SUCCESS with IMPS UTR upon cooling expiry', async () => {
    // Simulate time forward by 25 hours (past the 24h cooling window)
    const futureTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const workerResult = await processCoolingReleases(futureTime);

    assert.ok(workerResult.processedCount >= 1, 'At least 1 cooling transaction should be released');

    // Fetch updated transaction
    const getRes = await fetch(`${baseUrl}/api/transactions/${transactionOrderId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const getData = await getRes.json();

    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getData.transaction.status, 'PAYOUT_SUCCESS');
    assert.strictEqual(getData.transaction.payout_status, 'PAYOUT_SUCCESS');
    assert.ok(
      getData.transaction.utr_number && getData.transaction.utr_number.startsWith('UTR-IMPS-'),
      `UTR should be valid IMPS format, got: ${getData.transaction.utr_number}`
    );
    assert.ok(getData.transaction.settled_at, 'settled_at must be populated');

    // Verify user is now cooling cleared
    const updatedUser = mockStore.findUserById(userId);
    assert.strictEqual(updatedUser.is_cooling_cleared, true);
  });
});
