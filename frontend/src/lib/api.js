/**
 * API Client with JWT Bearer Token Interceptor
 * Communicates with local Node.js Express backend (or NEXT_PUBLIC_API_BASE_URL)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Core fetch wrapper with auth header injection
 */
async function request(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    // If token expired, clear and redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  // Handle binary downloads (e.g. PDF)
  if (options.responseType === 'blob') {
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Request failed with status ${response.status}`);
    }
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth endpoints
  sendOtp: (mobile) => request('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  }),

  verifyOtp: (payload) => request('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Update Dynamic Business Profile Settings
  updateProfile: (payload) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),

  // In-App Notification Bell Center
  getNotifications: () => request('/notifications'),

  markNotificationAsRead: (id) => request(`/notifications/${id}/read`, {
    method: 'POST',
  }),

  markAllNotificationsAsRead: () => request('/notifications/read-all', {
    method: 'POST',
  }),

  // Beneficiaries endpoints
  getBeneficiaries: () => request('/beneficiaries'),

  createBeneficiary: (payload) => request('/beneficiaries', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Transactions endpoints
  getTransactions: () => request('/transactions'),

  getTransactionAnalytics: () => request('/transactions/analytics'),

  getTransactionById: (id) => request(`/transactions/${id}`),

  initiateTransaction: (payload) => request('/transactions/initiate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Download Monthly Account Statement PDF
  downloadMonthlyStatement: async ({ month, year } = {}) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const blob = await request(`/transactions/statement${queryString}`, {
      method: 'GET',
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileMonth = String(month || new Date().getMonth() + 1).padStart(2, '0');
    const fileYear = year || new Date().getFullYear();
    link.setAttribute('download', `AccountStatement-${fileYear}-${fileMonth}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Promotional Coupons
  getCoupons: () => request('/coupons'),

  validateCoupon: (payload) => request('/coupons/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  mockPgWebhook: (payload) => request('/transactions/mock-pg-webhook', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  postPgWebhook: (payload, headers = {}) => request('/transactions/pg-webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  }),

  // Download PDF Tax Invoice
  downloadInvoice: async (transactionId) => {
    const blob = await request(`/transactions/${transactionId}/invoice`, {
      method: 'GET',
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice-${transactionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Download Digital Commercial Payment Declaration & Settlement Voucher PDF
  downloadVoucher: async (transactionId) => {
    const blob = await request(`/transactions/${transactionId}/voucher`, {
      method: 'GET',
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Voucher-${transactionId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Send / Resend Invoice via Email
  sendEmailInvoice: (transactionId, email) => request(`/transactions/${transactionId}/send-email-invoice`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  // Zero-Loss Referral System Endpoints
  applyReferralCode: (referral_code) => request('/referrals/apply', {
    method: 'POST',
    body: JSON.stringify({ referral_code }),
  }),

  getReferralStats: () => request('/referrals/my-stats'),

  // KYC Verification Endpoints
  getKycStatus: () => request('/kyc/status'),

  verifyPan: (payload) => request('/kyc/verify-pan', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  initiateAadhaar: (payload) => request('/kyc/initiate-aadhaar', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  verifyAadhaar: (payload) => request('/kyc/verify-aadhaar', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Developer Sandbox Controls (Simulation)
  fastForwardCooling: (hours = 24) => request('/dev/fast-forward-cooling', {
    method: 'POST',
    body: JSON.stringify({ hours }),
  }),

  resetSandbox: () => request('/dev/reset-sandbox', {
    method: 'POST',
  }),

  // Master Admin Endpoints
  getAdminMetrics: (adminKey = 'fintech_admin_secret_key_2026') => request('/admin/metrics', {
    headers: { 'x-admin-key': adminKey },
  }),

  getAdminTransactions: (params = {}, adminKey = 'fintech_admin_secret_key_2026') => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/transactions${query ? `?${query}` : ''}`, {
      headers: { 'x-admin-key': adminKey },
    });
  },

  overrideCooling: (transactionId, adminKey = 'fintech_admin_secret_key_2026') => request(`/admin/transactions/${transactionId}/override-cooling`, {
    method: 'POST',
    headers: { 'x-admin-key': adminKey },
  }),

  downloadGstReport: async (month = '', adminKey = 'fintech_admin_secret_key_2026') => {
    const query = month ? `?month=${month}&format=csv` : '?format=csv';
    const blob = await request(`/admin/export-gst-report${query}`, {
      method: 'GET',
      responseType: 'blob',
      headers: { 'x-admin-key': adminKey },
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UtilityPay_CA_GSTR1_${month || 'All_Time'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};


