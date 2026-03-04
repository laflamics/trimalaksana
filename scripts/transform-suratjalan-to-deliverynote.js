/**
 * Transform Surat Jalan JSON to DeliveryNote format
 * Maps old format to new DeliveryNote interface expected by Trucking module
 */

const fs = require('fs');
const path = require('path');

// Read the current Surat Jalan data
const inputFile = path.join(__dirname, 'master/trucking/trucking_suratJalan.json');
const outputFile = path.join(__dirname, 'master/trucking/trucking_suratJalan.json');

console.log('Reading Surat Jalan data...');
const rawData = fs.readFileSync(inputFile, 'utf8');
const suratJalanData = JSON.parse(rawData);

console.log(`Found ${suratJalanData.length} records`);

// Transform function
function transformToDeliveryNote(item, index) {
  // Generate unique ID if not exists
  const id = item.id || `dlv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Parse delivery date
  const deliveryDate = item.deliveryDate || new Date().toISOString().split('T')[0];
  
  // Extract time from scheduledTime or use default
  const scheduledTime = item.scheduledTime || '08:00';
  
  // Transform items array
  const items = (item.items || []).map(itemData => ({
    product: itemData.product || '',
    qty: itemData.qty || 0,
    unit: itemData.unit || 'UNIT',
    description: itemData.description || ''
  }));
  
  // Build the new DeliveryNote object
  const deliveryNote = {
    // Identitas
    id: id,
    no: index + 1,
    dnNo: item.sjNo || item.dnNo || `DN-${Date.now()}`,
    doNo: item.doNo || item.soNo || '',
    
    // Customer Info
    customerName: item.customer || item.customerName || '',
    customerAddress: item.customerAddress || '',
    
    // Driver Info
    driverId: item.driverId || '',
    driverName: item.driver || item.driverName || '',
    driverCode: item.driverCode || '',
    
    // Vehicle Info
    vehicleId: item.vehicleId || '',
    vehicleNo: item.vehicleNo || '',
    
    // Route Info
    routeId: item.routeId || '',
    routeName: item.routeName || '',
    
    // Items
    items: items,
    
    // Dates & Times
    scheduledDate: deliveryDate,
    scheduledTime: scheduledTime,
    departureDate: item.departureDate || undefined,
    departureTime: item.departureTime || undefined,
    arrivalDate: item.arrivalDate || undefined,
    arrivalTime: item.arrivalTime || undefined,
    
    // Additional Info
    pettyCashRequestNo: item.pettyCashRequestNo || undefined,
    transferProof: item.transferProof || undefined,
    transferProofName: item.transferProofName || undefined,
    distributedDate: item.distributedDate || undefined,
    receivedDate: item.receivedDate || undefined,
    receivedBy: item.receivedBy || undefined,
    
    // Signed Documents (backward compatibility)
    signedDocuments: item.signedDocuments || undefined,
    signedDocumentId: item.signedDocumentId || undefined,
    signedDocumentName: item.signedDocumentName || undefined,
    
    // Status & Metadata
    status: item.status === 'CLOSE' ? 'Close' : 'Open',
    notes: item.specNote || item.notes || '',
    created: item.created || new Date().toISOString(),
    lastUpdate: item.lastUpdate || new Date().toISOString(),
    timestamp: item.timestamp || Date.now(),
  };
  
  // Remove undefined values to keep JSON clean
  Object.keys(deliveryNote).forEach(key => {
    if (deliveryNote[key] === undefined) {
      delete deliveryNote[key];
    }
  });
  
  return deliveryNote;
}

// Transform all records
console.log('Transforming records...');
const transformedData = suratJalanData.map((item, index) => transformToDeliveryNote(item, index));

// Write output
console.log(`Writing ${transformedData.length} transformed records...`);
fs.writeFileSync(outputFile, JSON.stringify(transformedData, null, 2), 'utf8');

console.log('✅ Transformation complete!');
console.log(`Output: ${outputFile}`);
console.log(`Records: ${transformedData.length}`);

// Show sample
console.log('\n📋 Sample transformed record:');
console.log(JSON.stringify(transformedData[0], null, 2));
