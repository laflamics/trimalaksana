/**
 * Finance COA, Ledger, and Business Reports Integration Test
 * Tests COA linking, journal entries, and business reports data accuracy
 */

// Mock browser environment for Node.js execution
global.window = {
  localStorage: {
    data: {},
    getItem(key) {
      return this.data[key] || null;
    },
    setItem(key, value) {
      this.data[key] = value;
    },
    removeItem(key) {
      delete this.data[key];
    },
    clear() {
      this.data = {};
    }
  }
};

// Mock storage service
const storageService = {
  async get(key) {
    const data = global.window.localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  
  async set(key, value) {
    global.window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  }
};

// Setup COA and test data
async function setupCOATestData() {
  console.log('📋 Setting up COA and Finance test data...');
  
  // Setup Chart of Accounts for all modules
  const packagingAccounts = [
    { code: '1-1110', name: 'KAS PETTY CASH', type: 'Asset', balance: 1000000 },
    { code: '1-1210', name: 'PIUTANG USAHA', type: 'Asset', balance: 5000000 },
    { code: '1-2000', name: 'PERSEDIAAN', type: 'Asset', balance: 10000000 },
    { code: '2-1101', name: 'HUTANG USAHA', type: 'Liability', balance: 3000000 },
    { code: '2-4110', name: 'PPN KELUARAN', type: 'Liability', balance: 500000 },
    { code: '3-1000', name: 'MODAL', type: 'Equity', balance: 10000000 },
    { code: '3-2000', name: 'LABA DITAHAN', type: 'Equity', balance: 2000000 },
    { code: '4-1100', name: 'PENDAPATAN JUAL', type: 'Revenue', balance: 0 },
    { code: '5-1300', name: 'HARGA POKOK PENJUALAN', type: 'Expense', balance: 0 },
    { code: '6-1100', name: 'BIAYA LISTRIK/AIR/TELEPON', type: 'Expense', balance: 0 }
  ];
  
  const gtAccounts = [
    { code: '1-1110', name: 'KAS PETTY CASH', type: 'Asset', balance: 800000 },
    { code: '1-1210', name: 'PIUTANG USAHA', type: 'Asset', balance: 3000000 },
    { code: '1-2000', name: 'PERSEDIAAN', type: 'Asset', balance: 8000000 },
    { code: '2-1101', name: 'HUTANG USAHA', type: 'Liability', balance: 2500000 },
    { code: '2-4110', name: 'PPN KELUARAN', type: 'Liability', balance: 300000 },
    { code: '3-1000', name: 'MODAL', type: 'Equity', balance: 8000000 },
    { code: '3-2000', name: 'LABA DITAHAN', type: 'Equity', balance: 1000000 },
    { code: '4-1100', name: 'PENDAPATAN JUAL', type: 'Revenue', balance: 0 },
    { code: '5-1300', name: 'HARGA POKOK PENJUALAN', type: 'Expense', balance: 0 },
    { code: '6-1100', name: 'BIAYA LISTRIK/AIR/TELEPON', type: 'Expense', balance: 0 }
  ];
  
  const truckingAccounts = [
    { code: '1-1110', name: 'KAS PETTY CASH', type: 'Asset', balance: 500000 },
    { code: '1-1210', name: 'PIUTANG USAHA', type: 'Asset', balance: 2000000 },
    { code: '1-5300', name: 'KENDARAAN', type: 'Asset', balance: 50000000 },
    { code: '2-1101', name: 'HUTANG USAHA', type: 'Liability', balance: 1500000 }
  ]}