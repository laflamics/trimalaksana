#!/usr/bin/env node

/**
 * Fix Missing GT Invoice Notifications
 * 
 * Membuat invoice notifications untuk delivery notes yang sudah CLOSE tapi belum punya notification
 */

const fs = require('fs');

console.log('🔧 Fix Missing GT Invoice Notifications');
console.log('='.repeat(60));

// Helper functions
const readJsonFile = (path) => {
  try {
    if (!fs.existsSync(path)) {
      console.log(`❌ File not found: ${path}`);
      return null;
    }
    const content = fs.readFileSync(path, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.log(`❌ Error reading ${path}: ${e.message}`);
    return null;
  }
};

const writeJsonFile = (path, data) => {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`✅ Written ${path}`);
    return true;
  } catch (e) {
    console.log(`❌ Error writing ${path}: ${e.message}`);
    return false;
  }
};

const extractStorageValue = (data) => {
  if (!data) return [];
  if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
    const extracted = data.value;
    return Array.isArray(extracted) ? extracted : [];
  }
  return Array.isArray(data) ? data : [];
};

const filterActiveItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.filter(item => !item.deleted);
};

console.log('📋 Step 1: Loading GT Data...');
console.log('-'.repeat(50));

// Load data
const deliveryFile = 'data/localStorage/general-trading/gt_delivery.json';
const invoiceNotifFile = 'data/localStorage/general-trading/gt_invoiceNotifications.json';
const salesOrdersFile = 'data/localStorage/general-trading/gt_salesOrders.json';

const deliveryData = readJsonFile(deliveryFile);
const invoiceNotifData = readJsonFile(invoiceNotifFile);
const salesOrdersData = readJsonFile(salesOrdersFile);

if (!deliveryData) {
  console.log('❌ Missing delivery data file');
  process.exit(1);
}

const deliveryRecords = filterActiveItems(extractStorageValue(deliveryData));
const existingNotifications = filterActiveItems(extractStorageValue(invoiceNotifData));
const salesOrders = filterActiveItems(extractStorageValue(salesOrdersData));

console.log(`📊 Delivery Records: ${deliveryRecords.length}`);
console.log(`📊 Existing Invoice Notifications: ${existingNotifications.length}`);
console.log(`📊 Sales Orders: ${salesOrders.length}`);

console.log('\n📋 Step 2: Finding Delivery Notes That Need Invoice Notifications...');
console.log('-'.repeat(50));

const missingNotifications = [];

deliveryRecords.forEach(delivery => {
  // Only process CLOSE delivery notes with signed documents
  if (delivery.status === 'CLOSE' && delivery.signedDocumentPath) {
    console.log(`📋 Checking delivery: ${delivery.sjNo} (Status: ${delivery.status})`);
    
    // Check if invoice notification already exists
    const existingNotif = existingNotifications.find(n => 
      n.sjNo === delivery.sjNo && n.type === 'CUSTOMER_INVOICE'
    );
    
    if (!existingNotif) {
      console.log(`❌ Missing invoice notification for SJ ${delivery.sjNo}`);
      
      // Find corresponding sales order
      const so = salesOrders.find(s => s.soNo === delivery.soNo);
      const poCustomerNo = so?.poCustomerNo || so?.soNo || '-';
      
      // Get SPK numbers from delivery items
      const spkNosFromSJ = delivery.items
        .map(item => item.spkNo)
        .filter(spk => spk)
        .join(', ');
      
      // Calculate total qty
      const totalQty = delivery.items.reduce((sum, item) => sum + (item.qty || 0), 0);
      
      const newInvoiceNotification = {
        id: `invoice-${Date.now()}-${delivery.sjNo}`,
        type: 'CUSTOMER_INVOICE',
        sjNo: delivery.sjNo,
        soNo: delivery.soNo,
        poCustomerNo: poCustomerNo,
        spkNos: spkNosFromSJ,
        customer: delivery.customer,
        customerKode: so?.customerKode || '',
        items: delivery.items,
        totalQty: totalQty,
        signedDocument: delivery.signedDocumentPath, // Use path instead of base64
        signedDocumentName: delivery.signedDocumentName,
        status: 'PENDING',
        created: new Date().toISOString(),
      };
      
      missingNotifications.push(newInvoiceNotification);
      
      console.log(`   ✅ Will create invoice notification:`);
      console.log(`      SJ: ${delivery.sjNo}`);
      console.log(`      SO: ${delivery.soNo}`);
      console.log(`      Customer: ${delivery.customer}`);
      console.log(`      Items: ${delivery.items.length}`);
      console.log(`      Total Qty: ${totalQty}`);
      console.log(`      Signed Doc: ${delivery.signedDocumentName}`);
    } else {
      console.log(`✅ Invoice notification exists for SJ ${delivery.sjNo} (Status: ${existingNotif.status})`);
    }
  } else {
    console.log(`⏭️  Skipping delivery ${delivery.sjNo}: Status=${delivery.status}, HasSignedDoc=${!!delivery.signedDocumentPath}`);
  }
});

