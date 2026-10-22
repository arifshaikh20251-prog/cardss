/**
 * Mock IMPS Disbursement Payout Adapter
 * Simulates instant banking rail settlements with 12-digit Indian Bank UTRs.
 */

class MockPayout {
  constructor() {
    this.name = 'mock';
  }

  /**
   * Execute IMPS Payout
   */
  async executeImpsPayout({ transferId, amount, beneficiaryAccount, beneficiaryIfsc, remarks }) {
    const random12 = Math.floor(100000000000 + Math.random() * 900000000000);
    const utrNumber = `UTR-IMPS-${random12}`;

    return {
      success: true,
      provider: 'mock',
      transfer_id: transferId,
      utr_number: utrNumber,
      status: 'SUCCESS',
      payout_status: 'PAYOUT_SUCCESS',
      amount: Number(amount),
      beneficiary_account: beneficiaryAccount,
      beneficiary_ifsc: beneficiaryIfsc,
      remarks: remarks || 'B2B Vendor Utility Settlement SAC 9971',
      settled_at: new Date().toISOString(),
    };
  }

  /**
   * Get Payout Status
   */
  async getPayoutStatus(transferId) {
    return {
      success: true,
      transfer_id: transferId,
      status: 'SUCCESS',
      utr_number: `UTR-IMPS-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      acknowledged_at: new Date().toISOString(),
    };
  }
}

module.exports = new MockPayout();
