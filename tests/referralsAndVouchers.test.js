/**
 * Zero-Loss Referral Engine & Auto-Generated B2B Voucher Test Suite
 * B2B Vendor Invoicing & Rental Management Platform
 * Phase 5 - Step 5 Verification
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { mockStore } = require('../src/config/supabase');
const couponService = require('../src/services/couponService');

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

describe('Zero-Loss Referral Engine & Auto-Generated Commercial Voucher Suite', () => {
  let referrerToken = '';
  let referrerUser = null;
  let refereeToken = '';
  let refereeUser = null;
  let beneficiaryId = '';

  before(async () => {
    // 1. Authenticate Referrer User
    const resRef = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '9876543210',
        otp: '123456',
        full_name: 'Apex Solutions Pvt Ltd',
      }),
    });
    const refData = await resRef.json();
    referrerToken = refData.token;
    referrerUser = refData.user;

    // 2. Authenticate Referee (New User)
    const resNew = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '9988776655',
        otp: '123456',
        full_name: 'Priya Mehra Ventures',
      }),
    });
    const newData = await resNew.json();
    refereeToken = newData.token;
    refereeUser = newData.user;

    // 3. Create a verified beneficiary for referee
    const benRes = await fetch(`${baseUrl}/api/beneficiaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refereeToken}`,
      },
      body: JSON.stringify({
        account_holder_name: 'Prestige Commercial Estates LLP',
        account_number: '998811223344',
        ifsc_code: 'HDFC0000060',
        beneficiary_type: 'LANDLORD',
        pan_number: 'AAACP9988K',
      }),
    });
    const benData = await benRes.json();
    beneficiaryId = benData.beneficiary.id;
  });

  // --------------------------------------------------------------------------
  // 1. Referral Code Assignment
  // --------------------------------------------------------------------------
  it('Test 1: Assigns each user a unique 6-character referral code', () => {
    assert.ok(referrerUser.referral_code);
    assert.equal(typeof referrerUser.referral_code, 'string');
    assert.equal(referrerUser.referral_code.length, 6);
    assert.ok(referrerUser.referral_code.startsWith('PAY'));

    assert.ok(refereeUser.referral_code);
    assert.equal(typeof refereeUser.referral_code, 'string');
    assert.equal(refereeUser.referral_code.length, 6);
    assert.ok(refereeUser.referral_code.startsWith('PAY'));
  });

  // --------------------------------------------------------------------------
  // 2. Apply Referral Code Validations & Instant Fee Discount
  // --------------------------------------------------------------------------
  it('Test 2: Rejects applying own referral code (Self-referral check)', async () => {
    const res = await fetch(`${baseUrl}/api/referrals/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${referrerToken}`,
      },
      body: JSON.stringify({ referral_code: referrerUser.referral_code }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'SelfReferralNotAllowed');
  });

  it('Test 3: Rejects invalid or non-existent referral codes', async () => {
    const res = await fetch(`${baseUrl}/api/referrals/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refereeToken}`,
      },
      body: JSON.stringify({ referral_code: 'PAY000' }),
    });

    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'InvalidReferralCode');
  });

  it('Test 4: Successfully applies referrer code and gives referee ₹15 instant fee discount (REF15)', async () => {
    const res = await fetch(`${baseUrl}/api/referrals/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refereeToken}`,
      },
      body: JSON.stringify({ referral_code: referrerUser.referral_code }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.discount_code, 'REF15');
    assert.equal(data.discount_amount, 15);
  });

  it('Test 5: Prevents duplicate referral redemptions by the same referee', async () => {
    const res = await fetch(`${baseUrl}/api/referrals/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refereeToken}`,
      },
      body: JSON.stringify({ referral_code: referrerUser.referral_code }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'ReferralAlreadyApplied');
  });

  // --------------------------------------------------------------------------
  // 3. Coupon Engine: REF15 and REF25
  // --------------------------------------------------------------------------
  it('Test 6: Validates REF15 coupon discount for referee on checkout', () => {
    const res = couponService.validateAndApplyCoupon({
      code: 'REF15',
      amount: 10000,
      transferType: 'STANDARD',
    });

    assert.equal(res.valid, true);
    assert.equal(res.coupon.code, 'REF15');
    assert.equal(res.coupon.discountAmount, 15);
  });

  // --------------------------------------------------------------------------
  // 4. End-to-End Payout Release Issues ₹25 Coupon to Referrer
  // --------------------------------------------------------------------------
  it('Test 7: Initiates transfer without external invoice and auto-generates commercial voucher', async () => {
    const res = await fetch(`${baseUrl}/api/transactions/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refereeToken}`,
      },
      body: JSON.stringify({
        beneficiary_id: beneficiaryId,
        amount: 12000,
        transfer_type: 'INSTANT',
        purpose: 'COMMERCIAL_LEASE',
        coupon_code: 'REF15',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.transaction.coupon_code, 'REF15');
    assert.equal(data.transaction.voucher_status, 'AUTO_GENERATED');
    assert.ok(data.transaction.voucher_url);
    assert.equal(data.transaction.has_external_invoice, false);

    // Referee clears cooling to enable instant IMPS settlement
    mockStore.updateUser(refereeUser.id, { is_cooling_cleared: true });

    // Now trigger mock PG capture (with instant IMPS payout)
    const webhookRes = await fetch(`${baseUrl}/api/transactions/mock-pg-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: data.checkout.order_id,
        gateway_payment_id: `PAY_REF_${Date.now()}`,
      }),
    });

    assert.equal(webhookRes.status, 200);
  });

  it('Test 8: Successful payout issues ₹25 reward coupon to referrer and updates my-stats', async () => {
    const statsRes = await fetch(`${baseUrl}/api/referrals/my-stats`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${referrerToken}` },
    });

    assert.equal(statsRes.status, 200);
    const data = await statsRes.json();
    assert.equal(data.success, true);
    assert.equal(data.referral_code, referrerUser.referral_code);
    assert.equal(data.total_referred >= 1, true);
    assert.equal(data.successful_payouts >= 1, true);
    assert.equal(data.total_rewards_earned >= 25, true);
    assert.ok(Array.isArray(data.earned_coupons));
    assert.ok(data.earned_coupons.some((c) => c.code === 'REF25' && c.value === 25));
  });

  // --------------------------------------------------------------------------
  // 5. Download Auto-Generated Commercial Voucher PDF
  // --------------------------------------------------------------------------
  it('Test 9: GET /api/transactions/:id/voucher downloads valid PDF document', async () => {
    const txs = mockStore.getTransactionsByUserId(refereeUser.id);
    const targetTx = txs[0];

    const res = await fetch(`${baseUrl}/api/transactions/${targetTx.id}/voucher`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${refereeToken}` },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000); // Valid non-empty PDF binary
  });
});
