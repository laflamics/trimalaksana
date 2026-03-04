#!/usr/bin/env node

/**
 * Test script untuk verify blob storage upload functionality
 * Usage: node scripts/test-blob-upload.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const SERVER_URL = 'https://server-tljp.tail75a421.ts.net:8888';
const TEST_FILE = path.join(__dirname, '..', 'public', 'noxtiz.png');

async function testBlobUpload() {
  console.log('🧪 Testing Blob Storage Upload...\n');
  console.log(`📍 Server URL: ${SERVER_URL}`);
  console.log(`📁 Test file: ${TEST_FILE}`);
  console.log(`📦 Business: packaging\n`);

  try {
    // Check if test file exists
    if (!fs.existsSync(TEST_FILE)) {
      console.error(`❌ Test file not found: ${TEST_FILE}`);
      process.exit(1);
    }

    const fileStream = fs.createReadStream(TEST_FILE);
    const form = new FormData();
    form.append('file', fileStream);

    console.log('📤 Uploading file...');
    const response = await fetch(
      `${SERVER_URL}/api/blob/upload?business=packaging`,
      {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
      }
    );

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    console.log(`📋 Response data:`, JSON.stringify(data, null, 2));

    if (data.success) {
      console.log(`\n✅ Upload successful!`);
      console.log(`   File ID: ${data.fileId}`);
      console.log(`   Download URL: ${data.downloadUrl}`);
      console.log(`   Size: ${(data.size / 1024).toFixed(2)} KB`);
      console.log(`   MIME type: ${data.mimeType}`);
    } else {
      console.error(`\n❌ Upload failed: ${data.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    console.error(`\n💡 Troubleshooting:`);
    console.error(`   1. Make sure server is running: docker-compose up`);
    console.error(`   2. Check Tailscale connection: tailscale status`);
    console.error(`   3. Verify server URL is correct`);
    console.error(`   4. Check firewall/network settings`);
    process.exit(1);
  }
}

testBlobUpload();
