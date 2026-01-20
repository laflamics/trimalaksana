const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '../data');
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

// Helper function to generate ID
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Read Excel file
function readExcelFile(filePath, sheetName = null) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName 
      ? workbook.Sheets[sheetName] 
      : workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
  } catch (error) {
    console.error(`Error reading Excel file ${filePath}:`, error.message);
    return [];
  }
}

// Seed Karyawan (HR Staff)
async function seedKaryawan() {
  const filePath = path.join(DATA_DIR, 'Karyawan.xls');
  
  if (!await fileExists(filePath)) {
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Read as array to find header row
  const rows = XLSX.utils.sheet_to_json(sheet, { 
    header: 1,
    defval: ''
  });
  
  // Find header row (row with 'No', 'NIP', 'NAMA')
  let headerRowIndex = -1;
  let headerMap = {};
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      const rowStr = row.join('|').toLowerCase();
      if (rowStr.includes('nip') && rowStr.includes('nama') && rowStr.includes('departemen')) {
        headerRowIndex = i;
        // Map column indices
        headerMap = {
          no: row.findIndex(c => c && c.toString().toLowerCase().includes('no') && !c.toString().toLowerCase().includes('nip') && !c.toString().toLowerCase().includes('ktp') && !c.toString().toLowerCase().includes('hp')),
          nip: row.findIndex(c => c && c.toString().toLowerCase().includes('nip')),
          nama: row.findIndex(c => c && (c.toString().toLowerCase().includes('nama') && !c.toString().toLowerCase().includes('bank') && !c.toString().toLowerCase().includes('sekolah'))),
          tanggalMasuk: row.findIndex(c => c && c.toString().toLowerCase().includes('tanggal masuk')),
          departemen: row.findIndex(c => c && c.toString().toLowerCase().includes('departemen')),
          section: row.findIndex(c => c && c.toString().toLowerCase().includes('section')),
          jabatan: row.findIndex(c => c && c.toString().toLowerCase().includes('jabatan')),
          tempatLahir: row.findIndex(c => c && c.toString().toLowerCase().includes('tempat lahir')),
          tanggalLahir: row.findIndex(c => c && c.toString().toLowerCase().includes('tanggal lahir') && !c.toString().toLowerCase().includes('masuk')),
          alamat: row.findIndex(c => c && c.toString().toLowerCase().includes('alamat') && !c.toString().toLowerCase().includes('ktp')),
          alamatKtp: row.findIndex(c => c && c.toString().toLowerCase().includes('alamat ktp')),
          noHp: row.findIndex(c => c && (c.toString().toLowerCase().includes('no.hp') || c.toString().toLowerCase().includes('hp'))),
          noKtp: row.findIndex(c => c && c.toString().toLowerCase().includes('no.ktp')),
          noPaspor: row.findIndex(c => c && c.toString().toLowerCase().includes('paspor')),
          noSimA: row.findIndex(c => c && c.toString().toLowerCase().includes('sim a')),
          noSimC: row.findIndex(c => c && c.toString().toLowerCase().includes('sim c')),
          noBpjstek: row.findIndex(c => c && c.toString().toLowerCase().includes('bpjstek')),
          noBpjskes: row.findIndex(c => c && c.toString().toLowerCase().includes('bpjskes')),
          noNpwp: row.findIndex(c => c && c.toString().toLowerCase().includes('npwp')),
          noRekening: row.findIndex(c => c && c.toString().toLowerCase().includes('rekening')),
          namaBank: row.findIndex(c => c && c.toString().toLowerCase().includes('nama bank')),
          gajiPokok: row.findIndex(c => c && c.toString().toLowerCase().includes('gaji pokok')),
          premiHadir: row.findIndex(c => c && c.toString().toLowerCase().includes('premi hadir')),
          tunjTransport: row.findIndex(c => c && c.toString().toLowerCase().includes('tunj.transport')),
          tunjMakan: row.findIndex(c => c && c.toString().toLowerCase().includes('tunj.makan')),
        };
        break;
      }
    }
  }
  
  if (headerRowIndex >= 0) {
    console.log('Found header at row:', headerRowIndex + 1);
    console.log('Header mapping:', Object.keys(headerMap).filter(k => headerMap[k] >= 0));
    
    const staff = rows
      .slice(headerRowIndex + 1) // Skip header row
      .filter(row => {
        if (!Array.isArray(row)) return false;
        const nip = (row[headerMap.nip] || '').toString().trim();
        const nama = (row[headerMap.nama] || '').toString().trim();
        return nip || nama; // Must have at least NIP or NAMA
      })
      .map((row, index) => {
        const parseNumber = (val) => {
          if (!val) return 0;
          const num = parseFloat(val.toString().replace(/[^\d.-]/g, ''));
          return isNaN(num) ? 0 : num;
        };
        
        return {
          id: generateId(),
          no: index + 1,
          nip: (row[headerMap.nip] || '').toString().trim(),
          namaLengkap: (row[headerMap.nama] || '').toString().trim(),
          departemen: (row[headerMap.departemen] || '').toString().trim(),
          section: (row[headerMap.section] || '').toString().trim(),
          jabatan: (row[headerMap.jabatan] || '').toString().trim(),
          tanggalLahir: (row[headerMap.tanggalLahir] || '').toString().trim(),
          alamat: (row[headerMap.alamat] || '').toString().trim(),
          alamatKtp: (row[headerMap.alamatKtp] || '').toString().trim(),
          noHp: (row[headerMap.noHp] || '').toString().trim(),
          noKtp: (row[headerMap.noKtp] || '').toString().trim(),
          noPaspor: (row[headerMap.noPaspor] || '').toString().trim(),
          noSimA: (row[headerMap.noSimA] || '').toString().trim(),
          noSimC: (row[headerMap.noSimC] || '').toString().trim(),
          noBpjstek: (row[headerMap.noBpjstek] || '').toString().trim(),
          noBpjskes: (row[headerMap.noBpjskes] || '').toString().trim(),
          noNpwp: (row[headerMap.noNpwp] || '').toString().trim(),
          noRekening: (row[headerMap.noRekening] || '').toString().trim(),
          namaBank: (row[headerMap.namaBank] || '').toString().trim(),
          gajiPokok: parseNumber(row[headerMap.gajiPokok]),
          premiHadir: parseNumber(row[headerMap.premiHadir]),
          tunjTransport: parseNumber(row[headerMap.tunjTransport]),
          tunjMakan: parseNumber(row[headerMap.tunjMakan]),
          created: new Date().toISOString(),
        };
      })
      .filter(s => s.namaLengkap || s.nip); // Remove empty rows
    
    console.log(`Loaded ${staff.length} staff records`);
    return staff;
  } else {
    // Fallback: try default JSON parsing with __EMPTY columns
    console.log('Using fallback parsing...');
    const jsonRows = XLSX.utils.sheet_to_json(sheet);
    
    const staff = jsonRows
      .filter(row => {
        const nip = (row['__EMPTY'] || row['NIP'] || '').toString();
        const nama = (row['__EMPTY_1'] || row['NAMA'] || '').toString();
        // Skip header rows
        return nip && nip !== 'NIP' && nama && nama !== 'NAMA';
      })
      .map((row, index) => {
        const parseNumber = (val) => {
          if (!val) return 0;
          const num = parseFloat(val.toString().replace(/[^\d.-]/g, ''));
          return isNaN(num) ? 0 : num;
        };
        
        return {
          id: generateId(),
          no: index + 1,
          nip: (row['__EMPTY'] || row['NIP'] || '').toString().trim(),
          namaLengkap: (row['__EMPTY_1'] || row['NAMA'] || '').toString().trim(),
          departemen: (row['__EMPTY_3'] || row['DEPARTEMEN'] || '').toString().trim(),
          section: (row['__EMPTY_4'] || row['SECTION'] || '').toString().trim(),
          jabatan: (row['__EMPTY_5'] || row['JABATAN'] || '').toString().trim(),
          tanggalLahir: (row['__EMPTY_7'] || row['TANGGAL LAHIR'] || '').toString().trim(),
          alamat: (row['__EMPTY_8'] || row['ALAMAT'] || '').toString().trim(),
          alamatKtp: (row['__EMPTY_9'] || row['ALAMAT KTP'] || '').toString().trim(),
          noHp: (row['__EMPTY_10'] || row['NO.HP'] || '').toString().trim(),
          noKtp: (row['__EMPTY_11'] || row['NO.KTP'] || '').toString().trim(),
          noPaspor: (row['__EMPTY_12'] || row['NO.PASPOR'] || '').toString().trim(),
          noSimA: (row['__EMPTY_13'] || row['NO.SIM A'] || '').toString().trim(),
          noSimC: (row['__EMPTY_14'] || row['NO.SIM C'] || '').toString().trim(),
          noBpjstek: (row['__EMPTY_15'] || row['NO.BPJSTEK'] || '').toString().trim(),
          noBpjskes: (row['__EMPTY_16'] || row['NO.BPJSKES'] || '').toString().trim(),
          noNpwp: (row['__EMPTY_17'] || row['NO.NPWP'] || '').toString().trim(),
          noRekening: (row['__EMPTY_18'] || row['NO.REKENING'] || '').toString().trim(),
          namaBank: (row['__EMPTY_19'] || row['NAMA BANK'] || '').toString().trim(),
          gajiPokok: parseNumber(row['__EMPTY_20'] || row['GAJI POKOK']),
          premiHadir: parseNumber(row['__EMPTY_21'] || row['PREMI HADIR']),
          tunjTransport: parseNumber(row['__EMPTY_22'] || row['TUNJ.TRANSPORT']),
          tunjMakan: parseNumber(row['__EMPTY_23'] || row['TUNJ.MAKAN']),
          created: new Date().toISOString(),
        };
      })
      .filter(s => s.namaLengkap || s.nip);
    
    console.log(`Loaded ${staff.length} staff records`);
    return staff;
  }
}

