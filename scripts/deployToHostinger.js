/**
 * Automated Hostinger SFTP Sync & Hot Reload Script
 * B2B Vendor Invoicing & Rental Management Platform
 */

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: '145.223.17.217',
  port: 65002,
  username: 'u392055965',
  password: process.env.HOSTINGER_SSH_PASSWORD || 'EshopCity12345!',
};

const REMOTE_BASE = '/home/u392055965/domains/eshopcity.in/public_html/api';

const FILES_TO_SYNC = [
  'src/services/couponService.js',
  'src/routes/coupons.js',
  'src/app.js',
  'src/controllers/adminController.js',
  'src/controllers/authController.js',
  'src/controllers/notificationController.js',
  'src/controllers/referralController.js',
  'src/controllers/transactionController.js',
  'src/routes/admin.js',
  'src/routes/auth.js',
  'src/routes/health.js',
  'src/routes/notifications.js',
  'src/routes/referrals.js',
  'src/routes/transactions.js',
  'src/config/mockStore.js',
  'src/config/supabase.js',
  'src/services/invoiceService.js',
  'src/services/coolingWorker.js',
  'src/services/gateway/cashfreeGateway.js',
  'src/services/gateway/gatewayFactory.js',
  'src/services/gateway/mockGateway.js',
  'src/controllers/promotionController.js',
  'src/routes/promotions.js',
  'scripts/backupLedger.js',
  'scripts/auditLiveProduction.js',
];

async function deploy() {
  console.log('Connecting to Hostinger via SSH/SFTP (145.223.17.217:65002)...');
  const conn = new Client();

  conn.on('ready', () => {
    console.log('✅ SSH Connection established successfully.');

    conn.sftp((err, sftp) => {
      if (err) {
        console.error('SFTP Error:', err);
        conn.end();
        process.exit(1);
      }

      // Ensure remote directories exist
      const ensureRemoteDir = (remoteDir) => {
        return new Promise((resolve) => {
          sftp.mkdir(remoteDir, (err) => {
            resolve();
          });
        });
      };

      const uploadFile = (localRelPath) => {
        return new Promise(async (resolve, reject) => {
          const localPath = path.resolve(__dirname, '..', localRelPath);
          const remotePath = `${REMOTE_BASE}/${localRelPath.replace(/\\/g, '/')}`;
          const remoteDir = path.dirname(remotePath);

          await ensureRemoteDir(remoteDir);

          console.log(`Uploading: ${localRelPath} -> ${remotePath}`);
          sftp.fastPut(localPath, remotePath, (err) => {
            if (err) {
              console.error(`Failed to upload ${localRelPath}:`, err.message);
              reject(err);
            } else {
              console.log(`  ✓ Synced: ${localRelPath}`);
              resolve();
            }
          });
        });
      };

      (async () => {
        try {
          for (const f of FILES_TO_SYNC) {
            await uploadFile(f);
          }

          // Trigger Phusion Passenger App Restart
          conn.exec(`mkdir -p ${REMOTE_BASE}/tmp && touch ${REMOTE_BASE}/tmp/restart.txt`, (err, stream) => {
            if (err) {
              console.warn('Restart exec error:', err.message);
              conn.end();
              process.exit(1);
            } else {
              stream.on('data', () => {});
              stream.stderr.on('data', () => {});
              stream.on('close', () => {
                console.log('✅ Phusion Passenger restart signal dispatched.');
                conn.end();
                setTimeout(() => process.exit(0), 500);
              });
            }
          });
        } catch (uploadErr) {
          console.error('Deployment upload failed:', uploadErr);
          conn.end();
          process.exit(1);
        }
      })();
    });
  });

  conn.on('error', (err) => {
    console.error('SSH Connection failed:', err.message);
    process.exit(1);
  });

  conn.connect(config);
}

deploy();
