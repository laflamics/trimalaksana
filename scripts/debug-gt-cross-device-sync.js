/**
 * Debug GT Cross-Device Sync Issue
 * Investigate why GT sales orders from device B are not syncing to your device
 */

const fs = require('fs');
const path = require('path');

// Helper function to read JSON file safely
function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return 'No timestamp';
  const date = new Date(timestamp);
  return date.toISOString() + ' (' + date.toLocaleString() + ')';
}

// Check GT sales orders data
function analyzeGTSalesOrders() {
  console.log('🔍 ANALYZING GT SALES ORDERS SYNC ISSUE\n');
  console.log('=' .repeat(60));
  
  // Check different possible locations for GT sales orders
  const possiblePaths = [
    'data/localStorage/gt_salesOrders.json',
    'data/localStorage/general-trading/gt_salesOrders.json', 
    'data/gt.json/gt.json',
    'data/localStorage/salesOrders.json'
  ];
  
  console.log('📂 Checking all possible GT sales orders locations:\n');
  
  let totalSalesOrders = 0;
  let latestTimestamp = 0;
  let oldestTimestamp = Infinity;
  let allSalesOrders = [];
  
  possiblePaths.forEach((filePath, index) => {
    console.log(`${index + 1}. ${filePath}`);
    const data = readJsonFile(filePath);
    
    if (data) {
      let salesOrders = [];
      
      // Handle different data structures
      if (Array.isArray(data)) {
        salesOrders = data;
      } else if (data.value && Array.isArray(data.value)) {
        salesOrders = data.value;
      } else if (data.gt_salesOrders && Array.isArray(data.gt_salesOrders)) {
        salesOrders = data.gt_salesOrders;
      } else if (data.salesOrders && Array.isArray(data.salesOrders)) {
        salesOrders = data.salesOrders;
      }
      
      console.log(`   ✅ Found: ${salesOrders.length} sales orders`);
      
      if (salesOrders.length > 0) {
        totalSalesOrders += salesOrders.length;
        allSalesOrders = allSalesOrders.concat(salesOrders.map(so => ({
          ...so,
          _source: filePath
        })));
        
        // Check timestamps
        salesOrders.forEach(so => {
          const timestamp = so.timestamp || so._timestamp || new Date(so.created).getTime();
          if (timestamp > latestTimestamp) latestTimestamp = timestamp;
          if (timestamp < oldestTimestamp) oldestTimestamp = timestamp;
        });
        
        // Show sample data
        const sample = salesOrders[0];
        console.log(`   📋 Sample SO: ${sample.soNo} - ${sample.customer}`);
        console.log(`   📅 Created: ${formatTimestamp(sample.timestamp || sample._timestamp)}`);
        console.log(`   🏷️  Status: ${sample.status || 'Unknown'}`);
      }
    } else {
      console.log(`   ❌ Not found or invalid`);
    }
    console.log('');
  });
  
  console.log('=' .repeat(60));
  console.log('📊 SUMMARY:');
  console.log(`Total Sales Orders Found: ${totalSalesOrders}`);
  console.log(`Latest Update: ${formatTimestamp(latestTimestamp)}`);
  console.log(`Oldest Update: ${formatTimestamp(oldestTimestamp === Infinity ? 0 : oldestTimestamp)}`);
  
  return allSalesOrders;
}

// Check for duplicate or conflicting data
function checkForDuplicates(allSalesOrders) {
  console.log('\n🔍 CHECKING FOR DUPLICATES AND CONFLICTS:\n');
  
  const soNumbers = {};
  const soIds = {};
  
  allSalesOrders.forEach(so => {
    // Check SO numbers
    if (soNumbers[so.soNo]) {
      console.log(`⚠️  DUPLICATE SO NUMBER: ${so.soNo}`);
      console.log(`   Source 1: ${soNumbers[so.soNo]._source}`);
      console.log(`   Source 2: ${so._source}`);
      console.log(`   Timestamp 1: ${formatTimestamp(soNumbers[so.soNo].timestamp)}`);
      console.log(`   Timestamp 2: ${formatTimestamp(so.timestamp)}`);
      console.log('');
    } else {
      soNumbers[so.soNo] = so;
    }
    
    // Check IDs
    if (soIds[so.id]) {
      console.log(`⚠️  DUPLICATE SO ID: ${so.id}`);
      console.log(`   Source 1: ${soIds[so.id]._source}`);
      console.log(`   Source 2: ${so._source}`);
      console.log('');
    } else {
      soIds[so.id] = so;
    }
  });
  
  console.log(`✅ Unique SO Numbers: ${Object.keys(soNumbers).length}`);
  console.log(`✅ Unique SO IDs: ${Object.keys(soIds).length}`);
}

