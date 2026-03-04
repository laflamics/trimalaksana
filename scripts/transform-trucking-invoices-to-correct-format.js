/**
 * Transform Trucking Invoices dari format salah ke format yang diexpektasi oleh Trucking/Finance/invoices.tsx
 * 
 * Format Lama (Salah - sama kayak GT):
 * {
 *   items: [{ productCode, qty, unit, price, tax, totalAkhir, productName }],
 *   soNo: "",
 *   sjNo: "",
 *   taxPercent: 11
 * }
 * 
 * Format Baru (Benar - Trucking):
 * {
 *   lines: [{ itemSku, itemName, qty, unit, price, total, discount, pot }],
 *   doNo: string,
 *   sjNo: string,
 *   bom: {
 *     subtotal, discount, tax, taxPercent, total, topDays, sjNo, doNo
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

// Read the old format invoices
const inputFile = path.join(__dirname, 'master/packaging/trucking_invoices.json');
const outputFile = path.join(__dirname, 'master/packaging/trucking_invoices_transformed.json');

console.log('📖 Reading trucking invoices from:', inputFile);
const rawData = fs.readFileSync(inputFile, 'utf8');
const invoices = JSON.parse(rawData);

console.log(`✅ Loaded ${invoices.length} invoices`);

// Transform each invoice
const transformedInvoices = invoices.map((inv, idx) => {
  try {
    // Transform items array to lines array
    // Untuk trucking, setiap item adalah service/jasa angkutan
    const lines = (inv.items || []).map((item, lineIdx) => ({
      itemSku: item.productCode || `TRW${String(lineIdx + 1).padStart(5, '0')}`,
      itemName: item.productName || 'JASA ANGKUTAN',
      qty: Number(item.qty || 1),
      unit: item.unit || 'LOT',
      price: Number(item.price || 0),
      total: Number(item.total || 0),
      discount: Number(item.discount || 0),
      pot: 0, // Proof of Delivery - default 0, bisa di-update nanti
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
      sjNo: inv.sjNo || '',
      doNo: inv.doNo || inv.soNo || '', // Gunakan doNo jika ada, fallback ke soNo
      customer: inv.customer,
      customerAddress: inv.customerAddress || '',
      noFP: inv.noFP || '',
      status: inv.status || 'OPEN',
      created: inv.created || new Date().toISOString(),
      topDate: inv.topDate || inv.created || new Date().toISOString(),
      notes: inv.notes || '',
      timestamp: inv.timestamp || Date.now(),
      
      // New structure: lines array (untuk trucking)
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
        doNo: inv.doNo || inv.soNo || '',
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
