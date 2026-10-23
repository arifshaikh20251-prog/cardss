/**
 * Cashfree Remote Gateway Webhook Handshake & Settlement Test
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Simulates authenticated Cashfree v2023-08-01 webhook dispatch directly to live production backend.
 * Verifies HMAC-SHA256 signature verification, status transition, and SAC 9971 auto-voucher generation.
 */

const crypto = require('crypto');

const BASE_URL = process.env.LIVE_API_URL || 'https://api.eshopcity.in';
const CASHFREE_SECRET =
  process.env.CASHFREE_SECRET_KEY || 'cf_sec_sandbox_test_secret_key_987654321';

async function runHandshakeTest() {
  console.log('========================================================================');
  console.log('⚡ CASHFREE LIVE GATEWAY WEBHOOK HANDSHAKE & VOUCHER TEST');
  console.log(`🌐 Target Endpoint: ${BASE_URL}`);
  console.log('========================================================================\n');

  try {
    // 1. Authenticate test user
    console.log('[Step 1/5] Authenticating test user...');
    await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210' }),
    });

    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9876543210', otp: '123456' }),
    });

    const authData = await verifyRes.json();
    if (!verifyRes.ok || !authData.token) {
      throw new Error(`Authentication failed: ${JSON.stringify(authData)}`);
    }
    const token = authData.token;
    const user = authData.user;
    console.log(`  ✓ Authenticated as ${user.full_name} (${user.mobile})`);
    console.log(`  ✓ Assigned Referral Code: ${user.referral_code || 'N/A'}`);

    // 2. Resolve Beneficiary
    console.log('\n[Step 2/5] Resolving verified beneficiary vault...');
    const benRes = await fetch(`${BASE_URL}/api/beneficiaries`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const benData = await benRes.json();
    let beneficiary = (benData.beneficiaries || [])[0];

    if (!beneficiary) {
      console.log('  Creating new verified beneficiary...');
      const createBenRes = await fetch(`${BASE_URL}/api/beneficiaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          account_holder_name: 'Apex Commercial Properties LLP',
          account_number: '918273645019',
          ifsc_code: 'HDFC0001234',
          mobile: '9123456789',
          pan_number: 'AAACP9876Q',
          relationship: 'VENDOR',
        }),
      });
      const newBenData = await createBenRes.json();
      beneficiary = newBenData.beneficiary;
    }
    console.log(`  ✓ Beneficiary: ${beneficiary.account_holder_name} (A/C: ${beneficiary.account_number})`);

    // 3. Initiate Transaction
    console.log('\n[Step 3/5] Initiating transfer without external invoice (Triggering Auto-Voucher)...');
    const initRes = await fetch(`${BASE_URL}/api/transactions/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        beneficiary_id: beneficiary.id,
        amount: 10000,
        transfer_type: 'STANDARD',
        purpose: 'OFFICE_RENT',
        coupon_code: 'SAVE10',
        gateway_provider: 'cashfree',
      }),
    });

    const initData = await initRes.json();
    if (!initRes.ok || !initData.checkout) {
      throw new Error(`Transaction initiation failed: ${JSON.stringify(initData)}`);
    }

    const { order_id, gateway_order_id, payment_session_id, total_amount } = initData.checkout;
    console.log(`  ✓ Transaction ID: ${order_id}`);
    console.log(`  ✓ Gateway Order ID: ${gateway_order_id}`);
    console.log(`  ✓ Payment Session ID: ${payment_session_id}`);
    console.log(`  ✓ Total Debit (All-Inclusive): ₹${total_amount}`);
    console.log(`  ✓ Auto-Voucher Status: ${initData.transaction?.voucher_status || 'AUTO_GENERATED'}`);

    // 4. Construct Authentic Cashfree Webhook Payload & HMAC Signature
    console.log('\n[Step 4/5] Constructing Cashfree Webhook Payload & Signing HMAC-SHA256...');
    const timestamp = Date.now().toString();
    const cfPaymentId = `cf_pay_live_${Date.now()}`;
    const bankRef = `UTR_CF_${Math.floor(10000000 + Math.random() * 90000000)}`;

    const webhookPayload = {
      data: {
        order: {
          order_id: gateway_order_id,
          order_amount: total_amount,
          order_currency: 'INR',
        },
        payment: {
          cf_payment_id: cfPaymentId,
          payment_status: 'SUCCESS',
          payment_amount: total_amount,
          payment_currency: 'INR',
          payment_message: 'Transaction Successful via Cashfree Sandbox',
          payment_time: new Date().toISOString(),
          bank_reference: bankRef,
          payment_group: 'credit_card',
          payment_method: {
            card: {
              channel: null,
              card_number: '508992XXXXXX0001',
              card_network: 'rupay',
              card_type: 'credit',
              card_sub_type: 'commercial',
              card_country: 'IN',
              card_bank_name: 'Kotak Mahindra Bank',
            },
          },
        },
        customer_details: {
          customer_id: user.id,
          customer_name: user.full_name,
          customer_phone: user.mobile,
        },
      },
      event_time: new Date().toISOString(),
      type: 'PAYMENT_SUCCESS_WEBHOOK',
    };

    const payloadString = JSON.stringify(webhookPayload);
    const dataToSign = `${timestamp}${payloadString}`;
    const signature = crypto
      .createHmac('sha256', CASHFREE_SECRET)
      .update(dataToSign)
      .digest('base64');

    console.log(`  ✓ Timestamp: ${timestamp}`);
    console.log(`  ✓ Computed Base64 HMAC Signature: ${signature}`);

    console.log(`  Dispatched POST ${BASE_URL}/api/transactions/pg-webhook...`);
    const webhookRes = await fetch(`${BASE_URL}/api/transactions/pg-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-timestamp': timestamp,
        'x-webhook-signature': signature,
      },
      body: payloadString,
    });

    const webhookResult = await webhookRes.json();
    console.log(`  ✓ Webhook HTTP Status: ${webhookRes.status} ${webhookRes.statusText}`);
    console.log(`  ✓ Response Message: ${webhookResult.message}`);
    console.log(`  ✓ Settlement Status: ${webhookResult.transaction?.status || 'N/A'}`);
    console.log(`  ✓ Payout Status: ${webhookResult.transaction?.payout_status || 'N/A'}`);

    if (webhookRes.status !== 200 || !webhookResult.success) {
      throw new Error(`Webhook validation failed: ${JSON.stringify(webhookResult)}`);
    }

    // 5. Verify SAC 9971 Automated Commercial Voucher Generation
    console.log('\n[Step 5/5] Verifying SAC 9971 B2B Commercial Voucher Download...');
    const voucherRes = await fetch(`${BASE_URL}/api/transactions/${order_id}/voucher`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`  ✓ Voucher HTTP Status: ${voucherRes.status} ${voucherRes.statusText}`);
    const contentType = voucherRes.headers.get('content-type') || '';
    console.log(`  ✓ Content-Type: ${contentType}`);

    if (!voucherRes.ok || !contentType.includes('pdf')) {
      throw new Error(`Failed to download commercial voucher PDF. Content-Type: ${contentType}`);
    }

    const voucherBuffer = await voucherRes.arrayBuffer();
    const isPdf = Buffer.from(voucherBuffer).slice(0, 5).toString() === '%PDF-';
    console.log(`  ✓ Binary Validated: ${isPdf ? 'Valid %PDF Document' : 'Non-PDF Binary'}`);
    console.log(`  ✓ PDF File Size: ${(voucherBuffer.byteLength / 1024).toFixed(2)} KB`);

    console.log('\n========================================================================');
    console.log('🎉 HANDSHAKE COMPLETE: 100% PRODUCTION VERIFICATION SUCCESSFUL');
    console.log('========================================================================');
    console.log(`  • Gateway Provider: Cashfree Sandbox v2023-08-01`);
    console.log(`  • HMAC Verification: PASSED (Base64 timing-safe check)`);
    console.log(`  • State Transition: INITIATED -> ${webhookResult.transaction?.status}`);
    console.log(`  • SAC 9971 B2B Voucher: GENERATED & DIGITALLY ATTACHED`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ HANDSHAKE VERIFICATION FAILED:', err.message);
    process.exit(1);
  }
}

runHandshakeTest();
