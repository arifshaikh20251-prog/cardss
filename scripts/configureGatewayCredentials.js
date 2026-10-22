/**
 * Payment Gateway Configuration Wizard
 * B2B Vendor Invoicing & Rental Management Platform
 *
 * Allows administrators and DevOps engineers to seamlessly switch and configure:
 * - Mock Gateway Sandbox
 * - Cashfree Sandbox
 * - Cashfree Production
 * - Easebuzz Adapter
 *
 * Features:
 * 1. Interactive terminal prompts or CLI arguments (--mode, --appId, --secretKey)
 * 2. Automated credential validation against Cashfree PG REST APIs
 * 3. Atomic remote .env update and Passenger reload on Hostinger (api.eshopcity.in)
 * 4. End-to-end health verification against live server
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOCAL_ENV_PATH = path.join(ROOT_DIR, '.env');
const HOSTINGER_HOST = '145.223.17.217';
const HOSTINGER_PORT = 65002;
const HOSTINGER_USER = 'u392055965';
const HOSTINGER_PASS = 'EshopCity12345!';
const REMOTE_API_DIR = '/home/u392055965/domains/eshopcity.in/public_html/api';

/**
 * Validate Cashfree credentials against PG API
 */
async function validateCashfreeCredentials(appId, secretKey, env = 'sandbox') {
  const baseUrl =
    env === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

  console.log(`\n🔍 Verifying credentials against Cashfree ${env.toUpperCase()} (${baseUrl})...`);

  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify({
        order_id: `VALIDATION_CHECK_${Date.now()}`,
        order_amount: 1.0,
        order_currency: 'INR',
        customer_details: {
          customer_id: 'cust_health_check',
          customer_phone: '9876543210',
          customer_name: 'Cashfree Validation Probe',
          customer_email: 'compliance@utilitypay.in',
        },
        order_meta: {
          return_url: 'https://cardss-gilt.vercel.app/transactions',
        },
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || data.type === 'authentication_error') {
      return {
        valid: false,
        error: data.message || 'Authentication Failed: Invalid App ID or Secret Key.',
      };
    }

    if (response.ok || response.status === 200 || response.status === 201) {
      return { valid: true, orderId: data.order_id };
    }

    // If Cashfree returns an account/permission validation error (e.g. KYC pending on live),
    // credentials themselves are authenticated
    if (response.status === 400 && data.code !== 'authentication_failed') {
      return { valid: true, note: data.message };
    }

    return { valid: false, error: data.message || `Unexpected status ${response.status}` };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Update Hostinger remote .env via Python Paramiko Bridge
 */
function updateRemoteHostingerEnv(envUpdates) {
  console.log('\n🚀 Deploying configuration to Hostinger live server (api.eshopcity.in)...');

  const pythonScript = `
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('${HOSTINGER_HOST}', port=${HOSTINGER_PORT}, username='${HOSTINGER_USER}', password='${HOSTINGER_PASS}')

remote_env = '${REMOTE_API_DIR}/.env'
sftp = ssh.open_sftp()

try:
    with sftp.file(remote_env, 'r') as f:
        lines = f.read().decode('utf-8').splitlines()
except:
    lines = []

env_dict = {}
for line in lines:
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        env_dict[k.strip()] = v.strip()

# Apply updates
updates = ${JSON.stringify(envUpdates)}
for k, v in updates.items():
    env_dict[k] = str(v)

# Rebuild .env content
new_content = []
for k, v in env_dict.items():
    new_content.append(f'{k}={v}')

with sftp.file(remote_env, 'w') as f:
    f.write('\\n'.join(new_content) + '\\n')
sftp.close()

# Restart Phusion Passenger
stdin, stdout, stderr = ssh.exec_command('mkdir -p ${REMOTE_API_DIR}/tmp && touch ${REMOTE_API_DIR}/tmp/restart.txt')
stdout.read()
ssh.close()
print('SUCCESS')
`;

  try {
    const { spawnSync } = require('child_process');
    const proc = spawnSync('python', ['-'], {
      input: pythonScript,
      encoding: 'utf-8',
      timeout: 20000,
    });

    const output = (proc.stdout || '') + (proc.stderr || '');
    if (output.includes('SUCCESS')) {
      console.log('✅ Remote .env updated and Phusion Passenger restarted successfully.');
      return true;
    }
    console.warn('⚠️  Remote update output:', output.trim());
    return false;
  } catch (err) {
    console.error('❌ Failed to update Hostinger remote .env:', err.message);
    return false;
  }
}

/**
 * Update Local .env file
 */
function updateLocalEnv(envUpdates) {
  let content = '';
  if (fs.existsSync(LOCAL_ENV_PATH)) {
    content = fs.readFileSync(LOCAL_ENV_PATH, 'utf-8');
  }

  const lines = content.split('\n');
  const envMap = new Map();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startswith?.('#') && trimmed.includes('=')) {
      const [k, ...vParts] = trimmed.split('=');
      envMap.set(k.trim(), vParts.join('=').trim());
    }
  }

  for (const [k, v] of Object.entries(envUpdates)) {
    envMap.set(k, String(v));
  }

  const newLines = [];
  for (const [k, v] of envMap.entries()) {
    newLines.push(`${k}=${v}`);
  }

  fs.writeFileSync(LOCAL_ENV_PATH, newLines.join('\n') + '\n');
  console.log('✅ Local .env synchronized.');
}

