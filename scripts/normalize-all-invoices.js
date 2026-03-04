/**
 * Normalize all invoice JSON files (Packaging, GT, Trucking) to unified structure
 * 
 * Unified Invoice Structure:
 * {
 *   "invoiceNo": "string",
 *   "soNo": "string",
 *   "sjNo": "string",
 *   "customer": "string",
 *   "created": "ISO date string",
 *   "status": "OPEN|CLOSE|VOID",
 *   "paymentStatus": "OPEN|CLOSE",
 *   "notes": "string",
 *   "lines": [
 *     {
 *       "itemSku": "string",
 *       "itemName": "string",
 *       "qty": number,
 *       "unit": "string",
 *       "price": number,
 *       "total": number,
 *       "discount": number (optional),
 *       "soNo": "string (optional)"
 *     }
 *   ],
 *   "bom": {
 *     "subtotal": number,
 *     "discount": number,
 *     "tax": number,
 *     "total": number,
 *     "taxPercent": number,
 *     "discountPercent": number,
 *     "biayaLain": number (optional),
 *     "tanggalJt": "ISO date string (optional)",
 *     "dpPo": number (optional),
 *     "tunai": number (optional),
 *     "kredit": number (optional)
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

// Helper function to normalize a single invoice
function normalizeInvoice(invoice) {
  if (!invoice) return null;

  // Transform items to lines format
  let lines = [];
  
  // Priority 1: Use existing lines
  if (Array.isArray(invoice.lines) && invoice.lines.length > 0) {
    lines = invoice.lines.map(line => ({
      itemSku: line.itemSku || line.productKode || line.sku || line.kode || '',
      itemName: line.itemName || line.productName || line.nama || '',
      qty: Number(line.qty || 0),
      unit: line.unit || 'PCS',
      price: Number(line.price || 0),
      total: Number(line.total || line.totalAkhir || 0),
      discount: Number(line.discount || 0),
      soNo: line.soNo || invoice.soNo || '',
    }));
  }
  // Priority 2: Transform items to lines
  else if (Array.isArray(invoice.items) && invoice.items.length > 0) {
    lines = invoice.items.map(item => ({
      itemSku: item.productKode || item.itemSku || item.sku || item.kode || '',
      itemName: item.productName || item.itemName || item.nama || '',
      qty: Number(item.qty || 0),
      unit: item.unit || 'PCS',
      price: Number(item.price || 0),
      total: Number(item.total || item.totalAkhir || 0),
      discount: Number(item.discount || 0),
      soNo: item.soNo || invoice.soNo || '',
    }));
  }

  // Normalize BOM
  const bom = invoice.bom || {};
  const normalizedBom = {
    subtotal: Number(bom.subtotal || bom.subTotal || 0),
    discount: Number(bom.discount || 0),
    tax: Number(bom.tax || bom.ppn || 0),
    total: Number(bom.total || 0),
    taxPercent: Number(bom.taxPercent || bom.tax_percent || 0),
    discountPercent: Number(bom.discountPercent || bom.discount_percent || 0),
  };

  // Add optional BOM fields if they exist
  if (bom.biayaLain !== undefined) normalizedBom.biayaLain = Number(bom.biayaLain);
  if (bom.tanggalJt !== undefined) normalizedBom.tanggalJt = bom.tanggalJt;
  if (bom.dpPo !== undefined) normalizedBom.dpPo = Number(bom.dpPo);
  if (bom.tunai !== undefined) normalizedBom.tunai = Number(bom.tunai);
  if (bom.kredit !== undefined) normalizedBom.kredit = Number(bom.kredit);
  if (bom.kDebet !== undefined) normalizedBom.kDebet = Number(bom.kDebet);
  if (bom.kKredit !== undefined) normalizedBom.kKredit = Number(bom.kKredit);
  if (bom.kembaliKeKasir !== undefined) normalizedBom.kembaliKeKasir = Number(bom.kembaliKeKasir);
  if (bom.topDays !== undefined) normalizedBom.topDays = Number(bom.topDays);
  if (bom.tandaTangan !== undefined) normalizedBom.tandaTangan = bom.tandaTangan;

  // Normalize notes/keterangan
  const notes = invoice.notes || invoice.keterangan || '';

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
    notes: notes,
    lines: lines,
    bom: normalizedBom,
  };

  // Add optional fields if they exist
  if (invoice.paymentTerms !== undefined) normalized.paymentTerms = invoice.paymentTerms;
  if (invoice.topDays !== undefined) normalized.topDays = Number(invoice.topDays);
  if (invoice.templateType !== undefined) normalized.templateType = invoice.templateType;
  if (invoice.paymentProofId !== undefined) normalized.paymentProofId = invoice.paymentProofId;
  if (invoice.paymentProofName !== undefined) normalized.paymentProofName = invoice.paymentProofName;

  return normalized;
}

// Main function
async function normalizeAllInvoices() {
  console.log('🔄 Starting invoice normalization...\n');

  const invoiceFiles = [
    'scripts/master/packaging/invoices.json',
    'scripts/master/gt/gt_invoices.json',
    'scripts/master/trucking/trucking_invoices.json',
  ];

  let totalProcessed = 0;
  let totalNormalized = 0;

  for (const filePath of invoiceFiles) {
    const fullPath = path.join(__dirname, '..', filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
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
        const result = normalizeInvoice(inv);
        if (result) totalNormalized++;
        return result;
      }).filter(inv => inv !== null);

      // Write back to file
      fs.writeFileSync(fullPath, JSON.stringify(normalized, null, 2), 'utf-8');
      console.log(`   ✅ Normalized ${normalized.length} invoices\n`);

      totalProcessed += invoices.length;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message, '\n');
    }
  }

  console.log('✅ Invoice normalization complete!');
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   Total normalized: ${totalNormalized}`);
}

// Run
normalizeAllInvoices().catch(console.error);
