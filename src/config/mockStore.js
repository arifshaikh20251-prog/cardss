/**
 * In-Memory Mock Store for Phase 1 Fintech Business Engine
 * Simulates Supabase PostgreSQL tables in local sandbox and integration testing.
 */

const crypto = require('crypto');

function generateUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateReferralCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PAY${suffix}`;
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
        referral_code: 'PAY987',
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
        referral_code: 'PAY123',
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
    this.auditLogs = [];
    this.referrals = [];
    this.userCoupons = [];
    this.notifications = [
      {
        id: 'notif-seed-01',
        user_id: 'usr-1111-1111-1111',
        type: 'SETTLED',
        title: 'Payout Settled via IMPS Rail',
        message: '₹12,000.00 was credited to InfraTech Hardware Supplies. Bank UTR: UTR-IMPS-892173456.',
        is_read: false,
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-seed-02',
        user_id: 'usr-1111-1111-1111',
        type: 'REWARD',
        title: 'Referral Program Active',
        message: 'Share your referral code PAY987 with business associates to earn ₹25 on every vendor payout!',
        is_read: false,
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-seed-03',
        user_id: 'usr-1111-1111-1111',
        type: 'INFO',
        title: 'KYC Verification Approved',
        message: 'Your corporate KYC and PAN AAACA1234F have been verified by NSDL & UIDAI escrow rails.',
        is_read: true,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }

  // --- Users Operations ---
  findUserById(id) {
    return this.users.find((u) => u.id === id) || null;
  }

  findUserByMobile(mobile) {
    const cleaned = String(mobile).replace(/\D/g, '');
    return this.users.find((u) => u.mobile.replace(/\D/g, '') === cleaned) || null;
  }

  findUserByReferralCode(code) {
    if (!code) return null;
    const clean = String(code).trim().toUpperCase();
    return this.users.find((u) => u.referral_code && u.referral_code.toUpperCase() === clean) || null;
  }

  createUser(userData) {
    let referralCode = userData.referral_code;
    if (!referralCode) {
      let attempts = 0;
      do {
        referralCode = generateReferralCode();
        attempts++;
      } while (this.findUserByReferralCode(referralCode) && attempts < 10);
    }

    const user = {
      id: userData.id || generateUuid(),
      mobile: userData.mobile,
      full_name: userData.full_name || 'Fintech User',
      pan_number: userData.pan_number ? userData.pan_number.toUpperCase() : null,
      kyc_status: userData.kyc_status || 'PENDING',
      is_cooling_cleared: userData.is_cooling_cleared !== undefined ? userData.is_cooling_cleared : false,
      referral_code: referralCode,
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

  // --- Referrals Operations ---
  createReferral(data) {
    const ref = {
      id: data.id || generateUuid(),
      referrer_id: data.referrer_id,
      referee_id: data.referee_id,
      referral_code: data.referral_code.toUpperCase(),
      discount_code: data.discount_code || 'REF15',
      discount_amount: parseFloat(data.discount_amount || 15),
      status: data.status || 'APPLIED', // 'APPLIED' | 'REWARDED'
      created_at: new Date().toISOString(),
      rewarded_at: data.rewarded_at || null,
    };
    this.referrals.push(ref);
    return ref;
  }

  findReferralByRefereeId(refereeId) {
    return this.referrals.find((r) => r.referee_id === refereeId) || null;
  }

  getReferralsByReferrerId(referrerId) {
    return this.referrals.filter((r) => r.referrer_id === referrerId);
  }

  updateReferral(id, updates) {
    const ref = this.referrals.find((r) => r.id === id);
    if (!ref) return null;
    Object.assign(ref, updates);
    return ref;
  }

  // --- User-Specific Issued Coupons ---
  issueUserCoupon(couponData) {
    const coupon = {
      id: couponData.id || generateUuid(),
      user_id: couponData.user_id,
      code: couponData.code.toUpperCase(),
      type: couponData.type || 'FLAT',
      value: parseFloat(couponData.value || 25),
      minAmount: parseFloat(couponData.minAmount || 5000),
      description: couponData.description || '₹25 Referral Reward Discount',
      badge: couponData.badge || 'Referral ₹25 OFF',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    this.userCoupons.push(coupon);
    return coupon;
  }

  getUserCoupons(userId) {
    return this.userCoupons.filter((c) => c.user_id === userId);
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
      coupon_code: data.coupon_code || null,
      discount_amount: parseFloat(data.discount_amount || 0),
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

  // --- Audit Logs Operations ---
  createAuditLog(data) {
    const log = {
      id: data.id || generateUuid(),
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      action: data.action,
      actor_id: data.actor_id || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      payload: data.payload || {},
      created_at: new Date().toISOString(),
    };
    this.auditLogs.push(log);
    return log;
  }

  getAuditLogs(filters = {}) {
    return this.auditLogs.filter((log) => {
      if (filters.entity_type && log.entity_type !== filters.entity_type) return false;
      if (filters.entity_id && log.entity_id !== filters.entity_id) return false;
      if (filters.actor_id && log.actor_id !== filters.actor_id) return false;
      return true;
    });
  }

  // --- In-App Notifications Operations ---
  createNotification(data) {
    const notif = {
      id: data.id || generateUuid(),
      user_id: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type || 'INFO', // 'SETTLED' | 'COOLING' | 'REWARD' | 'PAYMENT' | 'INFO'
      metadata: data.metadata || {},
      is_read: data.is_read || false,
      created_at: data.created_at || new Date().toISOString(),
    };
    this.notifications.unshift(notif);
    return notif;
  }

  getNotificationsByUserId(userId) {
    return this.notifications.filter((n) => n.user_id === userId);
  }

  findNotificationById(id) {
    return this.notifications.find((n) => n.id === id) || null;
  }

  markNotificationAsRead(id, userId) {
    const notif = this.notifications.find((n) => n.id === id && (!userId || n.user_id === userId));
    if (notif) {
      notif.is_read = true;
      notif.read_at = new Date().toISOString();
    }
    return notif;
  }

  markAllNotificationsAsRead(userId) {
    let updatedCount = 0;
    this.notifications.forEach((n) => {
      if (n.user_id === userId && !n.is_read) {
        n.is_read = true;
        n.read_at = new Date().toISOString();
        updatedCount++;
      }
    });
    return updatedCount;
  }
}

const mockStore = new MockStore();

module.exports = {
  mockStore,
  generateUuid,
  generateReferralCode,
};