// Seed Customers
async function seedCustomers() {
  console.log('Seeding Customers...');
  const filePath = path.join(DATA_DIR, 'Master_Customer_Supplier.xls');
  
  if (!await fileExists(filePath)) {
    console.log('Master_Customer_Supplier.xls not found, skipping...');
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  let customers = [];
  
  // Try to find customer sheet
  const sheetNames = workbook.SheetNames;
  const customerSheet = sheetNames.find(name => 
    name.toLowerCase().includes('customer') || 
    name.toLowerCase().includes('pelanggan')
  ) || sheetNames[0];

  // Read with header row option to skip first row if it's a header
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[customerSheet], { 
    header: 1, // Get raw data
    defval: '' // Default value for empty cells
  });
  
  // Find header row (row with 'NO', 'Kode', 'Nama', etc.)
  let headerRowIndex = -1;
  let headerMap = {};
  
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      const rowStr = row.join('|').toLowerCase();
      if (rowStr.includes('kode') && rowStr.includes('nama')) {
        headerRowIndex = i;
        // Map column indices to field names
        headerMap = {
          no: row.findIndex(c => c && c.toString().toLowerCase().includes('no')),
          kode: row.findIndex(c => c && (c.toString().toLowerCase().includes('kode') || c.toString().toLowerCase().includes('code') || c.toString().toLowerCase().includes('id'))),
          nama: row.findIndex(c => c && (c.toString().toLowerCase().includes('nama') || c.toString().toLowerCase().includes('name') || c.toString().toLowerCase().includes('company'))),
          kontak: row.findIndex(c => c && (c.toString().toLowerCase().includes('kontak') || c.toString().toLowerCase().includes('contact') || c.toString().toLowerCase().includes('pic'))),
          npwp: row.findIndex(c => c && c.toString().toLowerCase().includes('npwp')),
          email: row.findIndex(c => c && c.toString().toLowerCase().includes('email')),
          telepon: row.findIndex(c => c && (c.toString().toLowerCase().includes('telepon') || c.toString().toLowerCase().includes('phone') || c.toString().toLowerCase().includes('telp'))),
          alamat: row.findIndex(c => c && (c.toString().toLowerCase().includes('alamat') || c.toString().toLowerCase().includes('address'))),
          kategori: row.findIndex(c => c && (c.toString().toLowerCase().includes('kategori') || c.toString().toLowerCase().includes('category'))),
        };
        break;
      }
    }
  }
  
  // If header found, use it; otherwise try default mapping
  if (headerRowIndex >= 0) {
    console.log('Found header at row:', headerRowIndex + 1);
    console.log('Header mapping:', headerMap);
    
    customers = rows
      .slice(headerRowIndex + 1) // Skip header row
      .filter(row => {
        if (!Array.isArray(row)) return false;
        const kode = row[headerMap.kode] || '';
        const nama = row[headerMap.nama] || '';
        return kode || nama;
      })
      .map((row, index) => {
        const kode = (row[headerMap.kode] || '').toString().trim();
        const nama = (row[headerMap.nama] || '').toString().trim();
        const kontak = (row[headerMap.kontak] || '').toString().trim();
        const npwp = (row[headerMap.npwp] || '').toString().trim();
        const email = (row[headerMap.email] || '').toString().trim();
        const telepon = (row[headerMap.telepon] || '').toString().trim();
        const alamat = (row[headerMap.alamat] || '').toString().trim();
        const kategori = (row[headerMap.kategori] || '').toString().trim();
        
        // Skip if looks like supplier (check kategori, nama, or kode)
        const kategoriLower = kategori.toLowerCase();
        const namaLower = nama.toLowerCase();
        const kodeLower = kode.toLowerCase();
        
        if (kategoriLower.includes('supplier') || 
            namaLower.includes('supplier') || 
            kodeLower.includes('supplier') || 
            kodeLower.includes('sup-') ||
            kodeLower.startsWith('spl-')) {
          return null;
        }
        
        return {
          id: generateId(),
          no: index + 1,
          kode: kode || `CUST-${index + 1}`,
          nama: nama,
          kontak: kontak,
          npwp: npwp,
          email: email,
          telepon: telepon,
          alamat: alamat,
          kategori: kategori,
          created: new Date().toISOString(),
        };
      })
      .filter(c => c && (c.nama || c.kode)); // Remove null and empty rows
  } else {
    // Fallback: try default JSON parsing
    const jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[customerSheet]);
    console.log('Using default JSON parsing, sample row:', jsonRows[0]);
    
    customers = jsonRows
      .filter(row => {
        const kode = (row['__EMPTY'] || row['Kode'] || row['KODE'] || '').toString();
        const nama = (row['__EMPTY_1'] || row['Nama'] || row['NAMA'] || '').toString();
        const kategori = (row['__EMPTY_7'] || row['Kategori'] || row['KATEGORI'] || '').toString().toLowerCase();
        
        // Skip header row
        if (kode === 'Kode' || nama === 'Nama') return false;
        
        // Skip if kategori is supplier
        if (kategori.includes('supplier')) return false;
        
        return kode && nama;
      })
      .map((row, index) => {
        const kode = (row['__EMPTY'] || row['Kode'] || row['KODE'] || `CUST-${index + 1}`).toString().trim();
        const nama = (row['__EMPTY_1'] || row['Nama'] || row['NAMA'] || '').toString().trim();
        const kategori = (row['__EMPTY_7'] || row['Kategori'] || row['KATEGORI'] || '').toString().trim();
        const kodeLower = kode.toLowerCase();
        const namaLower = nama.toLowerCase();
        const kategoriLower = kategori.toLowerCase();
        
        // Skip if looks like supplier
        if (kategoriLower.includes('supplier') || 
            namaLower.includes('supplier') || 
            kodeLower.includes('supplier') || 
            kodeLower.includes('sup-') ||
            kodeLower.startsWith('spl-')) {
          return null;
        }
        
        return {
          id: generateId(),
          no: index + 1,
          kode: kode,
          nama: nama,
          kontak: (row['__EMPTY_2'] || row['Kontak'] || row['KONTAK'] || '').toString().trim(),
          npwp: (row['__EMPTY_3'] || row['NPWP'] || '').toString().trim(),
          email: (row['__EMPTY_4'] || row['Email'] || row['EMAIL'] || '').toString().trim(),
          telepon: (row['__EMPTY_5'] || row['Telepon'] || row['TELEPON'] || '').toString().trim(),
          alamat: (row['__EMPTY_6'] || row['Alamat'] || row['ALAMAT'] || '').toString().trim(),
          kategori: kategori,
          created: new Date().toISOString(),
        };
      })
      .filter(c => c && (c.nama || c.kode)); // Remove null and empty rows
  }

  console.log(`Loaded ${customers.length} customer records`);
  return customers;
}

// Seed Suppliers
async function seedSuppliers() {
  console.log('Seeding Suppliers...');
  const filePath = path.join(DATA_DIR, 'Master_Customer_Supplier.xls');
  
  if (!await fileExists(filePath)) {
    console.log('Master_Customer_Supplier.xls not found, skipping...');
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  let suppliers = [];
  
  // Try to find supplier sheet
  const sheetNames = workbook.SheetNames;
  const supplierSheet = sheetNames.find(name => 
    name.toLowerCase().includes('supplier') || 
    name.toLowerCase().includes('vendor')
  ) || sheetNames[sheetNames.length - 1];

  // Read with header row option
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[supplierSheet], { 
    header: 1,
    defval: ''
  });
  
  // Find header row
  let headerRowIndex = -1;
  let headerMap = {};
  
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      const rowStr = row.join('|').toLowerCase();
      if (rowStr.includes('kode') && rowStr.includes('nama')) {
        headerRowIndex = i;
        headerMap = {
          no: row.findIndex(c => c && c.toString().toLowerCase().includes('no')),
          kode: row.findIndex(c => c && (c.toString().toLowerCase().includes('kode') || c.toString().toLowerCase().includes('code') || c.toString().toLowerCase().includes('id'))),
          nama: row.findIndex(c => c && (c.toString().toLowerCase().includes('nama') || c.toString().toLowerCase().includes('name') || c.toString().toLowerCase().includes('company'))),
          kontak: row.findIndex(c => c && (c.toString().toLowerCase().includes('kontak') || c.toString().toLowerCase().includes('contact') || c.toString().toLowerCase().includes('pic'))),
          npwp: row.findIndex(c => c && c.toString().toLowerCase().includes('npwp')),
          email: row.findIndex(c => c && c.toString().toLowerCase().includes('email')),
          telepon: row.findIndex(c => c && (c.toString().toLowerCase().includes('telepon') || c.toString().toLowerCase().includes('phone') || c.toString().toLowerCase().includes('telp'))),
          alamat: row.findIndex(c => c && (c.toString().toLowerCase().includes('alamat') || c.toString().toLowerCase().includes('address'))),
          kategori: row.findIndex(c => c && (c.toString().toLowerCase().includes('kategori') || c.toString().toLowerCase().includes('category'))),
        };
        break;
      }
    }
  }
  
  if (headerRowIndex >= 0) {
    console.log('Found supplier header at row:', headerRowIndex + 1);
    
    suppliers = rows
      .slice(headerRowIndex + 1)
      .filter(row => {
        if (!Array.isArray(row)) return false;
        const kode = row[headerMap.kode] || '';
        const nama = row[headerMap.nama] || '';
        return kode || nama;
      })
      .map((row, index) => {
        const kode = (row[headerMap.kode] || '').toString().trim();
        const nama = (row[headerMap.nama] || '').toString().trim();
        const kontak = (row[headerMap.kontak] || '').toString().trim();
        const npwp = (row[headerMap.npwp] || '').toString().trim();
        const email = (row[headerMap.email] || '').toString().trim();
        const telepon = (row[headerMap.telepon] || '').toString().trim();
        const alamat = (row[headerMap.alamat] || '').toString().trim();
        const kategori = (row[headerMap.kategori] || '').toString().trim();
        
        const kategoriLower = kategori.toLowerCase();
        const namaLower = nama.toLowerCase();
        const kodeLower = kode.toLowerCase();
        
        // Only include if looks like supplier (check kategori, nama, or kode)
        if (kategoriLower.includes('supplier') || 
            namaLower.includes('supplier') || 
            kodeLower.includes('supplier') || 
            kodeLower.includes('sup-') ||
            kodeLower.startsWith('spl-')) {
          return {
            id: generateId(),
            no: index + 1,
            kode: kode || `SUP-${index + 1}`,
            nama: nama,
            kontak: kontak,
            npwp: npwp,
            email: email,
            telepon: telepon,
            alamat: alamat,
            kategori: kategori,
            created: new Date().toISOString(),
          };
        }
        return null;
      })
      .filter(s => s && (s.nama || s.kode));
  } else {
    // Fallback
    const jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[supplierSheet]);
    
    suppliers = jsonRows
      .filter(row => {
        const kode = (row['__EMPTY'] || row['Kode'] || row['KODE'] || '').toString();
        const nama = (row['__EMPTY_1'] || row['Nama'] || row['NAMA'] || '').toString();
        const kategori = (row['__EMPTY_7'] || row['Kategori'] || row['KATEGORI'] || '').toString().toLowerCase();
        
        // Skip header row
        if (kode === 'Kode' || nama === 'Nama') return false;
        
        // Only include if kategori is supplier
        if (!kategori.includes('supplier')) return false;
        
        return kode && nama;
      })
      .map((row, index) => {
        const kode = (row['__EMPTY'] || row['Kode'] || row['KODE'] || `SUP-${index + 1}`).toString().trim();
        const nama = (row['__EMPTY_1'] || row['Nama'] || row['NAMA'] || '').toString().trim();
        const kategori = (row['__EMPTY_7'] || row['Kategori'] || row['KATEGORI'] || '').toString().trim();
        const kodeLower = kode.toLowerCase();
        const namaLower = nama.toLowerCase();
        const kategoriLower = kategori.toLowerCase();
        
        // Only include if looks like supplier
        if (kategoriLower.includes('supplier') || 
            namaLower.includes('supplier') || 
            kodeLower.includes('supplier') || 
            kodeLower.includes('sup-') ||
            kodeLower.startsWith('spl-')) {
          return {
            id: generateId(),
            no: index + 1,
            kode: kode,
            nama: nama,
            kontak: (row['__EMPTY_2'] || row['Kontak'] || row['KONTAK'] || '').toString().trim(),
            npwp: (row['__EMPTY_3'] || row['NPWP'] || '').toString().trim(),
            email: (row['__EMPTY_4'] || row['Email'] || row['EMAIL'] || '').toString().trim(),
            telepon: (row['__EMPTY_5'] || row['Telepon'] || row['TELEPON'] || '').toString().trim(),
            alamat: (row['__EMPTY_6'] || row['Alamat'] || row['ALAMAT'] || '').toString().trim(),
            kategori: kategori,
            created: new Date().toISOString(),
          };
        }
        return null;
      })
      .filter(s => s && (s.nama || s.kode)); // Remove null and empty rows
  }

  console.log(`Loaded ${suppliers.length} supplier records`);
  return suppliers;
}

