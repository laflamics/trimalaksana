/**
 * MinIO Test Script via Tailscale
 * Test connection to MinIO through Tailscale network
 */

const { Client: MinioClient } = require('minio');

// Tailscale Configuration
const TAILSCALE_HOST = 'server-tljp.tail75a421.ts.net';
const MINIO_PORT = 9000;

console.log(`\n[TEST] MinIO via Tailscale Configuration:`);
console.log(`  Host: ${TAILSCALE_HOST}`);
console.log(`  Port: ${MINIO_PORT}`);
console.log(`  Access Key: minioadmin`);
console.log(`  Secret Key: minioadmin123`);

const minioClient = new MinioClient({
  endPoint: TAILSCALE_HOST,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin123',
});

async function runTests() {
  try {
    // Test 1: Connection
    console.log(`\n[TEST 1] Testing MinIO Connection via Tailscale...`);
    const buckets = await minioClient.listBuckets();
    console.log(`✅ Connected to MinIO via Tailscale`);
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
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = `Test file created at ${new Date().toISOString()}\nThis is a test upload to MinIO via Tailscale.`;
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
    objectsList.slice(0, 10).forEach(obj => console.log(`   - ${obj}`));
    if (objectsList.length > 10) {
      console.log(`   ... and ${objectsList.length - 10} more`);
    }

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
    console.error(`\n[DIAGNOSIS]`);
    console.error(`  - Check if Tailscale is connected`);
    console.error(`  - Check if server-tljp is reachable: ping server-tljp.tail75a421.ts.net`);
    console.error(`  - Check if MinIO is running on port 9000`);
    console.error(`  - Check MinIO credentials (minioadmin / minioadmin123)`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();
