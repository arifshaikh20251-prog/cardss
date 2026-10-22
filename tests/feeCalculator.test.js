/**
 * Test Suite: Fee Calculation Engine
 * Verifies financial precision, Dual Fee Rates (INSTANT 3.5%, STANDARD 2.5%), and 18% GST
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  getFeeBreakdown,
  calculateInvoiceFee,
  reverseCalculateBase,
  roundMoney,
} = require('../src/utils/feeCalculator');

describe('Fee Calculator Unit Tests', () => {
  it('should accurately calculate INSTANT transfer fee (3.5%) + 18% GST on ₹20,000', () => {
    const result = getFeeBreakdown(20000, 'INSTANT');

    // 3.5% of 20,000 = 700.00
    assert.strictEqual(result.platformFee, 700.0);
    // 18% GST on 700 = 126.00
    assert.strictEqual(result.gstAmount, 126.0);
    // Total Fee = 700 + 126 = 826.00
    assert.strictEqual(result.totalFee, 826.0);
    // Total Payable = 20,000 + 826 = 20,826.00
    assert.strictEqual(result.totalPayable, 20826.0);
    // Net Payout = 20,000.00 (100% of principal)
    assert.strictEqual(result.netPayoutToBeneficiary, 20000.0);
  });

  it('should accurately calculate STANDARD transfer fee (2.5%) + 18% GST on ₹20,000', () => {
    const result = getFeeBreakdown(20000, 'STANDARD');

    // 2.5% of 20,000 = 500.00
    assert.strictEqual(result.platformFee, 500.0);
    // 18% GST on 500 = 90.00
    assert.strictEqual(result.gstAmount, 90.0);
    // Total Fee = 500 + 90 = 590.00
    assert.strictEqual(result.totalFee, 590.0);
    // Total Payable = 20,000 + 590 = 20,590.00
    assert.strictEqual(result.totalPayable, 20590.0);
    assert.strictEqual(result.netPayoutToBeneficiary, 20000.0);
  });

  it('should handle odd amounts with strict paise-rounding', () => {
    const result = calculateInvoiceFee({
      baseAmount: 12345.67,
      feePercentage: 1.5,
      gstPercentage: 18.0,
      isInterState: true,
    });

    assert.strictEqual(result.platformFee, 185.19);
    assert.strictEqual(result.gstBreakdown.totalGst, 33.33);
    assert.strictEqual(result.gstBreakdown.igst, 33.33);
    assert.strictEqual(result.totalFee, 218.52);
    assert.strictEqual(result.totalPayable, 12564.19);
  });

  it('should reject invalid non-positive or NaN amounts', () => {
    assert.throws(() => getFeeBreakdown(-500, 'INSTANT'), /positive number/);
    assert.throws(() => getFeeBreakdown(0, 'STANDARD'), /positive number/);
    assert.throws(() => getFeeBreakdown('invalid', 'INSTANT'), /positive number/);
    assert.throws(() => getFeeBreakdown(1000, 'UNKNOWN'), /Invalid transferType/);
  });

  it('should accurately reverse calculate base amount from total budget', () => {
    const result = reverseCalculateBase({
      totalAmountWithFee: 101770,
      feePercentage: 1.5,
      gstPercentage: 18.0,
    });

    assert.strictEqual(result.baseAmount, 100000.0);
    assert.strictEqual(result.totalPayable, 101770.0);
  });
});