// Get max ID number from existing products/materials
function getMaxIdNumber(existingItems, prefix) {
  if (!existingItems || existingItems.length === 0) return 0;
  const numbers = existingItems
    .map(item => {
      const kode = (item.kode || item.product_id || item.material_id || '').toString().trim();
      // Match pattern like KRT00226, KRT00956, etc.
      const match = kode.match(new RegExp(`^${prefix}(\\d+)`, 'i'));
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}

// Generate next ID based on prefix
function generateNextId(existingItems, prefix, startNumber = 1) {
  const maxNum = getMaxIdNumber(existingItems, prefix);
  const nextNum = maxNum + 1;
  // Keep same padding as existing IDs (usually 5 digits based on KRT00226 format)
  return `${prefix}${String(nextNum).padStart(5, '0')}`;
}

// Helper to parse numeric values that may contain thousand separators or commas
function parseNumericValue(value, { allowNegative = false } = {}) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return allowNegative ? value : Math.max(0, value);
  }

  if (!value && value !== 0) return 0;

  const str = value.toString().trim();
  if (!str) return 0;

  // Replace all non numeric characters except decimal separators, minus sign
  // First, normalize decimal separator: if there is a comma and no dot, treat comma as decimal
  let normalized = str.replace(/\s+/g, '');

  // Remove any character that is not digit, comma, dot, or minus
  normalized = normalized.replace(/[^0-9,.\-]/g, '');

  // If both comma and dot exist, assume comma is thousand separator -> remove commas
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/,/g, '');
  } else if (normalized.includes(',') && !normalized.includes('.')) {
    // If only comma exists, treat it as decimal separator
    normalized = normalized.replace(/,/g, '.');
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return 0;
  return allowNegative ? parsed : Math.max(0, parsed);
}

// Convert Excel serial date or keep original string
function formatExcelDate(value) {
  if (!value && value !== 0) return '';
  if (typeof value === 'number') {
    // Excel serial date starts at 1899-12-30
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return value.toString();
}

// Seed Sales Items from "Daftar Item Sales" sheet
async function seedSalesItems() {
  console.log('Seeding Sales Items from Daftar Item Sales sheet...');
  const filePath = path.join(DATA_DIR, 'merged_data_all_final.xlsx');
  
  if (!await fileExists(filePath)) {
    console.log('merged_data_all_final.xlsx not found, skipping...');
    return [];
  }

  // Load existing products to check duplicates
  let existingProducts = [];
  try {
    const existingData = await loadExistingData('products');
    existingProducts = Array.isArray(existingData) ? existingData : [];
    console.log(`Found ${existingProducts.length} existing products`);
  } catch (error) {
    console.log('No existing products found, starting fresh');
  }

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const salesSheetName = sheetNames.find(name => 
    name.toLowerCase().includes('daftar item sales') || 
    name.toLowerCase().includes('sales item')
  );
  
  if (!salesSheetName) {
    console.log('Daftar Item Sales sheet not found, skipping...');
    return [];
  }

  console.log(`Using sheet: ${salesSheetName}`);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[salesSheetName], { defval: '' });
  
  // Track used product_ids/kode to prevent duplicates
  const usedProductIds = new Set(
    existingProducts.map(p => 
      (p.product_id || p.kode || '').toString().trim().toUpperCase()
    ).filter(Boolean)
  );
  
  console.log(`Found ${usedProductIds.size} existing product codes`);
  
  // Filter and process rows
  const newProducts = [];
  const productsMap = new Map(); // Map by kode to prevent duplicates in same batch
  
  rows
    .filter(row => {
      const kode = (row['KODE ITEM/SKU'] || '').toString().trim();
      const nama = (row['NAMA ITEM'] || '').toString().trim();
      return kode && nama; // Must have both kode and nama
    })
    .forEach((row, index) => {
      const kode = (row['KODE ITEM/SKU'] || '').toString().trim().toUpperCase();
      const nama = (row['NAMA ITEM'] || '').toString().trim();
      const harga = parseFloat(row['HARGA'] || 0) || 0;
      
      // Skip if already exists in database
      if (usedProductIds.has(kode)) {
        return; // Skip silently
      }
      
      // Skip if duplicate in same batch
      if (productsMap.has(kode)) {
        console.log(`Skipping duplicate kode in batch: ${kode}`);
        return;
      }
      
      productsMap.set(kode, true);
      
      newProducts.push({
        id: generateId(),
        product_id: kode,
        kode: kode,
        nama: nama,
        satuan: 'PCS', // Default satuan
        stockAman: 0,
        stockMinimum: 0,
        kategori: 'Produk',
        customer: '', // Will be filled later if needed
        hargaFg: harga,
        hargaSales: harga,
        lastUpdate: new Date().toISOString(),
        userUpdate: 'System',
        ipAddress: '127.0.0.1',
        created: new Date().toISOString(),
      });
    });
  
  // Sort by kode
  newProducts.sort((a, b) => {
    return a.kode.localeCompare(b.kode);
  });
  
  console.log(`Found ${newProducts.length} new products to add from Sales Items`);
  
  return newProducts;
}

// Seed Products from master_item.xls (only category = Product/Produk)
async function seedProducts() {
  console.log('Seeding Products from master_item.xls (category = Product/Produk)...');
  const filePath = path.join(DATA_DIR, 'master_item.xls');

  if (!await fileExists(filePath)) {
    console.log('master_item.xls not found, skipping products...');
    return [];
  }

  // Load existing products to prevent duplicates
  let existingProducts = [];
  try {
    const existingData = await loadExistingData('products');
    existingProducts = Array.isArray(existingData) ? existingData : [];
    console.log(`Found ${existingProducts.length} existing products`);
  } catch (error) {
    console.log('No existing products found, starting fresh');
  }

  const usedProductIds = new Set(
    existingProducts
      .map(p => (p.product_id || p.kode || '').toString().trim().toUpperCase())
      .filter(Boolean)
  );

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find header row
  const headerRowIndex = rows.findIndex(row =>
    Array.isArray(row) &&
    row.some(cell => cell && cell.toString().toLowerCase().includes('kode')) &&
    row.some(cell => cell && cell.toString().toLowerCase().includes('nama'))
  );

  if (headerRowIndex === -1) {
    console.log('Header row not found in master_item.xls, skipping...');
    return [];
  }

  const headerRow = rows[headerRowIndex].map(cell => cell.toString().toLowerCase().trim());
  const headerMap = {
    kode: headerRow.findIndex(c => c.includes('kode')),
    nama: headerRow.findIndex(c => c === 'nama' || c.includes('nama item')),
    satuan: headerRow.findIndex(c => c.includes('satuan')),
    hargaJual: headerRow.findIndex(c => c.includes('harga jual')),
    hargaBeli: headerRow.findIndex(c => c.includes('harga beli')),
    stockAman: headerRow.findIndex(c => c.includes('stock aman')),
    stockMinimum: headerRow.findIndex(c => c.includes('stock minimum')),
    kategori: headerRow.findIndex(c => c.includes('kategori')),
    partner: headerRow.findIndex(c => c.includes('partner')),
    lastUpdate: headerRow.findIndex(c => c.includes('last update')),
    userUpdate: headerRow.findIndex(c => c.includes('user update')),
    ipAddress: headerRow.findIndex(c => c.includes('ip address')),
  };

  const products = [];
  const productsMap = new Map();

  rows
    .slice(headerRowIndex + 1)
    .filter(row => Array.isArray(row))
    .forEach((row, index) => {
      const kodeRaw = (row[headerMap.kode] || '').toString().trim();
      const nama = (row[headerMap.nama] || '').toString().trim();
      const kategori = (row[headerMap.kategori] || '').toString().trim().toLowerCase();

      // Only process items with category = Product or Produk
      if (kategori !== 'product' && kategori !== 'produk') {
        return;
      }

      if (!kodeRaw && !nama) return;

      const kode = (kodeRaw || `FG-AUTO-${index + 1}`).toUpperCase();

      if (usedProductIds.has(kode) || productsMap.has(kode)) {
        return;
      }

      const satuan = (row[headerMap.satuan] || 'PCS').toString().trim() || 'PCS';
      const hargaJual = parseNumericValue(row[headerMap.hargaJual]);
      const hargaBeli = parseNumericValue(row[headerMap.hargaBeli]);
      const stockAman = parseNumericValue(row[headerMap.stockAman]);
      const stockMinimum = parseNumericValue(row[headerMap.stockMinimum]);
      const partner = (row[headerMap.partner] || '').toString().trim();
      const lastUpdate = formatExcelDate(row[headerMap.lastUpdate] || '');
      const userUpdate = (row[headerMap.userUpdate] || 'System').toString().trim() || 'System';
      const ipAddress = (row[headerMap.ipAddress] || '').toString().trim();

      const product = {
        id: generateId(),
        product_id: kode,
        kode,
        no: existingProducts.length + products.length + 1,
        nama,
        satuan,
        stockAman,
        stockMinimum,
        kategori: 'Produk',
        customer: partner,
        supplier: partner,
        hargaFg: hargaJual,
        harga: hargaJual,
        hargaSales: hargaJual,
        hargaJual,
        hargaBeli,
        lastUpdate: lastUpdate || new Date().toISOString(),
        userUpdate,
        ipAddress: ipAddress || '127.0.0.1',
        created: new Date().toISOString(),
      };

      products.push(product);
      productsMap.set(kode, product);
      usedProductIds.add(kode);
    });

  console.log(`Loaded ${products.length} product records from master_item.xls (category = Product/Produk)`);
  return products;
}

