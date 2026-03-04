const fs = require('fs');

// File paths
const file1 = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/master2/LAP PENJUALAN DETAIL PERIODE FEBRUARI PER 9 FEB 2026_FIXED.csv';
const file2 = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/master2/packaging_master_fixed.csv';
const outputFile = '/home/zelwar/Data2/backup/trimalaksanasaving1/scripts/master/master2/MERGED_SALES_PACKAGING.csv';

function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return { headers: [], records: [] };

  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] || '';
    });
    records.push(record);
  }

  return { headers, records };
}

function recordsToCSV(headers, records) {
  const lines = [headers.join(',')];
  records.forEach(record => {
    const values = headers.map(h => {
      const val = record[h] || '';
      return val.includes(',') ? `"${val}"` : val;
    });
    lines.push(values.join(','));
  });
  return lines.join('\n');
}

try {
  console.log('Reading file 1...');
  const content1 = fs.readFileSync(file1, 'utf-8');
  
  console.log('Reading file 2...');
  const content2 = fs.readFileSync(file2, 'utf-8');

  console.log('Parsing CSV files...');
  const parsed1 = parseCSV(content1);
  const parsed2 = parseCSV(content2);

  console.log(`File 1 records: ${parsed1.records.length}`);
  console.log(`File 2 records: ${parsed2.records.length}`);

  // Merge records
  const mergedRecords = [...parsed1.records, ...parsed2.records];
  console.log(`Total merged records: ${mergedRecords.length}`);

  // Get all unique headers
  const allHeaders = new Set([...parsed1.headers, ...parsed2.headers]);
  const headers = Array.from(allHeaders);
  console.log(`Total columns: ${headers.length}`);

  // Convert to CSV
  console.log('Converting to CSV...');
  const csvOutput = recordsToCSV(headers, mergedRecords);

  // Write output file
  fs.writeFileSync(outputFile, csvOutput, 'utf-8');
  console.log(`\n✓ Merged CSV saved to: ${outputFile}`);
  console.log(`Total rows: ${mergedRecords.length}`);

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
