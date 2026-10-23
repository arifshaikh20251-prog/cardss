/**
 * In-App Notification Center, Monthly Account Statement PDF & Business Profile Test Suite
 * B2B Vendor Invoicing & Rental Management Platform
 * Phase 6 - Step 2 Verification
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
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

describe('Notification Bell Center, Monthly Statement PDF & Profile Settings Suite', () => {
  let authToken = '';
  let authUser = null;
  let testNotificationId = '';

  before(async () => {
    // Authenticate test user
    const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '9876543210',
        otp: '123456',
        full_name: 'Apex Innovations Pvt Ltd',
      }),
    });
    const data = await res.json();
    authToken = data.token;
    authUser = data.user;
  });

  // 1. In-App Notification Center Tests
  it('Test 1: GET /api/notifications returns user notification list and unread count', async () => {
    const res = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.notifications));
    assert.ok(data.notifications.length >= 1, 'Should have at least 1 seeded notification');
    assert.strictEqual(typeof data.unread_count, 'number');
    assert.ok(data.unread_count > 0);

    testNotificationId = data.notifications[0].id;
    assert.ok(testNotificationId);
  });

  it('Test 2: POST /api/notifications/:id/read marks an individual notification as read', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/${testNotificationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.notification.id, testNotificationId);
    assert.strictEqual(data.notification.is_read, true);
    assert.ok(data.notification.read_at);
  });

  it('Test 3: POST /api/notifications/read-all marks all notifications as read', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    // Verify unread count is now 0
    const checkRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const checkData = await checkRes.json();
    assert.strictEqual(checkData.unread_count, 0);
  });

  // 2. Dynamic Business Profile Settings Tests
  it('Test 4: PUT /api/auth/profile updates business_name, billing_address, and email', async () => {
    const updatePayload = {
      business_name: 'Apex Global Technologies LLP',
      billing_address: 'Suite 404, Tech Park, Outer Ring Road, Bangalore - 560103',
      email: 'billing@apextechnologies.io',
    };

    const res = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updatePayload),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.business_name, updatePayload.business_name);
    assert.strictEqual(data.user.billing_address, updatePayload.billing_address);
    assert.strictEqual(data.user.email, updatePayload.email);
  });

  it('Test 5: PUT /api/auth/profile validates email format', async () => {
    const invalidPayload = {
      email: 'not-a-valid-email',
    };

    const res = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(invalidPayload),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'ValidationError');
  });

  // 3. Monthly Account Statement PDF Generator Tests
  it('Test 6: GET /api/transactions/statement generates valid PDF binary stream', async () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const res = await fetch(`${baseUrl}/api/transactions/statement?month=${currentMonth}&year=${currentYear}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    const disposition = res.headers.get('content-disposition');
    assert.ok(disposition.includes('AccountStatement-'));

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    assert.ok(buffer.length > 500, 'PDF buffer should contain valid content');
    // Verify standard PDF magic header (%PDF-)
    const pdfMagic = buffer.slice(0, 5).toString('ascii');
    assert.strictEqual(pdfMagic, '%PDF-');
  });

  it('Test 7: GET /api/transactions/statement rejects invalid month or year params', async () => {
    const res = await fetch(`${baseUrl}/api/transactions/statement?month=13&year=2026`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error, 'InvalidMonth');
  });
});
