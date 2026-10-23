/**
 * Promotional Coupon & Monthly Spend Analytics Test Suite
 * B2B Vendor Invoicing & Rental Management Platform
 * Phase 5 - Step 4 Verification
 */

const { describe, it, before, after, beforeEach } = require('node:test');
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

describe('Promotional Coupon & Monthly Analytics Suite', () => {
  let authToken = '';
  let userId = '';
  let beneficiaryId = '';

  before(async () => {
    // 1. Authenticate user to obtain JWT
    const sendOtpRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' }),
    });
    const otpData = await sendOtpRes.json();

    const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '9876543210',
        otp: otpData.mock_otp || '123456',
        full_name: 'Ananya Sharma',
      }),
    });
    const authData = await verifyRes.json();
    authToken = authData.token;
    userId = authData.user.id;

    // 2. Create verified 3rd-party beneficiary
    const benRes = await fetch(`${baseUrl}/api/beneficiaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        account_holder_name: 'DLF CyberCity Leasehold LLP',
        account_number: '918273645501',
        ifsc_code: 'HDFC0000060',
        beneficiary_type: 'LANDLORD',
        pan_number: 'AAACD5501E',
      }),
    });
    const benData = await benRes.json();
    beneficiaryId = benData.beneficiary.id;
  });

  // --------------------------------------------------------------------------
  // 1. Coupon Service Unit Tests (Margin-Safe Tiered Coupons)
  // --------------------------------------------------------------------------
  it('Test 1: SAVE10 validates and applies flat ₹10 discount + net GST on orders >= ₹10,000', () => {
    // ₹10,000 at Standard 2.5% = ₹250 platform fee (exceeds minFee of ₹200)
    // SAVE10 gives -₹10 discount => Net fee = ₹240
    // 18% GST on Net Fee = ₹43.20 (instead of ₹45)
    // Total Fee = ₹283.20, Total Payable = ₹10,283.20, Total Savings = ₹11.80
    const res = couponService.validateAndApplyCoupon({
      code: 'SAVE10',
      amount: 10000,
      transferType: 'STANDARD',
      purpose: 'VENDOR_INVOICE',
    });

    assert.equal(res.valid, true);
    assert.equal(res.coupon.code, 'SAVE10');
    assert.equal(res.coupon.originalFee, 250);
    assert.equal(res.coupon.discountAmount, 10);
    assert.equal(res.coupon.netFee, 240);
    assert.equal(res.coupon.gstAmount, 43.2);
    assert.equal(res.coupon.totalFee, 283.2);
    assert.equal(res.coupon.totalPayable, 10283.2);
    assert.equal(res.coupon.totalSavings, 11.8);
  });

  it('Test 2: SAVE10 is rejected if amount does not meet ₹10,000 min threshold', () => {
    const res = couponService.validateAndApplyCoupon({
      code: 'SAVE10',
      amount: 8500,
      transferType: 'STANDARD',
    });

    assert.equal(res.valid, false);
    assert.equal(res.error, 'MinAmountNotMet');
  });

  it('Test 3: SAVE25 applies flat ₹25 fee discount on orders >= ₹25,000', () => {
    // ₹25,000 at Standard 2.5% = ₹625 platform fee (exceeds minFee of ₹500)
    // SAVE25 gives -₹25 discount => Net fee = ₹600
    // 18% GST on net fee = ₹108
    // Total fee = ₹708, Total payable = ₹25,708, Total savings = ₹29.50
    const res = couponService.validateAndApplyCoupon({
      code: 'SAVE25',
      amount: 25000,
      transferType: 'STANDARD',
    });

    assert.equal(res.valid, true);
    assert.equal(res.coupon.code, 'SAVE25');
    assert.equal(res.coupon.originalFee, 625);
    assert.equal(res.coupon.discountAmount, 25);
    assert.equal(res.coupon.netFee, 600);
    assert.equal(res.coupon.gstAmount, 108);
    assert.equal(res.coupon.totalFee, 708);
    assert.equal(res.coupon.totalPayable, 25708);
    assert.equal(res.coupon.totalSavings, 29.5);
  });

  it('Test 4: SAVE50 enforces >= ₹50,000 and min fee of ₹1,000', () => {
    // 4A: Rejected for amount < ₹50,000
    const underAmt = couponService.validateAndApplyCoupon({
      code: 'SAVE50',
      amount: 30000,
      transferType: 'STANDARD',
    });
    assert.equal(underAmt.valid, false);
    assert.equal(underAmt.error, 'MinAmountNotMet');

    // 4B: Accepted for ₹50,000 Standard (2.5% = ₹1,250 fee >= ₹1,000 minFee)
    const valid50k = couponService.validateAndApplyCoupon({
      code: 'SAVE50',
      amount: 50000,
      transferType: 'STANDARD',
    });
    assert.equal(valid50k.valid, true);
    assert.equal(valid50k.coupon.code, 'SAVE50');
    assert.equal(valid50k.coupon.discountAmount, 50);
    assert.equal(valid50k.coupon.netFee, 1200);
  });

  it('Test 5: Rejects invalid or expired coupon codes', () => {
    const res = couponService.validateAndApplyCoupon({
      code: 'DISCOUNT999',
      amount: 10000,
    });
    assert.equal(res.valid, false);
    assert.equal(res.error, 'InvalidCoupon');
  });

  it('Test 6: getHighestEligibleCoupon returns highest discount tier based on amount', () => {
    // At ₹15,000: SAVE10 is highest eligible
    const c15k = couponService.getHighestEligibleCoupon({ amount: 15000 });
    assert.ok(c15k);
    assert.equal(c15k.code, 'SAVE10');

    // At ₹25,000: SAVE25 is highest eligible
    const c25k = couponService.getHighestEligibleCoupon({ amount: 25000 });
    assert.ok(c25k);
    assert.equal(c25k.code, 'SAVE25');

    // At ₹5,000: No tier eligible (threshold is ₹10k)
    const c5k = couponService.getHighestEligibleCoupon({ amount: 5000 });
    assert.equal(c5k, null);
  });

  // --------------------------------------------------------------------------
  // 2. HTTP Route Endpoints
  // --------------------------------------------------------------------------
  it('Test 7: GET /api/coupons returns all active tiered coupons and best eligible', async () => {
    const res = await fetch(`${baseUrl}/api/coupons?amount=25000`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.coupons));
    assert.ok(data.coupons.some((c) => c.code === 'SAVE10'));
    assert.ok(data.coupons.some((c) => c.code === 'SAVE25'));
    assert.ok(data.coupons.some((c) => c.code === 'SAVE50'));
    assert.equal(data.best_eligible?.code, 'SAVE25');
  });

  it('Test 8: POST /api/coupons/validate endpoint validates coupon math via API', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'SAVE10',
        amount: 12000,
        transferType: 'STANDARD',
      }),
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.code, 'SAVE10');
    assert.equal(data.discountAmount, 10);
  });

  // --------------------------------------------------------------------------
  // 3. Initiate Transaction with Coupon Code
  // --------------------------------------------------------------------------
  it('Test 9: POST /api/transactions/initiate applies coupon and persists net fees', async () => {
    const res = await fetch(`${baseUrl}/api/transactions/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        beneficiary_id: beneficiaryId,
        amount: 18000,
        transfer_type: 'STANDARD',
        purpose: 'OFFICE_RENT',
        coupon_code: 'SAVE10',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.checkout.applied_coupon.code, 'SAVE10');
    assert.equal(data.checkout.applied_coupon.discountAmount, 10);
    assert.equal(data.transaction.coupon_code, 'SAVE10');
    assert.equal(data.transaction.discount_amount, 10);

    // Standard fee on 18k is 450 - 10 discount = 440 net fee + 79.20 GST = 519.20
    assert.equal(data.checkout.total_amount, 18519.2);
  });

  // --------------------------------------------------------------------------
  // 4. Monthly Spend Analytics Aggregation
  // --------------------------------------------------------------------------
  it('Test 10: GET /api/transactions/analytics returns aggregated monthly spend, swipe count, and savings', async () => {
    // Settle the initiated transaction so it counts as successful
    const allTxs = mockStore.getTransactionsByUserId(userId);
    const lastTx = allTxs[0];
    mockStore.updateTransaction(lastTx.id, {
      status: 'PAYOUT_SUCCESS',
      payout_status: 'SUCCESS',
      utr_number: 'UTR-TEST-ANALYTICS-99',
    });

    const res = await fetch(`${baseUrl}/api/transactions/analytics`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.analytics);
    assert.equal(data.analytics.current_month_total_amount >= 15000, true);
    assert.equal(data.analytics.current_month_swipe_count >= 1, true);
    assert.ok(data.analytics.month_name);
    assert.equal(data.analytics.total_fees_saved > 0, true);
  });
});
