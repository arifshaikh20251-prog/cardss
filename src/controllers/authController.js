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
        pan_number: user.pan_number,
        kyc_status: user.kyc_status,
        is_cooling_cleared: user.is_cooling_cleared,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  STATIC_MOCK_OTP,
};
