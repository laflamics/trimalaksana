const fs = require('fs');
const path = require('path');
const http = require('http');

const SERVER_URL = 'http://100.81.50.37:9999';

async function uploadData(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: '100.81.50.37',
      port: 9999,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: responseData });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function importTruckingData() {
  console.log(`🚀 Starting Trucking import to: ${SERVER_URL}\n`);

  try {
    // Read Trucking Invoices
    const invoicesPath = path.join(__dirname, 'master/trucking/trucking_invoices.json');
    const invoices = JSON.parse(fs.readFileSync(invoicesPath, 'utf8'));
    console.log(`📄 Trucking Invoices: ${invoices.length} items`);
    
    const invoicesRes = await uploadData('/invoices', invoices);
    if (invoicesRes.status === 200 || invoicesRes.status === 201) {
      console.log(`   ✅ Imported: ${invoices.length} items`);
    } else {
      console.log(`   ⚠️  Response: ${invoicesRes.status}`);
    }

    // Read Trucking Delivery Orders
    const doPath = path.join(__dirname, 'master/trucking/trucking_delivery_orders.json');
    if (fs.existsSync(doPath)) {
      const deliveryOrders = JSON.parse(fs.readFileSync(doPath, 'utf8'));
      console.log(`📄 Trucking Delivery Orders: ${deliveryOrders.length} items`);
      
      const doRes = await uploadData('/deliveryOrders', deliveryOrders);
      if (doRes.status === 200 || doRes.status === 201) {
        console.log(`   ✅ Imported: ${deliveryOrders.length} items`);
      } else {
        console.log(`   ⚠️  Response: ${doRes.status}`);
      }
    }

    // Read Trucking Surat Jalan
    const sjPath = path.join(__dirname, 'master/trucking/trucking_suratJalan.json');
    if (fs.existsSync(sjPath)) {
      const suratJalan = JSON.parse(fs.readFileSync(sjPath, 'utf8'));
      console.log(`📄 Trucking Surat Jalan: ${suratJalan.length} items`);
      
      const sjRes = await uploadData('/deliveryNotes', suratJalan);
      if (sjRes.status === 200 || sjRes.status === 201) {
        console.log(`   ✅ Imported: ${suratJalan.length} items`);
      } else {
        console.log(`   ⚠️  Response: ${sjRes.status}`);
      }
    }

    console.log('\n✅ Trucking import completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

importTruckingData();
