/**
 * Transform GT Invoices dari format server ke format yang diexpektasi oleh Invoices.tsx
 * 
 * Format Lama (Server):
 * {
 *   items: [{ productCode, qty, unit, price, tax, totalAkhir, productName }],
 *   taxPercent: 11,
 *   discount: 0
 * }
 * 
 * Format Baru (Expected):
 * {
 *   lines: [{ itemSku, qty, unit, price, product }],
 *   bom: {
 *     subtotal, discount, tax, taxPercent, total, topDays, sjNo, soNo
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

// Read the old format invoices
const inputFile = path.join(__dirname, 'master/packaging/gt_invoices.json');
const outputFile = path.join(__dirname, 'master/packaging/gt_invoices_transformed.json');

console.log('📖 Reading invoices from:', inputFile);
const rawData = fs.readFileSync(inputFile, 'utf8');
const invoices = JSON.parse(rawData);

console.log(`✅ Loaded ${invoices.length} invoices`);

// Transform each invoice
const transformedInvoices = invoices.map((inv, idx) => {
  try {
    // Transform items array to lines array
    const lines = (inv.items || []).map(item => ({
      itemSku: item.productCode || '',
      qty: Number(item.qty || 0),
      unit: item.unit || 'PCS',
      price: Number(item.price || 0),
      product: item.productName || '',
    }));

    // Calculate subtotal dari items
    const subtotal = (inv.items || []).reduce((sum, item) => {
      return sum + (Number(item.qty || 0) * Number(item.price || 0));
    }, 0);

    // Calculate total tax dari items (jika ada tax per item)
    const totalTax = (inv.items || []).reduce((sum, item) => {
      return sum + (Number(item.tax || 0));
    }, 0);

    // Calculate total akhir dari items (jika ada totalAkhir per item)
    const totalAkhir = (inv.items || []).reduce((sum, item) => {
      return sum + (Number(item.totalAkhir || 0));
    }, 0);

    // Jika totalAkhir ada, gunakan itu sebagai total. Jika tidak, hitung dari subtotal + tax
    const total = totalAkhir > 0 ? totalAkhir : (subtotal + totalTax);

    // Build transformed invoice
    const transformed = {
      // Keep original fields
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      soNo: inv.soNo,
      soId: inv.soId || '',
      sjNo: inv.sjNo || '',
      customer: inv.customer,
      noFP: inv.noFP || '',
      status: inv.status || 'OPEN',
      created: inv.created || new Date().toISOString(),
      topDate: inv.topDate || inv.created || new Date().toISOString(),
      notes: inv.notes || '',
      timestamp: inv.timestamp || Date.now(),
      
      // New structure: lines array
      lines: lines,
      
      // New structure: bom object
      bom: {
        subtotal: subtotal,
        discount: Number(inv.discount || 0),
        discountPercent: inv.discountPercent || 0,
        tax: totalTax,
        taxPercent: Number(inv.taxPercent || 11),
        biayaLain: inv.biayaLain || 0,
        total: total,
        paymentTerms: inv.paymentTerms || 'TOP',
        topDays: inv.topDays || 30,
        sjNo: inv.sjNo || '',
        soNo: inv.soNo || '',
        soId: inv.soId || '',
        poData: {
          topDays: inv.topDays || 30,
        },
      },
      
      // Additional fields
      paymentTerms: inv.paymentTerms || 'TOP',
      topDays: inv.topDays || 30,
      templateType: inv.templateType || 'template1',
    };

    // Log first few invoices untuk verify
    if (idx < 3) {
      console.log(`\n📋 Invoice ${idx + 1}: ${inv.invoiceNo}`);
      console.log(`   Items: ${lines.length}`);
      console.log(`   Subtotal: Rp ${subtotal.toLocaleString('id-ID')}`);
      console.log(`   Tax: Rp ${totalTax.toLocaleString('id-ID')}`);
      console.log(`   Total: Rp ${total.toLocaleString('id-ID')}`);
    }

    return transformed;
  } catch (error) {
    console.error(`❌ Error transforming invoice ${idx}: ${error.message}`);
    return inv; // Return original jika error
  }
});

// Write transformed invoices
fs.writeFileSync(outputFile, JSON.stringify(transformedInvoices, null, 2), 'utf8');
console.log(`\n✅ Transformed invoices saved to: ${outputFile}`);
console.log(`📊 Total invoices transformed: ${transformedInvoices.length}`);

// Show summary
const totalSubtotal = transformedInvoices.reduce((sum, inv) => sum + (inv.bom?.subtotal || 0), 0);
const totalTax = transformedInvoices.reduce((sum, inv) => sum + (inv.bom?.tax || 0), 0);
const totalAmount = transformedInvoices.reduce((sum, inv) => sum + (inv.bom?.total || 0), 0);

console.log(`\n📈 Summary:`);
console.log(`   Total Subtotal: Rp ${totalSubtotal.toLocaleString('id-ID')}`);
console.log(`   Total Tax: Rp ${totalTax.toLocaleString('id-ID')}`);
console.log(`   Total Amount: Rp ${totalAmount.toLocaleString('id-ID')}`);
