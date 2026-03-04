const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function convertToExcel() {
  try {
    const csvPath = 'data/raw/raw2/SObaruJan2026_WITH_DELIVERY.csv';
    const excelPath = 'data/raw/raw2/SObaruJan2026_WITH_DELIVERY.xlsx';

    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');

    // Parse CSV
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Simple CSV parsing - handle quoted fields
      const fields = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim());

      if (fields.length === headers.length) {
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = fields[idx];
        });
        rows.push(row);
      }
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('SO with Delivery');

    // Add headers
    worksheet.columns = headers.map(h => ({ header: h, key: h, width: 20 }));

    // Add rows
    rows.forEach(row => {
      worksheet.addRow(row);
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };

    // Save Excel file
    await workbook.xlsx.writeFile(excelPath);
    console.log(`✓ Converted ${csvPath} to ${excelPath}`);
    console.log(`✓ Total rows: ${rows.length}`);
    console.log(`✓ Columns: ${headers.join(', ')}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

convertToExcel();
