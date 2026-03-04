const fs = require('fs');
const path = require('path');

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headerLine = lines[0];
  const headers = [];
  let current = '';
  let inQuotes = false;

  // Parse header line
  for (let j = 0; j < headerLine.length; j++) {
    const char = headerLine[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  headers.push(current.trim().replace(/^"|"$/g, ''));

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim().replace(/^"|"$/g, ''));

    if (fields.length === headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = fields[idx];
      });
      rows.push(row);
    }
  }

  return { headers, rows };
}

function escapeCSV(value) {
  if (!value) return '';
  value = String(value);
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

try {
  // Read delivery schedule
  const deliveryPath = 'data/raw/raw2/DELIVERY_SCHEDULE_FORMATTED.csv';
  const deliveryContent = fs.readFileSync(deliveryPath, 'utf-8');
  const { rows: deliveryRows } = parseCSV(deliveryContent);

  // Build delivery map: No PO -> array of {suratJalan, qty, date}
  const deliveryMap = {};
  deliveryRows.forEach(row => {
    const noPO = row['No PO'] ? row['No PO'].trim() : '';
    const suratJalan = row['Surat Jalan'] ? row['Surat Jalan'].trim() : '';
    const deliveryQty = row['Delivery QTY'] ? row['Delivery QTY'].trim() : '';
    const deliveryDate = row['Delivery Date'] ? row['Delivery Date'].trim() : '';
    
    if (noPO && suratJalan) {
      if (!deliveryMap[noPO]) {
        deliveryMap[noPO] = [];
      }
      deliveryMap[noPO].push({
        suratJalan,
        qty: deliveryQty,
        date: deliveryDate
      });
    }
  });

  console.log(`Loaded ${Object.keys(deliveryMap).length} unique PO numbers with delivery data`);

  // Read SO/PO file
  const soPath = 'data/raw/raw2/SObaruJan2026_IMPORT_READY.csv';
  const soContent = fs.readFileSync(soPath, 'utf-8');
  const { headers: soHeaders, rows: soRows } = parseCSV(soContent);

  // Add Delivery Number, Delivery QTY, Delivery Date columns if not exists
  if (!soHeaders.includes('Delivery Number')) {
    soHeaders.push('Delivery Number');
  }
  if (!soHeaders.includes('Delivery QTY')) {
    soHeaders.push('Delivery QTY');
  }
  if (!soHeaders.includes('Delivery Date')) {
    soHeaders.push('Delivery Date');
  }

  // Match and add delivery numbers
  let matchCount = 0;
  const updatedRows = soRows.map(row => {
    const noSO = row['No So'] ? row['No So'].trim() : '';
    
    if (noSO && deliveryMap[noSO]) {
      const deliveries = deliveryMap[noSO];
      const suratJalans = deliveries.map(d => d.suratJalan).join(',');
      const qtys = deliveries.map(d => d.qty).join(',');
      const dates = deliveries.map(d => d.date).join(',');
      
      row['Delivery Number'] = suratJalans;
      row['Delivery QTY'] = qtys;
      row['Delivery Date'] = dates;
      matchCount++;
    } else {
      row['Delivery Number'] = '';
      row['Delivery QTY'] = '';
      row['Delivery Date'] = '';
    }
    
    return row;
  });

  // Write output CSV
  const outputPath = 'data/raw/raw2/SObaruJan2026_WITH_DELIVERY_FINAL.csv';
  let csvContent = soHeaders.map(h => escapeCSV(h)).join(',') + '\n';
  
  updatedRows.forEach(row => {
    const values = soHeaders.map(h => escapeCSV(row[h] || ''));
    csvContent += values.join(',') + '\n';
  });

  fs.writeFileSync(outputPath, csvContent, 'utf-8');

  console.log(`✓ Matched ${matchCount} out of ${soRows.length} SO/PO records (${(matchCount/soRows.length*100).toFixed(1)}%)`);
  console.log(`✓ Output saved to: ${outputPath}`);

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
