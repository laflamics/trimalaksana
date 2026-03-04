#!/usr/bin/env node

/**
 * Cleanup storage data - delete specific keys
 * Usage: node scripts/cleanup-storage.js <serverUrl> <key1> <key2> ...
 * Example: node scripts/cleanup-storage.js http://100.81.50.37:9999 packaging_customers packaging_suppliers packaging_products
 */

const axios = require('axios');

async function deleteStorageKey(serverUrl, key) {
  try {
    const response = await axios.delete(
      `${serverUrl}/api/storage/${encodeURIComponent(key)}`,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    if (response.data.success) {
      console.log(`✅ Deleted: ${key}`);
      return true;
    } else {
      console.log(`⚠️  Failed to delete ${key}: ${response.data.error}`);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`⚠️  Key not found: ${key}`);
      return true;
    }
    console.error(`❌ Error deleting ${key}:`, error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Usage: node scripts/cleanup-storage.js <serverUrl> <key1> <key2> ...');
    console.error('Example: node scripts/cleanup-storage.js http://100.81.50.37:9999 packaging_customers packaging_suppliers packaging_products');
    process.exit(1);
  }

  const serverUrl = args[0];
  const keysToDelete = args.slice(1);

  console.log(`🗑️  Cleaning up storage keys...`);
  console.log(`🔗 Server: ${serverUrl}`);
  console.log(`📋 Keys to delete: ${keysToDelete.join(', ')}\n`);

  let deleted = 0;
  for (const key of keysToDelete) {
    const success = await deleteStorageKey(serverUrl, key);
    if (success) deleted++;
  }

  console.log(`\n✅ Cleanup complete: ${deleted}/${keysToDelete.length} keys deleted`);
}

main();
