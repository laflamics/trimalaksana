/**
 * Add 'product' field to trucking invoices lines
 * Template butuh field ini untuk render nama item dengan benar
 */

const fs = require('fs');
const path = require('path');

// Read the trucking invoices
const inputFile = path.join(__dirname, 'master/trucking/trucking_invoices.json');
const outputFile = path.join(__dirname, 'master/trucking/trucking_invoices_with_product.json');

console.log('📖 Reading trucking invoices from:', inputFile);
const rawData = fs.readFileSync(inputFile, 'utf8');
const invoices = JSON.parse(rawData);

console.log(`✅ Loaded ${invoices.length} invoices`);

// Add product field to each line
const updatedInvoices = invoices.map((inv, idx) => {
  try {
    const updatedLines = (inv.lines || []).map((line, lineIdx) => ({
      ...line,
      product: line.product || line.itemName || 'JASA ANGKUTAN', // Add product field
    }));

    const updated = {
      ...inv,
      lines: updatedLines,
    };

    // Log first few invoices untuk verify
    if (idx < 2) {
      console.log(`\n📋 Invoice ${idx + 1}: ${inv.invoiceNo}`);
      console.log(`   Lines: ${updatedLines.length}`);
      updatedLines.slice(0, 2).forEach((line, i) => {
        console.log(`   Line ${i + 1}: ${line.itemSku} → ${line.product}`);
      });
    }

    return updated;
  } catch (error) {
    console.error(`❌ Error processing invoice ${idx}: ${error.message}`);
    return inv;
  }
});

// Write updated invoices
fs.writeFileSync(outputFile, JSON.stringify(updatedInvoices, null, 2), 'utf8');
console.log(`\n✅ Updated invoices saved to: ${outputFile}`);
console.log(`📊 Total invoices updated: ${updatedInvoices.length}`);

// Verify
const sampleInvoice = updatedInvoices[0];
console.log(`\n🔍 Sample invoice (first one):`);
console.log(`   invoiceNo: ${sampleInvoice.invoiceNo}`);
console.log(`   lines[0].itemSku: ${sampleInvoice.lines[0]?.itemSku}`);
console.log(`   lines[0].itemName: ${sampleInvoice.lines[0]?.itemName}`);
console.log(`   lines[0].product: ${sampleInvoice.lines[0]?.product}`);
