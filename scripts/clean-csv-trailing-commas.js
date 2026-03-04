#!/usr/bin/env node

/**
 * Clean CSV - Remove Trailing Commas
 * 
 * Removes excessive trailing commas from CSV files
 */

const fs = require('fs');
const path = require('path');

// File to clean
const inputFile = 'scripts/masterdisaster/LAPORAN DETAIL PESANAN (SO SALES).csv';
const outputFile = 'scripts/masterdisaster/LAPORAN DETAIL PESANAN (SO SALES)_cleaned.csv';

console.log('🧹 Cleaning CSV file...\n');

try {
  // Read file
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n');
  
  console.log(`📄 Total lines: ${lines.length}`);
  
  // Clean each line
  const cleanedLines = lines.map((line, index) => {
    // Remove trailing commas
    const cleaned = line.replace(/,+$/g, '');
    
    if (index < 5) {
      console.log(`Line ${index + 1}:`);
      console.log(`  Before: "${line.substring(0, 100)}..."`);
      console.log(`  After:  "${cleaned.substring(0, 100)}..."`);
    }
    
    return cleaned;
  });
  
  // Join back
  const cleanedContent = cleanedLines.join('\n');
  
  // Write to output file
  fs.writeFileSync(outputFile, cleanedContent, 'utf-8');
  
  console.log(`\n✅ File cleaned successfully!`);
  console.log(`📁 Output: ${outputFile}`);
  
  // Show stats
  const originalCommas = (content.match(/,/g) || []).length;
  const cleanedCommas = (cleanedContent.match(/,/g) || []).length;
  const removedCommas = originalCommas - cleanedCommas;
  
  console.log(`\n📊 Statistics:`);
  console.log(`   Original commas: ${originalCommas}`);
  console.log(`   Cleaned commas:  ${cleanedCommas}`);
  console.log(`   Removed commas:  ${removedCommas}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
