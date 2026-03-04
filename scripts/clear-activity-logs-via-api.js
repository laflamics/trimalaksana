#!/usr/bin/env node

/**
 * Clear Activity Logs via API
 * 
 * This script clears activity logs by deleting the activityLogs storage key from the server
 * via the REST API endpoint.
 * 
 * Usage:
 *   node clear-activity-logs-via-api.js [options]
 * 
 * Options:
 *   --server URL       Server URL (default: http://localhost:3000)
 *   --dry-run          Show what would be deleted without actually deleting
 *   --confirm          Skip confirmation prompt
 */

const fetch = require('node-fetch');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  server: 'http://localhost:3000',
  dryRun: args.includes('--dry-run'),
  confirm: args.includes('--confirm'),
};

// Parse options with values
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--server' && args[i + 1]) {
    options.server = args[i + 1];
  }
}

// Create readline interface for prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log('🔗 Connecting to server...');
    console.log(`   Server: ${options.server}`);

    // First, get current activity logs count
    console.log('\n📊 Fetching activity logs...');
    const getResponse = await fetch(`${options.server}/api/storage/activityLogs`);
    
    if (!getResponse.ok) {
      throw new Error(`Failed to fetch activity logs: ${getResponse.statusText}`);
    }

    const getData = await getResponse.json();
    const logs = getData.data?.value || [];
    const logCount = Array.isArray(logs) ? logs.length : 0;

    console.log(`✅ Found ${logCount} activity log records`);

    if (logCount === 0) {
      console.log('ℹ️  No activity logs to delete');
      process.exit(0);
    }

    // Show sample records
    console.log('\n📋 Sample records to be deleted:');
    const sampleLogs = logs.slice(0, 5);
    sampleLogs.forEach((log, idx) => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      console.log(`   ${idx + 1}. ${log.username} - ${log.action} - ${timestamp}`);
    });

    if (logCount > 5) {
      console.log(`   ... and ${logCount - 5} more records`);
    }

    // Dry run mode
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No records were deleted');
      process.exit(0);
    }

    // Ask for confirmation
    if (!options.confirm) {
      console.log('\n⚠️  WARNING: This action cannot be undone!');
      const answer = await prompt(`Delete all ${logCount} activity log records? (yes/no): `);
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Cancelled');
        process.exit(0);
      }
    }

    // Delete records
    console.log('\n🗑️  Deleting activity logs...');
    const deleteResponse = await fetch(`${options.server}/api/storage/activityLogs`, {
      method: 'DELETE',
    });

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete activity logs: ${deleteResponse.statusText}`);
    }

    const deleteData = await deleteResponse.json();
    console.log(`✅ Successfully deleted activity logs`);

    // Verify deletion
    console.log('\n📊 Verifying deletion...');
    const verifyResponse = await fetch(`${options.server}/api/storage/activityLogs`);
    const verifyData = await verifyResponse.json();
    const remainingLogs = verifyData.data?.value || [];
    const remainingCount = Array.isArray(remainingLogs) ? remainingLogs.length : 0;

    console.log(`✅ Remaining activity logs: ${remainingCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