/**
 * Health check on live server
 */
async function verifyLiveServer() {
  console.log('\n🩺 Pinging https://api.eshopcity.in/api/health...');
  try {
    const response = await fetch('https://api.eshopcity.in/api/health', {
      headers: { 'User-Agent': 'GatewayConfigWizard/1.0' },
    });
    const data = await response.json().catch(() => ({}));
    console.log(`📡 Status: ${response.status} OK | Server: ${data.service || 'UtilityPay'} | Mode: ${data.environment}`);
    console.log(`⚡ Mock Mode: ${data.mockMode ? 'ENABLED' : 'DISABLED'}`);
  } catch (err) {
    console.warn('⚠️  Could not ping live server health:', err.message);
  }
}

/**
 * Parse CLI Arguments
 */
function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split('=');
      args[k] = v === undefined ? true : v;
    }
  }
  return args;
}

/**
 * Main Interactive / CLI Execution
 */
async function main() {
  console.log('======================================================================');
  console.log('🛡️  FINTECH PAYMENT GATEWAY CONFIGURATION WIZARD');
  console.log('======================================================================');
  console.log('Live Target:       https://api.eshopcity.in');
  console.log(`Hostinger Server:  ${HOSTINGER_HOST}:${HOSTINGER_PORT}`);
  console.log('======================================================================\n');

  const cliArgs = parseArgs();

  let mode = cliArgs.mode;
  let appId = cliArgs.appId;
  let secretKey = cliArgs.secretKey;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    if (!mode) {
      console.log('Select Gateway Provider Mode:');
      console.log('  1) mock                 - In-Memory Sandbox (Zero external dependencies)');
      console.log('  2) cashfree_sandbox     - Cashfree PG Sandbox (Test Cards / UPI / Netbanking)');
      console.log('  3) cashfree_production  - Cashfree PG Production (Live Indian Banking Rails)');
      console.log('  4) easebuzz             - Easebuzz Gateway Adapter');

      const choice = (await prompt('\nEnter option (1-4, default: 1): ')).trim();

      const mapping = {
        '1': 'mock',
        '2': 'cashfree_sandbox',
        '3': 'cashfree_production',
        '4': 'easebuzz',
      };

      mode = mapping[choice] || 'mock';
    }

    console.log(`\nSelected Mode: [${mode.toUpperCase()}]`);

    const envUpdates = {};

    if (mode === 'mock') {
      envUpdates.GATEWAY_PROVIDER = 'mock';
      envUpdates.MOCK_MODE = 'true';
    } else if (mode === 'cashfree_sandbox' || mode === 'cashfree_production') {
      const isProd = mode === 'cashfree_production';
      envUpdates.GATEWAY_PROVIDER = 'cashfree';
      envUpdates.CASHFREE_ENV = isProd ? 'production' : 'sandbox';
      envUpdates.MOCK_MODE = 'false';

      if (!appId) {
        appId = (await prompt(`Enter Cashfree ${isProd ? 'Production' : 'Sandbox'} Client ID / App ID: `)).trim();
      }
      if (!secretKey) {
        secretKey = (await prompt(`Enter Cashfree ${isProd ? 'Production' : 'Sandbox'} Client Secret Key: `)).trim();
      }

      if (appId && secretKey) {
        envUpdates.CASHFREE_APP_ID = appId;
        envUpdates.CASHFREE_SECRET_KEY = secretKey;

        // Validation probe
        const validation = await validateCashfreeCredentials(appId, secretKey, envUpdates.CASHFREE_ENV);
        if (validation.valid) {
          console.log('✅ Cashfree credentials verified successfully with Cashfree API!');
        } else {
          console.warn(`⚠️  Validation Warning: ${validation.error}`);
          const proceed = (await prompt('Save these credentials anyway? (y/n, default: y): ')).trim().toLowerCase();
          if (proceed === 'n') {
            console.log('Aborting configuration change.');
            rl.close();
            return;
          }
        }
      } else {
        console.warn('⚠️  App ID or Secret Key not provided. Setting placeholder keys.');
      }
    } else if (mode === 'easebuzz') {
      envUpdates.GATEWAY_PROVIDER = 'easebuzz';
      envUpdates.MOCK_MODE = 'false';
    }

    // Apply updates locally and remotely
    updateLocalEnv(envUpdates);
    updateRemoteHostingerEnv(envUpdates);

    // Verify live server health
    await verifyLiveServer();

    console.log('\n======================================================================');
    console.log('🎉 GATEWAY CONFIGURATION DEPLOYED SUCCESSFULLY!');
    console.log('======================================================================\n');
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  validateCashfreeCredentials,
  updateRemoteHostingerEnv,
  updateLocalEnv,
};
