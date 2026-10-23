/**
 * Authentication Controller
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements mobile OTP authentication with mock OTP verification and JWT issuance.
 */

const jwt = require('jsonwebtoken');
const { isValidMobile, isValidPAN } = require('../utils/riskRules');
const { mockStore, isMockMode, supabase } = require('../config/supabase');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const STATIC_MOCK_OTP = '123456';

/**
 * Send OTP (Mock)
 * POST /api/auth/send-otp
 */
async function sendOtp(req, res, next) {
  try {
    const { mobile } = req.body;

    if (!mobile || !isValidMobile(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'InvalidMobile',
        message: 'A valid 10-digit Indian mobile number is required.',
      });
    }

    const cleanedMobile = mobile.replace(/[\s\-\+]/g, '').slice(-10);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully (Mock Mode: Use 123456)',
      mobile: cleanedMobile,
      otp: STATIC_MOCK_OTP,
      expires_in_seconds: 300,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify OTP and issue JWT session token
 * POST /api/auth/verify-otp
 */
async function verifyOtp(req, res, next) {
  try {
    const { mobile, otp, full_name, pan_number } = req.body;

    if (!mobile || !isValidMobile(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'InvalidMobile',
        message: 'A valid 10-digit Indian mobile number is required.',
      });
    }

    if (!otp || String(otp).trim() !== STATIC_MOCK_OTP) {
      return res.status(400).json({
        success: false,
        error: 'InvalidOTP',
        message: 'Invalid or expired OTP. Please use mock code 123456.',
      });
    }

    const cleanedMobile = mobile.replace(/[\s\-\+]/g, '').slice(-10);

    let user = null;
    if (isMockMode || supabase.isMock) {
      user = mockStore.findUserByMobile(cleanedMobile);
      if (!user) {
        user = mockStore.createUser({
          mobile: cleanedMobile,
          full_name: full_name || 'Fintech Business User',
          pan_number: pan_number && isValidPAN(pan_number) ? pan_number.toUpperCase() : null,
          kyc_status: 'PENDING',
          is_cooling_cleared: false, // New user starts in cooling window
        });
      } else if (full_name || pan_number) {
        user = mockStore.updateUser(user.id, {
          ...(full_name && { full_name }),
          ...(pan_number && isValidPAN(pan_number) && { pan_number: pan_number.toUpperCase() }),
        });
      }
    } else {
      const { data: existingUser } = await supabase.from('users').select('*').eq('mobile', cleanedMobile).single();
      if (!existingUser) {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            mobile: cleanedMobile,
            full_name: full_name || 'Fintech Business User',
            pan_number: pan_number && isValidPAN(pan_number) ? pan_number.toUpperCase() : null,
            kyc_status: 'PENDING',
            is_cooling_cleared: false,
          })
          .select()
          .single();
        if (error) throw error;
        user = newUser;
      } else {
        user = existingUser;
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        mobile: user.mobile,
        kyc_status: user.kyc_status,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        mobile: user.mobile,
        full_name: user.full_name,
        business_name: user.business_name || user.full_name,
        billing_address: user.billing_address || null,
        email: user.email || null,
        pan_number: user.pan_number,
        kyc_status: user.kyc_status,
        is_cooling_cleared: user.is_cooling_cleared,
        referral_code: user.referral_code || 'PAY987',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/profile
 * Updates authenticated user's business profile settings:
 * business_name, billing_address, email
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { business_name, billing_address, email, full_name } = req.body;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Invalid email address format.',
      });
    }

    const updates = {};
    if (business_name !== undefined) updates.business_name = String(business_name).trim();
    if (billing_address !== undefined) updates.billing_address = String(billing_address).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (full_name !== undefined) updates.full_name = String(full_name).trim();

    let updatedUser = null;
    if (isMockMode || supabase.isMock) {
      updatedUser = mockStore.updateUser(userId, updates);
    } else {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      updatedUser = data;
    }

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'UserNotFound',
        message: 'User account not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Business profile updated successfully.',
      user: {
        id: updatedUser.id,
        mobile: updatedUser.mobile,
        full_name: updatedUser.full_name,
        business_name: updatedUser.business_name || updatedUser.full_name,
        billing_address: updatedUser.billing_address || null,
        email: updatedUser.email || null,
        pan_number: updatedUser.pan_number,
        kyc_status: updatedUser.kyc_status,
        is_cooling_cleared: updatedUser.is_cooling_cleared,
        referral_code: updatedUser.referral_code,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  STATIC_MOCK_OTP,
};