// Check storage configuration
function checkStorageConfig() {
  console.log('\n🔧 CHECKING STORAGE CONFIGURATION:\n');
  
  // Check if there's a storage config
  const configPaths = [
    'data/localStorage/storage_config.json',
    'data/storage_config.json'
  ];
  
  configPaths.forEach(configPath => {
    const config = readJsonFile(configPath);
    if (config) {
      console.log(`📋 Storage Config (${configPath}):`);
      console.log(`   Type: ${config.type || 'Unknown'}`);
      console.log(`   Server URL: ${config.serverUrl || 'Not set'}`);
      console.log(`   Business: ${config.business || 'Not set'}`);
      console.log('');
    }
  });
}

// Check for sync-related files
function checkSyncFiles() {
  console.log('\n🔄 CHECKING SYNC-RELATED FILES:\n');
  
  const syncPaths = [
    'data/localStorage/sync_status.json',
    'data/localStorage/pending_sync.json',
    'data/localStorage/last_sync.json'
  ];
  
  syncPaths.forEach(syncPath => {
    const syncData = readJsonFile(syncPath);
    if (syncData) {
      console.log(`📋 Sync Data (${syncPath}):`);
      console.log(JSON.stringify(syncData, null, 2));
      console.log('');
    }
  });
}

// Generate sync diagnostic report
function generateSyncReport(allSalesOrders) {
  console.log('\n📋 SYNC DIAGNOSTIC REPORT:\n');
  console.log('=' .repeat(60));
  
  // Group by creation date
  const byDate = {};
  allSalesOrders.forEach(so => {
    const date = new Date(so.created || so.timestamp).toDateString();
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(so);
  });
  
  console.log('📅 Sales Orders by Date:');
  Object.keys(byDate).sort().forEach(date => {
    console.log(`   ${date}: ${byDate[date].length} orders`);
    byDate[date].forEach(so => {
      console.log(`      - ${so.soNo} (${so.customer}) [${so._source}]`);
    });
  });
  
  console.log('\n🔍 Potential Issues:');
  
  // Check for missing recent data
  const now = Date.now();
  const recentOrders = allSalesOrders.filter(so => {
    const timestamp = so.timestamp || so._timestamp || new Date(so.created).getTime();
    return (now - timestamp) < (24 * 60 * 60 * 1000); // Last 24 hours
  });
  
  if (recentOrders.length === 0) {
    console.log('   ⚠️  No recent orders found (last 24 hours)');
  } else {
    console.log(`   ✅ Found ${recentOrders.length} recent orders`);
  }
  
  // Check for sync gaps
  const timestamps = allSalesOrders.map(so => 
    so.timestamp || so._timestamp || new Date(so.created).getTime()
  ).sort((a, b) => a - b);
  
  if (timestamps.length > 1) {
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i] - timestamps[i-1];
      if (gap > (60 * 60 * 1000)) { // More than 1 hour gap
        gaps.push({
          from: formatTimestamp(timestamps[i-1]),
          to: formatTimestamp(timestamps[i]),
          duration: Math.round(gap / (60 * 60 * 1000)) + ' hours'
        });
      }
    }
    
    if (gaps.length > 0) {
      console.log('   ⚠️  Large time gaps detected:');
      gaps.forEach(gap => {
        console.log(`      ${gap.from} → ${gap.to} (${gap.duration})`);
      });
    }
  }
}

// Main analysis function
function runAnalysis() {
  console.log('🚀 GT CROSS-DEVICE SYNC ANALYSIS\n');
  console.log('This script will help identify why GT sales orders from device B');
  console.log('are not syncing to your device.\n');
  
  try {
    const allSalesOrders = analyzeGTSalesOrders();
    checkForDuplicates(allSalesOrders);
    checkStorageConfig();
    checkSyncFiles();
    generateSyncReport(allSalesOrders);
    
    console.log('\n🎯 RECOMMENDATIONS:\n');
    
    if (allSalesOrders.length <= 1) {
      console.log('❌ ISSUE CONFIRMED: Very few sales orders found locally');
      console.log('   This suggests a sync problem between devices.');
      console.log('');
      console.log('🔧 Possible Solutions:');
      console.log('   1. Check if both devices are using the same server URL');
      console.log('   2. Verify network connectivity between devices');
      console.log('   3. Check if GT sync service is running properly');
      console.log('   4. Force a manual sync from device B');
      console.log('   5. Check server logs for sync errors');
    } else {
      console.log('✅ Multiple sales orders found - sync might be working');
      console.log('   Check if the missing orders are in a different location');
    }
    
    console.log('\n📞 Next Steps:');
    console.log('   1. Run this script on device B to compare data');
    console.log('   2. Check server sync logs');
    console.log('   3. Verify GT sync service configuration');
    console.log('   4. Test manual sync operation');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
runAnalysis();