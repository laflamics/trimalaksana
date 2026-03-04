#!/usr/bin/env node
/**
 * Reset Petty Cash status from Close back to Open
 */

const fs = require('fs');
const path = require('path');

const PC_FILE = path.join(__dirname, '../data/localStorage/trucking/trucking_pettycash_requests.json');

console.log('🔄 Resetting Petty Cash status to Open...\n');

const data = JSON.parse(fs.readFileSync(PC_FILE, 'utf8'));
const pettyCash = data.value || [];

console.log(`📦 Found ${pettyCash.length} Petty Cash items`);

let resetCount = 0;

pettyCash.forEach(pc => {
  if (pc.status === 'Close' && pc.amount && pc.amount !== '0' && pc.amount !== 0) {
    pc.status = 'Open';
    delete pc.distributedDate;
    delete pc.distributedBy;
    delete pc.distributedAt;
    resetCount++;
    console.log(`✅ Reset ${pc.requestNo} to Open (Amount: Rp ${parseInt(pc.amount).toLocaleString('id-ID')})`);
  }
});

fs.writeFileSync(PC_FILE, JSON.stringify({ value: pettyCash }, null, 2));

// Copy to docker
const DOCKER_PC_FILE = path.join(__dirname, '../docker/data/localStorage/trucking/trucking_pettycash_requests.json');
fs.writeFileSync(DOCKER_PC_FILE, JSON.stringify({ value: pettyCash }, null, 2));

console.log(`\n📊 SUMMARY:`);
console.log(`   ✅ Reset to Open: ${resetCount}`);
console.log(`   ⏭️  Already Open: ${pettyCash.filter(pc => pc.status === 'Open').length - resetCount}`);
console.log('\n✅ DONE! Files updated in both data/ and docker/data/');
console.log('🔄 Please refresh browser and force sync from server');
