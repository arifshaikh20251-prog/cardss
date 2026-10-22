/**
 * Modular Payout Factory
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Provider-agnostic facade for IMPS disbursements and banking rail status checks.
 */

const mockPayout = require('./mockPayout');
const cashfreePayout = require('./cashfreePayout');

function getProviderName() {
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_PAYOUT_PROVIDER || 'mock';
  }
  return (process.env.PAYOUT_PROVIDER || process.env.GATEWAY_PROVIDER || 'mock').toLowerCase();
}

function getPayoutAdapter(provider = getProviderName()) {
  switch (provider) {
    case 'cashfree':
      return cashfreePayout;
    case 'mock':
    default:
      return mockPayout;
  }
}

class PayoutFactory {
  get provider() {
    return getProviderName();
  }

  get adapter() {
    return getPayoutAdapter(this.provider);
  }

  /**
   * Execute automated IMPS payout
   */
  async executeImpsPayout(params) {
    const adapter = this.adapter;
    return adapter.executeImpsPayout(params);
  }

  /**
   * Fetch payout status & UTR
   */
  async getPayoutStatus(transferId) {
    const adapter = this.adapter;
    return adapter.getPayoutStatus(transferId);
  }
}

module.exports = new PayoutFactory();
module.exports.getPayoutAdapter = getPayoutAdapter;
