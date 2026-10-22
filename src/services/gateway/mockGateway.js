/**
 * Mock Payment Gateway Adapter
 * Simulates gateway operations for local dev, sandbox testing, and CI/CD
 */

const crypto = require('crypto');

const MOCK_WEBHOOK_SECRET = process.env.GATEWAY_WEBHOOK_SECRET || 'mock_webhook_secret_key_fintech';

class MockGateway {
  constructor() {
    this.name = 'mock';
  }

  /**
   * Create Payment Order
   */
  async createPaymentOrder({ orderId, amount, customerInfo = {}, returnUrl }) {
    const paymentSessionId = `session_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      provider: 'mock',
      order_id: orderId,
      payment_session_id: paymentSessionId,
      order_status: 'ACTIVE',
      order_amount: Number(amount),
      order_currency: 'INR',
      customer_id: customerInfo.id || 'cust-mock-001',
      return_url: returnUrl || 'http://localhost:3000/transactions',
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Verify Webhook Signature (HMAC-SHA256)
   */
  verifyWebhookSignature(rawBody, signature, timestamp) {
    if (!signature) return false;

    // Allow static test token
    if (signature === 'valid-mock-signature') return true;
    if (signature === 'invalid-mock-signature') return false;

    try {
      const payloadString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
      const dataToSign = timestamp ? `${timestamp}${payloadString}` : payloadString;

      const expectedBase64 = crypto
        .createHmac('sha256', MOCK_WEBHOOK_SECRET)
        .update(dataToSign)
        .digest('base64');

      const expectedHex = crypto
        .createHmac('sha256', MOCK_WEBHOOK_SECRET)
        .update(dataToSign)
        .digest('hex');

      return signature === expectedBase64 || signature === expectedHex;
    } catch (err) {
      return false;
    }
  }

  /**
   * Generate valid signature for mock testing
   */
  generateMockSignature(rawBody, timestamp) {
    const payloadString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const dataToSign = timestamp ? `${timestamp}${payloadString}` : payloadString;
    return crypto
      .createHmac('sha256', MOCK_WEBHOOK_SECRET)
      .update(dataToSign)
      .digest('base64');
  }

  /**
   * Fetch Payment Details
   */
  async fetchPaymentDetails(orderId) {
    return {
      order_id: orderId,
      order_status: 'PAID',
      order_amount: 20000,
      payment_id: `pay_mock_${Date.now()}`,
      payment_method: 'credit_card',
      settled_at: new Date().toISOString(),
    };
  }
}

module.exports = new MockGateway();
module.exports.MOCK_WEBHOOK_SECRET = MOCK_WEBHOOK_SECRET;
