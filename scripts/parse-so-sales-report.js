#!/usr/bin/env node

/**
 * Parse SO Sales Report CSV
 * 
 * Converts the weird formatted sales order report to clean JSON
 */

const fs = require('fs');
const path = require('path');

const inputFile = 'scripts/masterdisaster/LAPORAN DETAIL PESANAN (SO SALES)_cleaned.csv';
const outputFile = 'scripts/masterdisaster/so_sales_parsed.json';

console.log('📊 Parsing SO Sales Report...\n');

try {
  // Read file
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log(`📄 Total lines: ${lines.length}\n`);
  
  // Find where actual data starts
  let dataStartIndex = -1;
  let headerLine = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for header line with "No Transaksi"
    if (line.includes('No Transaksi')) {
      headerLine = line;
      dataStartIndex = i + 1;
      console.log(`✅ Found header at line ${i + 1}`);
      console.log(`   Header: ${line.substring(0, 100)}...\n`);
      break;
    }
  }
  
  if (dataStartIndex === -1) {
    throw new Error('Could not find data header');
  }
  
  // Parse header to understand column structure
  const headerParts = headerLine.split(',').map(h => h.trim());
  console.log(`📋 Header columns (${headerParts.length}):`);
  headerParts.forEach((h, i) => {
    if (h) console.log(`   ${i}: "${h}"`);
  });
  console.log();
  
  // Helper function to parse CSV line properly (handle quoted values)
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
  
  // Helper to parse number with comma separator
  function parseNumber(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/,/g, '').replace(/"/g, '')) || 0;
  }
  
  // Parse data
  const salesOrders = [];
  let currentSO = null;
  let inItemSection = false;
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCSVLine(line);
    
    // Check if this is a new SO (has transaction number with / or -)
    const transNo = parts[1];
    
    if (transNo && (transNo.includes('/') || transNo.includes('-')) && 
        !line.includes('No.') && !line.includes('Kd. Item') &&
        parts[7]) { // Must have date
      // New sales order
      if (currentSO) {
        salesOrders.push(currentSO);
      }
      
      const customerKode = parts[12] || '';
      
      currentSO = {
        soNo: transNo,
        date: parts[7] || '',
        dept: parts[9] || '',
        customerKode: customerKode,
        items: [],
        subtotal: 0,
        discount: 0,
        tax: 0,
        otherCosts: 0,
        grandTotal: 0
      };
      
      inItemSection = false;
      console.log(`📦 Found SO: ${transNo} (${currentSO.date}) - Customer: ${customerKode || 'N/A'}`);
      continue;
    }
    
    // Check if this is item header line
    if (line.includes('No.') && line.includes('Kd. Item') && line.includes('Nama Item')) {
      inItemSection = true;
      console.log(`   📋 Item section started`);
      continue;
    }
    
    // Check if this is end of items (summary line)
    if (line.includes('Pot. :') || line.includes('Total Akhir')) {
      inItemSection = false;
      
      // Parse summary values if this is the summary line
      if (currentSO && line.includes('Pot. :')) {
        // Format: Pot. :,,0.00,,,,,Pajak :,,,0.00,,,,Biaya :,,,0.00,,,,,Total Akhir :,,,,,0.00
        const summaryParts = parts;
        
        // Find indices for each value
        for (let j = 0; j < summaryParts.length; j++) {
          if (summaryParts[j] === 'Pot. :' && summaryParts[j + 2]) {
            currentSO.discount = parseNumber(summaryParts[j + 2]);
          }
          if (summaryParts[j] === 'Pajak :' && summaryParts[j + 3]) {
            currentSO.tax = parseNumber(summaryParts[j + 3]);
          }
          if (summaryParts[j] === 'Biaya :' && summaryParts[j + 3]) {
            currentSO.otherCosts = parseNumber(summaryParts[j + 3]);
          }
          if (summaryParts[j] === 'Total Akhir :' && summaryParts[j + 5]) {
            currentSO.grandTotal = parseNumber(summaryParts[j + 5]);
          }
        }
      }
      continue;
    }
    
    // Parse item line
    if (inItemSection && currentSO) {
      const itemNo = parts[1];
      const itemCode = parts[2];
      const itemName = parts[7];
      
      // Check if this is subtotal line (has numbers but no item code)
      if (!itemCode && parts[14]) {
        const subtotal = parseNumber(parts[14]);
        if (subtotal > 0) {
          currentSO.subtotal = subtotal;
        }
        continue;
      }
      
      // Must have at least item number and code
      if (itemNo && itemCode && !isNaN(parseInt(itemNo))) {
        const item = {
          no: parseInt(itemNo),
          code: itemCode,
          name: itemName || '',
          qty: parseNumber(parts[14]),
          qtyReceived: parseNumber(parts[17]),
          unit: parts[19] || '',
          price: parseNumber(parts[24]),
          discount: parseNumber(parts[25]),
          total: parseNumber(parts[29])
        };
        
        currentSO.items.push(item);
        console.log(`   ├─ Item ${itemNo}: ${itemCode} - ${(itemName || '').substring(0, 40)}...`);
      }
    }
  }
  
  // Add last SO
  if (currentSO) {
    salesOrders.push(currentSO);
  }
  
  console.log(`\n✅ Parsed ${salesOrders.length} sales orders`);
  console.log(`📦 Total items: ${salesOrders.reduce((sum, so) => sum + so.items.length, 0)}`);
  
  // Write output
  fs.writeFileSync(outputFile, JSON.stringify(salesOrders, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${outputFile}`);
  
  // Show sample
  if (salesOrders.length > 0) {
    console.log(`\n📋 Sample (first SO):`);
    console.log(JSON.stringify(salesOrders[0], null, 2).substring(0, 500) + '...');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
