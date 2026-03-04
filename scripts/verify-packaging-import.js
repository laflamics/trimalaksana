#!/usr/bin/env node

/**
 * Verify all packaging data is imported to server
 */

const axios = require('axios');

const serverUrl = 'http://100.81.50.37:9999';

const keys = [
  'packaging/pkg_products',
  'packaging/pkg_salesOrders',
  'packaging/pkg_delivery',
  'packaging/pkg_invoices',
  'packaging/pkg_purchaseOrders',
  'packaging/pkg_payments'
];

async function verify() {
  console.log('🔍 Verifying Packaging Data Import...\n');
  
  let totalItems = 0;
  
  for (const key of keys) {
    try {
      const response = await axios.get(`${serverUrl}/api/storage/${encodeURIComponent(key)}`);
      const count = response.data.value?.length || 0;
      totalItems += count;
      
      const status = count > 0 ? '✅' : '⚠️ ';
      console.log(`${status} ${key.padEnd(35)} : ${count} items`);
    } catch (error) {
      console.log(`❌ ${key.padEnd(35)} : Error - ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Total Items: ${totalItems}`);
  console.log(`${'='.repeat(60)}`);
}

verify();
