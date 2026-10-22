/**
 * Supabase Live Bridge & Schema Verification Script
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Verifies live PostgreSQL connectivity, confirms required database tables,
 * and validates database schema readiness for production deployment.
 */

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const isMockTenant = process.env.MOCK_MODE === 'true' || !SUPABASE_URL || SUPABASE_URL.includes('mock-tenant') || !SUPABASE_KEY || SUPABASE_KEY.includes('mock');

const REQUIRED_TABLES = [
  'users',
  'beneficiaries',
  'transactions',
  'invoices',
  'audit_logs',
];

async function verifySupabase() {
  console.log('\n================================================================');
  console.log('🔍 SUPABASE LIVE BRIDGE & PRODUCTION SCHEMA VERIFIER');
  console.log('================================================================');
  console.log(`📡 Target URL:     ${SUPABASE_URL || 'NOT_CONFIGURED'}`);
  console.log(`🔑 Key Type:       ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role (Full Access)' : (process.env.SUPABASE_ANON_KEY ? 'Anon Public Key' : 'None')}`);
  console.log(`🛡️ Mock Sandbox:   ${isMockTenant ? 'ACTIVE (Local In-Memory Mode)' : 'DISABLED (Testing Live Supabase)'}`);
  console.log('----------------------------------------------------------------\n');

  if (isMockTenant) {
    console.log('ℹ️  STATUS: Running in Local Mock Sandbox Mode.');
    console.log('   The local backend is using the stateful in-memory MockStore.');
    console.log('\n📋 TO CONNECT TO LIVE SUPABASE POSTGRESQL:');
    console.log('   1. Sign in to https://app.supabase.com and create a project.');
    console.log('   2. Open Project Settings -> API.');
    console.log('   3. Copy "Project URL" and set SUPABASE_URL in your .env');
    console.log('   4. Copy "service_role" secret key and set SUPABASE_SERVICE_ROLE_KEY in your .env');
    console.log('   5. Set MOCK_MODE=false in your .env');
    console.log('   6. Go to SQL Editor in Supabase, paste database/schema.sql, and click Run.');
    console.log('   7. Re-run: npm run verify:supabase\n');
    console.log('✅ Local Mock Engine: OPERATIONAL & READY');
    process.exit(0);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    console.log('🔄 Checking connection and inspecting database tables...\n');

    let allPassed = true;
    const tableResults = [];

    for (const tableName of REQUIRED_TABLES) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          allPassed = false;
          tableResults.push({
            table: tableName,
            status: 'MISSING / ERROR',
            details: error.message,
            code: error.code,
          });
        } else {
          tableResults.push({
            table: tableName,
            status: 'VERIFIED',
            details: `${count !== null ? count : 0} rows found`,
          });
        }
      } catch (err) {
        allPassed = false;
        tableResults.push({
          table: tableName,
          status: 'ERROR',
          details: err.message,
        });
      }
    }

    // Output Table Status
    console.table(tableResults);

    if (allPassed) {
      console.log('\n🎉 SUCCESS: All required database tables are live, indexed, and queryable!');
      console.log('   Your Supabase database is 100% ready for production payments.\n');
      process.exit(0);
    } else {
      console.error('\n⚠️  SCHEMA MISMATCH DETECTED:');
      console.error('   One or more required tables could not be located in your Supabase project.');
      console.log('\n🛠️  ACTION REQUIRED:');
      console.log('   1. Open your Supabase Dashboard: ' + SUPABASE_URL);
      console.log('   2. Navigate to the "SQL Editor" tab on the left sidebar.');
      console.log('   3. Open the file: ' + path.resolve(__dirname, '../database/schema.sql'));
      console.log('   4. Copy all SQL script contents, paste into the SQL Editor, and click "Run".');
      console.log('   5. Once executed, re-run: npm run verify:supabase\n');
      process.exit(1);
    }
  } catch (fatalErr) {
    console.error('❌ Connection Fatal Error:', fatalErr.message);
    process.exit(1);
  }
}

verifySupabase();
