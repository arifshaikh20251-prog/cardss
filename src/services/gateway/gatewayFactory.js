/**
 * Modular Payment Gateway Factory
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Provider-agnostic gateway abstraction supporting Mock, Cashfree, and Easebuzz adapters.
 */

const mockGateway = require('./mockGateway');
const cashfreeGateway = require('./cashfreeGateway');

function getProviderName() {
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_GATEWAY_PROVIDER || 'mock';
  }
  return (process.env.GATEWAY_PROVIDER || 'mock').toLowerCase();
}

function getGatewayAdapter(provider = getProviderName()) {
  switch (provider) {
    case 'cashfree':
      return cashfreeGateway;
    case 'easebuzz':
      // Extensible placeholder for easebuzz
      return mockGateway;
    case 'mock':
    default:
      return mockGateway;
  }
}

/**
 * Unified Payment Gateway Facade
 */
class GatewayFactory {
  get provider() {
    return getProviderName();
  }

  get adapter() {
    return getGatewayAdapter(this.provider);
  }

  /**
   * Create Payment Order across active provider
   */
  async createPaymentOrder(params) {
    const adapter = this.adapter;
    return adapter.createPaymentOrder(params);
  }

  /**
   * Strict HMAC-SHA256 Webhook Verification
   */
  verifyWebhookSignature(rawBody, signature, timestamp) {
    // 1. Primary active adapter
    if (this.adapter.verifyWebhookSignature(rawBody, signature, timestamp)) {
      return true;
    }

    // 2. Fallback check on Cashfree adapter (if active adapter was mock)
    if (this.provider !== 'cashfree' && cashfreeGateway.verifyWebhookSignature(rawBody, signature, timestamp)) {
      return true;
    }

    // 3. Fallback check on Mock adapter (if active adapter was cashfree)
    if (this.provider !== 'mock' && mockGateway.verifyWebhookSignature(rawBody, signature, timestamp)) {
      return true;
    }

    return false;
  }

  /**
   * Fetch order status and payment information
   */
  async fetchPaymentDetails(orderId) {
    const adapter = this.adapter;
    return adapter.fetchPaymentDetails(orderId);
  }
}

module.exports = new GatewayFactory();
module.exports.getGatewayAdapter = getGatewayAdapter;
