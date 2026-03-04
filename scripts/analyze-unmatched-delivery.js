const fs = require('fs');
const path = require('path');

// Simple CSV parser that handles quoted fields
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

// Calculate similarity between two strings
function similarity(s1, s2) {
  if (!s1 || !s2) return 0;
  
  s1 = s1.toUpperCase();
  s2 = s2.toUpperCase();
  
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0)
        costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// Read files
const enrichedFile = path.join(__dirname, '../data/raw/Delivery_enriched.csv');
const soFile = path.join(__dirname, '../data/raw/SObaruJan2026.csv');
const customersFile = path.join(__dirname, '../data/localStorage/customers.json');

console.log('Reading enriched delivery data...');
const enrichedContent = fs.readFileSync(enrichedFile, 'utf-8');
const enrichedLines = enrichedContent.split('\n');

console.log('Reading SO data...');
const soContent = fs.readFileSync(soFile, 'utf-8');
const soLines = soContent.split('\n');

// Read customers.json for additional customer data
console.log('Reading customers data...');
let customersData = [];
try {
  const customersContent = fs.readFileSync(customersFile, 'utf-8');
  customersData = JSON.parse(customersContent);
  console.log(`✓ Loaded ${customersData.length} customers from customers.json`);
} catch (e) {
  console.log('⚠ Could not read customers.json');
}

// Build customer lookup from customers.json
const customersByName = {};
customersData.forEach(cust => {
  if (cust.nama) {
    const key = cust.nama
      .toUpperCase()
      .replace(/^PT\.?\s*/i, '')
      .replace(/^CV\.?\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!customersByName[key]) {
      customersByName[key] = {
        code: cust.kode,
        fullName: cust.nama
      };
    }
  }
});

// Get all SO numbers from SO data
const soNumbers = new Set();
for (let i = 1; i < soLines.length; i++) {
  const line = soLines[i];
  if (!line.trim()) continue;
  const cols = parseCSVLine(line);
  const soNo = cols[3] || '';
  if (soNo) soNumbers.add(soNo);
}

console.log(`\n✓ Found ${soNumbers.length} unique SO numbers in SO data\n`);

// Find unmatched deliveries
const unmatched = [];
const unmatchedSoNos = new Set();

for (let i = 1; i < enrichedLines.length; i++) {
  const line = enrichedLines[i];
  if (!line.trim()) continue;
  
  const cols = parseCSVLine(line);
  const padCode = cols[0] || '';
  const customer = cols[1] || '';
  const soNo = cols[2] || '';
  const kode = cols[5] || '';
  
  // If no pad code, it's unmatched
  if (!padCode && soNo) {
    unmatched.push({ customer, soNo, kode });
    unmatchedSoNos.add(soNo);
  }
}

console.log(`Found ${unmatched.length} unmatched delivery rows`);
console.log(`Unique unmatched SO numbers: ${unmatchedSoNos.size}\n`);

// Group by SO No
const groupedBySo = {};
unmatched.forEach(item => {
  if (!groupedBySo[item.soNo]) {
    groupedBySo[item.soNo] = { customer: item.customer, count: 0, codes: new Set() };
  }
  groupedBySo[item.soNo].count++;
  if (item.kode) groupedBySo[item.soNo].codes.add(item.kode);
});

console.log('='.repeat(80));
console.log('UNMATCHED SO NUMBERS WITH SIMILARITY ANALYSIS');
console.log('='.repeat(80));

// Analyze each unmatched SO
const soArray = Array.from(soNumbers);
Object.keys(groupedBySo).sort().forEach(unmatchedSo => {
  const info = groupedBySo[unmatchedSo];
  
  console.log(`\n📦 SO No: ${unmatchedSo}`);
  console.log(`   Customer: ${info.customer}`);
  console.log(`   Delivery rows: ${info.count}`);
  console.log(`   Product codes: ${Array.from(info.codes).join(', ') || 'none'}`);
  
  // Find similar SO numbers
  const similarities = soArray.map(soNo => ({
    soNo,
    score: similarity(unmatchedSo, soNo)
  })).filter(s => s.score > 0.5).sort((a, b) => b.score - a.score).slice(0, 3);
  
  if (similarities.length > 0) {
    console.log(`   🔍 Similar SO numbers in database:`);
    similarities.forEach(s => {
      console.log(`      - ${s.soNo} (${(s.score * 100).toFixed(1)}% match)`);
    });
  } else {
    console.log(`   ❌ No similar SO numbers found`);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\nSummary:`);
console.log(`- Total unmatched rows: ${unmatched.length}`);
console.log(`- Unique unmatched SO numbers: ${unmatchedSoNos.size}`);
console.log(`- Total SO numbers in database: ${soNumbers.size}`);
