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
    const adapter = this.adapter;
    return adapter.verifyWebhookSignature(rawBody, signature, timestamp);
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
