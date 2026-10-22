import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format number into Indian Rupee format (e.g. ₹20,000.00)
 */
export function formatINR(amount) {
  const numeric = parseFloat(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

/**
 * Mask sensitive bank account number
 */
export function maskAccount(acc) {
  if (!acc) return '••••0000';
  const clean = String(acc).trim();
  return `••••${clean.slice(-4)}`;
}

/**
 * Mask PAN number
 */
export function maskPAN(pan) {
  if (!pan) return '•••••XXXX';
  const clean = String(pan).trim().toUpperCase();
  return `•••••${clean.slice(-4)}`;
}

/**
 * Mask mobile number
 */
export function maskMobile(mobile) {
  if (!mobile) return '+91 ••••••0000';
  const digits = String(mobile).replace(/\D/g, '');
  return `+91 ••••••${digits.slice(-4)}`;
}

/**
 * Calculate client-side fee preview for instant UI feedback
 */
export function calculateLiveFee(amount, transferType = 'STANDARD') {
  const numeric = parseFloat(amount || 0);
  if (isNaN(numeric) || numeric <= 0) {
    return {
      amount: 0,
      feeRate: transferType === 'INSTANT' ? 3.5 : 2.5,
      platformFee: 0,
      gstAmount: 0,
      totalFee: 0,
      totalPayable: 0,
      netPayout: 0,
    };
  }

  const feeRate = transferType === 'INSTANT' ? 3.5 : 2.5;
  const platformFee = Math.round((numeric * (feeRate / 100) + Number.EPSILON) * 100) / 100;
  const gstAmount = Math.round((platformFee * 0.18 + Number.EPSILON) * 100) / 100;
  const totalFee = Math.round((platformFee + gstAmount + Number.EPSILON) * 100) / 100;
  const totalPayable = Math.round((numeric + totalFee + Number.EPSILON) * 100) / 100;

  return {
    amount: numeric,
    feeRate,
    platformFee,
    gstAmount,
    totalFee,
    totalPayable,
    netPayout: numeric,
  };
}

export const calculateTotalFromBase = calculateLiveFee;

/**
 * Format remaining seconds into "18h 24m 30s"
 */
export function formatDuration(seconds) {
  if (seconds <= 0) return '0m 0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  return `${m}m ${s}s`;
}
