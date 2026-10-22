/**
 * Cashfree Payment Gateway Adapter (v2023-08-01)
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements Cashfree Payment Gateway API orders and HMAC-SHA256 webhook verification.
 */

const crypto = require('crypto');

class CashfreeGateway {
  constructor() {
    this.name = 'cashfree';
    this.appId = process.env.CASHFREE_APP_ID || '';
    this.secretKey = process.env.CASHFREE_SECRET_KEY || '';
    this.apiVersion = process.env.CASHFREE_API_VERSION || '2023-08-01';
    this.env = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase();

    this.baseUrl =
      this.env === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
      'x-api-version': this.apiVersion,
    };
  }

  /**
   * Create Cashfree PG Order
   */
  async createPaymentOrder({ orderId, amount, customerInfo = {}, returnUrl }) {
    if (!this.appId || !this.secretKey) {
      throw new Error('Cashfree credentials missing: CASHFREE_APP_ID and CASHFREE_SECRET_KEY are required.');
    }

    const payload = {
      order_id: String(orderId),
      order_amount: Number(amount),
      order_currency: 'INR',
      customer_details: {
        customer_id: String(customerInfo.id || `cust_${Date.now()}`),
        customer_phone: String(customerInfo.phone || customerInfo.mobile || '9876543210').slice(-10),
        customer_name: String(customerInfo.name || customerInfo.full_name || 'B2B Corporate Client'),
        customer_email: String(customerInfo.email || 'support@utilitypay.in'),
      },
      order_meta: {
        return_url: returnUrl || 'http://localhost:3000/transactions',
      },
      order_note: 'B2B Vendor Utility SAC 9971 Disbursement',
    };

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Cashfree order creation failed with status ${response.status}`);
    }

    return {
      success: true,
      provider: 'cashfree',
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status,
      order_amount: data.order_amount,
      order_currency: data.order_currency,
      raw: data,
    };
  }

  /**
   * Strict HMAC-SHA256 Webhook Signature Verification
   * Matches official Cashfree v2023-08-01 specification:
   * signature = Base64(HmacSHA256(timestamp + rawBody, secretKey))
   */
  verifyWebhookSignature(rawBody, signature, timestamp) {
    if (!signature || !this.secretKey) return false;

    try {
      const payloadString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
      const dataToSign = timestamp ? `${timestamp}${payloadString}` : payloadString;

      const computedBase64 = crypto
        .createHmac('sha256', this.secretKey)
        .update(dataToSign)
        .digest('base64');

      const computedHex = crypto
        .createHmac('sha256', this.secretKey)
        .update(dataToSign)
        .digest('hex');

      return (
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedBase64)) ||
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedHex))
      );
    } catch (err) {
      // In case buffer lengths do not match or malformed
      return false;
    }
  }

  /**
   * Fetch order status and payment details
   */
  async fetchPaymentDetails(orderId) {
    const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Failed to fetch Cashfree order ${orderId}`);
    }

    return {
      order_id: data.order_id,
      order_status: data.order_status,
      order_amount: data.order_amount,
      order_currency: data.order_currency,
      raw: data,
    };
  }
}

module.exports = new CashfreeGateway();
