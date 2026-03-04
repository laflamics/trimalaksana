/**
 * Integration test untuk fitur auto-fill padCode
 * Simulate data loading dan auto-fill process
 */

const fs = require('fs');

// Mock data - sama seperti di database
const mockCustomers = [
  { id: '1', kode: 'CUST001', nama: 'PT. KAWASAKI MOTOR INDONESIA' },
  { id: '2', kode: 'CUST002', nama: 'PT. SANOH INDONESIA' },
  { id: '3', kode: 'CUST003', nama: 'PT. CAC PUTRA PERKASA' },
  { id: '4', kode: 'CUST004', nama: 'PT. FLORA JAYA ABADI' },
];

const mockProducts = [
  {
    id: '1',
    kode: 'KRT00015',
    nama: 'BIG CARTON BOX 421X (K3120-0025)',
    customer: 'PT. KAWASAKI MOTOR INDONESIA',
    padCode: '', // Kosong - harus di-fill dengan CUST001
  },
  {
    id: '2',
    kode: 'KRT00023',
    nama: 'BIG CARTON BOX LX230 STD (K3120-0022)',
    customer: 'PT. KAWASAKI MOTOR INDONESIA',
    padCode: '', // Kosong - harus di-fill dengan CUST001
  },
  {
    id: '3',
    kode: 'KRT00050',
    nama: 'BOX 695 X 265 X 180 SNI 15',
    customer: 'PT. SANOH INDONESIA',
    padCode: '', // Kosong - harus di-fill dengan CUST002
  },
  {
    id: '4',
    kode: 'KRT00097',
    nama: 'CARTON BOX 1000X265X150',
    customer: 'PT. CAC PUTRA PERKASA',
    padCode: '', // Kosong - harus di-fill dengan CUST003
  },
  {
    id: '5',
    kode: 'KRT00103',
    nama: 'CARTON BOX 120 X 120 X 100 MM',
    customer: 'PT. FLORA JAYA ABADI',
    padCode: '', // Kosong - harus di-fill dengan CUST004
  },
  {
    id: '6',
    kode: 'KRT00131',
    nama: 'CARTON BOX 387X277X125 MM',
    customer: 'PT. CAC PUTRA PERKASA',
    padCode: '', // Kosong - harus di-fill dengan CUST003
  },
];

// Simulate auto-fill logic (sama seperti di useEffect)
function autofillPadCodes(products, customers) {
  console.log('\n🔄 Starting auto-fill process...\n');

  const productsNeedingFill = products.filter(p => {
    const hasCustomer = !!(p.customer || p.supplier);
    const padCodeEmpty = !p.padCode || p.padCode.trim() === '';
    return hasCustomer && padCodeEmpty;
  });

  console.log(`📊 Found ${productsNeedingFill.length} products needing padCode auto-fill\n`);

  const updatedProducts = products.map(p => {
    const hasCustomer = !!(p.customer || p.supplier);
    const padCodeEmpty = !p.padCode || p.padCode.trim() === '';

    if (!hasCustomer || !padCodeEmpty) {
      return p;
    }

    const customerName = (p.customer || p.supplier || '').trim();
    const customer = customers.find(c => 
      c.nama && c.nama.toLowerCase() === customerName.toLowerCase()
    );

    if (!customer || !customer.kode) {
      console.log(`❌ Customer not found for "${p.nama}"`);
      return p;
    }

    console.log(`✅ Auto-filled "${p.nama}": ${customer.kode}`);
    return {
      ...p,
      padCode: customer.kode.trim(),
    };
  });

  return updatedProducts;
}

// Run test
console.log('=' .repeat(80));
console.log('🧪 Integration Test: Auto-fill padCode Feature');
console.log('=' .repeat(80));

const result = autofillPadCodes(mockProducts, mockCustomers);

console.log('\n' + '=' .repeat(80));
console.log('📋 Results:\n');

let successCount = 0;
let failCount = 0;

result.forEach((product, idx) => {
  const original = mockProducts[idx];
  const changed = original.padCode !== product.padCode;
  
  if (changed && product.padCode) {
    console.log(`✅ ${product.kode}: "${product.nama}"`);
    console.log(`   Customer: ${product.customer}`);
    console.log(`   padCode: ${product.padCode}\n`);
    successCount++;
  } else if (!changed && !product.padCode) {
    console.log(`⚠️  ${product.kode}: No customer found\n`);
    failCount++;
  }
});

console.log('=' .repeat(80));
console.log(`\n📊 Summary:`);
console.log(`   ✅ Successfully filled: ${successCount}`);
console.log(`   ⚠️  Failed/No customer: ${failCount}`);
console.log(`   Total: ${result.length}\n`);

// Verify all products have padCode now
const allFilled = result.every(p => {
  if (p.customer) {
    return p.padCode && p.padCode.trim() !== '';
  }
  return true; // OK jika tidak ada customer
});

if (allFilled) {
  console.log('🎉 All products with customer have padCode filled!\n');
  process.exit(0);
} else {
  console.log('⚠️ Some products still missing padCode\n');
  process.exit(1);
}
