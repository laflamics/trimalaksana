#!/usr/bin/env node

/**
 * Clear Activity Logs from Server Database
 * 
 * This script connects directly to the PostgreSQL database and deletes activity logs
 * based on various criteria (date range, user, action type, etc.)
 * 
 * Usage:
 *   node clear-activity-logs-from-server.js [options]
 * 
 * Options:
 *   --all              Delete all activity logs
 *   --days N           Delete logs older than N days
 *   --user USERNAME    Delete logs for specific user
 *   --action ACTION    Delete logs for specific action (CREATE, UPDATE, DELETE, LOGIN, etc)
 *   --module MODULE    Delete logs for specific module (packaging, gt, trucking)
 *   --dry-run          Show what would be deleted without actually deleting
 *   --confirm          Skip confirmation prompt
 */

const pg = require('pg');
const readline = require('readline');

// Configuration
const DB_CONFIG = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'trimalaksana',
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all'),
  dryRun: args.includes('--dry-run'),
  confirm: args.includes('--confirm'),
  days: null,
  user: null,
  action: null,
  module: null,
};

// Parse options with values
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--days' && args[i + 1]) {
    options.days = parseInt(args[i + 1]);
  }
  if (args[i] === '--user' && args[i + 1]) {
    options.user = args[i + 1];
  }
  if (args[i] === '--action' && args[i + 1]) {
    options.action = args[i + 1];
  }
  if (args[i] === '--module' && args[i + 1]) {
    options.module = args[i + 1];
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
  const client = new pg.Client(DB_CONFIG);

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (options.days) {
      whereConditions.push(`created_at < NOW() - INTERVAL '${options.days} days'`);
    }

    if (options.user) {
      whereConditions.push(`user_id = $${paramIndex}`);
      queryParams.push(options.user);
      paramIndex++;
    }

    if (options.action) {
      whereConditions.push(`action = $${paramIndex}`);
      queryParams.push(options.action);
      paramIndex++;
    }

    if (options.module) {
      whereConditions.push(`module = $${paramIndex}`);
      queryParams.push(options.module);
      paramIndex++;
    }

    // If no criteria specified, require --all flag
    if (whereConditions.length === 0 && !options.all) {
      console.error('❌ Error: Please specify deletion criteria or use --all flag');
      console.log('\nUsage examples:');
      console.log('  node clear-activity-logs-from-server.js --all');
      console.log('  node clear-activity-logs-from-server.js --days 7');
      console.log('  node clear-activity-logs-from-server.js --user testuser');
      console.log('  node clear-activity-logs-from-server.js --action CREATE --module packaging');
      process.exit(1);
    }

    // Build WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // First, count how many records will be deleted
    const countQuery = `SELECT COUNT(*) as count FROM activity_logs ${whereClause}`;
    const countResult = await client.query(countQuery, queryParams);
    const recordCount = countResult.rows[0].count;

    console.log('\n📊 Activity Logs to Delete:');
    console.log(`   Total records: ${recordCount}`);

    if (options.days) {
      console.log(`   Criteria: Older than ${options.days} days`);
    }
    if (options.user) {
      console.log(`   Criteria: User = ${options.user}`);
    }
    if (options.action) {
      console.log(`   Criteria: Action = ${options.action}`);
    }
    if (options.module) {
      console.log(`   Criteria: Module = ${options.module}`);
    }
    if (options.all && whereConditions.length === 0) {
      console.log(`   Criteria: ALL records`);
    }

    // Show sample records
    if (recordCount > 0) {
      const sampleQuery = `
        SELECT id, user_id, action, module, created_at 
        FROM activity_logs 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      const sampleResult = await client.query(sampleQuery, queryParams);
      console.log('\n📋 Sample records to be deleted:');
      sampleResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.user_id} - ${row.action} (${row.module}) - ${new Date(row.created_at).toLocaleString()}`);
      });
    }

    // Dry run mode
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No records were deleted');
      await client.end();
      process.exit(0);
    }

    // Ask for confirmation
    if (!options.confirm) {
      console.log('\n⚠️  WARNING: This action cannot be undone!');
      const answer = await prompt('Are you sure you want to delete these records? (yes/no): ');
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Cancelled');
        await client.end();
        process.exit(0);
      }
    }

    // Delete records
    console.log('\n🗑️  Deleting records...');
    const deleteQuery = `DELETE FROM activity_logs ${whereClause}`;
    const result = await client.query(deleteQuery, queryParams);

    console.log(`✅ Successfully deleted ${result.rowCount} activity log records`);

    // Show remaining count
    const remainingResult = await client.query('SELECT COUNT(*) as count FROM activity_logs');
    const remainingCount = remainingResult.rows[0].count;
    console.log(`📊 Remaining activity logs: ${remainingCount}`);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

main();
