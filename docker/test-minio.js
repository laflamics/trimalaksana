/**
 * MinIO Test Script
 * Test connection, bucket creation, and file upload
 */

const { Client: MinioClient } = require('minio');
const fs = require('fs');
const path = require('path');

// MinIO Configuration
const minioEndpoint = (process.env.MINIO_ENDPOINT || 'minio:9000').replace(/^https?:\/\//, '');
const [minioHost, minioPort] = minioEndpoint.includes(':') 
  ? minioEndpoint.split(':') 
  : [minioEndpoint, '9000'];

console.log(`\n[TEST] MinIO Configuration:`);
console.log(`  Endpoint: ${minioHost}:${minioPort}`);
console.log(`  Access Key: ${process.env.MINIO_ACCESS_KEY || 'minioadmin'}`);
console.log(`  Secret Key: ${process.env.MINIO_SECRET_KEY || 'minioadmin123'}`);

const minioClient = new MinioClient({
  endPoint: minioHost,
  port: parseInt(minioPort) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

async function runTests() {
  try {
    // Test 1: Connection
    console.log(`\n[TEST 1] Testing MinIO Connection...`);
    const buckets = await minioClient.listBuckets();
    console.log(`✅ Connected to MinIO`);
    console.log(`   Existing buckets: ${buckets.length > 0 ? buckets.map(b => b.name).join(', ') : 'None'}`);

    // Test 2: Create buckets
    console.log(`\n[TEST 2] Creating/Verifying Buckets...`);
    const requiredBuckets = ['packaging', 'general-trading', 'trucking'];
    
    for (const bucket of requiredBuckets) {
      try {
        const exists = await minioClient.bucketExists(bucket);
        if (!exists) {
          await minioClient.makeBucket(bucket, 'us-east-1');
          console.log(`✅ Created bucket: ${bucket}`);
        } else {
          console.log(`✓ Bucket exists: ${bucket}`);
        }
      } catch (error) {
        console.error(`❌ Error with bucket ${bucket}:`, error.message);
      }
    }

    // Test 3: Upload test file
    console.log(`\n[TEST 3] Testing File Upload...`);
    const testFileName = 'test-file.txt';
    const testContent = `Test file created at ${new Date().toISOString()}\nThis is a test upload to MinIO.`;
    const testBuffer = Buffer.from(testContent);

    try {
      await minioClient.putObject(
        'packaging',
        `test/${testFileName}`,
        testBuffer,
        testBuffer.length,
        { 'Content-Type': 'text/plain' }
      );
      console.log(`✅ File uploaded: test/${testFileName}`);
    } catch (error) {
      console.error(`❌ Upload failed:`, error.message);
      throw error;
    }

    // Test 4: List files
    console.log(`\n[TEST 4] Listing Files in 'packaging' Bucket...`);
    const objectsList = [];
    const stream = minioClient.listObjects('packaging', '', true);
    
    stream.on('data', (obj) => {
      objectsList.push(obj.name);
    });

    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    console.log(`✅ Found ${objectsList.length} objects:`);
    objectsList.forEach(obj => console.log(`   - ${obj}`));

    // Test 5: Download test file
    console.log(`\n[TEST 5] Testing File Download...`);
    try {
      const dataStream = await minioClient.getObject('packaging', `test/${testFileName}`);
      let downloadedContent = '';
      
      await new Promise((resolve, reject) => {
        dataStream.on('data', (chunk) => {
          downloadedContent += chunk.toString();
        });
        dataStream.on('end', resolve);
        dataStream.on('error', reject);
      });

      console.log(`✅ File downloaded successfully`);
      console.log(`   Content: ${downloadedContent.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Download failed:`, error.message);
      throw error;
    }

    // Test 6: Get file metadata
    console.log(`\n[TEST 6] Getting File Metadata...`);
    try {
      const stat = await minioClient.statObject('packaging', `test/${testFileName}`);
      console.log(`✅ File metadata:`);
      console.log(`   Size: ${stat.size} bytes`);
      console.log(`   ETag: ${stat.etag}`);
      console.log(`   Last Modified: ${stat.lastModified}`);
    } catch (error) {
      console.error(`❌ Metadata retrieval failed:`, error.message);
      throw error;
    }

    // Test 7: Delete test file
    console.log(`\n[TEST 7] Testing File Deletion...`);
    try {
      await minioClient.removeObject('packaging', `test/${testFileName}`);
      console.log(`✅ File deleted successfully`);
    } catch (error) {
      console.error(`❌ Deletion failed:`, error.message);
      throw error;
    }

    console.log(`\n[TEST] ✅ All tests passed!\n`);
    process.exit(0);

  } catch (error) {
    console.error(`\n[TEST] ❌ Test failed:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