console.log(`\n📊 Missing notifications to create: ${missingNotifications.length}`);

if (missingNotifications.length === 0) {
  console.log('🎉 All delivery notes have corresponding invoice notifications!');
} else {
  console.log('\n📋 Step 3: Creating Missing Invoice Notifications...');
  console.log('-'.repeat(50));
  
  // Create updated notifications array
  const updatedNotifications = [...existingNotifications, ...missingNotifications];
  
  // Create proper storage format
  const invoiceNotifStorageData = {
    value: updatedNotifications,
    timestamp: Date.now(),
    _timestamp: Date.now()
  };
  
  // Write to file
  if (writeJsonFile(invoiceNotifFile, invoiceNotifStorageData)) {
    console.log(`✅ Successfully created ${missingNotifications.length} invoice notifications`);
    console.log(`📊 Total notifications: ${updatedNotifications.length}`);
  } else {
    console.log('❌ Failed to write invoice notifications file');
    process.exit(1);
  }
}

console.log('\n📋 Step 4: Verifying GT Invoice Module Data Loading...');
console.log('-'.repeat(50));

// Re-read the updated data
const updatedInvoiceNotifData = readJsonFile(invoiceNotifFile);
const updatedNotifications = filterActiveItems(extractStorageValue(updatedInvoiceNotifData));

const pendingNotifications = updatedNotifications.filter(notif =>
  notif.type === 'CUSTOMER_INVOICE' && notif.status === 'PENDING'
);

console.log(`⏳ Pending notifications for GT Invoice: ${pendingNotifications.length}`);

if (pendingNotifications.length > 0) {
  console.log('\n📋 Notifications GT Invoice Should Show:');
  pendingNotifications.forEach((notif, index) => {
    console.log(`   ${index + 1}. SJ: ${notif.sjNo}`);
    console.log(`      SO: ${notif.soNo}`);
    console.log(`      Customer: ${notif.customer}`);
    console.log(`      Items: ${notif.items ? notif.items.length : 0}`);
    console.log(`      Total Qty: ${notif.totalQty}`);
    console.log(`      Status: ${notif.status}`);
    console.log(`      Created: ${notif.created}`);
    console.log('');
  });
}

console.log('\n🎯 Instructions for User:');
console.log('='.repeat(60));

if (pendingNotifications.length > 0) {
  console.log('🎉 SUCCESS: GT Invoice should now show notifications!');
  console.log('');
  console.log('📋 What user should see:');
  console.log('1. Go to GT Finance → Invoice module');
  console.log('2. Look for notification bell or pending notifications section');
  console.log('3. Should show notifications for creating customer invoices');
  console.log('4. Click notification to create invoice from delivery note');
  console.log('');
  console.log('🔄 If notifications still not visible:');
  console.log('1. Refresh the GT Invoice page (F5)');
  console.log('2. Clear browser cache (Ctrl+Shift+R)');
  console.log('3. Check browser console for errors');
  console.log('4. Verify GT Invoice module is loading gt_invoiceNotifications correctly');
} else {
  console.log('⚠️  No pending invoice notifications found');
  console.log('');
  console.log('🔧 This could mean:');
  console.log('1. No delivery notes with signed documents exist');
  console.log('2. All delivery notes already have invoice notifications');
  console.log('3. All notifications have been processed');
  console.log('');
  console.log('📋 To test:');
  console.log('1. Go to GT Delivery Note');
  console.log('2. Upload signed document to a delivery note');
  console.log('3. Check if invoice notification is created');
  console.log('4. Go to GT Invoice to see the notification');
}

console.log('\n📊 Final Summary:');
console.log(`   Delivery records: ${deliveryRecords.length}`);
console.log(`   Invoice notifications: ${updatedNotifications.length}`);
console.log(`   Pending for Invoice: ${pendingNotifications.length}`);
console.log(`   Created new: ${missingNotifications.length}`);