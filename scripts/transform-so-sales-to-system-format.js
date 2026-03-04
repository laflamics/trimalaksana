#!/usr/bin/env node

/**
 * Transform SO Sales Report to System Format
 * 
 * Converts parsed SO data to match the system's Sales Order format
 */

const fs = require('fs');
const path = require('path');

const inputFile = 'scripts/masterdisaster/so_sales_parsed.json';
const customerFile = 'scripts/master/Customers_2026-02-07.csv';
const outputFile = 'scripts/masterdisaster/so_sales_system_format.json';

console.log('🔄 Transforming SO Sales to System Format...\n');

try {
  // Load customer data
  console.log('📋 Loading customer data...');
  const customerCSV = fs.readFileSync(customerFile, 'utf-8');
  const customerLines = customerCSV.split('\n').slice(1); // Skip header
  
  const customerMap = {};
  customerLines.forEach(line => {
    if (!line.trim()) return;
    
    // Parse CSV line (handle quotes)
    const parts = line.split(',');
    const kode = parts[1]?.trim();
    const nama = parts[2]?.trim();
    
    if (kode && nama) {
      customerMap[kode] = nama;
    }
  });
  
  console.log(`✅ Loaded ${Object.keys(customerMap).length} customers\n`);
  
  // Read parsed data
  const parsedData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  
  console.log(`📦 Found ${parsedData.length} sales orders\n`);
  
  // Transform to system format
  const systemFormat = parsedData.map((so, index) => {
    // Generate unique ID
    const timestamp = new Date(so.date).getTime() || Date.now();
    const id = `so-${timestamp}-${generateRandomId()}`;
    
    // Parse date (format: 1/6/2026 -> 2026-01-06)
    const dateObj = parseDate(so.date);
    const isoDate = dateObj ? dateObj.toISOString() : new Date().toISOString();
    
    // Transform items
    const items = so.items.map((item, itemIndex) => {
      const itemId = `item-${timestamp}-${generateRandomId()}`;
      
      return {
        id: itemId,
        productId: item.code,
        productKode: item.code,
        productName: item.name,
        qty: item.qty || 0,
        unit: item.unit || 'PCS',
        price: item.price || 0,
        total: item.total || 0,
        specNote: '',
        discountPercent: item.discount || 0
      };
    });
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    // Get customer name from map
    const customerName = customerMap[so.customerKode] || '';
    
    return {
      id: id,
      soNo: so.soNo,
      customer: customerName,
      customerKode: so.customerKode || '',
      paymentTerms: 'TOP',
      topDays: 30,
      status: 'OPEN',
      created: isoDate,
      items: items,
      globalSpecNote: '',
      discountPercent: 0,
      subtotal: subtotal,
      tax: so.tax || 0,
      otherCosts: so.otherCosts || 0,
      grandTotal: so.grandTotal || subtotal,
      confirmed: true,
      confirmedAt: isoDate,
      confirmedBy: 'system-import',
      ppicNotified: false,
      ppicNotifiedAt: null,
      ppicNotifiedBy: null
    };
  });
  
  console.log(`✅ Transformed ${systemFormat.length} sales orders`);
  console.log(`📊 Total items: ${systemFormat.reduce((sum, so) => sum + so.items.length, 0)}`);
  
  // Write output
  fs.writeFileSync(outputFile, JSON.stringify(systemFormat, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${outputFile}`);
  
  // Show sample
  if (systemFormat.length > 0) {
    console.log(`\n📋 Sample (first SO):`);
    console.log(JSON.stringify(systemFormat[0], null, 2).substring(0, 800) + '...');
  }
  
  // Show statistics
  console.log(`\n📈 Statistics:`);
  console.log(`   Total SOs: ${systemFormat.length}`);
  console.log(`   Total Items: ${systemFormat.reduce((sum, so) => sum + so.items.length, 0)}`);
  console.log(`   Total Value: Rp ${systemFormat.reduce((sum, so) => sum + so.grandTotal, 0).toLocaleString()}`);
  console.log(`   Date Range: ${systemFormat[0]?.created.split('T')[0]} to ${systemFormat[systemFormat.length - 1]?.created.split('T')[0]}`);
  console.log(`   Customers Matched: ${systemFormat.filter(so => so.customer).length}/${systemFormat.length}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Helper functions
function generateRandomId() {
  return Math.random().toString(36).substring(2, 11);
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Format: 1/6/2026 or 1/2/2026
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const month = parseInt(parts[0]);
  const day = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  
  // Create date object
  return new Date(year, month - 1, day, 10, 0, 0);
}
