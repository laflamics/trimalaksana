/**
 * Test Image Upload to MinIO
 * Upload PNG images from public folder
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const SERVER_URL = 'http://server-tljp.tail75a421.ts.net:9999';
const PUBLIC_DIR = '/mnt/data2/backup/trimalaksanasaving1/public';

console.log(`\n[TEST] Image Upload to MinIO`);
console.log(`  Server URL: ${SERVER_URL}`);
console.log(`  Public Dir: ${PUBLIC_DIR}`);

async function uploadImage(imagePath, business = 'packaging') {
  try {
    const fileName = path.basename(imagePath);
    const fileSize = fs.statSync(imagePath).size;
    
    console.log(`\n[UPLOAD] ${fileName}`);
    console.log(`  Size: ${(fileSize / 1024).toFixed(2)} KB`);
    console.log(`  Business: ${business}`);

    const fileStream = fs.createReadStream(imagePath);
    const form = new FormData();
    form.append('file', fileStream, fileName);

    const uploadRes = await fetch(
      `${SERVER_URL}/api/blob/upload?business=${business}`,
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

    const result = await uploadRes.json();
    console.log(`✅ Upload successful`);
    console.log(`   File ID: ${result.fileId}`);
    console.log(`   MIME Type: ${result.mimeType}`);
    console.log(`   Download URL: ${result.url}`);

    return result;

  } catch (error) {
    console.error(`❌ Upload failed:`, error.message);
    throw error;
  }
}

async function testImageDownload(fileId, business = 'packaging') {
  try {
    console.log(`\n[DOWNLOAD] Testing image download...`);
    
    const downloadRes = await fetch(
      `${SERVER_URL}/api/blob/download/${business}/${fileId}`
    );

    if (!downloadRes.ok) {
      throw new Error(`Download failed: ${downloadRes.status} ${downloadRes.statusText}`);
    }

    const contentType = downloadRes.headers.get('content-type');
    const contentLength = downloadRes.headers.get('content-length');
    
    console.log(`✅ Download successful`);
    console.log(`   Content-Type: ${contentType}`);
    console.log(`   Content-Length: ${contentLength} bytes`);

    return true;

  } catch (error) {
    console.error(`❌ Download failed:`, error.message);
    throw error;
  }
}

async function runTests() {
  try {
    // Test 1: Health check
    console.log(`\n[TEST 1] Health Check...`);
    const healthRes = await fetch(`${SERVER_URL}/health`);
    const health = await healthRes.json();
    console.log(`✅ Server is running`);
    console.log(`   Database: ${health.database}`);
    console.log(`   MinIO: ${health.minio}`);

    // Test 2: Upload images
    console.log(`\n[TEST 2] Uploading Images...`);
    
    const images = [
      { path: path.join(PUBLIC_DIR, 'tljp.png'), business: 'packaging' },
      { path: path.join(PUBLIC_DIR, 'ttdPakAli.png'), business: 'packaging' },
    ];

    const uploadedFiles = [];

    for (const img of images) {
      if (fs.existsSync(img.path)) {
        const result = await uploadImage(img.path, img.business);
        uploadedFiles.push(result);
      } else {
        console.warn(`⚠️ File not found: ${img.path}`);
      }
    }

    // Test 3: Download uploaded images
    console.log(`\n[TEST 3] Downloading Uploaded Images...`);
    for (const file of uploadedFiles) {
      await testImageDownload(file.fileId, 'packaging');
    }

    // Test 4: List all files
    console.log(`\n[TEST 4] Listing All Files in Packaging Bucket...`);
    const listRes = await fetch(`${SERVER_URL}/api/blob/list/packaging`);
    const listResult = await listRes.json();
    console.log(`✅ Total files: ${listResult.count}`);
    console.log(`   Files:`);
    listResult.files.forEach(file => {
      console.log(`     - ${file.file_name} (${(file.file_size / 1024).toFixed(2)} KB)`);
    });

    console.log(`\n[TEST] ✅ All image upload tests passed!\n`);
    process.exit(0);

  } catch (error) {
    console.error(`\n[TEST] ❌ Test failed:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

runTests();
