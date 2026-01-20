const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const EXCEL_FILE = path.join(DATA_DIR, 'Data Supplier dan Customer GT.xlsx');

// Helper function to generate ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Convert Excel to JSON
async function convertExcelToJSON() {
  console.log('Converting Excel to JSON...\n');
  
  if (!await fileExists(EXCEL_FILE)) {
    console.error(`File not found: ${EXCEL_FILE}`);
    process.exit(1);
  }

  // Read Excel file
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetNames = workbook.SheetNames;
  
  console.log(`Found sheets: ${sheetNames.join(', ')}\n`);

  // Process Customer sheet
  let customers = [];
  if (sheetNames.includes('customer') || sheetNames.includes('Customer') || sheetNames.includes('CUSTOMER')) {
    const customerSheetName = sheetNames.find(name => 
      name.toLowerCase() === 'customer'
    ) || sheetNames[0]; // Fallback to first sheet
    
    console.log(`Processing Customer sheet: ${customerSheetName}`);
    const customerSheet = workbook.Sheets[customerSheetName];
    const customerRows = XLSX.utils.sheet_to_json(customerSheet);
    
    console.log(`Found ${customerRows.length} customer rows`);
    if (customerRows.length > 0) {
      console.log('First row keys:', Object.keys(customerRows[0]));
    }
    
    // Map columns (flexible mapping - support multiple column name patterns)
    customers = customerRows
      .filter(row => {
        // Skip empty rows
        const nama = (
          row['COMPANY NAME'] || row['Company Name'] || row['company name'] ||
          row['Nama'] || row['NAMA'] || row['Name'] || row['NAME'] || row['nama'] || ''
        ).toString().trim();
        return nama;
      })
      .map((row, index) => {
        // Support multiple column patterns
        const nama = (
          row['COMPANY NAME'] || row['Company Name'] || row['company name'] ||
          row['Nama'] || row['NAMA'] || row['Name'] || row['NAME'] || row['nama'] || ''
        ).toString().trim();
        
        // Use KODE from Excel if exists, otherwise generate from nama
        let kode = (
          row['KODE'] || row['Kode'] || row['CODE'] || row['Code'] || row['kode'] || ''
        ).toString().trim();
        
        if (!kode && nama) {
          // Generate code from nama (first 3-4 letters uppercase) + sequential number
          const cleanNama = nama.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const prefix = cleanNama.substring(0, Math.min(4, cleanNama.length));
          kode = `${prefix}-${String(index + 1).padStart(4, '0')}`;
        } else if (!kode) {
          kode = `CUST-${String(index + 1).padStart(4, '0')}`;
        }
        
        const kontak = (
          row['PIC NAME'] || row['PIC Name'] || row['pic name'] ||
          row['Kontak'] || row['KONTAK'] || row['Contact'] || row['CONTACT'] || row['kontak'] || 
          row['PIC'] || row['pic'] || ''
        ).toString().trim();
        const picTitle = (
          row['PIC TITLE'] || row['PIC Title'] || row['pic title'] ||
          row['PIC TITLE'] || row['Pic Title'] || ''
        ).toString().trim();
        const npwp = (row['NPWP'] || row['npwp'] || row['Npwp'] || '').toString().trim();
        const email = (
          row['EMAIL'] || row['Email'] || row['email'] || ''
        ).toString().trim();
        const telepon = (
          row['PHONE'] || row['Phone'] || row['phone'] ||
          row['Telepon'] || row['TELEPON'] || row['telepon'] || row['Telp'] || row['TELP'] || ''
        ).toString().trim();
        const alamat = (
          row['ADDRESS'] || row['Address'] || row['address'] ||
          row['Alamat'] || row['ALAMAT'] || row['alamat'] || ''
        ).toString().trim();
        const kategori = (
          row['Kategori'] || row['KATEGORI'] || row['Category'] || row['CATEGORY'] || row['kategori'] || 
          'Customer'
        ).toString().trim();
        
        return {
          id: generateId(),
          no: index + 1,
          kode: kode,
          nama: nama,
          kontak: kontak,
          picTitle: picTitle,
          npwp: npwp,
          email: email,
          telepon: telepon,
          alamat: alamat,
          kategori: kategori || 'Customer',
          created: new Date().toISOString(),
        };
      });
    
    console.log(`✓ Processed ${customers.length} customers\n`);
  }

  // Process Supplier sheet
  let suppliers = [];
  if (sheetNames.includes('supplier') || sheetNames.includes('Supplier') || sheetNames.includes('SUPPLIER')) {
    const supplierSheetName = sheetNames.find(name => 
      name.toLowerCase() === 'supplier'
    ) || (sheetNames.length > 1 ? sheetNames[1] : sheetNames[0]); // Fallback to second sheet or first
    
    console.log(`Processing Supplier sheet: ${supplierSheetName}`);
    const supplierSheet = workbook.Sheets[supplierSheetName];
    const supplierRows = XLSX.utils.sheet_to_json(supplierSheet);
    
    console.log(`Found ${supplierRows.length} supplier rows`);
    if (supplierRows.length > 0) {
      console.log('First row keys:', Object.keys(supplierRows[0]));
    }
    
    // Map columns (flexible mapping - support multiple column name patterns)
    suppliers = supplierRows
      .filter(row => {
        // Skip empty rows
        const nama = (
          row['Nama'] || row['NAMA'] || row['Name'] || row['NAME'] || row['nama'] || 
          row['COMPANY NAME'] || row['Company Name'] || row['company name'] || ''
        ).toString().trim();
        return nama;
      })
      .map((row, index) => {
        // Support multiple column patterns
        const nama = (
          row['Nama'] || row['NAMA'] || row['Name'] || row['NAME'] || row['nama'] ||
          row['COMPANY NAME'] || row['Company Name'] || row['company name'] || ''
        ).toString().trim();
        
        // Generate code from nama (first 3-4 letters uppercase) + sequential number
        let kode = '';
        if (nama) {
          // Take first 3-4 uppercase letters from nama, remove spaces and special chars
          const cleanNama = nama.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const prefix = cleanNama.substring(0, Math.min(4, cleanNama.length));
          kode = `${prefix}-${String(index + 1).padStart(4, '0')}`;
        } else {
          kode = `SUP-${String(index + 1).padStart(4, '0')}`;
        }
        const kontak = (
          row['Kontak'] || row['KONTAK'] || row['Contact'] || row['CONTACT'] || row['kontak'] || 
          row['PIC'] || row['pic'] || row['PIC NAME'] || row['PIC Name'] || row['pic name'] || ''
        ).toString().trim();
        const npwp = (row['NPWP'] || row['npwp'] || row['Npwp'] || '').toString().trim();
        const email = (
          row['Email'] || row['EMAIL'] || row['email'] || ''
        ).toString().trim();
        const telepon = (
          row['Telepon'] || row['TELEPON'] || row['telepon'] || row['Telp'] || row['TELP'] ||
          row['PHONE'] || row['Phone'] || row['phone'] || ''
        ).toString().trim();
        const alamat = (
          row['Alamat'] || row['ALAMAT'] || row['alamat'] ||
          row['ADDRESS'] || row['Address'] || row['address'] || ''
        ).toString().trim();
        const kategori = (
          row['Kategori'] || row['KATEGORI'] || row['Category'] || row['CATEGORY'] || row['kategori'] || 
          'Supplier'
        ).toString().trim();
        
        return {
          id: generateId(),
          no: index + 1,
          kode: kode,
          nama: nama,
          kontak: kontak,
          npwp: npwp,
          email: email,
          telepon: telepon,
          alamat: alamat,
          kategori: kategori || 'Supplier',
          created: new Date().toISOString(),
        };
      });
    
    console.log(`✓ Processed ${suppliers.length} suppliers\n`);
  }

  // Save to JSON files
  if (customers.length > 0) {
    const customerPath = path.join(DATA_DIR, 'gt_customers.json');
    await fs.writeFile(customerPath, JSON.stringify(customers, null, 2));
    console.log(`✓ Saved ${customers.length} customers to ${customerPath}`);
  }

  if (suppliers.length > 0) {
    const supplierPath = path.join(DATA_DIR, 'gt_suppliers.json');
    await fs.writeFile(supplierPath, JSON.stringify(suppliers, null, 2));
    console.log(`✓ Saved ${suppliers.length} suppliers to ${supplierPath}`);
  }

  console.log('\n✅ Conversion completed!');
  return { customers, suppliers };
}

// Run if called directly
if (require.main === module) {
  convertExcelToJSON()
    .then(() => {
      console.log('\n✅ All done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { convertExcelToJSON };