// Seed Materials from master_item.xls (only category = Material)
async function seedMaterials() {
  console.log('Seeding Materials from master_item.xls (category = Material)...');
  const filePath = path.join(DATA_DIR, 'master_item.xls');
  
  if (!await fileExists(filePath)) {
    console.log('master_item.xls not found, skipping materials...');
    return [];
  }

  // Load existing materials to continue ID numbering
  let existingMaterials = [];
  try {
    const existingData = await loadExistingData('materials');
    existingMaterials = Array.isArray(existingData) ? existingData : [];
    console.log(`Found ${existingMaterials.length} existing materials`);
  } catch (error) {
    console.log('No existing materials found, starting fresh');
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find header row
  const headerRowIndex = rows.findIndex(row =>
    Array.isArray(row) &&
    row.some(cell => cell && cell.toString().toLowerCase().includes('kode')) &&
    row.some(cell => cell && cell.toString().toLowerCase().includes('nama'))
  );

  if (headerRowIndex === -1) {
    console.log('Header row not found in master_item.xls, skipping...');
    return [];
  }

  const headerRow = rows[headerRowIndex].map(cell => cell.toString().toLowerCase().trim());
  const headerMap = {
    kode: headerRow.findIndex(c => c.includes('kode')),
    nama: headerRow.findIndex(c => c === 'nama' || c.includes('nama item')),
    satuan: headerRow.findIndex(c => c.includes('satuan')),
    hargaJual: headerRow.findIndex(c => c.includes('harga jual') || c.includes('harga sales')),
    hargaBeli: headerRow.findIndex(c => c.includes('harga beli') || c.includes('price mtr')),
    stockAman: headerRow.findIndex(c => c.includes('stock aman')),
    stockMinimum: headerRow.findIndex(c => c.includes('stock minimum')),
    kategori: headerRow.findIndex(c => c.includes('kategori')),
    supplier: headerRow.findIndex(c => c.includes('supplier') || c.includes('supplier name') || c.includes('partner')),
    lastUpdate: headerRow.findIndex(c => c.includes('last update')),
    userUpdate: headerRow.findIndex(c => c.includes('user update')),
    ipAddress: headerRow.findIndex(c => c.includes('ip address')),
  };

  // Track used material_ids to prevent duplicates (normalize to uppercase)
  const usedMaterialIds = new Set(
    existingMaterials
      .map(m => {
        const id = (m.material_id || m.kode || '').toString().trim();
        // Normalize to uppercase MTRL
        if (id.toLowerCase().startsWith('mtrl')) {
          return 'MTRL' + id.substring(4);
        }
        return id.toUpperCase();
      })
      .filter(Boolean)
  );
  const materialsMap = new Map(); // Map by material_id to prevent duplicates

  rows
    .slice(headerRowIndex + 1)
    .filter(row => Array.isArray(row))
    .forEach((row, index) => {
      const kodeRaw = (row[headerMap.kode] || '').toString().trim();
      const nama = (row[headerMap.nama] || '').toString().trim();
      const kategori = (row[headerMap.kategori] || '').toString().trim().toLowerCase();

      // Only process items with category = Material
      if (kategori !== 'material') {
        return;
      }

      if (!kodeRaw && !nama) return;

      // Convert KRT format to MTRL format (if still exists)
      let finalMaterialId = kodeRaw.toUpperCase();
      if (finalMaterialId.startsWith('KRT')) {
        // Convert KRT00956 to MTRL00956
        finalMaterialId = 'MTRL' + finalMaterialId.substring(3);
        console.log(`Converted KRT to MTRL: ${kodeRaw} -> ${finalMaterialId}`);
      } else if (!finalMaterialId.startsWith('MTRL') && !finalMaterialId.toLowerCase().startsWith('mtrl')) {
        // If doesn't start with MTRL/mtrl, generate new one
        finalMaterialId = generateNextId(existingMaterials, 'MTRL');
        console.log(`Generated new material_id: ${finalMaterialId} for material: ${nama}`);
      }

      // Normalize to uppercase MTRL (keep uppercase)
      if (finalMaterialId.toLowerCase().startsWith('mtrl')) {
        finalMaterialId = 'MTRL' + finalMaterialId.substring(4);
      }

      // Skip if duplicate
      if (materialsMap.has(finalMaterialId)) {
        console.log(`Skipping duplicate material_id: ${finalMaterialId}`);
        return;
      }
      
      // Check if already exists in database
      if (usedMaterialIds.has(finalMaterialId)) {
        console.log(`Material_id ${finalMaterialId} already exists in database, skipping...`);
        return;
      }

      const satuan = (row[headerMap.satuan] || 'PCS').toString().trim() || 'PCS';
      const hargaJual = parseNumericValue(row[headerMap.hargaJual]);
      const hargaBeli = parseNumericValue(row[headerMap.hargaBeli]);
      const stockAman = parseNumericValue(row[headerMap.stockAman]);
      const stockMinimum = parseNumericValue(row[headerMap.stockMinimum]);
      const supplier = (row[headerMap.supplier] || '').toString().trim();
      const lastUpdate = formatExcelDate(row[headerMap.lastUpdate] || '');
      const userUpdate = (row[headerMap.userUpdate] || 'System').toString().trim() || 'System';
      const ipAddress = (row[headerMap.ipAddress] || '').toString().trim();

      materialsMap.set(finalMaterialId, {
        id: generateId(),
        material_id: finalMaterialId,
        kode: finalMaterialId,
        no: materialsMap.size + 1,
        nama: nama || '',
        satuan: satuan,
        stockAman: stockAman,
        stockMinimum: stockMinimum,
        kategori: 'Material',
        supplier: supplier,
        priceMtr: hargaBeli,
        hargaSales: hargaJual,
        lastUpdate: lastUpdate || new Date().toISOString(),
        userUpdate: userUpdate,
        ipAddress: ipAddress || '127.0.0.1',
        created: new Date().toISOString(),
      });
      
      usedMaterialIds.add(finalMaterialId);
    });

  const materials = Array.from(materialsMap.values());
  console.log(`Loaded ${materials.length} material records from master_item.xls (category = Material)`);
  return materials;
}

// Seed BOM (Bill of Materials)
async function seedBOM(products, materials) {
  console.log('Seeding BOM data...');

  // 1) PRIORITAS: kalau sudah ada data BOM final di data/bom.json, pakai itu aja
  const bomJsonPath = path.join(DATA_DIR, 'bom.json');
  if (await fileExists(bomJsonPath)) {
    try {
      console.log('Found existing BOM JSON at data/bom.json, using it as primary source...');
      const raw = await fs.readFile(bomJsonPath, 'utf-8');
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        console.log(`Loaded ${parsed.length} BOM items from bom.json`);
        // Pastikan minimal field yang dipakai di app ada
        const normalized = parsed.map((item) => ({
          id: item.id || generateId(),
          product_id: item.product_id || item.productId || '',
          material_id: item.material_id || item.materialId || '',
          ratio: typeof item.ratio === 'number' ? item.ratio : Number(item.ratio) || 0,
          created: item.created || new Date().toISOString(),
        })).filter((b) => b.product_id && b.material_id && b.ratio > 0);

        console.log(`Normalized BOM from bom.json: ${normalized.length} valid items`);
        return normalized;
      }

      console.warn('bom.json exists but is not an array. Falling back to fg_bos_analysis.csv seeding...');
    } catch (err) {
      console.error('Error reading/normalizing bom.json, falling back to fg_bos_analysis.csv:', err.message);
    }
  }

  // 2) Fallback lama: generate BOM dari fg_bos_analysis.csv
  console.log('Seeding BOM from fg_bos_analysis.csv (fallback)...');
  const filePath = path.join(DATA_DIR, 'fg_bos_analysis.csv');

  if (!await fileExists(filePath)) {
    console.log('fg_bos_analysis.csv not found, skipping BOM...');
    return [];
  }

  const workbook = XLSX.readFile(filePath, { raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Create maps for quick lookup
  const productMap = new Map(products.map(p => [p.product_id || p.kode, p]));
  const materialMap = new Map(materials.map(m => [m.material_id || m.kode, m]));

  const bomGroups = new Map();

  rows.forEach(row => {
    const productId = (row['Product Code'] || row['Product_id'] || row['Product ID'] || '').toString().trim();
    const productName = (row['Product Name'] || row['Product'] || '').toString().trim();
    const productQty = parseNumericValue(row['Product Qty'] || row['Product Quantity'] || row['Qty Product']);
    const materialId = (row['Material ID'] || row['Material_Id'] || '').toString().trim().toUpperCase();
    const materialName = (row['Material Name'] || row['Material'] || '').toString().trim();
    const materialQty = parseNumericValue(row['Material Qty'] || row['Material Quantity'] || row['Qty Material']);
    let ratio = parseNumericValue(row['Ratio']);

    if (!productId || !materialId) return;

    if (!ratio && productQty > 0 && materialQty > 0) {
      ratio = materialQty / productQty;
    }

    // Ensure product exists
    if (!productMap.has(productId)) {
      const product = {
        id: generateId(),
        product_id: productId,
        kode: productId,
        nama: productName || productId,
        satuan: 'PCS',
        stockAman: 0,
        stockMinimum: 0,
        kategori: 'Produk',
        customer: '',
        supplier: '',
        hargaFg: 0,
        harga: 0,
        hargaSales: 0,
        hargaJual: 0,
        hargaBeli: 0,
        lastUpdate: new Date().toISOString(),
        userUpdate: 'System',
        ipAddress: '127.0.0.1',
        created: new Date().toISOString(),
      };
      products.push(product);
      productMap.set(productId, product);
    }

    // Ensure material exists
    if (!materialMap.has(materialId)) {
      const material = {
        id: generateId(),
        material_id: materialId,
        kode: materialId,
        no: materials.length + 1,
        nama: materialName || materialId,
        satuan: 'PCS',
        stockAman: 0,
        stockMinimum: 0,
        kategori: 'Material',
        supplier: '',
        priceMtr: 0,
        hargaSales: 0,
        lastUpdate: new Date().toISOString(),
        userUpdate: 'System',
        ipAddress: '127.0.0.1',
        created: new Date().toISOString(),
      };
      materials.push(material);
      materialMap.set(materialId, material);
    }

    const key = `${productId}|||${materialId}`;
    if (!bomGroups.has(key)) {
      bomGroups.set(key, {
        productId,
        materialId,
        ratios: [],
        totalMaterialQty: 0,
        totalProductQty: 0,
      });
    }

    const group = bomGroups.get(key);
    if (ratio > 0) {
      group.ratios.push(ratio);
    }
    group.totalMaterialQty += materialQty || 0;
    group.totalProductQty += productQty || 0;
  });

  const bomItems = [];
  const bomMap = new Map();

  bomGroups.forEach(group => {
    let finalRatio = 0;
    if (group.ratios.length > 0) {
      const sum = group.ratios.reduce((acc, val) => acc + val, 0);
      finalRatio = sum / group.ratios.length;
    } else if (group.totalProductQty > 0) {
      finalRatio = group.totalMaterialQty / group.totalProductQty;
    }

    finalRatio = Number(finalRatio.toFixed(6));
    if (finalRatio <= 0) {
      return;
    }

    const bomItem = {
      id: generateId(),
      product_id: group.productId,
      material_id: group.materialId,
      ratio: finalRatio,
      created: new Date().toISOString(),
    };

    bomItems.push(bomItem);
    if (!bomMap.has(group.productId)) {
      bomMap.set(group.productId, []);
    }
    bomMap.get(group.productId).push(bomItem);
  });

  console.log(`Loaded ${bomItems.length} BOM items from fg_bos_analysis.csv`);

  // Update products with BOM data
  products.forEach(product => {
    const productId = product.product_id || product.kode;
    if (bomMap.has(productId)) {
      product.bom = bomMap.get(productId);
    }
  });

  return bomItems;
}

// Seed COA (Chart of Accounts) from COA_update.json or COA_update.xls
async function seedCOA() {
  console.log('Seeding COA from COA_update.json or COA_update.xls...');
  
  // Load existing accounts from both Packaging and GT to update balances
  let existingPackagingAccounts = [];
  let existingGTAccounts = [];
  try {
    const packagingData = await loadExistingData('accounts');
    existingPackagingAccounts = Array.isArray(packagingData) ? packagingData : [];
    const gtData = await loadExistingData('gt_accounts');
    existingGTAccounts = Array.isArray(gtData) ? gtData : [];
    console.log(`Found ${existingPackagingAccounts.length} existing Packaging COA accounts`);
    console.log(`Found ${existingGTAccounts.length} existing GT COA accounts`);
  } catch (error) {
    console.log('No existing COA accounts found, starting fresh');
  }

  // Combine all existing accounts for duplicate checking
  const allExistingAccounts = [...existingPackagingAccounts, ...existingGTAccounts];
  const existingAccountMap = new Map(
    allExistingAccounts.map(a => [(a.code || '').toString().trim().toUpperCase(), a])
  );

  let accounts = [];
  
  // Try to read from JSON file first (check both locations)
  let jsonFilePath = path.join(DATA_DIR, 'COA_update.json');
  let jsonData = null;
  
  if (await fileExists(jsonFilePath)) {
    console.log('Reading COA from JSON file...');
    try {
      const jsonContent = await fs.readFile(jsonFilePath, 'utf8');
      jsonData = JSON.parse(jsonContent);
    } catch (error) {
      console.log(`Error reading ${jsonFilePath}: ${error.message}`);
    }
  }
  
  // Also try localStorage location
  if (!jsonData) {
    const localStorageJsonPath = path.join(DATA_DIR, 'localStorage', 'COA_update.json');
    if (await fileExists(localStorageJsonPath)) {
      console.log('Reading COA from localStorage JSON file...');
      try {
        const jsonContent = await fs.readFile(localStorageJsonPath, 'utf8');
        jsonData = JSON.parse(jsonContent);
      } catch (error) {
        console.log(`Error reading ${localStorageJsonPath}: ${error.message}`);
      }
    }
  }
  
  if (jsonData) {
    try {
      // Handle both array and wrapped object formats
      const rawData = Array.isArray(jsonData) ? jsonData : (jsonData.value || jsonData.data || []);
      
      accounts = rawData
          .filter(row => {
            const code = (row.Kode_Akun || '').toString().trim();
            const name = (row.Nama_Akun || '').toString().trim();
            return code && name; // Must have both code and name
          })
          .map((row) => {
            const code = (row.Kode_Akun || '').toString().trim();
            const name = (row.Nama_Akun || '').toString().trim();
            // Handle both "Debet" and "Debit" field names
            const debet = parseNumericValue(row.Debet || row.Debit || 0, { allowNegative: true });
            const kredit = parseNumericValue(row.Kredit || 0, { allowNegative: true });
            
            // Calculate balance: Debet - Kredit
            const balance = debet - kredit;
            
            // Determine type from code pattern
            let type = 'Asset';
            if (code.startsWith('1-') || code.startsWith('1.')) {
              type = 'Asset';
            } else if (code.startsWith('2-') || code.startsWith('2.')) {
              type = 'Liability';
            } else if (code.startsWith('3-') || code.startsWith('3.')) {
              type = 'Equity';
            } else if (code.startsWith('4-') || code.startsWith('4.')) {
              type = 'Revenue';
            } else if (code.startsWith('5-') || code.startsWith('5.') || 
                       code.startsWith('6-') || code.startsWith('6.') ||
                       code.startsWith('8-') || code.startsWith('8.')) {
              type = 'Expense';
            }
            
            // Update existing account with new balance, or create new one
            const codeUpper = code.toUpperCase();
            const existingAccount = existingAccountMap.get(codeUpper);
            
            if (existingAccount) {
              // Update existing account with balance from COA_update.json
              return {
                code: code,
                name: name.trim() || existingAccount.name,
                type: type || existingAccount.type,
                balance: balance, // Update balance from COA data (Debit - Kredit)
                debet: debet, // Simpan Debit dari COA_update.json
                kredit: kredit, // Simpan Kredit dari COA_update.json
              };
            } else {
              // New account
              return {
                code: code,
                name: name.trim(),
                type: type,
                balance: balance,
                debet: debet, // Simpan Debit dari COA_update.json
                kredit: kredit, // Simpan Kredit dari COA_update.json
              };
            }
          })
          .filter(a => a !== null); // Remove null entries
        
        console.log(`Loaded ${accounts.length} COA accounts from COA_update.json`);
        return accounts;
    } catch (error) {
      console.log(`Error processing JSON data: ${error.message}, falling back to Excel...`);
    }
  }
  
  // Fallback to Excel file
  const filePath = path.join(DATA_DIR, 'COA_update.xls');
  
  if (!await fileExists(filePath)) {
    console.log('COA_update.xls not found, skipping COA...');
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Read as array to find header row
  const rows = XLSX.utils.sheet_to_json(sheet, { 
    header: 1,
    defval: ''
  });
  
  // Find header row (row with 'Code', 'Name', 'Type', etc.)
  let headerRowIndex = -1;
  let headerMap = {};
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      const rowStr = row.join('|').toLowerCase();
      if ((rowStr.includes('code') || rowStr.includes('kode')) && 
          (rowStr.includes('name') || rowStr.includes('nama')) && 
          (rowStr.includes('type') || rowStr.includes('tipe') || rowStr.includes('jenis'))) {
        headerRowIndex = i;
        // Map column indices
        headerMap = {
          code: row.findIndex(c => c && (c.toString().toLowerCase().includes('code') || c.toString().toLowerCase().includes('kode'))),
          name: row.findIndex(c => c && (c.toString().toLowerCase().includes('name') || c.toString().toLowerCase().includes('nama')) && !c.toString().toLowerCase().includes('code')),
          type: row.findIndex(c => c && (c.toString().toLowerCase().includes('type') || c.toString().toLowerCase().includes('tipe') || c.toString().toLowerCase().includes('jenis'))),
          balance: row.findIndex(c => c && (c.toString().toLowerCase().includes('balance') || c.toString().toLowerCase().includes('saldo'))),
        };
        break;
      }
    }
  }
  
  if (headerRowIndex >= 0) {
    console.log('Found COA header at row:', headerRowIndex + 1);
    console.log('Header mapping:', Object.keys(headerMap).filter(k => headerMap[k] >= 0));
    
    accounts = rows
      .slice(headerRowIndex + 1) // Skip header row
      .filter(row => {
        if (!Array.isArray(row)) return false;
        const code = (row[headerMap.code] || '').toString().trim();
        const name = (row[headerMap.name] || '').toString().trim();
        return code && name; // Must have both code and name
      })
      .map((row, index) => {
        const code = (row[headerMap.code] || '').toString().trim();
        const name = (row[headerMap.name] || '').toString().trim();
        const typeRaw = (row[headerMap.type] || 'Asset').toString().trim();
        const balance = parseNumericValue(row[headerMap.balance] || 0, { allowNegative: true });
        
        // Map type: normalize to valid Account type
        let type = 'Asset';
        const typeLower = typeRaw.toLowerCase();
        if (typeLower.includes('asset') || typeLower.includes('aktiva')) {
          type = 'Asset';
        } else if (typeLower.includes('liability') || typeLower.includes('kewajiban') || typeLower.includes('hutang')) {
          type = 'Liability';
        } else if (typeLower.includes('equity') || typeLower.includes('ekuitas') || typeLower.includes('modal')) {
          type = 'Equity';
        } else if (typeLower.includes('revenue') || typeLower.includes('pendapatan') || typeLower.includes('income')) {
          type = 'Revenue';
        } else if (typeLower.includes('expense') || typeLower.includes('biaya') || typeLower.includes('beban')) {
          type = 'Expense';
        } else {
          // Try to guess from code pattern
          if (code.startsWith('1-') || code.startsWith('1.')) {
            type = 'Asset';
          } else if (code.startsWith('2-') || code.startsWith('2.')) {
            type = 'Liability';
          } else if (code.startsWith('3-') || code.startsWith('3.')) {
            type = 'Equity';
          } else if (code.startsWith('4-') || code.startsWith('4.')) {
            type = 'Revenue';
          } else if (code.startsWith('5-') || code.startsWith('5.')) {
            type = 'Expense';
          }
        }
        
        // Skip if duplicate
        const codeUpper = code.toUpperCase();
        if (usedAccountCodes.has(codeUpper)) {
          return null;
        }
        usedAccountCodes.add(codeUpper);
        
        return {
          code: code,
          name: name,
          type: type,
          balance: balance,
        };
      })
      .filter(a => a !== null); // Remove null entries
  } else {
    // Fallback: try default JSON parsing
    console.log('Using fallback parsing for COA...');
    const jsonRows = XLSX.utils.sheet_to_json(sheet);
    
    accounts = jsonRows
      .filter(row => {
        const code = (row['Account Code'] || row['account code'] || row['Code'] || row['CODE'] || row['__EMPTY'] || '').toString().trim();
        const name = (row['Account Name'] || row['account name'] || row['Name'] || row['NAME'] || row['__EMPTY_1'] || '').toString().trim();
        // Skip header rows
        if (code === 'Code' || code === 'Account Code' || name === 'Name' || name === 'Account Name') return false;
        return code && name;
      })
      .map((row, index) => {
        const code = (row['Account Code'] || row['account code'] || row['Code'] || row['CODE'] || row['__EMPTY'] || '').toString().trim();
        const name = (row['Account Name'] || row['account name'] || row['Name'] || row['NAME'] || row['__EMPTY_1'] || '').toString().trim();
        const typeRaw = (row['Type'] || row['TYPE'] || row['__EMPTY_2'] || 'Asset').toString().trim();
        const balance = parseNumericValue(row['Balance'] || row['BALANCE'] || row['__EMPTY_3'] || 0, { allowNegative: true });
        
        // Map type
        let type = 'Asset';
        const typeLower = typeRaw.toLowerCase();
        if (typeLower.includes('asset') || typeLower.includes('aktiva')) {
          type = 'Asset';
        } else if (typeLower.includes('liability') || typeLower.includes('kewajiban') || typeLower.includes('hutang')) {
          type = 'Liability';
        } else if (typeLower.includes('equity') || typeLower.includes('ekuitas') || typeLower.includes('modal')) {
          type = 'Equity';
        } else if (typeLower.includes('revenue') || typeLower.includes('pendapatan') || typeLower.includes('income')) {
          type = 'Revenue';
        } else if (typeLower.includes('expense') || typeLower.includes('biaya') || typeLower.includes('beban')) {
          type = 'Expense';
        } else {
          // Guess from code
          if (code.startsWith('1-') || code.startsWith('1.')) {
            type = 'Asset';
          } else if (code.startsWith('2-') || code.startsWith('2.')) {
            type = 'Liability';
          } else if (code.startsWith('3-') || code.startsWith('3.')) {
            type = 'Equity';
          } else if (code.startsWith('4-') || code.startsWith('4.')) {
            type = 'Revenue';
          } else if (code.startsWith('5-') || code.startsWith('5.')) {
            type = 'Expense';
          }
        }
        
        // Skip if duplicate
        const codeUpper = code.toUpperCase();
        if (usedAccountCodes.has(codeUpper)) {
          return null;
        }
        usedAccountCodes.add(codeUpper);
        
        return {
          code: code,
          name: name,
          type: type,
          balance: balance,
        };
      })
      .filter(a => a !== null);
  }
  
  console.log(`Loaded ${accounts.length} COA accounts from COA_update.xls`);
  return accounts;
}

// Seed Stock Opname from SO_Nov2025.xlsx
async function seedStockOpname(products, materials) {
  console.log('Seeding Stock Opname from SO_Nov2025.xlsx...');
  const filePath = path.join(DATA_DIR, 'SO_Nov2025.xlsx');
  
  if (!await fileExists(filePath)) {
    console.log('SO_Nov2025.xlsx not found, skipping stock opname...');
    return [];
  }

  // Load existing inventory to get latest prices
  let existingInventory = [];
  try {
    const existingData = await loadExistingData('inventory');
    existingInventory = Array.isArray(existingData) ? existingData : [];
    console.log(`Found ${existingInventory.length} existing inventory items`);
  } catch (error) {
    console.log('No existing inventory found, starting fresh');
  }

  // Create maps for products and materials lookup
  const productsMap = new Map();
  const materialsMap = new Map();
  
  if (products && Array.isArray(products)) {
    products.forEach(p => {
      const code = (p.product_id || p.kode || '').toString().trim().toUpperCase();
      if (code) {
        productsMap.set(code, p);
      }
    });
  }
  
  if (materials && Array.isArray(materials)) {
    materials.forEach(m => {
      const code = (m.material_id || m.kode || '').toString().trim().toUpperCase();
      if (code) {
        materialsMap.set(code, m);
      }
    });
  }

  // Create map for existing inventory prices (use latest price by codeItem)
  const inventoryPriceMap = new Map();
  existingInventory.forEach(item => {
    const code = (item.codeItem || '').toString().trim().toUpperCase();
    if (code && item.price) {
      // Keep the latest price (if multiple entries, last one wins)
      inventoryPriceMap.set(code, item.price);
    }
  });

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames.find(name => 
    name.toLowerCase().includes('stock') || 
    name.toLowerCase().includes('opname')
  ) || workbook.SheetNames[0];
  
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const inventoryItems = [];
  const processedCodes = new Set();

  data.forEach((row, index) => {
    const kodeSistem = (row['KODE SISTEM'] || row['Kode Sistem'] || row['KODE'] || '').toString().trim();
    const nama = (row['Nama'] || row['NAMA'] || row['nama'] || '').toString().trim();
    const stock = parseNumericValue(row['STOCK'] || row['Stock'] || row['stock'] || 0);
    const hargaJual = parseNumericValue(row['Harga Jual'] || row['Harga jual'] || row['harga jual'] || 0);
    const partner = (row['Partner'] || row['PARTNER'] || row['partner'] || '').toString().trim();

    if (!kodeSistem && !nama) {
      return; // Skip empty rows
    }

    // Normalize code to uppercase for lookup
    const codeUpper = kodeSistem.toUpperCase();
    
    // Skip if already processed (duplicate)
    if (processedCodes.has(codeUpper)) {
      return;
    }
    processedCodes.add(codeUpper);

    // Determine if this is a product or material
    let isProduct = false;
    let itemData = null;
    let kategori = '';
    let satuan = '';

    // Check if it's a product (usually starts with FG-)
    if (productsMap.has(codeUpper)) {
      isProduct = true;
      itemData = productsMap.get(codeUpper);
    } else if (materialsMap.has(codeUpper)) {
      isProduct = false;
      itemData = materialsMap.get(codeUpper);
    } else {
      // Try to guess from code pattern
      if (codeUpper.startsWith('FG-') || codeUpper.startsWith('PROD-')) {
        isProduct = true;
      } else if (codeUpper.startsWith('RM-') || codeUpper.startsWith('MAT-') || codeUpper.startsWith('MTRL-')) {
        isProduct = false;
      } else {
        // Default: assume product if not clear
        isProduct = true;
      }
    }

    // Get kategori and satuan from product/material data
    if (itemData) {
      kategori = (itemData.kategori || itemData.category || '').toString().trim();
      satuan = (itemData.satuan || itemData.unit || itemData.satuan || '').toString().trim();
    }

    // If kategori/satuan not found, use defaults
    if (!kategori) {
      kategori = isProduct ? 'Product' : 'Material';
    }
    if (!satuan) {
      satuan = 'PCS'; // Default unit
    }

    // Get price: use existing inventory price if available, otherwise use from Excel
    let finalPrice = hargaJual;
    if (inventoryPriceMap.has(codeUpper)) {
      finalPrice = inventoryPriceMap.get(codeUpper);
    }

    // Create inventory item
    const inventoryItem = {
      id: generateId(),
      supplierName: partner || '',
      codeItem: kodeSistem,
      description: nama,
      kategori: kategori,
      satuan: satuan,
      price: finalPrice,
      stockPremonth: stock,
      receive: 0,
      outgoing: 0,
      return: 0,
      nextStock: stock + 0 - 0 + 0, // stockPremonth + receive - outgoing + return
      lastUpdate: new Date().toISOString(),
      processedPOs: [],
      processedSPKs: [],
      processedGRNs: [],
    };

    inventoryItems.push(inventoryItem);
  });

  return inventoryItems;
}

// Helper to load existing data
async function loadExistingData(key) {
  try {
    // Try to load from local JSON file first
    const jsonPath = path.join(DATA_DIR, 'localStorage', `${key}.json`);
    if (await fileExists(jsonPath)) {
      const content = await fs.readFile(jsonPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Ignore
  }
  return null;
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

// Save to storage (local or server)
async function saveToStorage(key, data) {
  try {
    // Try to save to server first
    try {
      await axios.post(`${SERVER_URL}/api/storage/${key}`, { value: data }, {
        timeout: 5000,
      });
      console.log(`✓ Saved ${key} to server (${data.length} records)`);
      return;
    } catch (serverError) {
      // If server not available, fallback to local
      if (serverError.code === 'ECONNREFUSED' || serverError.code === 'ERR_NETWORK') {
        console.log(`Server not available, saving ${key} to local file...`);
      } else {
        throw serverError;
      }
    }
  } catch (error) {
    console.error(`Error saving ${key} to server:`, error.message);
  }
  
  // Fallback to local JSON file (data/localStorage)
  try {
    const localStorageDir = path.join(DATA_DIR, 'localStorage');
    await fs.mkdir(localStorageDir, { recursive: true });
    const localPath = path.join(localStorageDir, `${key}.json`);
    await fs.writeFile(localPath, JSON.stringify(data, null, 2));
    console.log(`✓ Saved ${key} to local file (${data.length} records)`);
  } catch (localError) {
    console.error(`Error saving ${key} to local file:`, localError.message);
  }
}

// Main seed function
async function seed() {
  console.log('Starting seed process...\n');

  try {
    // Seed all data (skip products for now - too heavy)
    const staff = await seedKaryawan();
    const customers = await seedCustomers();
    const suppliers = await seedSuppliers();
    // const products = await seedProducts(); // Skip products for now

    // Seed Products and Materials
    const products = await seedProducts();
    const materials = await seedMaterials();
    const bomItems = await seedBOM(products, materials);
    
    // Seed Sales Items (Daftar Item Sales)
    const salesItems = await seedSalesItems();
    
    // Seed User Access Control
    const userAccess = await seedUserAccess();
    
    // Seed COA (Chart of Accounts)
    const coaAccounts = await seedCOA();
    
    // Seed Stock Opname (Inventory)
    const inventory = await seedStockOpname(products, materials);

    // Save to storage
    if (staff.length > 0) {
      await saveToStorage('staff', staff);
    }
    if (customers.length > 0) {
      await saveToStorage('customers', customers);
    }
    if (suppliers.length > 0) {
      await saveToStorage('suppliers', suppliers);
    }
    if (products.length > 0) {
      await saveToStorage('products', products);
    }
    if (materials.length > 0) {
      await saveToStorage('materials', materials);
    }
    if (bomItems.length > 0) {
      await saveToStorage('bom', bomItems);
    }
    if (inventory.length > 0) {
      await saveToStorage('inventory', inventory);
    }
    
    // Merge sales items with existing products
    if (salesItems.length > 0) {
      // Load existing products again to merge (after products from product sheet are saved)
      const existingProductsForMergeRaw = await loadExistingData('products') || [];
      const existingProductsForMerge = Array.isArray(existingProductsForMergeRaw) ? existingProductsForMergeRaw : [];
      // Filter out any duplicates (shouldn't happen, but just in case)
      const existingCodes = new Set(
        existingProductsForMerge.map(p => 
          (p.product_id || p.kode || '').toString().trim().toUpperCase()
        ).filter(Boolean)
      );
      const uniqueSalesItems = salesItems.filter(item => {
        const code = (item.product_id || item.kode || '').toString().trim().toUpperCase();
        return !existingCodes.has(code);
      });
      const mergedProducts = [...existingProductsForMerge, ...uniqueSalesItems];
      await saveToStorage('products', mergedProducts);
      console.log(`  - Sales Items: ${uniqueSalesItems.length} new products added (${salesItems.length - uniqueSalesItems.length} duplicates skipped)`);
    }
    
    // Save User Access Control
    if (userAccess.length > 0) {
      await saveToStorage('userAccessControl', userAccess);
    }
    
    // Save COA (Chart of Accounts) - update balances for both Packaging and General Trading
    if (coaAccounts.length > 0) {
      // Create map of updated accounts by code
      const updatedAccountsMap = new Map(
        coaAccounts.map(a => [(a.code || '').toString().trim().toUpperCase(), a])
      );
      
      // Update General Trading (gt_accounts)
      const existingGTAccountsRaw = await loadExistingData('gt_accounts') || [];
      const existingGTAccounts = Array.isArray(existingGTAccountsRaw) ? existingGTAccountsRaw : [];
      const mergedGTAccounts = existingGTAccounts.map(existing => {
        const codeUpper = (existing.code || '').toString().trim().toUpperCase();
        const updated = updatedAccountsMap.get(codeUpper);
        if (updated) {
          // Update balance from COA data
          return { ...existing, balance: updated.balance };
        }
        return existing;
      });
      // Add new accounts that don't exist yet
      const existingGTCodes = new Set(mergedGTAccounts.map(a => (a.code || '').toString().trim().toUpperCase()));
      coaAccounts.forEach(newAccount => {
        const codeUpper = (newAccount.code || '').toString().trim().toUpperCase();
        if (!existingGTCodes.has(codeUpper)) {
          mergedGTAccounts.push(newAccount);
        }
      });
      await saveToStorage('gt_accounts', mergedGTAccounts);
      const updatedGTCount = existingGTAccounts.filter(a => updatedAccountsMap.has((a.code || '').toString().trim().toUpperCase())).length;
      const newGTCount = coaAccounts.filter(a => !existingGTCodes.has((a.code || '').toString().trim().toUpperCase())).length;
      console.log(`  - COA (GT): ${updatedGTCount} accounts updated, ${newGTCount} new accounts added`);
      
      // Update Packaging (accounts)
      const existingPackagingAccountsRaw = await loadExistingData('accounts') || [];
      const existingPackagingAccounts = Array.isArray(existingPackagingAccountsRaw) ? existingPackagingAccountsRaw : [];
      const mergedPackagingAccounts = existingPackagingAccounts.map(existing => {
        const codeUpper = (existing.code || '').toString().trim().toUpperCase();
        const updated = updatedAccountsMap.get(codeUpper);
        if (updated) {
          // Update balance from COA data
          return { ...existing, balance: updated.balance };
        }
        return existing;
      });
      // Add new accounts that don't exist yet
      const existingPackagingCodes = new Set(mergedPackagingAccounts.map(a => (a.code || '').toString().trim().toUpperCase()));
      coaAccounts.forEach(newAccount => {
        const codeUpper = (newAccount.code || '').toString().trim().toUpperCase();
        if (!existingPackagingCodes.has(codeUpper)) {
          mergedPackagingAccounts.push(newAccount);
        }
      });
      await saveToStorage('accounts', mergedPackagingAccounts);
      const updatedPackagingCount = existingPackagingAccounts.filter(a => updatedAccountsMap.has((a.code || '').toString().trim().toUpperCase())).length;
      const newPackagingCount = coaAccounts.filter(a => !existingPackagingCodes.has((a.code || '').toString().trim().toUpperCase())).length;
      console.log(`  - COA (Packaging): ${updatedPackagingCount} accounts updated, ${newPackagingCount} new accounts added`);
    }

    console.log('\n✓ Seed completed successfully!');
    console.log(`  - Staff: ${staff.length} records`);
    console.log(`  - Customers: ${customers.length} records`);
    console.log(`  - Suppliers: ${suppliers.length} records`);
    console.log(`  - Products: ${products.length} records`);
    if (salesItems.length > 0) {
      console.log(`  - Sales Items: ${salesItems.length} new products added`);
    }
    console.log(`  - Materials: ${materials.length} records`);
    console.log(`  - BOM Items: ${bomItems.length} records`);
    console.log(`  - User Access: ${userAccess.length} records`);
    if (coaAccounts.length > 0) {
      console.log(`  - COA: ${coaAccounts.length} accounts loaded`);
    }
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

// Seed User Access Control
async function seedUserAccess() {
  console.log('Seeding User Access Control...');
  
  const timestamp = new Date().toISOString();
  
  // Helper to get all menu IDs for a business unit
  function getAllMenuIds(businessId) {
    const config = {
      packaging: [
        '/packaging/master/products',
        '/packaging/master/materials',
        '/packaging/master/customers',
        '/packaging/master/suppliers',
        '/packaging/master/inventory',
        '/packaging/workflow',
        '/packaging/sales-orders',
        '/packaging/ppic',
        '/packaging/purchasing',
        '/packaging/production',
        '/packaging/qa-qc',
        '/packaging/delivery-note',
        '/packaging/finance/ledger',
        '/packaging/finance/reports',
        '/packaging/finance/invoices',
        '/packaging/finance/accounting',
        '/packaging/finance/ar',
        '/packaging/finance/ap',
        '/packaging/finance/payments',
        '/packaging/finance/tax-management',
        '/packaging/finance/cost-analysis',
        '/packaging/finance/all-business-reports',
        '/packaging/finance/coa',
        '/packaging/hr',
        '/packaging/settings',
        '/packaging/settings/report',
        '/packaging/settings/db-activity',
        '/packaging/settings/test-automation',
        '/packaging/settings/user-control',
      ],
      'general-trading': [
        '/general-trading/dashboard',
        '/general-trading/master/products',
        '/general-trading/master/customers',
        '/general-trading/master/suppliers',
        '/general-trading/master/inventory',
        '/general-trading/orders/sales',
        '/general-trading/orders/purchase',
        '/general-trading/ppic',
        '/general-trading/production',
        '/general-trading/qa-qc',
        '/general-trading/sales/quotations',
        '/general-trading/sales/invoices',
        '/general-trading/purchasing/pr',
        '/general-trading/purchasing/po',
        '/general-trading/purchasing',
        '/general-trading/warehouse/stock',
        '/general-trading/warehouse/receiving',
        '/general-trading/warehouse/shipping',
        '/general-trading/delivery-note',
        '/general-trading/finance/ledger',
        '/general-trading/finance/reports',
        '/general-trading/finance/accounting',
        '/general-trading/finance/ar',
        '/general-trading/finance/ap',
        '/general-trading/finance/payments',
        '/general-trading/finance/coa',
        '/general-trading/settings',
      ],
      tracking: [
        '/tracking/dashboard',
        '/tracking/master/vehicles',
        '/tracking/master/drivers',
        '/tracking/master/routes',
        '/tracking/master/customers',
        '/tracking/shipments/delivery-orders',
        '/tracking/shipments/tracking',
        '/tracking/tracking/realtime',
        '/tracking/tracking/status',
        '/tracking/schedules/route-planning',
        '/tracking/schedules/delivery',
        '/tracking/finance/billing',
        '/tracking/finance/payments',
        '/tracking/finance/pettycash',
        '/tracking/settings',
      ],
    };
    return config[businessId] || [];
  }
  
  // Helper to get finance menu IDs for a business unit
  function getFinanceMenuIds(businessId) {
    const config = {
      packaging: [
        '/packaging/finance/ledger',
        '/packaging/finance/reports',
        '/packaging/finance/invoices',
        '/packaging/finance/accounting',
        '/packaging/finance/ar',
        '/packaging/finance/ap',
        '/packaging/finance/payments',
        '/packaging/finance/tax-management',
        '/packaging/finance/cost-analysis',
        '/packaging/finance/all-business-reports',
        '/packaging/finance/coa',
      ],
      'general-trading': [
        '/general-trading/finance/ledger',
        '/general-trading/finance/reports',
        '/general-trading/finance/accounting',
        '/general-trading/finance/ar',
        '/general-trading/finance/ap',
        '/general-trading/finance/payments',
        '/general-trading/finance/coa',
      ],
      tracking: [
        '/tracking/finance/billing',
        '/tracking/finance/payments',
        '/tracking/finance/pettycash',
      ],
    };
    return config[businessId] || [];
  }
  
  // Helper to map access description to menu IDs
  function mapAccessToMenus(access, businessUnits) {
    const menuAccess = {};
    
    businessUnits.forEach(businessId => {
      menuAccess[businessId] = [];
    });
    
    const accessLower = access.toLowerCase();
    
    // Full access all business units (ALI)
    if (accessLower.includes('full akses') && (accessLower.includes('packaging/trucking/general') || accessLower.includes('all'))) {
      businessUnits.forEach(businessId => {
        menuAccess[businessId] = getAllMenuIds(businessId);
      });
      return menuAccess;
    }
    
    // Full Access Accounting & Finance all (SUMAR)
    if (accessLower.includes('full access') && accessLower.includes('accounting & finance all')) {
      businessUnits.forEach(businessId => {
        menuAccess[businessId] = getFinanceMenuIds(businessId);
      });
      return menuAccess;
    }
    
    // Full access packaging
    if (accessLower.includes('full access packaging')) {
      menuAccess.packaging = getAllMenuIds('packaging');
      return menuAccess;
    }
    
    // Full access tracking/trucking
    if (accessLower.includes('trucking full') || accessLower.includes('tracking full') || accessLower.includes('unit bisnis tracking full')) {
      menuAccess.tracking = getAllMenuIds('tracking');
      return menuAccess;
    }
    
    // General Trading ALL
    if (accessLower.includes('general trading all')) {
      menuAccess['general-trading'] = getAllMenuIds('general-trading');
      return menuAccess;
    }
    
    // Finance category (all finance menus for that business)
    if (accessLower.includes('finance category')) {
      if (accessLower.includes('packaging')) {
        menuAccess.packaging = getFinanceMenuIds('packaging');
      } else if (accessLower.includes('gt') || accessLower.includes('general trading')) {
        menuAccess['general-trading'] = getFinanceMenuIds('general-trading');
      }
      return menuAccess;
    }
    
    // Accounting + Finance category
    if (accessLower.includes('accounting') && accessLower.includes('finance category')) {
      if (accessLower.includes('packaging')) {
        menuAccess.packaging = [
          '/packaging/finance/accounting',
          ...getFinanceMenuIds('packaging'),
        ];
      } else if (accessLower.includes('gt') || accessLower.includes('general trading')) {
        menuAccess['general-trading'] = [
          '/general-trading/finance/accounting',
          ...getFinanceMenuIds('general-trading'),
        ];
      }
      return menuAccess;
    }
    
    // Specific menu access
    businessUnits.forEach(businessId => {
      const menus = [];
      
      if (accessLower.includes('sales order') && businessId === 'packaging') {
        menus.push('/packaging/sales-orders');
      }
      if (accessLower.includes('ppic') && businessId === 'packaging') {
        menus.push('/packaging/ppic');
      }
      if (accessLower.includes('purchasing') && !accessLower.includes('gt') && businessId === 'packaging') {
        menus.push('/packaging/purchasing');
      }
      if (accessLower.includes('purchasing') && (accessLower.includes('gt') || accessLower.includes('general trading')) && businessId === 'general-trading') {
        menus.push('/general-trading/purchasing');
      }
      if (accessLower.includes('hrd') && businessId === 'packaging') {
        menus.push('/packaging/hr');
      }
      if ((accessLower.includes('wh/delivery') || accessLower.includes('wh & delivery')) && businessId === 'packaging') {
        menus.push('/packaging/delivery-note');
      }
      if ((accessLower.includes('wh/delivery') || accessLower.includes('wh & delivery')) && businessId === 'general-trading') {
        menus.push('/general-trading/delivery-note');
      }
      if (accessLower.includes('qa/qc') && businessId === 'packaging') {
        menus.push('/packaging/qa-qc');
      }
      if (accessLower.includes('production') && businessId === 'packaging') {
        menus.push('/packaging/production');
      }
      if (accessLower.includes('finance') && !accessLower.includes('accounting') && businessId === 'packaging') {
        menus.push(...getFinanceMenuIds('packaging'));
      }
      if (accessLower.includes('accounting') && businessId === 'packaging') {
        menus.push('/packaging/finance/accounting');
      }
      if (accessLower.includes('invoice') && businessId === 'packaging') {
        menus.push('/packaging/finance/invoices');
      }
      if (accessLower.includes('accounting & finance') && businessId === 'general-trading') {
        menus.push(...getFinanceMenuIds('general-trading'));
      }
      
      if (menus.length > 0) {
        menuAccess[businessId] = menus;
      }
    });
    
    return menuAccess;
  }
  
  const users = [
    {
      fullName: 'ALI',
      username: 'ALI',
      role: 'Owner',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging', 'general-trading', 'tracking'],
      defaultBusiness: 'packaging', // Full access bisa pilih
      access: 'Full akses (Packaging/trucking/general)',
    },
    {
      fullName: 'RATMO',
      username: 'RATMO',
      role: 'Ops',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'Full Access Packaging',
    },
    {
      fullName: 'DANI',
      username: 'DANI',
      role: 'Ops',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'Full Access Packaging',
    },
    {
      fullName: 'LINA',
      username: 'LINA',
      role: 'Sales Admin',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'Sales order Packaging',
    },
    {
      fullName: 'DWI',
      username: 'DWI',
      role: 'PPIC',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'PPIC Packaging',
    },
    {
      fullName: 'HARYATI',
      username: 'HARYATI',
      role: 'Purchasing',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'Purchasing Packaging',
    },
    {
      fullName: 'NOVI',
      username: 'NOVI',
      role: 'HRD',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'HRD',
    },
    {
      fullName: 'ZIDANE',
      username: 'ZIDANE',
      role: 'WH',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'WH/Delivery Packaging',
    },
    {
      fullName: 'SYAKILA',
      username: 'SYAKILA',
      role: 'QC',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'QA/QC Packaging',
    },
    {
      fullName: 'ROFIK',
      username: 'ROFIK',
      role: 'Production H',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'Production Packaging',
    },
    {
      fullName: 'ULFAH',
      username: 'ULFAH',
      role: 'Finance',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'Packaging finance category',
    },
    {
      fullName: 'SYIFA',
      username: 'SYIFA',
      role: 'Accounting',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging'],
      defaultBusiness: 'packaging',
      access: 'Accounting Packaging-Finance Category',
    },
    {
      fullName: 'SEPULOH',
      username: 'SEPULOH',
      role: 'Admin GT',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['general-trading'],
      defaultBusiness: 'general-trading',
      access: 'GENERAL TRADING ALL',
    },
    {
      fullName: 'AGUNG',
      username: 'AGUNG',
      role: 'Purchasing',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['general-trading'],
      defaultBusiness: 'general-trading',
      access: 'Purchasing GT',
    },
    {
      fullName: 'DEDI',
      username: 'DEDI',
      role: 'WH Ops',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['general-trading'],
      defaultBusiness: 'general-trading',
      access: 'WH/Delivery GT',
    },
    {
      fullName: 'LIN-LIN',
      username: 'LIN-LIN',
      role: 'Accounting & Finance',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['general-trading'],
      defaultBusiness: 'general-trading',
      access: 'GT (General Trading) Finance category',
    },
    {
      fullName: 'PRASETIO',
      username: 'PRASETIO',
      role: 'Operational Head',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['tracking'],
      defaultBusiness: 'tracking',
      access: 'Trucking Full',
    },
    {
      fullName: 'NIA',
      username: 'NIA',
      role: 'admin trucking',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['tracking'],
      defaultBusiness: 'tracking',
      access: 'Unit bisnis tracking full',
    },
    {
      fullName: 'SUMAR',
      username: 'SUMAR',
      role: 'Ka. Keuangan (Head of Finance)',
      accessCode: '1234',
      isActive: true,
      businessUnits: ['packaging', 'general-trading', 'tracking'],
      defaultBusiness: 'packaging', // Full access bisa pilih
      access: 'Full Access (Accounting & Finance all - Packaging/Trucking/General)',
    },
  ];
  
  const userAccessList = users.map((user, index) => {
    const menuAccess = mapAccessToMenus(user.access, user.businessUnits);
    
    // Add settings company access for all business units that user has access to
    user.businessUnits.forEach(businessId => {
      if (!menuAccess[businessId]) {
        menuAccess[businessId] = [];
      }
      
      // Add settings company if not already included
      const settingsPath = businessId === 'packaging' 
        ? '/packaging/settings'
        : businessId === 'general-trading'
        ? '/general-trading/settings'
        : '/tracking/settings';
      
      if (!menuAccess[businessId].includes(settingsPath)) {
        menuAccess[businessId].push(settingsPath);
      }
    });
    
    return {
      id: `usr-${Date.now()}-${index}`,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      accessCode: user.accessCode,
      isActive: user.isActive,
      businessUnits: user.businessUnits,
      defaultBusiness: user.defaultBusiness,
      menuAccess: menuAccess,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
  
  console.log(`Created ${userAccessList.length} user access records`);
  return userAccessList;
}

// Run seed
if (require.main === module) {
  seed();
}

module.exports = { seed, seedKaryawan, seedCustomers, seedSuppliers, seedProducts, seedMaterials, seedBOM, seedUserAccess, seedCOA, seedStockOpname };

