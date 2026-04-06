/**
 * Test Server Upload Endpoint
 * Test /api/blob/upload endpoint via Tailscale
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const SERVER_URL = 'http://server-tljp.tail75a421.ts.net:9999';

console.log(`\n[TEST] Server Upload Endpoint Test`);
console.log(`  Server URL: ${SERVER_URL}`);
console.log(`  Endpoint: /api/blob/upload`);

async function testUpload() {
  try {
    // Test 1: Health check
    console.log(`\n[TEST 1] Health Check...`);
    const healthRes = await fetch(`${SERVER_URL}/health`);
    const health = await healthRes.json();
    console.log(`✅ Server is running`);
    console.log(`   Status: ${health.status}`);
    console.log(`   Database: ${health.database}`);
    console.log(`   MinIO: ${health.minio}`);
    console.log(`   Mode: ${health.mode}`);

    // Test 2: Upload file
    console.log(`\n[TEST 2] Testing File Upload...`);
    
    const testFileName = `test-upload-${Date.now()}.txt`;
    const testContent = `Test file from server upload endpoint\nCreated at ${new Date().toISOString()}`;
    
    const form = new FormData();
    form.append('file', Buffer.from(testContent), testFileName);

    const uploadRes = await fetch(
      `${SERVER_URL}/api/blob/upload?business=packaging`,
      {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
      }
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}\n${errorText}`);
    }

    const uploadResult = await uploadRes.json();
    console.log(`✅ File uploaded successfully`);
    console.log(`   File ID: ${uploadResult.fileId}`);
    console.log(`   File Name: ${uploadResult.fileName}`);
    console.log(`   File Size: ${uploadResult.fileSize} bytes`);
    console.log(`   MIME Type: ${uploadResult.mimeType}`);
    console.log(`   Download URL: ${uploadResult.url}`);

    // Test 3: Download file
    console.log(`\n[TEST 3] Testing File Download...`);
    const downloadRes = await fetch(`${SERVER_URL}${uploadResult.url}`);
    
    if (!downloadRes.ok) {
      throw new Error(`Download failed: ${downloadRes.status} ${downloadRes.statusText}`);
    }

    const downloadedContent = await downloadRes.text();
    console.log(`✅ File downloaded successfully`);
    console.log(`   Content: ${downloadedContent.substring(0, 50)}...`);
    console.log(`   Content-Type: ${downloadRes.headers.get('content-type')}`);

    // Test 4: List files
    console.log(`\n[TEST 4] Listing Files...`);
    const listRes = await fetch(`${SERVER_URL}/api/blob/list/packaging`);
    const listResult = await listRes.json();
    console.log(`✅ Listed files in packaging bucket`);
    console.log(`   Total files: ${listResult.count}`);
    if (listResult.files.length > 0) {
      console.log(`   Latest files:`);
      listResult.files.slice(0, 3).forEach(file => {
        console.log(`     - ${file.file_name} (${file.file_size} bytes)`);
      });
    }

    // Test 5: Get metadata
    console.log(`\n[TEST 5] Getting File Metadata...`);
    const metaRes = await fetch(`${SERVER_URL}/api/blob/metadata/${uploadResult.fileId}`);
    const metadata = await metaRes.json();
    console.log(`✅ Retrieved file metadata`);
    console.log(`   File ID: ${metadata.file_id}`);
    console.log(`   File Name: ${metadata.file_name}`);
    console.log(`   Bucket: ${metadata.bucket_name}`);
    console.log(`   Object Key: ${metadata.object_key}`);
    console.log(`   Uploaded At: ${metadata.uploaded_at}`);

    // Test 6: Delete file
    console.log(`\n[TEST 6] Testing File Deletion...`);
    const deleteRes = await fetch(
      `${SERVER_URL}/api/blob/delete/packaging/${uploadResult.fileId}`,
      { method: 'DELETE' }
    );
    
    if (!deleteRes.ok) {
      throw new Error(`Delete failed: ${deleteRes.status} ${deleteRes.statusText}`);
    }

    const deleteResult = await deleteRes.json();
    console.log(`✅ File deleted successfully`);

    console.log(`\n[TEST] ✅ All server upload tests passed!\n`);
    process.exit(0);

  } catch (error) {
    console.error(`\n[TEST] ❌ Test failed:`, error.message);
    console.error(`\n[DIAGNOSIS]`);
    console.error(`  - Check if server is running: curl http://server-tljp.tail75a421.ts.net:9999/health`);
    console.error(`  - Check if PostgreSQL is connected`);
    console.error(`  - Check if MinIO is connected`);
    console.error(`  - Check server logs: docker logs docker-storage-server-1`);
    console.error(error);
    process.exit(1);
  }
}

testUpload();
