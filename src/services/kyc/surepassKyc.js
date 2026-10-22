/**
 * Surepass KYC Adapter
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Implements Surepass API for PAN comprehensive verification and Aadhaar OTP flow.
 */

const { isValidPAN, calculateNameSimilarity } = require('../../utils/riskRules');
const mockKyc = require('./mockKyc');

class SurepassKyc {
  constructor() {
    this.name = 'surepass';
    this.token = process.env.SUREPASS_TOKEN || process.env.SUREPASS_API_KEY || '';
    this.env = (process.env.SUREPASS_ENV || 'sandbox').toLowerCase();
    this.baseUrl =
      this.env === 'production'
        ? 'https://kyc.surepass.io/api/v1'
        : 'https://sandbox.surepass.io/api/v1';
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Verify PAN via Surepass Pan Comprehensive API
   */
  async verifyPan({ panNumber, fullName }) {
    if (!panNumber || !isValidPAN(panNumber)) {
      return {
        success: false,
        valid: false,
        error: 'InvalidPanFormat',
        message: 'Invalid Indian PAN format. Must match 5 letters, 4 numbers, 1 letter.',
      };
    }

    if (!this.token) {
      // In sandbox/dev without live token, gracefully delegate to mock
      return mockKyc.verifyPan({ panNumber, fullName });
    }

    try {
      const response = await fetch(`${this.baseUrl}/pan/pan-comprehensive`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id_number: panNumber.trim().toUpperCase() }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          valid: false,
          error: data.message || 'PAN verification failed at provider',
        };
      }

      const panData = data.data || {};
      const registeredName = panData.full_name || panData.name || '';
      const similarity = calculateNameSimilarity(fullName || '', registeredName);

      return {
        success: true,
        valid: true,
        provider: 'surepass',
        pan: panData.pan_number || panNumber.trim().toUpperCase(),
        name: registeredName,
        status: panData.status || 'ACTIVE',
        category: panData.category || 'COMPANY',
        matchScore: Math.round(similarity * 100),
        raw: data,
        verified_at: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        valid: false,
        error: err.message,
      };
    }
  }

  /**
   * Initiate Aadhaar OTP via Surepass Aadhaar v2
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

    if (!this.token) {
      return mockKyc.initiateAadhaarOtp({ aadhaarNumber: cleanAadhaar });
    }

    try {
      const response = await fetch(`${this.baseUrl}/aadhaar-v2/generate-otp`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ id_number: cleanAadhaar }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || 'Aadhaar OTP dispatch failed',
        };
      }

      const clientRefId = data.data?.client_id || `surepass_${Date.now()}`;
      return {
        success: true,
        provider: 'surepass',
        clientRefId,
        maskedAadhaar: `XXXXXXXX${cleanAadhaar.slice(-4)}`,
        message: 'OTP sent to Aadhaar linked mobile number.',
        expires_in_seconds: 600,
        raw: data,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Verify Aadhaar OTP via Surepass
   */
  async verifyAadhaarOtp({ clientRefId, otp }) {
    if (!this.token) {
      return mockKyc.verifyAadhaarOtp({ clientRefId, otp });
    }

    try {
      const response = await fetch(`${this.baseUrl}/aadhaar-v2/submit-otp`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ client_id: clientRefId, otp: String(otp).trim() }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          verified: false,
          error: data.message || 'Aadhaar OTP verification failed',
        };
      }

      const aData = data.data || {};
      return {
        success: true,
        verified: true,
        provider: 'surepass',
        clientRefId,
        name: aData.full_name || 'Verified User',
        maskedAadhaar: aData.aadhaar_number || 'XXXXXXXXXXXX',
        gender: aData.gender || 'U',
        dob: aData.dob || '',
        careOf: aData.care_of || '',
        address: aData.address || {},
        status: 'SUCCESS',
        verified_at: new Date().toISOString(),
        raw: data,
      };
    } catch (err) {
      return {
        success: false,
        verified: false,
        error: err.message,
      };
    }
  }
}

module.exports = new SurepassKyc();
