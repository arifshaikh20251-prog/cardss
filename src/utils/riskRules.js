/**
 * Risk & Compliance Rules Engine
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Enforces RBI/Fintech risk guardrails:
 * - Anti-Self-Transfer check (Preventing credit card rotation/cash-out)
 * - PAN and IFSC syntax validation
 * - 24-Hour cooling-off window for new users / first transactions
 * - Single ticket cap: strictly max ₹25,000 per transaction
 * - Fuzzy name similarity matching (>80% similarity blocked under AML guidelines)
 */

const dotenv = require('dotenv');
dotenv.config();

const NEW_CARD_COOLING_HOURS = parseInt(process.env.NEW_CARD_COOLING_HOURS || '24', 10);
const MAX_SINGLE_TICKET_AMOUNT = 25000.00;
const UNVERIFIED_KYC_MAX_TICKET = parseFloat(process.env.UNVERIFIED_KYC_MAX_TICKET_SIZE || '10000.00');
const MAX_DAILY_LIMIT = parseFloat(process.env.MAX_DAILY_TRANSACTION_LIMIT || '50000.00');

/**
 * Validates Indian Permanent Account Number (PAN)
 * Format: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g., ABCDE1234F)
 *
 * @param {string} pan
 * @returns {boolean}
 */
function isValidPAN(pan) {
  if (!pan || typeof pan !== 'string') return false;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.trim().toUpperCase());
}

/**
 * Validates Indian 10-digit mobile number with optional +91 / 0 prefix
 *
 * @param {string} mobile
 * @returns {boolean}
 */
function isValidMobile(mobile) {
  if (!mobile || typeof mobile !== 'string') return false;
  const cleaned = mobile.replace(/[\s\-\+]/g, '');
  const mobileRegex = /^(?:(?:91|0)?[6-9]\d{9})$/;
  return mobileRegex.test(cleaned);
}

/**
 * Validates Indian Financial System Code (IFSC)
 * Format: 4 letters (Bank Code), 0 (Reserved), 6 alphanumeric characters (Branch Code)
 *
 * @param {string} ifsc
 * @returns {boolean}
 */
function isValidIFSC(ifsc) {
  if (!ifsc || typeof ifsc !== 'string') return false;
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc.trim().toUpperCase());
}

/**
 * Validates Bank Account Number
 * Format: 9 to 18 numerical digits
 *
 * @param {string} accountNumber
 * @returns {boolean}
 */
function isValidAccountNumber(accountNumber) {
  if (!accountNumber || typeof accountNumber !== 'string') return false;
  const accRegex = /^\d{9,18}$/;
  return accRegex.test(accountNumber.trim());
}

/**
 * Compute normalized Levenshtein distance string similarity between two names [0.0 - 1.0]
 *
 * @param {string} str1
 * @param {string} str2
 * @returns {number} Value between 0 (completely different) and 1 (exact match)
 */
function calculateNameSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const s2 = str2.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;

  const m = s1.length;
  const n = s2.length;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(m, n);
  const similarity = 1 - (d[m][n] / maxLen);
  return Math.max(0, similarity);
}

/**
 * Checks if cooling period has cleared based on given created date and hours
 *
 * @param {Date|string} createdAt
 * @param {number} [coolingHours=24]
 * @returns {boolean}
 */
function isCoolingPeriodCleared(createdAt, coolingHours = NEW_CARD_COOLING_HOURS) {
  if (!createdAt) return false;
  const createdDate = new Date(createdAt);
  if (isNaN(createdDate.getTime())) return false;

  const now = new Date();
  const elapsedHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
  return elapsedHours >= coolingHours;
}

/**
 * Anti-Self Transfer Check (AML Compliance)
 * Detects if the payer is attempting to pay their own account, matching PAN, or similar name.
 *
 * @param {Object} user - Payer object containing full_name, pan_number, account_number, mobile
 * @param {Object} beneficiary - Beneficiary object containing account_holder_name, pan_number, account_number, mobile
 * @returns {{ isSelfTransfer: boolean, reason?: string, similarity?: number }}
 */
