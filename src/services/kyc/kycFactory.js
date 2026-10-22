/**
 * Modular KYC Factory
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Provider-agnostic KYC adapter layer supporting 'mock', 'surepass', and 'sandbox' options.
 */

const mockKyc = require('./mockKyc');
const surepassKyc = require('./surepassKyc');

function getProviderName() {
  if (process.env.NODE_ENV === 'test') {
    return process.env.TEST_KYC_PROVIDER || 'mock';
  }
  return (process.env.KYC_PROVIDER || 'mock').toLowerCase();
}

function getKycAdapter(provider = getProviderName()) {
  switch (provider) {
    case 'surepass':
      return surepassKyc;
    case 'sandbox':
    case 'mock':
    default:
      return mockKyc;
  }
}

class KycFactory {
  get provider() {
    return getProviderName();
  }

  get adapter() {
    return getKycAdapter(this.provider);
  }

  /**
   * Validates PAN syntax, checks active status, and computes name match percentage
   */
  async verifyPan(params) {
    const adapter = this.adapter;
    return adapter.verifyPan(params);
  }

  /**
   * Dispatches OTP to registered Aadhaar mobile
   */
  async initiateAadhaarOtp(params) {
    const adapter = this.adapter;
    return adapter.initiateAadhaarOtp(params);
  }

  /**
   * Validates OTP and returns verified full name, masked identifier, and address
   */
  async verifyAadhaarOtp(params) {
    const adapter = this.adapter;
    return adapter.verifyAadhaarOtp(params);
  }
}

module.exports = new KycFactory();
module.exports.getKycAdapter = getKycAdapter;
