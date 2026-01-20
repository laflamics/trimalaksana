/**
 * Test script untuk verify PDF schedule fix
 * Memastikan PDF menampilkan schedule yang benar dari PPIC data
 */

const { generateWOHtml } = require('./src/pdf/wo-pdf-template.ts');

async function testPDFScheduleFix() {
  console.log('🧪 Testing PDF Schedule Fix...\n');
  
  try {
    // Mock data dengan schedule yang benar dari PPIC
    const mockWO = {
      id: 'SPK/001',
      soNo: 'SO-001',
      customer: 'Test Customer',
      product: 'Test Product',
      qty: 100,
      status: 'OPEN',
      createdAt: '2025-01-12T00:00:00.000Z',
      materials: [],
      docs: {
        scheduleDate: '2025-12-31T00:00:00.000Z', // Start: 31/12/2025
        scheduleEndDate: '2026-01-07T00:00:00.000Z', // End: 07/01/2026 (dari PPIC)
      }
    };
    
    const mockCompany = {
      companyName: 'Test Company',
      address: 'Test Address'
    };
    
    console.log('📋 Mock WO Data:');
    console.log('- Schedule Start:', mockWO.docs.scheduleDate);
    console.log('- Schedule End:', mockWO.docs.scheduleEndDate);
    console.log('- Expected Display: 31/12/2025 - 07/01/2026\n');
    
    // Generate HTML
    console.log('🔄 Generating PDF HTML...');
    const html = generateWOHtml({
      logo: 'data:image/svg+xml;base64,test',
      company: mockCompany,
      wo: mockWO,
      so: null,
      products: [],
      materials: [],
      rawMaterials: []
    });
    
    // Check if HTML contains correct schedule format
    console.log('✅ HTML generated successfully');
    
    // Verify schedule display
    if (html.includes('📅 Schedule')) {
      console.log('✅ Schedule label found');
    } else {
      console.log('❌ Schedule label NOT found');
    }
    
    if (html.includes('31/12/2025 - 07/01/2026')) {
      console.log('✅ Correct schedule dates found: 31/12/2025 - 07/01/2026');
    } else {
      console.log('❌ Correct schedule dates NOT found');
      
      // Check what dates are actually in the HTML
      const dateMatches = html.match(/\d{2}\/\d{2}\/\d{4}/g);
      if (dateMatches) {
        console.log('📊 Found dates in HTML:', dateMatches);
      }
    }
    
    // Check that old labels are NOT present
    if (html.includes('Start Production') || html.includes('End Production')) {
      console.log('❌ Old production labels still found');
    } else {
      console.log('✅ Old production labels removed');
    }
    
    // Save HTML for manual inspection
    const fs = require('fs');
    fs.writeFileSync('test-pdf-output.html', html);
    console.log('📄 HTML saved to test-pdf-output.html for manual inspection');
    
    console.log('\n✅ PDF Schedule Fix test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test if called directly
if (require.main === module) {
  testPDFScheduleFix();
}

module.exports = { testPDFScheduleFix };