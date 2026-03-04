/**
 * Normalize Trucking invoices to match Packaging invoice structure
 * 
 * Transform from:
 * {
 *   "items": [{ "itemSku", "product", "qty", "unit", "price", "total", "tax", "totalAkhir" }],
 *   // NO "discount", NO "taxPercent", NO "notes", NO "lines", NO "bom"
 * }
 * 
 * To:
 * {
 *   "lines": [{ "itemSku", "itemName", "qty", "unit", "price", "total" }],
 *   "bom": { "subtotal", "discount", "tax", "total", "taxPercent", "discountPercent" },
 *   "notes": "string"
 * }
 */

const fs = require('fs');
const path = require('path');

function normalizeTruckingInvoice(invoice) {
  if (!invoice) return null;

  // Transform items to lines
  let lines = [];
  let totalTax = 0;
  let subtotal = 0;

  if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    lines = invoice.items.map(item => {
      const itemTotal = Number(item.total || 0);
      subtotal += itemTotal;
      totalTax += Number(item.tax || 0);

      return {
        itemSku: item.itemSku || item.sku || item.kode || '',
        itemName: item.product || item.productName || item.itemName || item.nama || '',
        qty: Number(item.qty || 0),
        unit: item.unit || 'LOT',
        price: Number(item.price || 0),
        total: itemTotal,
        discount: Number(item.discount || 0),
        soNo: item.soNo || invoice.soNo || '',
      };
    });
  }

  // Calculate discount (default 0 for trucking)
  const discount = Number(invoice.discount || 0);
  const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;

  // Calculate total
  const total = subtotal - discount + totalTax;

  // Build normalized invoice
  const normalized = {
    id: invoice.id || invoice.invoiceId || '',
    invoiceNo: invoice.invoiceNo || invoice.invNo || invoice.invoice_no || '',
    soNo: invoice.soNo || invoice.so_no || '',
    sjNo: invoice.sjNo || invoice.sj_no || invoice.dlvNo || '',
    customer: invoice.customer || invoice.customerName || '',
    created: invoice.created || invoice.createdAt || invoice.created_at || new Date().toISOString(),
    status: (invoice.status || 'OPEN').toUpperCase(),
    paymentStatus: (invoice.paymentStatus || invoice.payment_status || 'OPEN').toUpperCase(),
    notes: invoice.notes || invoice.keterangan || '',
    lines: lines,
    bom: {
      subtotal: subtotal,
      discount: discount,
      tax: totalTax,
      total: total,
      taxPercent: Number(invoice.taxPercent || 11),
      discountPercent: discountPercent,
    },
  };

  // Add optional fields if they exist
  if (invoice.paymentTerms !== undefined) normalized.paymentTerms = invoice.paymentTerms;
  if (invoice.topDays !== undefined) normalized.topDays = Number(invoice.topDays);
  if (invoice.templateType !== undefined) normalized.templateType = invoice.templateType;
  if (invoice.paymentProofId !== undefined) normalized.paymentProofId = invoice.paymentProofId;
  if (invoice.paymentProofName !== undefined) normalized.paymentProofName = invoice.paymentProofName;
  if (invoice.noFP !== undefined) normalized.noFP = invoice.noFP;
  if (invoice.topDate !== undefined) normalized.topDate = invoice.topDate;

  return normalized;
}

async function normalizeTruckingInvoices() {
  console.log('🔄 Starting Trucking invoice normalization...\n');

  const filePath = 'scripts/master/packaging/trucking_invoices.json';
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  try {
    console.log(`📄 Processing: ${filePath}`);
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    let invoices = JSON.parse(fileContent);

    // Ensure it's an array
    if (!Array.isArray(invoices)) {
      invoices = [invoices];
    }

    console.log(`   Found ${invoices.length} invoices`);

    // Normalize each invoice
    const normalized = invoices.map(inv => {
      const result = normalizeTruckingInvoice(inv);
      return result;
    }).filter(inv => inv !== null);

    // Write back to file
    fs.writeFileSync(fullPath, JSON.stringify(normalized, null, 2), 'utf-8');
    console.log(`   ✅ Normalized ${normalized.length} invoices\n`);

    // Show sample
    if (normalized.length > 0) {
      console.log('📋 Sample normalized invoice:');
      console.log(JSON.stringify(normalized[0], null, 2));
    }

    console.log('\n✅ Trucking invoice normalization complete!');
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Run
normalizeTruckingInvoices().catch(console.error);