function checkSelfTransfer(user, beneficiary) {
  if (!user || !beneficiary) {
    return { isSelfTransfer: false };
  }

  // 1. Check matching PAN (Strict AML prohibition)
  if (
    user.pan_number &&
    beneficiary.pan_number &&
    user.pan_number.trim().toUpperCase() === beneficiary.pan_number.trim().toUpperCase()
  ) {
    return {
      isSelfTransfer: true,
      reason: 'Self-transfer prohibited under AML guidelines: User PAN matches Beneficiary PAN.',
    };
  }

  // 2. Check Name Similarity (>80% similarity threshold)
  const userName = user.full_name || '';
  const beneficiaryName = beneficiary.account_holder_name || '';
  if (userName && beneficiaryName) {
    const similarity = calculateNameSimilarity(userName, beneficiaryName);
    if (similarity > 0.80) {
      return {
        isSelfTransfer: true,
        similarity,
        reason: `Self-transfer prohibited under AML guidelines: Beneficiary name is ${(similarity * 100).toFixed(1)}% similar to account holder name.`,
      };
    }
  }

  // 3. Check matching Bank Account
  if (
    user.account_number &&
    beneficiary.account_number &&
    user.account_number.trim() === beneficiary.account_number.trim()
  ) {
    return {
      isSelfTransfer: true,
      reason: 'Self-transfer prohibited under AML guidelines: User bank account matches Beneficiary account.',
    };
  }

  // 4. Check matching Mobile
  if (
    user.mobile &&
    beneficiary.mobile &&
    user.mobile.replace(/\D/g, '') === beneficiary.mobile.replace(/\D/g, '')
  ) {
    return {
      isSelfTransfer: true,
      reason: 'Self-transfer prohibited under AML guidelines: User mobile matches Beneficiary contact.',
    };
  }

  return { isSelfTransfer: false };
}

/**
 * Comprehensive risk gatekeeper for processing transactions.
 */
function evaluateTransactionRisk({
  user,
  beneficiary,
  amount,
  dailyAccumulatedAmount = 0,
}) {
  const violations = [];

  // 1. Amount threshold checks
  if (!amount || amount <= 0) {
    violations.push('Transaction amount must be strictly greater than 0.');
  }

  // 2. Single ticket cap check: strictly max ₹25,000 per transaction
  if (amount > MAX_SINGLE_TICKET_AMOUNT) {
    violations.push(
      `Transaction amount exceeds maximum single ticket cap of ₹${MAX_SINGLE_TICKET_AMOUNT.toLocaleString('en-IN')}.00.`
    );
  }

  // 3. KYC Tier validation
  const kycStatus = (user?.kyc_status || 'PENDING').toUpperCase();
  if (kycStatus !== 'VERIFIED') {
    if (amount > UNVERIFIED_KYC_MAX_TICKET) {
      violations.push(
        `Ticket size exceeds maximum limit of ₹${UNVERIFIED_KYC_MAX_TICKET.toLocaleString('en-IN')} for unverified KYC. Complete KYC to proceed.`
      );
    }
  }

  // 4. Daily velocity limit check
  const totalDaily = dailyAccumulatedAmount + amount;
  if (totalDaily > MAX_DAILY_LIMIT) {
    violations.push(
      `Daily aggregate limit of ₹${MAX_DAILY_LIMIT.toLocaleString('en-IN')} exceeded. Current accumulated total: ₹${totalDaily.toLocaleString('en-IN')}.`
    );
  }

  // 5. Anti-Money Laundering (Self Transfer) check
  const selfCheck = checkSelfTransfer(user, beneficiary);
  if (selfCheck.isSelfTransfer) {
    violations.push(selfCheck.reason);
  }

  // 6. Beneficiary bank detail checks
  if (beneficiary?.ifsc_code && !isValidIFSC(beneficiary.ifsc_code)) {
    violations.push(`Invalid Beneficiary IFSC code: ${beneficiary.ifsc_code}`);
  }

  if (beneficiary?.account_number && !isValidAccountNumber(beneficiary.account_number)) {
    violations.push('Invalid Beneficiary account number: must be 9-18 digits.');
  }

  return {
    approved: violations.length === 0,
    violations,
  };
}

module.exports = {
  isValidPAN,
  isValidMobile,
  isValidIFSC,
  isValidAccountNumber,
  calculateNameSimilarity,
  isCoolingPeriodCleared,
  checkSelfTransfer,
  evaluateTransactionRisk,
  NEW_CARD_COOLING_HOURS,
  MAX_SINGLE_TICKET_AMOUNT,
  UNVERIFIED_KYC_MAX_TICKET,
  MAX_DAILY_LIMIT,
};
