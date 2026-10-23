/**
 * Zero-Loss Referral Engine Controller
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements referral discount distribution:
 * - Referee receives ₹15 instant fee discount on first transaction ('REF15')
 * - On successful payout of referee's first transfer, issues a ₹25 discount coupon to referrer
 */

const { mockStore, isMockMode, supabase } = require('../config/supabase');

/**
 * Apply Referral Code
 * POST /api/referrals/apply
 */
async function applyReferralCode(req, res, next) {
  try {
    const user = req.user;
    const { referral_code, code } = req.body;
    const rawCode = referral_code || code;

    if (!rawCode || !String(rawCode).trim()) {
      return res.status(400).json({
        success: false,
        error: 'ReferralCodeRequired',
        message: 'Please provide a valid 6-character referral code.',
      });
    }

    const cleanCode = String(rawCode).trim().toUpperCase();

    // 1. Cannot use own referral code
    if (user.referral_code && user.referral_code.toUpperCase() === cleanCode) {
      return res.status(400).json({
        success: false,
        error: 'SelfReferralNotAllowed',
        message: 'You cannot use your own referral code.',
      });
    }

    // 2. Resolve referrer
    let referrer = null;
    if (isMockMode || supabase.isMock) {
      referrer = mockStore.findUserByReferralCode(cleanCode);
    } else {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('referral_code', cleanCode)
        .maybeSingle();
      if (!error && data) referrer = data;
    }

    if (!referrer) {
      return res.status(404).json({
        success: false,
        error: 'InvalidReferralCode',
        message: `Referral code '${cleanCode}' is invalid or does not exist.`,
      });
    }

    // 3. Referee cannot apply more than once
    let existingRef = null;
    if (isMockMode || supabase.isMock) {
      existingRef = mockStore.findReferralByRefereeId(user.id);
    } else {
      const { data } = await supabase
        .from('referrals')
        .select('*')
        .eq('referee_id', user.id)
        .maybeSingle();
      existingRef = data;
    }

    if (existingRef) {
      return res.status(400).json({
        success: false,
        error: 'ReferralAlreadyApplied',
        message: 'You have already redeemed a referral discount on this account.',
      });
    }

    // 4. First transaction check (strictly new users only)
    let userTxs = [];
    if (isMockMode || supabase.isMock) {
      userTxs = mockStore.getTransactionsByUserId(user.id);
    } else {
      const { data } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('user_id', user.id);
      userTxs = data || [];
    }

    const hasCompletedTx = userTxs.some((t) =>
      ['PAYOUT_SUCCESS', 'SETTLED', 'SUCCESS'].includes(t.status)
    );

    if (hasCompletedTx) {
      return res.status(400).json({
        success: false,
        error: 'FirstTransactionOnly',
        message: 'Referral discount is valid strictly on your first commercial transfer.',
      });
    }

    // 5. Create Referral Record
    const refRecord = {
      referrer_id: referrer.id,
      referee_id: user.id,
      referral_code: cleanCode,
      discount_code: 'REF15',
      discount_amount: 15,
      status: 'APPLIED',
    };

    if (isMockMode || supabase.isMock) {
      mockStore.createReferral(refRecord);
      mockStore.issueUserCoupon({
        user_id: user.id,
        code: 'REF15',
        value: 15,
        minAmount: 1000,
        description: 'Referral Welcome: ₹15 instant fee discount on your first transfer',
        badge: 'Referral ₹15 OFF',
      });
    } else {
      await supabase.from('referrals').insert(refRecord);
    }

    return res.status(200).json({
      success: true,
      message: `Referral code applied! You unlocked ₹15 instant fee discount (use code REF15 on checkout).`,
      discount_code: 'REF15',
      discount_amount: 15,
      referrer_name: referrer.full_name,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Authenticated User Referral Stats
 * GET /api/referrals/my-stats
 */
async function getReferralStats(req, res, next) {
  try {
    const user = req.user;
    let referrals = [];
    let userCoupons = [];

    if (isMockMode || supabase.isMock) {
      referrals = mockStore.getReferralsByReferrerId(user.id);
      userCoupons = mockStore.getUserCoupons(user.id);
    } else {
      const { data } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id);
      referrals = data || [];
    }

    const rewarded = referrals.filter((r) => r.status === 'REWARDED');
    const pending = referrals.filter((r) => r.status === 'APPLIED');
    const totalEarnings = rewarded.length * 25;

    return res.status(200).json({
      success: true,
      referral_code: user.referral_code || 'PAY987',
      total_referred: referrals.length,
      successful_payouts: rewarded.length,
      pending_referrals: pending.length,
      total_rewards_earned: totalEarnings,
      reward_amount_per_referral: 25,
      referee_discount_amount: 15,
      earned_coupons: userCoupons,
      share_text: `Pay vendor bills & commercial rent with credit card and get ₹15 off! Use my referral code: ${user.referral_code || 'PAY987'}`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  applyReferralCode,
  getReferralStats,
};
