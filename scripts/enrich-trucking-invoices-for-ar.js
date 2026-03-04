/**
 * Enrich Trucking Invoices dengan field yang dibutuhkan AR
 * Tambah: invoiceDate, paidAmount, paidDate, paymentProof
 * Keep: semua field yang sudah ada
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'master/trucking/trucking_invoices.json');
const outputFile = path.join(__dirname, 'master/trucking/trucking_invoices.json');

console.log('Reading trucking invoices...');
const rawData = fs.readFileSync(inputFile, 'utf8');
const invoices = JSON.parse(rawData);

console.log(`Found ${invoices.length} invoices`);

// Enrich function
function enrichInvoice(inv) {
  return {
    // Keep semua field yang sudah ada
    ...inv,
    
    // Tambah field yang kurang untuk AR
    invoiceDate: inv.invoiceDate || inv.created || new Date().toISOString().split('T')[0],
    paidAmount: inv.paidAmount !== undefined ? inv.paidAmount : 0,
    paidDate: inv.paidDate || '',
    paymentProof: inv.paymentProof || '',
    
    // Ensure bom structure lengkap
    bom: {
      subtotal: inv.bom?.subtotal || 0,
      discount: inv.bom?.discount || 0,
      discountPercent: inv.bom?.discountPercent || 0,
      tax: inv.bom?.tax || 0,
      taxPercent: inv.bom?.taxPercent || 11,
      biayaLain: inv.bom?.biayaLain || 0,
      total: inv.bom?.total || 0,
      paymentTerms: inv.bom?.paymentTerms || 'TOP',
      topDays: inv.bom?.topDays || inv.topDays || 30,
      sjNo: inv.bom?.sjNo || inv.sjNo || '',
      doNo: inv.bom?.doNo || inv.doNo || '',
      poData: inv.bom?.poData || { topDays: inv.bom?.topDays || inv.topDays || 30 }
    }
  };
}

// Enrich semua invoices
console.log('Enriching invoices...');
const enrichedInvoices = invoices.map(enrichInvoice);

// Write output
console.log(`Writing ${enrichedInvoices.length} enriched invoices...`);
fs.writeFileSync(outputFile, JSON.stringify(enrichedInvoices, null, 2), 'utf8');

console.log('✅ Enrichment complete!');
console.log(`Output: ${outputFile}`);

// Show sample
console.log('\n📋 Sample enriched invoice:');
console.log(JSON.stringify(enrichedInvoices[0], null, 2));
