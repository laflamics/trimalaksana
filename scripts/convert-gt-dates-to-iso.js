const fs = require('fs');
const path = require('path');

// Helper to convert MM/DD/YY to ISO YYYY-MM-DD
function convertDateToISO(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  
  // If already ISO format, return as-is
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split('T')[0];
  }
  
  // If MM/DD/YY format, convert to ISO
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
}

// Process SO JSON
console.log('Converting SO dates and product fields...');
const soPath = path.join(__dirname, 'master/gt/gt_salesOrders.json');
const soData = JSON.parse(fs.readFileSync(soPath, 'utf8'));
soData.value.forEach(so => {
  so.created = convertDateToISO(so.created);
  // Convert items: product -> productName, itemSku -> productKode
  if (so.items && Array.isArray(so.items)) {
    so.items.forEach(item => {
      if (item.product && !item.productName) {
        item.productName = item.product;
        delete item.product;
      }
      if (item.itemSku && !item.productKode) {
        item.productKode = item.itemSku;
        item.productId = item.itemSku;
        delete item.itemSku;
      }
    });
  }
});
fs.writeFileSync(soPath, JSON.stringify(soData, null, 2), 'utf8');
console.log('✓ SO dates and product fields converted');

// Process DN JSON
console.log('Converting DN dates and product fields...');
const dnPath = path.join(__dirname, 'master/gt/gt_delivery.json');
const dnData = JSON.parse(fs.readFileSync(dnPath, 'utf8'));
dnData.value.forEach(dn => {
  dn.deliveryDate = convertDateToISO(dn.deliveryDate);
  // DN items already have correct format (product, productCode, qty, unit)
});
fs.writeFileSync(dnPath, JSON.stringify(dnData, null, 2), 'utf8');
console.log('✓ DN dates converted');

// Process Invoice JSON
console.log('Converting Invoice dates and product fields...');
const invPath = path.join(__dirname, 'master/gt/gt_invoices.json');
const invData = JSON.parse(fs.readFileSync(invPath, 'utf8'));
invData.value.forEach(inv => {
  inv.created = convertDateToISO(inv.created);
  inv.topDate = convertDateToISO(inv.topDate);
  // Convert items: productCode -> productKode, productName stays same
  if (inv.items && Array.isArray(inv.items)) {
    inv.items.forEach(item => {
      if (item.productCode && !item.productKode) {
        item.productKode = item.productCode;
        delete item.productCode;
      }
    });
  }
});
fs.writeFileSync(invPath, JSON.stringify(invData, null, 2), 'utf8');
console.log('✓ Invoice dates and product fields converted');

console.log('\n✓ All dates converted to ISO format (YYYY-MM-DD)');
console.log('✓ All product fields renamed (product->productName, itemSku->productKode)');
