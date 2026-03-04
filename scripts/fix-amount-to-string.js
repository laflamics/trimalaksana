#!/usr/bin/env node
/**
 * Convert all amount from number to string
 */

const fs = require('fs');
const path = require('path');

const PC_FILE = path.join(__dirname, '../data/localStorage/trucking/trucking_pettycash_requests.json');

console.log('🔄 Converting all amounts to string...\n');

const data = JSON.parse(fs.readFileSync(PC_FILE, 'utf8'));
const pettyCash = data.value || [];

console.log(`📦 Found ${pettyCash.length} Petty Cash items`);

let converted = 0;

pettyCash.forEach(pc => {
  if (typeof pc.amount === 'number') {
    pc.amount = String(pc.amount);
    converted++;
    console.log(`✅ Converted ${pc.requestNo}: ${pc.amount}`);
  }
});

fs.writeFileSync(PC_FILE, JSON.stringify({ value: pettyCash }, null, 2));

console.log(`\n📊 SUMMARY:`);
console.log(`   ✅ Converted: ${converted}`);
console.log(`   ⏭️  Already string: ${pettyCash.length - converted}`);
console.log('\n✅ DONE!');
