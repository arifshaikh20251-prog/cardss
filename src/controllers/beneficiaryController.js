/**
 * Beneficiary Vault Controller
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Handles vendor and landlord registration, IFSC/Account validation,
 * Anti-Self-Transfer AML filtering, and mock penny-drop verification.
 */

const {
  isValidIFSC,
  isValidAccountNumber,
  isValidPAN,
  checkSelfTransfer,
} = require('../utils/riskRules');
const { mockStore, isMockMode, supabase } = require('../config/supabase');

/**
 * Register a new vendor or rental beneficiary
 * POST /api/beneficiaries
 */
async function createBeneficiary(req, res, next) {
  try {
    const user = req.user;
    const {
      account_holder_name,
      account_number,
      ifsc_code,
      bank_name,
      pan_number,
      beneficiary_type,
    } = req.body;

    // 1. Basic field presence and syntax checks
    if (!account_holder_name || typeof account_holder_name !== 'string' || account_holder_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'A valid account_holder_name with at least 3 characters is required.',
      });
    }

    if (!account_number || !isValidAccountNumber(account_number)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid account_number: must be between 9 and 18 numerical digits.',
      });
    }

    if (!ifsc_code || !isValidIFSC(ifsc_code)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid ifsc_code format. Example: HDFC0000128.',
      });
    }

    if (pan_number && !isValidPAN(pan_number)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid beneficiary PAN format. Example: ABCDE1234F.',
      });
    }

    // 2. Anti-Self-Transfer & AML Compliance Check
    const selfCheck = checkSelfTransfer(user, {
      account_holder_name: account_holder_name.trim(),
      account_number: account_number.trim(),
      pan_number: pan_number ? pan_number.trim() : null,
      mobile: req.body.mobile || null,
    });

    if (selfCheck.isSelfTransfer) {
      return res.status(400).json({
        success: false,
        error: 'SelfTransferProhibited',
        message: selfCheck.reason,
        similarity: selfCheck.similarity ? Number((selfCheck.similarity * 100).toFixed(1)) : undefined,
      });
    }

    // 3. Persist beneficiary with mock penny-drop verification
    const beneficiaryRecord = {
      user_id: user.id,
      account_holder_name: account_holder_name.trim(),
      account_number: account_number.trim(),
      ifsc_code: ifsc_code.trim().toUpperCase(),
      bank_name: bank_name || 'Standard Commercial Bank',
      beneficiary_type: (beneficiary_type || 'VENDOR').toUpperCase(),
      pan_number: pan_number ? pan_number.trim().toUpperCase() : null,
      penny_drop_verified: true, // Mock penny drop ₹1 verification pass
      is_verified: true,
      is_cooling_cleared: false,
      cooling_period_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    let savedBeneficiary = null;
    if (isMockMode || supabase.isMock) {
      savedBeneficiary = mockStore.createBeneficiary(beneficiaryRecord);
    } else {
      const { data, error } = await supabase
        .from('beneficiaries')
        .insert(beneficiaryRecord)
        .select()
        .single();
      if (error) throw error;
      savedBeneficiary = data;
    }

    return res.status(201).json({
      success: true,
      message: 'Beneficiary registered successfully and verified via Penny-Drop (Mock).',
      beneficiary: savedBeneficiary,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List beneficiaries for authenticated user
 * GET /api/beneficiaries
 */
async function getBeneficiaries(req, res, next) {
  try {
    const user = req.user;
    let beneficiaries = [];

    if (isMockMode || supabase.isMock) {
      beneficiaries = mockStore.getBeneficiariesByUserId(user.id);
    } else {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      beneficiaries = data || [];
    }

    return res.status(200).json({
      success: true,
      count: beneficiaries.length,
      beneficiaries,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBeneficiary,
  getBeneficiaries,
};
