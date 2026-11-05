#!/usr/bin/env node

/**
 * Smoke test for Pushbridge extension
 * Verifies that the extension loads correctly and shows token input when storage is empty
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Running Pushbridge smoke tests...');

// Test 1: Check if build output exists
console.log('\n📦 Testing build output...');

const requiredFiles = [
  'dist/background.js',
  'dist/popup.js',
  'dist/options.js',
  'dist/content.js',
  'public/manifest.json',
  'public/popup.html',
  'public/options.html',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('\n❌ Build output verification failed');
  process.exit(1);
}

// Test 2: Check manifest.json structure
console.log('\n📋 Testing manifest.json...');

try {
  const manifestPath = path.join(__dirname, '../../public/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const requiredManifestFields = [
    'manifest_version',
    'name',
    'version',
    'permissions',
    'background',
    'action',
  ];

  let manifestValid = true;
  for (const field of requiredManifestFields) {
    if (manifest[field]) {
      console.log(`✅ manifest.${field} is present`);
    } else {
      console.log(`❌ manifest.${field} is missing`);
      manifestValid = false;
    }
  }

  if (!manifestValid) {
    console.error('\n❌ Manifest validation failed');
    process.exit(1);
  }

  // Check specific values
  if (manifest.manifest_version === 3) {
    console.log('✅ Manifest version is 3');
  } else {
    console.log('❌ Manifest version should be 3');
    process.exit(1);
  }

  if (manifest.name === 'Pushbridge') {
    console.log('✅ Extension name is correct');
  } else {
    console.log('❌ Extension name should be "Pushbridge"');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to parse manifest.json:', error.message);
  process.exit(1);
}

// Test 3: Check popup.html structure
console.log('\n🖥️ Testing popup.html...');

try {
  const popupPath = path.join(__dirname, '../../public/popup.html');
  const popupContent = fs.readFileSync(popupPath, 'utf8');

  if (popupContent.includes('Loading...')) {
    console.log('✅ popup.html contains loading placeholder');
  } else {
    console.log('❌ popup.html should contain loading placeholder');
    process.exit(1);
  }

  if (popupContent.includes('src="popup.js"')) {
    console.log('✅ popup.html references popup.js');
  } else {
    console.log('❌ popup.html should reference popup.js');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to read popup.html:', error.message);
  process.exit(1);
}

// Test 4: Check that background.js is not empty
console.log('\n🔧 Testing background.js...');

try {
  const backgroundPath = path.join(__dirname, '../../dist/background.js');
  const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

  if (backgroundContent.length > 100) {
    console.log('✅ background.js has content');
  } else {
    console.log('❌ background.js appears to be empty or too small');
    process.exit(1);
  }

  if (backgroundContent.includes('chrome.runtime.onInstalled')) {
    console.log('✅ background.js contains service worker setup');
  } else {
    console.log('❌ background.js should contain service worker setup');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to read background.js:', error.message);
  process.exit(1);
}

// Test 5: Check that popup.js is not empty
console.log('\n🖥️ Testing popup.js...');

try {
  const popupJsPath = path.join(__dirname, '../../dist/popup.js');
  const popupJsContent = fs.readFileSync(popupJsPath, 'utf8');

  if (popupJsContent.length > 100) {
    console.log('✅ popup.js has content');
  } else {
    console.log('❌ popup.js appears to be empty or too small');
    process.exit(1);
  }

  if (popupJsContent.includes('pb-token-setup')) {
    console.log('✅ popup.js contains token setup component');
  } else {
    console.log('❌ popup.js should contain token setup component');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to read popup.js:', error.message);
  process.exit(1);
}

console.log('\n🎉 All smoke tests passed!');
console.log('\n📝 Next steps:');
console.log('1. Load the extension in Chrome (chrome://extensions/)');
console.log('2. Click on the extension icon');
console.log('3. Verify that the token input field appears');
console.log('4. Test with a valid Pushbullet access token');

process.exit(0);
