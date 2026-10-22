/**
 * In-Memory Mock Store for Phase 1 Fintech Business Engine
 * Simulates Supabase PostgreSQL tables in local sandbox and integration testing.
 */

const crypto = require('crypto');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

class MockStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = [
      {
        id: 'usr-1111-1111-1111',
        mobile: '9876543210',
        full_name: 'Apex Solutions Private Limited',
        pan_number: 'AAACA1234F',
        kyc_status: 'VERIFIED',
        is_cooling_cleared: true,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'usr-2222-2222-2222',
        mobile: '9123456780',
        full_name: 'Rohan Verma',
        pan_number: 'BAPPR5678K',
        kyc_status: 'PENDING',
        is_cooling_cleared: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    this.beneficiaries = [
      {
        id: 'ben-1111-1111-1111',
        user_id: 'usr-1111-1111-1111',
        account_holder_name: 'InfraTech Hardware Supplies',
        account_number: '100234908123',
        ifsc_code: 'HDFC0000128',
        bank_name: 'HDFC Bank Ltd',
        beneficiary_type: 'VENDOR',
        pan_number: 'BBBCB4321G',
        is_verified: true,
        penny_drop_verified: true,
        is_cooling_cleared: true,
        cooling_period_ends_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      },
    ];

    this.transactions = [];
  }

  // --- Users Operations ---
  findUserById(id) {
    return this.users.find((u) => u.id === id) || null;
  }

  findUserByMobile(mobile) {
    const cleaned = String(mobile).replace(/\D/g, '');
    return this.users.find((u) => u.mobile.replace(/\D/g, '') === cleaned) || null;
  }

  createUser(userData) {
    const user = {
      id: userData.id || generateUuid(),
      mobile: userData.mobile,
      full_name: userData.full_name || 'Fintech User',
      pan_number: userData.pan_number ? userData.pan_number.toUpperCase() : null,
      kyc_status: userData.kyc_status || 'PENDING',
      is_cooling_cleared: userData.is_cooling_cleared !== undefined ? userData.is_cooling_cleared : false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates, { updated_at: new Date().toISOString() });
    return user;
  }

  // --- Beneficiaries Operations ---
  findBeneficiaryById(id) {
    return this.beneficiaries.find((b) => b.id === id) || null;
  }

  getBeneficiariesByUserId(userId) {
    return this.beneficiaries.filter((b) => b.user_id === userId);
  }

  createBeneficiary(data) {
    const ben = {
      id: data.id || generateUuid(),
      user_id: data.user_id,
      account_holder_name: data.account_holder_name,
      account_number: data.account_number,
      ifsc_code: data.ifsc_code.toUpperCase(),
      bank_name: data.bank_name || 'Standard Bank',
      beneficiary_type: data.beneficiary_type || 'VENDOR',
      pan_number: data.pan_number ? data.pan_number.toUpperCase() : null,
      is_verified: data.is_verified !== undefined ? data.is_verified : true,
      penny_drop_verified: data.penny_drop_verified !== undefined ? data.penny_drop_verified : true,
      is_cooling_cleared: data.is_cooling_cleared !== undefined ? data.is_cooling_cleared : false,
      cooling_period_ends_at: data.cooling_period_ends_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.beneficiaries.push(ben);
    return ben;
  }

  // --- Transactions Operations ---
  findTransactionById(id) {
    return this.transactions.find((t) => t.id === id) || null;
  }

  getTransactionsByUserId(userId) {
    return this.transactions
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  createTransaction(data) {
    const tx = {
      id: data.id || generateUuid(),
      user_id: data.user_id,
      beneficiary_id: data.beneficiary_id,
      amount: parseFloat(data.amount),
      transfer_type: data.transfer_type || 'STANDARD',
      purpose: data.purpose || 'VENDOR_INVOICE',
      convenience_fee: parseFloat(data.convenience_fee || 0),
      gst_on_fee: parseFloat(data.gst_on_fee || 0),
      total_debited: parseFloat(data.total_debited || data.amount),
      status: data.status || 'INITIATED',
      payout_status: data.payout_status || 'INITIATED',
      payment_mode: data.payment_mode || 'CREDIT_CARD',
      gateway_order_id: data.gateway_order_id || `ORD-${Date.now()}`,
      gateway_payment_id: data.gateway_payment_id || null,
      utr_number: data.utr_number || null,
      cooling_release_at: data.cooling_release_at || null,
      settled_at: data.settled_at || null,
      failure_reason: data.failure_reason || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.transactions.push(tx);
    return tx;
  }

  updateTransaction(id, updates) {
    const tx = this.findTransactionById(id);
    if (!tx) return null;
    Object.assign(tx, updates, { updated_at: new Date().toISOString() });
    return tx;
  }

  findCoolingTransactions(currentDate = new Date()) {
    const nowTime = new Date(currentDate).getTime();
    return this.transactions.filter(
      (tx) => tx.status === 'IN_COOLING' && tx.cooling_release_at && new Date(tx.cooling_release_at).getTime() <= nowTime
    );
  }
}

const mockStore = new MockStore();

module.exports = {
  mockStore,
  generateUuid,
};
