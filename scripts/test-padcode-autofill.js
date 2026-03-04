/**
 * Test script untuk fitur auto-fill padCode dari customer kode
 * 
 * Scenario:
 * 1. Ada product dengan customer tapi padCode kosong
 * 2. Saat save, padCode harus otomatis terisi dengan kode customer
 * 3. Jika padCode sudah ada, jangan ubah
 */

const fs = require('fs');
const path = require('path');

// Mock data
const mockCustomers = [
  { id: '1', kode: 'CUST001', nama: 'PT Maju Jaya' },
  { id: '2', kode: 'CUST002', nama: 'CV Sukses Bersama' },
  { id: '3', kode: 'CUST003', nama: 'UD Berkah' },
];

const mockProducts = [
  {
    id: '1',
    kode: 'PROD001',
    nama: 'Product A',
    customer: 'PT Maju Jaya',
    padCode: '', // Kosong - harus di-fill dengan CUST001
  },
  {
    id: '2',
    kode: 'PROD002',
    nama: 'Product B',
    customer: 'CV Sukses Bersama',
    padCode: '', // Kosong - harus di-fill dengan CUST002
  },
  {
    id: '3',
    kode: 'PROD003',
    nama: 'Product C',
    customer: 'UD Berkah',
    padCode: 'CUSTOM_PAD', // Sudah ada - jangan ubah
  },
  {
    id: '4',
    kode: 'PROD004',
    nama: 'Product D',
    customer: '', // Tidak ada customer - padCode tetap kosong
    padCode: '',
  },
];

// Helper function - sama seperti di Products.tsx
function autofillPadCodeFromCustomer(product, customers) {
  // Jika padCode sudah ada, jangan ubah
  if (product.padCode && product.padCode.trim()) {
    return product;
  }

  // Ambil nama customer dari product
  const customerName = (product.customer || product.supplier || '').trim();
  
  if (!customerName) {
    // Tidak ada customer, return as-is
    return product;
  }

  // Cari customer berdasarkan nama
  const customer = customers.find(c => 
    c.nama && c.nama.toLowerCase() === customerName.toLowerCase()
  );

  if (!customer || !customer.kode) {
    // Customer tidak ditemukan atau tidak punya kode
    return product;
  }

  // Return product dengan padCode yang sudah di-fill dari customer kode
  return {
    ...product,
    padCode: customer.kode.trim(),
  };
}

// Test cases
console.log('🧪 Testing Auto-fill padCode Feature\n');
console.log('=' .repeat(60));

let passedTests = 0;
let failedTests = 0;

mockProducts.forEach((product, idx) => {
  console.log(`\n📦 Test Case ${idx + 1}: ${product.nama}`);
  console.log(`   Customer: ${product.customer || '(none)'}`);
  console.log(`   padCode Before: "${product.padCode}"`);

  const updated = autofillPadCodeFromCustomer(product, mockCustomers);
  console.log(`   padCode After: "${updated.padCode}"`);

  // Validate
  let testPassed = false;
  let reason = '';

  if (idx === 0) {
    // Product A - harus di-fill dengan CUST001
    testPassed = updated.padCode === 'CUST001';
    reason = testPassed ? '✅ Correctly filled from customer kode' : '❌ Should be CUST001';
  } else if (idx === 1) {
    // Product B - harus di-fill dengan CUST002
    testPassed = updated.padCode === 'CUST002';
    reason = testPassed ? '✅ Correctly filled from customer kode' : '❌ Should be CUST002';
  } else if (idx === 2) {
    // Product C - sudah ada, jangan ubah
    testPassed = updated.padCode === 'CUSTOM_PAD';
    reason = testPassed ? '✅ Correctly preserved existing padCode' : '❌ Should not change existing padCode';
  } else if (idx === 3) {
    // Product D - tidak ada customer, tetap kosong
    testPassed = updated.padCode === '';
    reason = testPassed ? '✅ Correctly kept empty (no customer)' : '❌ Should remain empty';
  }

  console.log(`   Result: ${reason}`);

  if (testPassed) {
    passedTests++;
  } else {
    failedTests++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Summary:`);
console.log(`   ✅ Passed: ${passedTests}`);
console.log(`   ❌ Failed: ${failedTests}`);
console.log(`   Total: ${passedTests + failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 All tests passed! Feature is working correctly.\n');
  process.exit(0);
} else {
  console.log('\n⚠️ Some tests failed. Please review the implementation.\n');
  process.exit(1);
}
