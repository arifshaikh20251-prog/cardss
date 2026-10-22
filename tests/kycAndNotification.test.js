/**
 * KYC Verification & Multi-Channel Notification Test Suite
 * B2B Vendor Invoicing & Rental Management Platform (Phase 3 - Step 2)
 *
 * Verifies:
 * 1. PAN verification endpoint and name matching logic
 * 2. Aadhaar OTP initiation and verification flow (clearing cooling limits & marking user VERIFIED)
 * 3. Notification Service generating email payload with GST Tax Invoice PDF attachment and SMS alert
 * 4. Webhook triggers notifications upon payment capture
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { mockStore } = require('../src/config/supabase');
const notificationService = require('../src/services/notificationService');
const kycFactory = require('../src/services/kyc/kycFactory');

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

describe('KYC Verification & Notification Engine Suite', () => {
  let authToken = '';
  let userId = '';
  let userMobile = '9876543299';
  let aadhaarClientRefId = '';

  // Setup: Authenticate fresh test user
  before(async () => {
    const authRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: userMobile,
        otp: '123456',
        full_name: 'Aditya Birla Enterprises',
      }),
    });
    const authData = await authRes.json();
    assert.equal(authRes.status, 200);
    assert.ok(authData.token);
    authToken = authData.token;
    userId = authData.user.id;
  });

  // --------------------------------------------------------------------------
  // Test 1: Verify PAN verification endpoint and name matching logic
  // --------------------------------------------------------------------------
  it('Test 1: Verify PAN verification endpoint and name matching logic', async () => {
    // 1A. Reject invalid PAN format
    const badPanRes = await fetch(`${baseUrl}/api/kyc/verify-pan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ panNumber: 'INVALID_PAN' }),
    });
    const badPanData = await badPanRes.json();
    assert.equal(badPanRes.status, 400);
    assert.equal(badPanData.success, false);

    // 1B. Accept valid 10-character PAN
    const validPanRes = await fetch(`${baseUrl}/api/kyc/verify-pan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        panNumber: 'ABCDE1234F',
        fullName: 'Aditya Birla Enterprises',
      }),
    });
    const validPanData = await validPanRes.json();
    assert.equal(validPanRes.status, 200);
    assert.equal(validPanData.success, true);
    assert.equal(validPanData.data.pan, 'ABCDE1234F');
    assert.equal(validPanData.data.status, 'ACTIVE');
    assert.ok(validPanData.data.matchScore >= 80, 'Expected match score >= 80%');
    assert.equal(validPanData.user.pan_number, 'ABCDE1234F');
    assert.equal(validPanData.user.kyc_step, 'AADHAAR_PENDING');
  });

  // --------------------------------------------------------------------------
  // Test 2: Verify Aadhaar OTP initiation and verification flow
  // --------------------------------------------------------------------------
  it('Test 2: Verify Aadhaar OTP initiation and verification flow', async () => {
    // 2A. Reject invalid Aadhaar number length
    const badAadhaarRes = await fetch(`${baseUrl}/api/kyc/initiate-aadhaar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ aadhaarNumber: '12345' }),
    });
    const badAadhaarData = await badAadhaarRes.json();
    assert.equal(badAadhaarRes.status, 400);
    assert.equal(badAadhaarData.success, false);

    // 2B. Initiate valid Aadhaar OTP
    const initRes = await fetch(`${baseUrl}/api/kyc/initiate-aadhaar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ aadhaarNumber: '998877665544' }),
    });
    const initData = await initRes.json();
    assert.equal(initRes.status, 200);
    assert.equal(initData.success, true);
    assert.ok(initData.clientRefId);
    assert.equal(initData.maskedAadhaar, 'XXXXXXXX5544');
    aadhaarClientRefId = initData.clientRefId;

    // 2C. Reject incorrect OTP
    const badOtpRes = await fetch(`${baseUrl}/api/kyc/verify-aadhaar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        clientRefId: aadhaarClientRefId,
        otp: '000000',
      }),
    });
    const badOtpData = await badOtpRes.json();
    assert.equal(badOtpRes.status, 400);
    assert.equal(badOtpData.success, false);

    // 2D. Submit valid OTP (123456) -> User updated to VERIFIED & limits cleared
    const verifyRes = await fetch(`${baseUrl}/api/kyc/verify-aadhaar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        clientRefId: aadhaarClientRefId,
        otp: '123456',
      }),
    });
    const verifyData = await verifyRes.json();
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyData.success, true);
    assert.equal(verifyData.user.kyc_status, 'VERIFIED');
    assert.equal(verifyData.user.is_cooling_cleared, true);

    // 2E. Confirm KYC Status API reflects completed verification
    const statusRes = await fetch(`${baseUrl}/api/kyc/status`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const statusData = await statusRes.json();
    assert.equal(statusRes.status, 200);
    assert.equal(statusData.kyc_status, 'VERIFIED');
    assert.equal(statusData.is_cooling_cleared, true);
  });

  // --------------------------------------------------------------------------
  // Test 3: Verify notification service generates email payload with invoice PDF attachment
  // --------------------------------------------------------------------------
  it('Test 3: Verify notification service generates email payload with invoice PDF attachment', async () => {
    notificationService.clearNotificationHistory();

    const mockTx = {
      id: 'TXN-NOTIF-TEST-100',
      user_id: userId,
      amount: 18000,
      convenience_fee: 630,
      gst_on_fee: 113.40,
      total_debited: 18743.40,
      transfer_type: 'INSTANT',
      purpose: 'COMMERCIAL_OFFICE_LEASE',
      status: 'PAYOUT_SUCCESS',
      utr_number: 'UTR-IMPS-887766554433',
    };

    const mockBen = {
      account_holder_name: 'DLF Commercial Properties Pvt Ltd',
      account_number: '987654321098',
      bank_name: 'ICICI Bank',
      ifsc_code: 'ICIC0001234',
    };

    const mockUser = {
      id: userId,
      full_name: 'Aditya Birla Enterprises',
      email: 'finance@adityabirla.com',
      mobile: userMobile,
    };

    const result = await notificationService.sendPaymentSuccessAlert({
      user: mockUser,
      transaction: mockTx,
      beneficiary: mockBen,
    });

    assert.equal(result.success, true);
    const history = notificationService.getNotificationHistory();
    assert.ok(history.length >= 2, 'Expected email and SMS notifications logged');

    const emailEntry = history.find((h) => h.type === 'EMAIL');
    assert.ok(emailEntry, 'Expected email notification entry');
    assert.equal(emailEntry.to, 'finance@adityabirla.com');
    assert.ok(emailEntry.subject.includes('18,000.00'));
    assert.ok(emailEntry.subject.includes('COMMERCIAL_OFFICE_LEASE'));
    assert.ok(emailEntry.attachmentsCount >= 1, 'Expected attached Tax Invoice PDF');

    const smsEntry = history.find((h) => h.type === 'SMS');
    assert.ok(smsEntry, 'Expected SMS notification entry');
    assert.ok(smsEntry.message.includes('18,000.00'));
    assert.ok(smsEntry.message.includes('Invoice has been sent'));
  });

  // --------------------------------------------------------------------------
  // Test 4: Verify webhook triggers notifications upon payment capture
  // --------------------------------------------------------------------------
  it('Test 4: Verify webhook triggers notifications upon payment capture', async () => {
    notificationService.clearNotificationHistory();

    // 4A. Create a fresh beneficiary
    const benRes = await fetch(`${baseUrl}/api/beneficiaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        account_holder_name: 'Sterling Generators Co',
        account_number: '501004321987',
        ifsc_code: 'HDFC0000050',
        beneficiary_type: 'VENDOR',
        pan_number: 'XYZPS9988G',
      }),
    });
    const benData = await benRes.json();
    assert.equal(benRes.status, 201);
    const benId = benData.beneficiary.id;

    // 4B. Initiate transaction
    const initTxRes = await fetch(`${baseUrl}/api/transactions/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        beneficiary_id: benId,
        amount: 10000,
        transfer_type: 'INSTANT',
        purpose: 'EQUIPMENT_MAINTENANCE',
      }),
    });
    const initTxData = await initTxRes.json();
    assert.equal(initTxRes.status, 201);
    const orderId = initTxData.transaction.id;

    notificationService.clearNotificationHistory();

    // 4C. Trigger mock PG Webhook simulating payment capture
    const webhookRes = await fetch(`${baseUrl}/api/transactions/mock-pg-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        gateway_payment_id: 'PAY_NOTIF_VERIFY_999',
      }),
    });
    const webhookData = await webhookRes.json();
    assert.equal(webhookRes.status, 200);
    assert.equal(webhookData.success, true);

    // 4D. Inspect notification history for triggered notifications
    const history = notificationService.getNotificationHistory();
    assert.ok(history.length >= 2, 'Expected email & SMS triggered on payment capture');

    const paymentEmails = history.filter((h) => h.type === 'EMAIL');
    assert.ok(paymentEmails.length >= 1, 'Expected payment success email with invoice');
    assert.ok(paymentEmails.some((e) => e.attachmentsCount >= 1), 'At least one email has invoice attachment');

    // 4E. Test resend email invoice endpoint
    const resendRes = await fetch(`${baseUrl}/api/transactions/${orderId}/send-email-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ email: 'audit@adityabirla.com' }),
    });
    const resendData = await resendRes.json();
    assert.equal(resendRes.status, 200);
    assert.equal(resendData.success, true);

    const updatedHistory = notificationService.getNotificationHistory();
    assert.ok(
      updatedHistory.some((h) => h.to === 'audit@adityabirla.com'),
      'Expected resend invoice email delivered to audit@adityabirla.com'
    );
  });
});
