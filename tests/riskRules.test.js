/**
 * Test Suite: Risk & Compliance Rules Engine
 * Verifies Fintech AML, PAN/IFSC formats, name similarity, and 24-hour cooling-off checks
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isValidPAN,
  isValidMobile,
  isValidIFSC,
  isValidAccountNumber,
  calculateNameSimilarity,
  isCoolingPeriodCleared,
  checkSelfTransfer,
  evaluateTransactionRisk,
} = require('../src/utils/riskRules');

describe('Risk Rules Unit Tests', () => {
  it('should validate standard PAN numbers accurately', () => {
    assert.strictEqual(isValidPAN('ABCDE1234F'), true);
    assert.strictEqual(isValidPAN('xyzpa9999z'), true);
    assert.strictEqual(isValidPAN('ABCDE12345'), false);
    assert.strictEqual(isValidPAN('12345ABCDE'), false);
    assert.strictEqual(isValidPAN(''), false);
    assert.strictEqual(isValidPAN(null), false);
  });

  it('should validate Indian 10-digit mobile numbers', () => {
    assert.strictEqual(isValidMobile('9876543210'), true);
    assert.strictEqual(isValidMobile('+919876543210'), true);
    assert.strictEqual(isValidMobile('09876543210'), true);
    assert.strictEqual(isValidMobile('1234567890'), false);
    assert.strictEqual(isValidMobile('98765'), false);
  });

  it('should validate Bank IFSC and Account numbers', () => {
    assert.strictEqual(isValidIFSC('HDFC0000128'), true);
    assert.strictEqual(isValidIFSC('SBIN0001234'), true);
    assert.strictEqual(isValidIFSC('INVALID_IFSC'), false);

    assert.strictEqual(isValidAccountNumber('123456789012'), true);
    assert.strictEqual(isValidAccountNumber('1234'), false);
  });

  it('should compute fuzzy name similarity and reject >80% match under AML rules', () => {
    // Exact match
    const simExact = calculateNameSimilarity('Rohan Verma', 'Rohan Verma');
    assert.strictEqual(simExact, 1.0);

    // Minor typo / close match (simulated evasion attempt)
    const simClose = calculateNameSimilarity('Rohan Verma', 'Rohan Varma');
    assert.ok(simClose > 0.80);

    // Completely different vendor
    const simDiff = calculateNameSimilarity('Rohan Verma', 'Apex Tech Solutions Pvt Ltd');
    assert.ok(simDiff < 0.40);

    const user = { full_name: 'Rohan Verma', pan_number: 'ABCDE1234F' };
    const similarBen = { account_holder_name: 'Rohan Varma', pan_number: 'XYZPA9999Z' };
    const exactBen = { account_holder_name: 'Rohan Verma', pan_number: 'XYZPA9999Z' };
    const legitBen = { account_holder_name: 'InfraTech Hardware Supplies', pan_number: 'XYZPA9999Z' };

    assert.strictEqual(checkSelfTransfer(user, similarBen).isSelfTransfer, true);
    assert.strictEqual(checkSelfTransfer(user, exactBen).isSelfTransfer, true);
    assert.strictEqual(checkSelfTransfer(user, legitBen).isSelfTransfer, false);
  });

  it('should flag self-transfers when PAN or Account matches (Anti-Cycling AML rule)', () => {
    const user = { full_name: 'Alice Smith', pan_number: 'ABCDE1234F', account_number: '100200300' };
    const matchingPanBen = { account_holder_name: 'Different Name Corp', pan_number: 'ABCDE1234F', account_number: '999888777' };
    const matchingAccBen = { account_holder_name: 'Different Name Corp', pan_number: 'XYZPA9999Z', account_number: '100200300' };
    const legitBen = { account_holder_name: 'Vendor Partner LLC', pan_number: 'XYZPA9999Z', account_number: '888777666' };

    assert.strictEqual(checkSelfTransfer(user, matchingPanBen).isSelfTransfer, true);
    assert.strictEqual(checkSelfTransfer(user, matchingAccBen).isSelfTransfer, true);
    assert.strictEqual(checkSelfTransfer(user, legitBen).isSelfTransfer, false);
  });

  it('should accurately calculate 24-hour cooling-off window status', () => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

    assert.strictEqual(isCoolingPeriodCleared(twelveHoursAgo, 24), false);
    assert.strictEqual(isCoolingPeriodCleared(twentyFiveHoursAgo, 24), true);
  });

  it('should enforce strict ₹25,000 single ticket cap', () => {
    const verifiedUser = { kyc_status: 'VERIFIED', pan_number: 'ABCDE1234F' };
    const beneficiary = {
      account_number: '123456789012',
      ifsc_code: 'HDFC0000128',
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      is_cooling_cleared: true,
    };

    // Amount ₹26,000 exceeds ₹25,000 single ticket cap
    const capResult = evaluateTransactionRisk({
      user: verifiedUser,
      beneficiary,
      amount: 26000,
    });

    assert.strictEqual(capResult.approved, false);
    assert.ok(capResult.violations.some((v) => v.includes('ticket cap of ₹25,000')));

    // Amount ₹25,000 is permitted
    const validResult = evaluateTransactionRisk({
      user: verifiedUser,
      beneficiary,
      amount: 25000,
    });
    assert.strictEqual(validResult.approved, true);
  });
});
