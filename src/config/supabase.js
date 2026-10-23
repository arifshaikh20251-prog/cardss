/**
 * Supabase Client Configuration
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Provides initialized Supabase clients for both standard (RLS-enforced)
 * and administrative (service role / ledger) operations, with stateful
 * in-memory MockStore adapter for Phase 1 local development.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { mockStore, generateReferralCode } = require('./mockStore');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isMockMode = process.env.MOCK_MODE === 'true' || !supabaseUrl || supabaseUrl.includes('mock-tenant');

let supabase = null;
let supabaseAdmin = null;

if (!isMockMode && supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (supabaseServiceKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      supabaseAdmin = supabase;
    }

    console.log('[SUPABASE] Initialized real Supabase client targeting:', supabaseUrl);
  } catch (error) {
    console.warn('[SUPABASE] Failed to initialize live client, falling back to mock mode:', error.message);
  }
}

if (!supabase) {
  // Build a query-compatible mock adapter around stateful mockStore
  const createMockQueryBuilder = (tableName) => {
    let filters = [];
    let isSingle = false;
    let operation = 'SELECT';
    let payload = null;

    const builder = {
      select: () => {
        operation = 'SELECT';
        return builder;
      },
      insert: (records) => {
        operation = 'INSERT';
        payload = Array.isArray(records) ? records : [records];
        return builder;
      },
      update: (updates) => {
        operation = 'UPDATE';
        payload = updates;
        return builder;
      },
      delete: () => {
        operation = 'DELETE';
        return builder;
      },
      eq: (column, value) => {
        filters.push({ type: 'eq', column, value });
        return builder;
      },
      lte: (column, value) => {
        filters.push({ type: 'lte', column, value });
        return builder;
      },
      single: () => {
        isSingle = true;
        return builder;
      },
      order: () => builder,
      limit: () => builder,

      then: (resolve, reject) => {
        try {
          let tableItems = [];
          if (tableName === 'users') tableItems = mockStore.users;
          else if (tableName === 'beneficiaries') tableItems = mockStore.beneficiaries;
          else if (tableName === 'transactions') tableItems = mockStore.transactions;
          else if (tableName === 'audit_logs') tableItems = mockStore.auditLogs;
          else if (tableName === 'notifications') tableItems = mockStore.notifications;

          if (operation === 'INSERT') {
            const inserted = payload.map((item) => {
              if (tableName === 'users') return mockStore.createUser(item);
              if (tableName === 'beneficiaries') return mockStore.createBeneficiary(item);
              if (tableName === 'transactions') return mockStore.createTransaction(item);
              if (tableName === 'audit_logs') return mockStore.createAuditLog(item);
              if (tableName === 'notifications') return mockStore.createNotification(item);
              return item;
            });
            const resultData = isSingle ? inserted[0] : inserted;
            resolve({ data: resultData, error: null });
            return;
          }

          if (operation === 'UPDATE') {
            const idFilter = filters.find((f) => f.column === 'id');
            if (idFilter) {
              let updated = null;
              if (tableName === 'users') updated = mockStore.updateUser(idFilter.value, payload);
              if (tableName === 'transactions') updated = mockStore.updateTransaction(idFilter.value, payload);
              if (tableName === 'notifications') updated = mockStore.markNotificationAsRead(idFilter.value);
              resolve({ data: isSingle ? updated : (updated ? [updated] : []), error: null });
              return;
            }
          }

          // SELECT
          let filtered = [...tableItems];
          for (const f of filters) {
            if (f.type === 'eq') {
              filtered = filtered.filter((item) => item[f.column] === f.value);
            } else if (f.type === 'lte') {
              filtered = filtered.filter((item) => new Date(item[f.column]).getTime() <= new Date(f.value).getTime());
            }
          }

          if (isSingle) {
            const item = filtered[0] || null;
            resolve({ data: item, error: null });
          } else {
            resolve({ data: filtered, error: null });
          }
        } catch (err) {
          reject(err);
        }
      },
    };

    return builder;
  };

  supabase = {
    from: createMockQueryBuilder,
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    isMock: true,
  };

  supabaseAdmin = supabase;
}

/**
 * Health check helper to test database connectivity
 */
async function checkDatabaseConnection() {
  if (isMockMode || !supabase || supabase.isMock) {
    return {
      connected: false,
      mockMode: true,
      message: 'Running in Mock Mode. Configure valid Supabase credentials in .env to connect to live PostgreSQL.',
    };
  }

  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return { connected: false, mockMode: false, error: error.message };
    }
    return { connected: true, mockMode: false, message: 'Database connection healthy' };
  } catch (err) {
    return { connected: false, mockMode: false, error: err.message };
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  mockStore,
  isMockMode,
  generateReferralCode,
  checkDatabaseConnection,
};
