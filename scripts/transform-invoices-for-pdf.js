#!/usr/bin/env node

/**
 * Transform invoices from items format to lines format for PDF generation
 * The PDF generator expects item.lines with itemSku, productName, etc.
 * But our invoices have item.items with productKode, productName, etc.
 */

const fs = require('fs');
const path = require('path');

const invoicesFile = path.resolve(__dirname, '../public/import-output/invoices.json');

try {
  console.log('📖 Reading invoices.json...');
  const invoices = JSON.parse(fs.readFileSync(invoicesFile, 'utf-8'));

  if (!Array.isArray(invoices)) {
    throw new Error('Invoices must be an array');
  }

  console.log(`📊 Found ${invoices.length} invoices`);

  // Transform each invoice
  const transformed = invoices.map(inv => {
    // Transform items to lines format
    const lines = (inv.items || []).map(item => ({
      itemSku: item.productKode || item.itemSku || '',
      productName: item.productName || '',
      qty: item.qty || 0,
      unit: item.unit || '',
      price: item.price || 0,
      total: item.total || 0,
      tax: item.tax || 0,
      totalAkhir: item.totalAkhir || 0,
    }));

    // Preserve all original fields and add lines
    return {
      ...inv,
      lines: lines,
      // Keep items for backward compatibility
      items: lines,
    };
  });

  // Write back
  fs.writeFileSync(invoicesFile, JSON.stringify(transformed, null, 2));
  console.log(`✅ Transformed ${transformed.length} invoices`);
  console.log(`📝 Updated: ${invoicesFile}`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
