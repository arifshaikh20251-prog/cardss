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
  // 1. Coupon Service Unit Tests
  // --------------------------------------------------------------------------
  it('Test 1: WELCOME50 validates and applies flat ₹50 discount + net GST on orders > ₹5,000', () => {
    // ₹10,000 at Standard 2.5% = ₹250 platform fee
    // WELCOME50 gives -₹50 discount => Net fee = ₹200
    // 18% GST on Net Fee = ₹36 (instead of ₹45)
    // Total Fee = ₹236, Total Payable = ₹10,236, Total Savings = ₹59
    const res = couponService.validateAndApplyCoupon({
      code: 'WELCOME50',
      amount: 10000,
      transferType: 'STANDARD',
      purpose: 'VENDOR_INVOICE',
    });

    assert.equal(res.valid, true);
    assert.equal(res.coupon.code, 'WELCOME50');
    assert.equal(res.coupon.originalFee, 250);
    assert.equal(res.coupon.discountAmount, 50);
    assert.equal(res.coupon.netFee, 200);
    assert.equal(res.coupon.gstAmount, 36);
    assert.equal(res.coupon.totalFee, 236);
    assert.equal(res.coupon.totalPayable, 10236);
    assert.equal(res.coupon.totalSavings, 59);
  });

  it('Test 2: WELCOME50 is rejected if amount does not exceed ₹5,000 min threshold', () => {
    const res = couponService.validateAndApplyCoupon({
      code: 'WELCOME50',
      amount: 4500,
      transferType: 'STANDARD',
    });

    assert.equal(res.valid, false);
    assert.equal(res.error, 'MinAmountNotMet');
  });

  it('Test 3: FEE10 applies dynamic 10% fee discount and recalculates net GST', () => {
    // ₹20,000 at Instant 3.5% = ₹700 platform fee
    // FEE10 gives 10% off ₹700 = ₹70 discount => Net fee = ₹630
    // 18% GST on net fee = ₹113.40
    // Total fee = ₹743.40, Total payable = ₹20,743.40
    const res = couponService.validateAndApplyCoupon({
      code: 'FEE10',
      amount: 20000,
      transferType: 'INSTANT',
    });

    assert.equal(res.valid, true);
    assert.equal(res.coupon.code, 'FEE10');
    assert.equal(res.coupon.originalFee, 700);
    assert.equal(res.coupon.discountAmount, 70);
    assert.equal(res.coupon.netFee, 630);
    assert.equal(res.coupon.gstAmount, 113.4);
    assert.equal(res.coupon.totalFee, 743.4);
    assert.equal(res.coupon.totalPayable, 20743.4);
  });

  it('Test 4: RENTMAX enforces rental purpose eligibility and min amount of ₹15,000', () => {
    // 4A: Rejected for non-rental purpose (VENDOR_INVOICE)
    const invalidPurpose = couponService.validateAndApplyCoupon({
      code: 'RENTMAX',
      amount: 18000,
      transferType: 'STANDARD',
      purpose: 'VENDOR_INVOICE',
    });
    assert.equal(invalidPurpose.valid, false);
    assert.equal(invalidPurpose.error, 'IneligiblePurpose');

    // 4B: Accepted for OFFICE_RENT > ₹15,000
    // ₹18,000 at Standard 2.5% = ₹450 platform fee
    // RENTMAX gives -₹100 discount => Net fee = ₹350
    // 18% GST = ₹63, Total fee = ₹413, Total savings = ₹118
    const validRent = couponService.validateAndApplyCoupon({
      code: 'RENTMAX',
      amount: 18000,
      transferType: 'STANDARD',
      purpose: 'OFFICE_RENT',
    });
    assert.equal(validRent.valid, true);
    assert.equal(validRent.coupon.code, 'RENTMAX');
    assert.equal(validRent.coupon.discountAmount, 100);
    assert.equal(validRent.coupon.netFee, 350);
    assert.equal(validRent.coupon.gstAmount, 63);
    assert.equal(validRent.coupon.totalSavings, 118);
  });

  it('Test 5: Rejects invalid or expired coupon codes', () => {
    const res = couponService.validateAndApplyCoupon({
      code: 'DISCOUNT999',
      amount: 10000,
    });
    assert.equal(res.valid, false);
    assert.equal(res.error, 'InvalidCoupon');
  });

  // --------------------------------------------------------------------------
  // 2. HTTP Route Endpoints
  // --------------------------------------------------------------------------
  it('Test 6: GET /api/coupons returns all active promotional coupons', async () => {
    const res = await fetch(`${baseUrl}/api/coupons`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.coupons));
    assert.ok(data.coupons.some((c) => c.code === 'WELCOME50'));
    assert.ok(data.coupons.some((c) => c.code === 'FEE10'));
    assert.ok(data.coupons.some((c) => c.code === 'RENTMAX'));
  });

  it('Test 7: POST /api/coupons/validate endpoint validates coupon math via API', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'WELCOME50',
        amount: 12000,
        transferType: 'STANDARD',
      }),
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.code, 'WELCOME50');
    assert.equal(data.discountAmount, 50);
  });

  // --------------------------------------------------------------------------
  // 3. Initiate Transaction with Coupon Code
  // --------------------------------------------------------------------------
  it('Test 8: POST /api/transactions/initiate applies coupon and persists net fees', async () => {
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
        coupon_code: 'RENTMAX',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.checkout.applied_coupon.code, 'RENTMAX');
    assert.equal(data.checkout.applied_coupon.discountAmount, 100);
    assert.equal(data.transaction.coupon_code, 'RENTMAX');
    assert.equal(data.transaction.discount_amount, 100);

    // Standard fee on 18k is 450 - 100 discount = 350 net fee + 63 GST = 413
    assert.equal(data.checkout.total_amount, 18413);
  });

  // --------------------------------------------------------------------------
  // 4. Monthly Spend Analytics Aggregation
  // --------------------------------------------------------------------------
  it('Test 9: GET /api/transactions/analytics returns aggregated monthly spend, swipe count, and savings', async () => {
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
