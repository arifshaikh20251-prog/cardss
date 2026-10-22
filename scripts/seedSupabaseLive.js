/**
 * Supabase Live Database Seeder Script
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Populates live Supabase PostgreSQL tables with initial test accounts,
 * verified vendor beneficiaries, and audit records if they do not already exist.
 */

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const isMockTenant = process.env.MOCK_MODE === 'true' || !SUPABASE_URL || SUPABASE_URL.includes('mock-tenant') || !SUPABASE_KEY || SUPABASE_KEY.includes('mock');

const SEED_USERS = [
  {
    id: 'usr-1111-1111-1111',
    mobile: '9876543210',
    full_name: 'Apex Solutions Private Limited',
    pan_number: 'AAACA1234F',
    kyc_status: 'VERIFIED',
    is_cooling_cleared: true,
  },
  {
    id: 'usr-2222-2222-2222',
    mobile: '9123456780',
    full_name: 'Rohan Verma',
    pan_number: 'BAPPR5678K',
    kyc_status: 'PENDING',
    is_cooling_cleared: false,
  },
];

const SEED_BENEFICIARIES = [
  {
    id: 'ben-1111-1111-1111',
    user_id: 'usr-1111-1111-1111',
    account_holder_name: 'InfraTech Hardware Supplies',
    account_number: '100234908123',
    ifsc_code: 'HDFC0000128',
    bank_name: 'HDFC Bank Ltd',
    beneficiary_type: 'VENDOR',
    pan_number: 'BBBCB4321G',
    is_verified: true,
    penny_drop_verified: true,
    is_cooling_cleared: true,
  },
  {
    id: 'ben-2222-2222-2222',
    user_id: 'usr-1111-1111-1111',
    account_holder_name: 'Brigade Horizon Commercial Leases',
    account_number: '200987123456',
    ifsc_code: 'ICIC0000045',
    bank_name: 'ICICI Bank Ltd',
    beneficiary_type: 'RENTAL_LANDLORD',
    pan_number: 'AACCA9876L',
    is_verified: true,
    penny_drop_verified: true,
    is_cooling_cleared: true,
  },
];

async function seedSupabase() {
  console.log('\n================================================================');
  console.log('🌱 SUPABASE LIVE PRODUCTION SEEDER');
  console.log('================================================================');
  console.log(`📡 Supabase URL:   ${SUPABASE_URL || 'NOT_CONFIGURED'}`);
  console.log(`🛡️ Mock Sandbox:   ${isMockTenant ? 'ACTIVE (In-Memory Sandbox)' : 'LIVE DATABASE'}`);
  console.log('----------------------------------------------------------------\n');

  if (isMockTenant) {
    console.log('ℹ️  STATUS: Currently in Mock Sandbox Mode.');
    console.log('   The in-memory MockStore already has test accounts pre-seeded:');
    console.log('   • User 1: 9876543210 (Apex Solutions Private Limited - KYC Verified, Cooling Cleared)');
    console.log('   • User 2: 9123456780 (Rohan Verma - Under 24h Cooling Hold)');
    console.log('   • Payees: InfraTech Hardware (HDFC Bank), Brigade Horizon (ICICI Bank)\n');
    console.log('📋 TO SEED A LIVE SUPABASE INSTANCE:');
    console.log('   1. Configure real SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    console.log('   2. Set MOCK_MODE=false in .env');
    console.log('   3. Run: npm run seed:supabase\n');
    console.log('✅ Mock Store Seed State: READY');
    process.exit(0);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    console.log('🔄 Checking existing users in live database...');
    
    // 1. Seed Users
    for (const u of SEED_USERS) {
      const { data: existing } = await supabase
        .from('users')
        .select('id, mobile')
        .eq('mobile', u.mobile)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('users').insert(u);
        if (error) {
          console.warn(`   ⚠️ Warning seeding user ${u.mobile}: ${error.message}`);
        } else {
          console.log(`   ✅ Seeded user: ${u.full_name} (${u.mobile})`);
        }
      } else {
        console.log(`   ℹ️ User ${u.mobile} already exists.`);
      }
    }

    // 2. Seed Beneficiaries
    console.log('\n🔄 Checking existing beneficiaries...');
    for (const b of SEED_BENEFICIARIES) {
      const { data: existing } = await supabase
        .from('beneficiaries')
        .select('id')
        .eq('id', b.id)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('beneficiaries').insert(b);
        if (error) {
          console.warn(`   ⚠️ Warning seeding beneficiary ${b.account_holder_name}: ${error.message}`);
        } else {
          console.log(`   ✅ Seeded payee: ${b.account_holder_name} (${b.bank_name})`);
        }
      } else {
        console.log(`   ℹ️ Beneficiary ${b.account_holder_name} already exists.`);
      }
    }

    console.log('\n🎉 Live Supabase Seeding Complete!');
    process.exit(0);
  } catch (fatalErr) {
    console.error('❌ Seeder Error:', fatalErr.message);
    process.exit(1);
  }
}

seedSupabase();
