/**
 * KYC Controller
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements PAN verification, Aadhaar OTP initiation, and Aadhaar OTP verification.
 */

const kycFactory = require('../services/kyc/kycFactory');
const { mockStore, isMockMode, supabase } = require('../config/supabase');

/**
 * Verify PAN Card
 * POST /api/kyc/verify-pan
 */
async function verifyPan(req, res, next) {
  try {
    const panNumber = req.body.panNumber || req.body.pan_number;
    const fullName = req.body.fullName || req.body.full_name || req.user.full_name;

    if (!panNumber) {
      return res.status(400).json({
        success: false,
        error: 'MissingPanNumber',
        message: 'PAN number is required.',
      });
    }

    const result = await kycFactory.verifyPan({
      panNumber,
      fullName,
    });

    if (!result.valid || !result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'PanVerificationFailed',
        message: result.message || 'PAN verification failed. Please enter a valid Indian PAN.',
      });
    }

    const updates = {
      pan_number: result.pan,
      kyc_step: 'AADHAAR_PENDING',
    };

    let updatedUser = null;
    if (isMockMode || supabase.isMock) {
      updatedUser = mockStore.updateUser(req.user.id, updates);
    } else {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id)
        .select()
        .single();
      if (!error && data) updatedUser = data;
    }

    return res.status(200).json({
      success: true,
      message: 'PAN verified successfully. Registered entity match confirmed.',
      data: result,
      user: updatedUser || { ...req.user, ...updates },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Initiate Aadhaar OTP Verification Session
 * POST /api/kyc/initiate-aadhaar
 */
async function initiateAadhaar(req, res, next) {
  try {
    const aadhaarNumber = req.body.aadhaarNumber || req.body.aadhaar_number;

    if (!aadhaarNumber) {
      return res.status(400).json({
        success: false,
        error: 'MissingAadhaarNumber',
        message: 'Aadhaar number is required.',
      });
    }

    const result = await kycFactory.initiateAadhaarOtp({ aadhaarNumber });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'AadhaarOtpFailed',
        message: result.message || 'Failed to dispatch Aadhaar OTP.',
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message || 'OTP sent to Aadhaar linked mobile number.',
      clientRefId: result.clientRefId,
      maskedAadhaar: result.maskedAadhaar,
      expires_in_seconds: result.expires_in_seconds || 600,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Validate Aadhaar OTP & Upgrade User to KYC Verified
 * POST /api/kyc/verify-aadhaar
 */
async function verifyAadhaar(req, res, next) {
  try {
    const clientRefId = req.body.clientRefId || req.body.client_ref_id;
    const otp = req.body.otp;

    if (!clientRefId || !otp) {
      return res.status(400).json({
        success: false,
        error: 'MissingCredentials',
        message: 'clientRefId and otp are required.',
      });
    }

    const result = await kycFactory.verifyAadhaarOtp({ clientRefId, otp });

    if (!result.verified || !result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'InvalidOtp',
        message: result.message || 'Aadhaar OTP verification failed.',
      });
    }

    const updates = {
      kyc_status: 'VERIFIED',
      is_cooling_cleared: true, // Verification clears cooling limit
      kyc_step: 'COMPLETED',
      aadhaar_verified_at: result.verified_at || new Date().toISOString(),
      masked_aadhaar: result.maskedAadhaar,
    };

    let updatedUser = null;
    if (isMockMode || supabase.isMock) {
      updatedUser = mockStore.updateUser(req.user.id, updates);
    } else {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id)
        .select()
        .single();
      if (!error && data) updatedUser = data;
    }

    return res.status(200).json({
      success: true,
      message: 'Aadhaar verified successfully! Account is now KYC Verified.',
      data: result,
      user: updatedUser || { ...req.user, ...updates },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get KYC Status
 * GET /api/kyc/status
 */
async function getKycStatus(req, res, next) {
  try {
    let user = req.user;
    if (isMockMode || supabase.isMock) {
      user = mockStore.findUserById(req.user.id) || req.user;
    } else {
      const { data } = await supabase.from('users').select('*').eq('id', req.user.id).single();
      if (data) user = data;
    }

    return res.status(200).json({
      success: true,
      kyc_status: user.kyc_status || 'PENDING',
      pan_number: user.pan_number || null,
      masked_aadhaar: user.masked_aadhaar || null,
      is_cooling_cleared: Boolean(user.is_cooling_cleared),
      kyc_step: user.kyc_step || (user.kyc_status === 'VERIFIED' ? 'COMPLETED' : (user.pan_number ? 'AADHAAR_PENDING' : 'PAN_PENDING')),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  verifyPan,
  initiateAadhaar,
  verifyAadhaar,
  getKycStatus,
};
