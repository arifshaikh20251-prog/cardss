/**
 * Mock KYC Verification Adapter
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Simulates PAN verification, Aadhaar OTP generation, and OTP validation.
 */

const { isValidPAN, calculateNameSimilarity } = require('../../utils/riskRules');

class MockKyc {
  constructor() {
    this.name = 'mock';
    this.sessions = new Map();
  }

  /**
   * Verify PAN syntax and simulated NSDL/ITD status
   */
  async verifyPan({ panNumber, fullName }) {
    if (!panNumber || !isValidPAN(panNumber)) {
      return {
        success: false,
        valid: false,
        error: 'InvalidPanFormat',
        message: 'Invalid Indian PAN format. Must match 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).',
      };
    }

    const cleanPan = panNumber.trim().toUpperCase();
    const cleanName = (fullName || 'Apex Solutions Private Limited').trim();

    // Default registered name for mock simulation
    const simulatedRegisteredName = cleanName || 'Verified Corporate Enterprise';
    const similarity = calculateNameSimilarity(cleanName, simulatedRegisteredName);

    return {
      success: true,
      valid: true,
      provider: 'mock',
      pan: cleanPan,
      name: simulatedRegisteredName,
      status: 'ACTIVE',
      category: cleanPan.charAt(3) === 'C' ? 'COMPANY' : (cleanPan.charAt(3) === 'P' ? 'INDIVIDUAL' : 'FIRM'),
      matchScore: Math.round(similarity * 100) || 95,
      verified_at: new Date().toISOString(),
    };
  }

  /**
   * Initiate Aadhaar OTP Verification Session
   */
  async initiateAadhaarOtp({ aadhaarNumber }) {
    const cleanAadhaar = String(aadhaarNumber || '').replace(/\D/g, '');

    if (cleanAadhaar.length !== 12) {
      return {
        success: false,
        error: 'InvalidAadhaarNumber',
        message: 'Aadhaar number must contain exactly 12 numerical digits.',
      };
    }

    const clientRefId = `aadhaar_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const maskedAadhaar = `XXXXXXXX${cleanAadhaar.slice(-4)}`;

    // Store in-memory session (Mock OTP: 123456)
    this.sessions.set(clientRefId, {
      maskedAadhaar,
      otp: '123456',
      createdAt: Date.now(),
    });

    return {
      success: true,
      provider: 'mock',
      clientRefId,
      maskedAadhaar,
      message: 'OTP sent to Aadhaar linked mobile number (Mock Sandbox: Use 123456)',
      expires_in_seconds: 600,
    };
  }

  /**
   * Validate Aadhaar OTP
   */
  async verifyAadhaarOtp({ clientRefId, otp }) {
    if (!clientRefId) {
      return {
        success: false,
        verified: false,
        message: 'clientRefId is required for Aadhaar OTP verification.',
      };
    }

    const session = this.sessions.get(clientRefId);

    // Accept static mock code '123456'
    if (String(otp).trim() !== '123456' && (!session || session.otp !== String(otp).trim())) {
      return {
        success: false,
        verified: false,
        error: 'InvalidOtp',
        message: 'Invalid Aadhaar OTP. Please use code 123456 in mock mode.',
      };
    }

    return {
      success: true,
      verified: true,
      provider: 'mock',
      clientRefId,
      name: 'Rohan S. Verma',
      maskedAadhaar: session ? session.maskedAadhaar : 'XXXXXXXX9012',
      gender: 'M',
      dob: '1990-05-15',
      careOf: 'Late S. K. Verma',
      address: {
        line: 'Level 6, Cyber Crest Towers, Outer Ring Road',
        locality: 'Devarabisanahalli, Bellandur',
        district: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560103',
        country: 'India',
      },
      status: 'SUCCESS',
      verified_at: new Date().toISOString(),
    };
  }
}

module.exports = new MockKyc();
