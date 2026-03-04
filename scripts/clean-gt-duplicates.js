#!/usr/bin/env node

/**
 * Clean GT duplicates - remove duplicate customers/products/suppliers by kode
 * Keep the one with more complete data
 * Usage: node scripts/clean-gt-duplicates.js <serverUrl>
 * Example: node scripts/clean-gt-duplicates.js http://100.81.50.37:9999
 */

const axios = require('axios');

const API_URL = process.argv[2] || 'http://100.81.50.37:9999';

async function getStorageData(key) {
  try {
    const response = await axios.get(`${API_URL}/api/storage/${encodeURIComponent(key)}`);
    return response.data.value || [];
  } catch (error) {
    console.error(`Error fetching ${key}:`, error.message);
    return [];
  }
}

async function setStorageData(key, data) {
  try {
    await axios.post(`${API_URL}/api/storage/${encodeURIComponent(key)}`, { value: data });
    console.log(`✓ Updated ${key}`);
  } catch (error) {
    console.error(`Error updating ${key}:`, error.message);
  }
}

function countFilledFields(item) {
  if (!item) return 0;
  let count = 0;
  const fields = ['kode', 'nama', 'kontak', 'npwp', 'email', 'telepon', 'alamat', 'kategori', 'picTitle'];
  fields.forEach(field => {
    const value = item[field];
    if (value && value !== '-' && value !== '' && value.trim() !== '') {
      count++;
    }
  });
  return count;
}

async function cleanDuplicates(key, matchField = 'nama') {
  console.log(`\n=== Cleaning ${key} ===`);
  const data = await getStorageData(key);
  
  if (!Array.isArray(data) || data.length === 0) {
    console.log(`No data found for ${key}`);
    return 0;
  }

  console.log(`Total records: ${data.length}`);

  // Group by nama (customer name)
  const grouped = {};
  data.forEach(item => {
    const matchValue = item[matchField];
    if (!matchValue) return;
    
    // Normalize for comparison (lowercase, trim)
    const normalizedKey = String(matchValue).toLowerCase().trim();
    
    if (!grouped[normalizedKey]) {
      grouped[normalizedKey] = [];
    }
    grouped[normalizedKey].push(item);
  });

  // Find duplicates and keep the best one
  let duplicatesFound = 0;
  const cleaned = [];
  const removed = [];

  Object.entries(grouped).forEach(([key, items]) => {
    if (items.length > 1) {
      duplicatesFound++;
      // Sort by filled fields (descending) and keep the first one
      items.sort((a, b) => countFilledFields(b) - countFilledFields(a));
      
      console.log(`  Duplicate found for ${key}:`);
      items.forEach((item, idx) => {
        const filledCount = countFilledFields(item);
        console.log(`    ${idx === 0 ? '✓ KEEP' : '✗ REMOVE'}: ${item.nama || 'N/A'} (${filledCount} fields filled)`);
        if (idx === 0) {
          cleaned.push(item);
        } else {
          removed.push(item);
        }
      });
    } else {
      cleaned.push(items[0]);
    }
  });

  console.log(`\nDuplicates found: ${duplicatesFound}`);
  console.log(`Records removed: ${removed.length}`);
  console.log(`Final count: ${cleaned.length}`);

  if (removed.length > 0) {
    // Re-number
    const renumbered = cleaned.map((item, idx) => ({
      ...item,
      no: idx + 1
    }));
    
    await setStorageData(key, renumbered);
    return removed.length;
  }

  return 0;
}

async function main() {
  console.log('Starting GT duplicate cleanup...');
  console.log(`API URL: ${API_URL}`);

  try {
    const customersRemoved = await cleanDuplicates('gt_customers', 'nama');
    const productsRemoved = await cleanDuplicates('gt_products', 'kode');
    const suppliersRemoved = await cleanDuplicates('gt_suppliers', 'kode');

    console.log('\n\n=== CLEANUP SUMMARY ===');
    console.log(`Customers removed: ${customersRemoved}`);
    console.log(`Products removed: ${productsRemoved}`);
    console.log(`Suppliers removed: ${suppliersRemoved}`);
    console.log(`Total removed: ${customersRemoved + productsRemoved + suppliersRemoved}`);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
