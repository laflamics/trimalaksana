const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Path file Excel
const excelPath = path.join(__dirname, '../data/NEW_LIST HARGA TRUCKING.xlsx');
const outputDir = path.join(__dirname, '../data/trucking');

// Pastikan folder output ada
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✅ Created folder: ${outputDir}`);
}

// Baca file Excel
console.log(`📖 Reading Excel file: ${excelPath}`);
const workbook = XLSX.readFile(excelPath);

// Get semua sheet names
const sheetNames = workbook.SheetNames;
console.log(`📋 Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}`);

// Convert setiap sheet ke CSV
sheetNames.forEach((sheetName, index) => {
  try {
    // Get worksheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert ke CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Clean sheet name untuk filename (remove special characters)
    const cleanSheetName = sheetName
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .trim();
    
    // Output file path
    const outputPath = path.join(outputDir, `${cleanSheetName}.csv`);
    
    // Write CSV file
    fs.writeFileSync(outputPath, csv, 'utf8');
    
    console.log(`✅ [${index + 1}/${sheetNames.length}] Converted "${sheetName}" → ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error converting sheet "${sheetName}":`, error.message);
  }
});

console.log(`\n🎉 Done! All sheets converted to CSV in: ${outputDir}`);

