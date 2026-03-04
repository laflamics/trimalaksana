#!/usr/bin/env node

/**
 * Parse Untitled 3.csv to SO JSON Format
 * 
 * This CSV has a simpler structure where each row is a line item
 * with SO info repeated per item.
 */

const fs = require('fs');
const path = require('path');

const inputFile = 'scripts/masterdisaster/Untitled 3.csv';
const customerFile = 'scripts/master/Customers_2026-02-07.csv';
const outputFile = 'scripts/masterdisaster/untitled3_so_format.json';

console.log('🔄 Parsing Untitled 3.csv to SO Format...\n');

try {
  // Load customer data
  console.log('📋 Loading customer data...');
  const customerCSV = fs.readFileSync(customerFile, 'utf-8');
  const customerLines = customerCSV.split('\n').slice(1); // Skip header
  
  const customerMap = {};
  customerLines.forEach(line => {
    if (!line.trim()) return;
    
    const parts = line.split(',');
    const kode = parts[1]?.trim();
    const nama = parts[2]?.trim();
    
    if (kode && nama) {
      customerMap[kode] = nama;
    }
  });
  
  console.log(`✅ Loaded ${Object.keys(customerMap).length} customers\n`);
  
  // Read CSV
  const csvContent = fs.readFileSync(inputFile, 'utf-8');
  const lines = csvContent.split('\n');
  
  // Skip header
  const dataLines = lines.slice(1).filter(line => line.trim());
  
  console.log(`📦 Found ${dataLines.length} data rows\n`);
  
  // Group by SO Number
  const soMap = {};
  
  dataLines.forEach((line, index) => {
    try {
      // Parse CSV line properly (handle quoted values with commas)
      const parseCsvLine = (line) => {
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
      };
      
      const parts = parseCsvLine(line);
      
      // Extract fields
      const date = parts[1]?.trim();
      const soNo = parts[2]?.trim();
      const customerKode = parts[3]?.trim();
      const customerName = parts[4]?.trim();
      const itemCode = parts[5]?.trim();
      const itemName = parts[6]?.trim();
      const qtyStr = parts[7]?.trim();
      const priceStr = parts[8]?.trim();
      const totalStr = parts[9]?.trim();
      
      if (!soNo || !itemCode) return; // Skip invalid rows
      
      // Clean numbers (remove "Rp", commas, spaces, quotes)
      const cleanNumber = (str) => {
        if (!str) return 0;
        return parseFloat(str.replace(/[Rp,"\s]/g, '')) || 0;
      };
      
      const qty = cleanNumber(qtyStr);
      const price = cleanNumber(priceStr);
      const total = cleanNumber(totalStr);
      
      // Parse date (format: 02-Jan-26 → 2026-01-02)
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date().toISOString();
        
        try {
          // Format: 02-Jan-26 or 02 Jan 2026
          const parts = dateStr.split(/[-\s]/);
          if (parts.length < 3) return new Date().toISOString();
          
          const day = parseInt(parts[0]);
          const monthStr = parts[1];
          let year = parts[2];
          
          // Convert month name to number
          const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          
          const month = months[monthStr];
          if (month === undefined) return new Date().toISOString();
          
          // Handle 2-digit year
          if (year.length === 2) {
            year = '20' + year;
          }
          
          const dateObj = new Date(parseInt(year), month, day, 10, 0, 0);
          return dateObj.toISOString();
        } catch (err) {
          return new Date().toISOString();
        }
      };
      
      const isoDate = parseDate(date);
      
      // Initialize SO if not exists
      if (!soMap[soNo]) {
        soMap[soNo] = {
          soNo: soNo,
          date: isoDate,
          customerKode: customerKode,
          customerName: customerName,
          items: []
        };
      }
      
      // Add item
      soMap[soNo].items.push({
        code: itemCode,
        name: itemName,
        qty: qty,
        price: price,
        total: total
      });
      
    } catch (err) {
      console.error(`Error parsing line ${index + 2}:`, err.message);
    }
  });
  
  console.log(`✅ Grouped into ${Object.keys(soMap).length} Sales Orders\n`);
  
  // Transform to system format
  const systemFormat = Object.values(soMap).map((so) => {
    const timestamp = new Date(so.date).getTime() || Date.now();
    const id = `so-${timestamp}-${generateRandomId()}`;
    
    // Transform items
    const items = so.items.map((item) => {
      const itemId = `item-${timestamp}-${generateRandomId()}`;
      
      return {
        id: itemId,
        productId: item.code,
        productKode: item.code,
        productName: item.name,
        qty: item.qty || 0,
        unit: 'PCS',
        price: item.price || 0,
        total: item.total || 0,
        specNote: '',
        discountPercent: 0
      };
    });
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    // Get customer name from map (fallback to CSV name)
    const customerName = customerMap[so.customerKode] || so.customerName || '';
    
    return {
      id: id,
      soNo: so.soNo,
      customer: customerName,
      customerKode: so.customerKode || '',
      paymentTerms: 'TOP',
      topDays: 30,
      status: 'OPEN',
      created: so.date,
      items: items,
      globalSpecNote: '',
      discountPercent: 0,
      subtotal: subtotal,
      tax: 0,
      otherCosts: 0,
      grandTotal: subtotal,
      confirmed: true,
      confirmedAt: so.date,
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
  console.log(`   Total Value: Rp ${systemFormat.reduce((sum, so) => sum + so.grandTotal, 0).toLocaleString('id-ID')}`);
  
  const dates = systemFormat.map(so => so.created.split('T')[0]).sort();
  console.log(`   Date Range: ${dates[0]} to ${dates[dates.length - 1]}`);
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
