/**
 * Hostinger Native Node.js Deployment Packager
 * Packages standalone production backend into hostinger-backend.zip
 */

const fs = require('fs');
const path = require('path');
const archiverModule = require('archiver');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_ZIP = path.join(ROOT_DIR, 'hostinger-backend.zip');

console.log('================================================================');
console.log('📦 HOSTINGER NATIVE NODE.JS BACKEND BUNDLER');
console.log('================================================================');
console.log(`Source directory:      ${ROOT_DIR}`);
console.log(`Target archive:        ${OUTPUT_ZIP}`);

// Delete existing zip if present
if (fs.existsSync(OUTPUT_ZIP)) {
  fs.unlinkSync(OUTPUT_ZIP);
  console.log('🗑️  Removed previous hostinger-backend.zip');
}

const output = fs.createWriteStream(OUTPUT_ZIP);

// Support both archiver v7 function call and archiver v8 ZipArchive class
const archive = typeof archiverModule === 'function'
  ? archiverModule('zip', { zlib: { level: 9 } })
  : new archiverModule.ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  const sizeBytes = fs.statSync(OUTPUT_ZIP).size;
  const sizeKB = (sizeBytes / 1024).toFixed(2);
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

  console.log('----------------------------------------------------------------');
  console.log(`✅ Build Complete!`);
  console.log(`📁 File:        hostinger-backend.zip`);
  console.log(`📊 Total Size:  ${sizeKB} KB (${sizeMB} MB)`);
  console.log(`📍 Path:        ${OUTPUT_ZIP}`);
  console.log('----------------------------------------------------------------');
  console.log('🚀 Hostinger hPanel Ready:');
  console.log('  1. Login to Hostinger hPanel -> Websites -> Manage');
  console.log('  2. Go to Advanced -> Node.js -> Create / Manage Application');
  console.log('  3. Upload hostinger-backend.zip into application root folder');
  console.log('  4. Extract zip, run `npm install --omit=dev`, and click "Restart"');
  console.log('================================================================');
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('⚠️  Archive warning:', err);
  } else {
    throw err;
  }
});

archive.on('error', (err) => {
  console.error('❌ Archive failed:', err);
  throw err;
});

archive.pipe(output);

// 1. Add directories
console.log('📂 Adding src/ directory...');
archive.directory(path.join(ROOT_DIR, 'src'), 'src');

if (fs.existsSync(path.join(ROOT_DIR, 'database'))) {
  console.log('📂 Adding database/ directory...');
  archive.directory(path.join(ROOT_DIR, 'database'), 'database');
}

// 2. Add individual root deployment files
const filesToInclude = [
  'package.json',
  'package-lock.json',
  '.env.example',
  '.env.production.hostinger',
  'Procfile',
  'README.md',
];

for (const file of filesToInclude) {
  const filePath = path.join(ROOT_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`📄 Adding ${file}...`);
    archive.file(filePath, { name: file });
  }
}

// Finalize archive
archive.finalize();
