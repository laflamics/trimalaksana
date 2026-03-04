#!/usr/bin/env node

/**
 * Debug packaging storage - check what's on server and what keys are being used
 */

const axios = require('axios');

const serverUrl = 'http://100.81.50.37:9999';

async function debug() {
  console.log('🔍 Debugging Packaging Storage\n');
  console.log('Server:', serverUrl);
  console.log('='.repeat(60));

  // Check all storage
  try {
    const allRes = await axios.get(`${serverUrl}/api/storage/all`);
    const allKeys = Object.keys(allRes.data.value || {});
    
    console.log('\n📦 All Storage Keys on Server:');
    allKeys.forEach(key => {
      const count = Array.isArray(allRes.data.value[key]) ? allRes.data.value[key].length : 'N/A';
      console.log(`  - ${key}: ${count} items`);
    });
  } catch (error) {
    console.error('❌ Error fetching all storage:', error.message);
  }

  // Check specific packaging keys
  const packagingKeys = [
    'products',
    'salesOrders',
    'delivery',
    'invoices',
    'purchaseOrders',
    'payments',
    'packaging/pkg_products',
    'packaging/pkg_salesOrders',
    'packaging/pkg_delivery',
    'packaging/pkg_invoices',
    'packaging/pkg_purchaseOrders',
    'packaging/pkg_payments'
  ];

  console.log('\n🔎 Checking Packaging Keys:');
  for (const key of packagingKeys) {
    try {
      const res = await axios.get(`${serverUrl}/api/storage/${encodeURIComponent(key)}`);
      const count = res.data.value?.length || 0;
      if (count > 0) {
        console.log(`  ✅ ${key}: ${count} items`);
      }
    } catch (error) {
      // Key doesn't exist, skip
    }
  }

  // Check a sample purchase order
  console.log('\n📋 Sample Purchase Order:');
  try {
    const res = await axios.get(`${serverUrl}/api/storage/purchaseOrders`);
    if (res.data.value && res.data.value.length > 0) {
      console.log(JSON.stringify(res.data.value[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Check a sample payment
  console.log('\n💳 Sample Payment:');
  try {
    const res = await axios.get(`${serverUrl}/api/storage/payments`);
    if (res.data.value && res.data.value.length > 0) {
      console.log(JSON.stringify(res.data.value[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debug();
