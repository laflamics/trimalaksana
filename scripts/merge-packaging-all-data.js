const fs = require('fs');
const path = require('path');

console.log('🔄 Merging packaging data (Sales Orders, Delivery Notes, Invoices)...\n');

// Define file pairs to merge
const filePairs = [
  {
    name: 'Sales Orders',
    file1: 'master/packaging/salesOrders.json',
    file2: 'master/master2/import-output/salesOrders.json',
    key: 'soNo'
  },
  {
    name: 'Delivery Notes',
    file1: 'master/packaging/deliveryNotes.json',
    file2: 'master/master2/import-output/deliveryNotes.json',
    key: 'sjNo'
  },
  {
    name: 'Invoices',
    file1: 'master/packaging/invoices.json',
    file2: 'master/master2/import-output/invoices.json',
    key: 'invoiceNo',
    normalize: true
  }
];

filePairs.forEach(pair => {
  console.log(`\n📄 Processing: ${pair.name}`);
  
  const file1Path = path.join(__dirname, pair.file1);
  const file2Path = path.join(__dirname, pair.file2);
  
  let data1 = [];
  let data2 = [];
  
  try {
    if (fs.existsSync(file1Path)) {
      data1 = JSON.parse(fs.readFileSync(file1Path, 'utf8'));
      console.log(`   ✅ File 1: ${data1.length} items`);
    } else {
      console.log(`   ⚠️  File 1 not found`);
    }
  } catch (err) {
    console.error(`   ❌ Error reading file 1:`, err.message);
  }
  
  try {
    if (fs.existsSync(file2Path)) {
      data2 = JSON.parse(fs.readFileSync(file2Path, 'utf8'));
      console.log(`   ✅ File 2: ${data2.length} items`);
    } else {
      console.log(`   ⚠️  File 2 not found`);
    }
  } catch (err) {
    console.error(`   ❌ Error reading file 2:`, err.message);
  }
  
  // Merge and deduplicate by key
  const mergedMap = new Map();
  
  // Add from file 1
  data1.forEach(item => {
    if (item[pair.key]) {
      mergedMap.set(item[pair.key], item);
    }
  });
  
  // Add from file 2 (will overwrite if same key)
  data2.forEach(item => {
    if (item[pair.key]) {
      mergedMap.set(item[pair.key], item);
    }
  });
  
  let merged = Array.from(mergedMap.values());
  
  // Normalize invoices if needed
  if (pair.normalize) {
    merged = merged.map(inv => {
      // Transform items to lines if needed
      let lines = inv.lines || [];
      if (lines.length === 0 && inv.items && Array.isArray(inv.items)) {
        lines = inv.items.map(item => ({
          itemSku: item.productKode || item.itemSku || item.sku || item.kode || '',
          itemName: item.productName || item.itemName || item.nama || '',
          qty: Number(item.qty || 0),
          unit: item.unit || 'PCS',
          price: Number(item.price || 0),
          total: Number(item.total || item.totalAkhir || 0),
          discount: Number(item.discount || 0),
          soNo: item.soNo || inv.soNo || '',
        }));
      }
      
      // Transform keterangan to notes if needed
      const notes = inv.notes || inv.keterangan || '';
      
      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        soNo: inv.soNo,
        sjNo: inv.sjNo || inv.dlvNo || '',
        customer: inv.customer,
        created: inv.created,
        status: inv.status || 'OPEN',
        paymentStatus: inv.paymentStatus || 'OPEN',
        notes: notes,
        lines: lines,
        bom: inv.bom || {
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
          taxPercent: 0,
          discountPercent: 0,
          biayaLain: 0,
        },
      };
    });
  }
  
  // Sort by created/date
  merged.sort((a, b) => {
    const dateA = new Date(a.created || a.date || a.createdAt || 0);
    const dateB = new Date(b.created || b.date || b.createdAt || 0);
    return dateA - dateB;
  });
  
  // Write merged file
  fs.writeFileSync(file1Path, JSON.stringify(merged, null, 2));
  
  console.log(`   ✅ Merged: ${merged.length} items`);
  
  // Show date range
  const dates = [...new Set(merged.map(d => {
    const dateStr = d.created || d.date || d.createdAt;
    return dateStr ? new Date(dateStr).toISOString().split('T')[0] : null;
  }).filter(d => d))].sort();
  
  if (dates.length > 0) {
    console.log(`   📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
  }
});

console.log('\n✅ All merges completed!');
