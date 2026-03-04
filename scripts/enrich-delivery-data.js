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

// Escape CSV field
function escapeCSV(field) {
  if (!field) return '';
  field = String(field);
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Read SO data
const soFile = path.join(__dirname, '../data/raw/SObaruJan2026.csv');
const deliveryFile = path.join(__dirname, '../data/raw/Delivery_transformed.csv');
const outputFile = path.join(__dirname, '../data/raw/Delivery_enriched.csv');
const customersFile = path.join(__dirname, '../data/localStorage/customers.json');

console.log('Reading SO data...');
const soContent = fs.readFileSync(soFile, 'utf-8');
const soLines = soContent.split('\n');

// Read customers.json for additional customer data
console.log('Reading customers data...');
let customersData = [];
const customersByShortName = {};
try {
  const customersContent = fs.readFileSync(customersFile, 'utf-8');
  const customersJson = JSON.parse(customersContent);
  customersData = customersJson.value || customersJson;
  
  // Build lookup by short name (skip CTM codes)
  customersData.forEach(cust => {
    if (cust.nama && cust.kode && !cust.kode.startsWith('CTM')) {
      const fullKey = cust.nama
        .toUpperCase()
        .replace(/^PT\.?\s*/i, '')
        .replace(/^CV\.?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract first word as short name (e.g., ESSILOR, INDOSAFETY)
      const firstWord = fullKey.split(' ')[0];
      
      if (firstWord && !customersByShortName[firstWord]) {
        customersByShortName[firstWord] = {
          code: cust.kode,
          fullName: cust.nama
        };
      }
      
      // Also check for common abbreviations (first 3-10 chars)
      for (let len = 3; len <= Math.min(10, firstWord.length); len++) {
        const abbrev = firstWord.substring(0, len);
        if (!customersByShortName[abbrev]) {
          customersByShortName[abbrev] = {
            code: cust.kode,
            fullName: cust.nama
          };
        }
      }
    }
  });
  
  console.log(`✓ Loaded ${Object.keys(customersByShortName).length} customer mappings from customers.json`);
} catch (e) {
  console.log('⚠ Could not read customers.json:', e.message);
}

// Normalize SO number for matching (handle roman numerals, spacing, etc)
function normalizeSoNo(soNo) {
  if (!soNo) return '';
  
  let normalized = soNo.toUpperCase().trim();
  
  // Replace roman numerals with numbers
  normalized = normalized
    .replace(/\/I\//g, '/1/')
    .replace(/\/II\//g, '/2/')
    .replace(/\/III\//g, '/3/')
    .replace(/\/IV\//g, '/4/')
    .replace(/\/V\//g, '/5/')
    .replace(/\/VI\//g, '/6/')
    .replace(/\/VII\//g, '/7/')
    .replace(/\/VIII\//g, '/8/')
    .replace(/\/IX\//g, '/9/')
    .replace(/\/X\//g, '/10/')
    .replace(/\/XI\//g, '/11/')
    .replace(/\/XII\//g, '/12/');
  
  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
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

// Build lookup maps
const soLookup = {}; // SO No -> data
const soLookupNormalized = {}; // Normalized SO No -> data
const productLookup = {}; // Product Code -> data (for fallback matching)
const customerLookup = {}; // Customer name -> data (for customer-based matching)
const soArray = []; // Array of all SO data for fuzzy matching

for (let i = 1; i < soLines.length; i++) {
  const line = soLines[i];
  if (!line.trim()) continue;
  
  const cols = parseCSVLine(line);
  const padCode = cols[0] || '';
  const productId = cols[1] || '';
  const soNo = cols[3] || '';
  const customer = cols[4] || '';
  
  if (soNo) {
    const data = { customer, padCode, originalSoNo: soNo };
    
    // Store exact match
    if (!soLookup[soNo]) {
      soLookup[soNo] = data;
      soArray.push(data);
    }
    
    // Store normalized version for fuzzy matching
    const normalizedSo = normalizeSoNo(soNo);
    if (!soLookupNormalized[normalizedSo]) {
      soLookupNormalized[normalizedSo] = data;
    }
  }
  
  // Store by product code for fallback matching
  if (productId && !productLookup[productId]) {
    productLookup[productId] = { customer, padCode, originalSoNo: soNo };
  }
  
  // Store by customer name (extract key parts)
  if (customer) {
    // Extract key parts of customer name (remove PT., CV., common words)
    const customerKey = customer
      .toUpperCase()
      .replace(/^PT\.?\s*/i, '')
      .replace(/^CV\.?\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (customerKey && !customerLookup[customerKey]) {
      customerLookup[customerKey] = { customer, padCode, originalSoNo: soNo };
    }
  }
}

console.log(`✓ Loaded ${Object.keys(soLookup).length} unique SO numbers`);
console.log(`✓ Loaded ${Object.keys(productLookup).length} unique product codes`);
console.log(`✓ Loaded ${Object.keys(customerLookup).length} unique customers`);

// Read delivery data
console.log('Reading delivery data...');
const deliveryContent = fs.readFileSync(deliveryFile, 'utf-8');
const deliveryLines = deliveryContent.split('\n');

// Process delivery data
const result = [];
result.push('Pad Code,Customer,So No,Item,QTY Delivery,Kode,Delivery date,Surat Jalan');

let enrichedCount = 0;
let notFoundCount = 0;

for (let i = 1; i < deliveryLines.length; i++) {
  const line = deliveryLines[i];
  if (!line.trim()) continue;
  
  const cols = parseCSVLine(line);
  const customer = cols[0] || '';
  const soNo = cols[1] || '';
  const item = cols[2] || '';
  const qty = cols[3] || '';
  const kode = cols[4] || '';
  const deliveryDate = cols[5] || '';
  const suratJalan = cols[6] || '';
  
  // Try to find matching SO data
  let padCode = '';
  let fullCustomer = customer;
  let matchedSoNo = '';
  let matchType = '';
  
  // First try exact SO No match
  if (soLookup[soNo]) {
    padCode = soLookup[soNo].padCode;
    fullCustomer = soLookup[soNo].customer || customer;
    matchedSoNo = soLookup[soNo].originalSoNo;
    matchType = 'exact';
    enrichedCount++;
  } 
  // Try normalized/fuzzy SO No match
  else {
    const normalizedSo = normalizeSoNo(soNo);
    if (soLookupNormalized[normalizedSo]) {
      padCode = soLookupNormalized[normalizedSo].padCode;
      fullCustomer = soLookupNormalized[normalizedSo].customer || customer;
      matchedSoNo = soLookupNormalized[normalizedSo].originalSoNo;
      matchType = 'normalized';
      enrichedCount++;
    }
    // Try product code match
    else if (kode && productLookup[kode]) {
      padCode = productLookup[kode].padCode;
      fullCustomer = productLookup[kode].customer || customer;
      matchedSoNo = productLookup[kode].originalSoNo;
      matchType = 'product';
      enrichedCount++;
    }
    // Try customer name match (with fuzzy matching and substring matching)
    else if (customer) {
      const customerKey = customer
        .toUpperCase()
        .replace(/^PT\.?\s*/i, '')
        .replace(/^CV\.?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // First try exact customer key match
      if (customerLookup[customerKey]) {
        padCode = customerLookup[customerKey].padCode;
        fullCustomer = customerLookup[customerKey].customer || customer;
        matchedSoNo = customerLookup[customerKey].originalSoNo;
        matchType = 'customer';
        enrichedCount++;
      }
      // Try substring matching (customer name starts with or contains the key)
      else {
        let bestCustomerMatch = null;
        let bestMatchType = '';
        
        for (const [custKey, custData] of Object.entries(customerLookup)) {
          // Check if customer key is at the start of the full customer name
          if (custKey.startsWith(customerKey) || customerKey.startsWith(custKey)) {
            bestCustomerMatch = custData;
            bestMatchType = 'customer-substring';
            break;
          }
          // Check if customer key is contained in the full customer name
          if (custKey.includes(customerKey) || customerKey.includes(custKey)) {
            bestCustomerMatch = custData;
            bestMatchType = 'customer-contains';
          }
        }
        
        if (bestCustomerMatch) {
          padCode = bestCustomerMatch.padCode;
          fullCustomer = bestCustomerMatch.customer || customer;
          matchedSoNo = bestCustomerMatch.originalSoNo;
          matchType = bestMatchType;
          enrichedCount++;
        }
        // Try fuzzy customer name matching
        else {
          let bestCustomerScore = 0;
          
          for (const [custKey, custData] of Object.entries(customerLookup)) {
            const score = similarity(customerKey, custKey);
            if (score > bestCustomerScore && score >= 0.7) { // 70% similarity threshold
              bestCustomerScore = score;
              bestCustomerMatch = custData;
            }
          }
          
          if (bestCustomerMatch) {
            padCode = bestCustomerMatch.padCode;
            fullCustomer = bestCustomerMatch.customer || customer;
            matchedSoNo = bestCustomerMatch.originalSoNo;
            matchType = `customer-fuzzy(${(bestCustomerScore * 100).toFixed(0)}%)`;
            enrichedCount++;
          }
          // Last resort: fuzzy SO No match with high similarity threshold (85%+)
          else if (soNo) {
            let bestMatch = null;
            let bestScore = 0;
            
            for (const soData of soArray) {
              const score = similarity(soNo, soData.originalSoNo);
              if (score > bestScore && score >= 0.85) {
                bestScore = score;
                bestMatch = soData;
              }
            }
            
            if (bestMatch) {
              padCode = bestMatch.padCode;
              fullCustomer = bestMatch.customer || customer;
              matchedSoNo = bestMatch.originalSoNo;
              matchType = `fuzzy(${(bestScore * 100).toFixed(0)}%)`;
              enrichedCount++;
            } else {
              notFoundCount++;
            }
          }
          else {
            notFoundCount++;
          }
        }
      }
    }
    else {
      notFoundCount++;
    }
  }
  
  // If still no match, try customers.json lookup
  if (!padCode && customer) {
    const firstWord = customer.toUpperCase().split(/[\s,]+/)[0];
    if (customersByShortName[firstWord]) {
      padCode = customersByShortName[firstWord].code;
      fullCustomer = customersByShortName[firstWord].fullName;
      matchType = 'customers-json';
      enrichedCount++;
      notFoundCount--; // Adjust count
    }
  }
  
  const row = [
    escapeCSV(padCode),
    escapeCSV(fullCustomer),
    escapeCSV(soNo),
    escapeCSV(item),
    escapeCSV(qty),
    escapeCSV(kode),
    deliveryDate,
    escapeCSV(suratJalan)
  ].join(',');
  
  result.push(row);
}

// Write output
fs.writeFileSync(outputFile, result.join('\n'), 'utf-8');
console.log(`✓ Enriched file saved to: ${outputFile}`);
console.log(`✓ Total rows: ${result.length - 1}`);
console.log(`✓ Enriched with SO data: ${enrichedCount}`);
console.log(`✓ Not found in SO: ${notFoundCount}`);
