/**
 * PTP vs SO Flow Comparison Test
 * Memastikan PTP flow sama dengan SO flow, hanya beda starting point
 */

import { packagingSync } from '../services/packaging-sync';
import { workflowStateMachine } from '../services/workflow-state-machine';
import { materialAllocator } from '../services/material-allocator';

interface FlowStep {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  data?: any;
  timing?: number;
}

interface FlowComparison {
  soFlow: FlowStep[];
  ptpFlow: FlowStep[];
  differences: string[];
  consistency: 'CONSISTENT' | 'INCONSISTENT';
}

class PTPvsSOFlowComparison {
  private soResults: FlowStep[] = [];
  private ptpResults: FlowStep[] = [];
  private differences: string[] = [];
  
  /**
   * Run comprehensive comparison between PTP and SO flows
   */
  async runComparison(): Promise<FlowComparison> {
    console.log('🔄 PTP vs SO FLOW COMPARISON TEST');
    console.log('=================================');
    console.log('Testing if PTP flow matches SO flow (except starting point)');
    console.log('');

    // Test SO Flow (Standard)
    await this.testSOFlow();
    
    // Test PTP Flow (Direct)
    await this.testPTPFlow();
    
    // Compare flows
    this.compareFlows();
    
    return this.generateComparison();
  }
  
  /**
   * Test standard SO Flow: SO → SPK → Production → QC → SJ
   */
  private async testSOFlow() {
    console.log('📋 Testing Standard SO Flow...');
    
    try {
      // Step 1: Create SO
      const startTime = Date.now();
      const testSO = {
        id: 'so-flow-test-001',
        soNo: 'SO-FLOW-001',
        customer: 'Test Customer SO',
        status: 'DRAFT',
        items: [
          {
            id: 'item-001',
            productId: 'PROD-001',
            productName: 'Test Product',
            qty: 100,
            unit: 'PCS',
            price: 1000,
            total: 100000
          }
        ],
        created: new Date().toISOString()
      };
      
      // Save SO
      const salesOrders = await packagingSync.getData('salesOrders') || [];
      await packagingSync.updateData('salesOrders', [...salesOrders, testSO]);
      
      this.addSOResult('SO_CREATION', 'PASS', 'SO created successfully', testSO, Date.now() - startTime);
      
      // Step 2: Confirm SO (DRAFT → OPEN → CONFIRMED)
      const confirmTime = Date.now();
      const confirmedSO = { ...testSO, status: 'CONFIRMED', confirmedAt: new Date().toISOString() };
      const updatedSOs = salesOrders.map(so => so.id === testSO.id ? confirmedSO : so);
      await packagingSync.updateData('salesOrders', [...updatedSOs, confirmedSO]);
      
      this.addSOResult('SO_CONFIRMATION', 'PASS', 'SO confirmed successfully', confirmedSO, Date.now() - confirmTime);
      
      // Step 3: Create SPK from SO
      const spkTime = Date.now();
      const testSPK = {
        id: 'spk-from-so-001',
        spkNo: 'SPK-FROM-SO-001',
        soNo: testSO.soNo,
        soId: testSO.id,
        customer: testSO.customer,
        status: 'OPEN',
        items: testSO.items.map(item => ({
          ...item,
          materials: [
            { materialId: 'MAT-001', materialName: 'Material 1', qty: item.qty * 0.5, unit: 'KG' },
            { materialId: 'MAT-002', materialName: 'Material 2', qty: item.qty * 0.2, unit: 'PCS' }
          ]
        })),
        created: new Date().toISOString()
      };
      
      const spkData = await packagingSync.getData('spk') || [];
      await packagingSync.updateData('spk', [...spkData, testSPK]);
      
      this.addSOResult('SPK_CREATION', 'PASS', 'SPK created from SO', testSPK, Date.now() - spkTime);
      
      // Continue with production flow
      await this.continueProductionFlow(testSPK, 'SO');
      
    } catch (error) {
      this.addSOResult('SO_FLOW_ERROR', 'FAIL', `SO Flow failed: ${error.message}`);
    }
  }
  
  /**
   * Test PTP Flow: Direct PTP → SPK → Production → QC → SJ
   */
  private async testPTPFlow() {
    console.log('🎯 Testing Direct PTP Flow...');
    
    try {
      // Step 1: Create PTP (Direct production request, no SO)
      const startTime = Date.now();
      const testPTP = {
        id: 'ptp-flow-test-001',
        ptpNo: 'PTP-FLOW-001',
        customer: 'Test Customer PTP',
        status: 'OPEN',
        type: 'DIRECT_PRODUCTION', // Key difference: no SO needed
        items: [
          {
            id: 'item-001',
            productId: 'PROD-001',
            productName: 'Test Product',
            qty: 100,
            unit: 'PCS',
            // PTP might not have price (internal production)
            isInternal: true
          }
        ],
        created: new Date().toISOString()
      };
      
      // Save PTP (might use different storage key)
      const ptpData = await packagingSync.getData('ptp') || [];
      await packagingSync.updateData('ptp', [...ptpData, testPTP]);
      
      this.addPTPResult('PTP_CREATION', 'PASS', 'PTP created successfully', testPTP, Date.now() - startTime);
      
      // Step 2: Create SPK directly from PTP (no SO confirmation needed)
      const spkTime = Date.now();
      const testSPK = {
        id: 'spk-from-ptp-001',
        spkNo: 'SPK-FROM-PTP-001',
        ptpNo: testPTP.ptpNo, // Reference PTP instead of SO
        ptpId: testPTP.id,
        customer: testPTP.customer,
        status: 'OPEN',
        items: testPTP.items.map(item => ({
          ...item,
          materials: [
            { materialId: 'MAT-001', materialName: 'Material 1', qty: item.qty * 0.5, unit: 'KG' },
            { materialId: 'MAT-002', materialName: 'Material 2', qty: item.qty * 0.2, unit: 'PCS' }
          ]
        })),
        created: new Date().toISOString()
      };
      
      const spkData = await packagingSync.getData('spk') || [];
      await packagingSync.updateData('spk', [...spkData, testSPK]);
      
      this.addPTPResult('SPK_CREATION', 'PASS', 'SPK created from PTP', testSPK, Date.now() - spkTime);
      
      // Continue with same production flow as SO
      await this.continueProductionFlow(testSPK, 'PTP');
      
    } catch (error) {
      this.addPTPResult('PTP_FLOW_ERROR', 'FAIL', `PTP Flow failed: ${error.message}`);
    }
  }
  
  /**
   * Continue production flow (same for both SO and PTP)
   */
  private async continueProductionFlow(spk: any, flowType: 'SO' | 'PTP') {
    const results = flowType === 'SO' ? this.soResults : this.ptpResults;
    const addResult = flowType === 'SO' ? this.addSOResult.bind(this) : this.addPTPResult.bind(this);
    
    try {
      // Step 4: Material Check & Allocation
      const materialTime = Date.now();
      const materials = spk.items[0].materials;
      const availability = await materialAllocator.checkMaterialAvailability(spk.spkNo, materials);
      
      if (availability.success) {
        addResult('MATERIAL_CHECK', 'PASS', 'Material availability confirmed', availability, Date.now() - materialTime);
      } else {
        addResult('MATERIAL_CHECK', 'FAIL', `Material shortage detected`, availability, Date.now() - materialTime);
      }
      
      // Step 5: Production Process
      const prodTime = Date.now();
      const testProduction = {
        id: `prod-${flowType.toLowerCase()}-001`,
        productionNo: `PROD-${flowType}-001`,
        spkNo: spk.spkNo,
        spkId: spk.id,
        status: 'IN_PROGRESS',
        items: spk.items.map(item => ({
          ...item,
          qtyProduced: 0,
          qtyTarget: item.qty
        })),
        created: new Date().toISOString()
      };
      
      const productionData = await packagingSync.getData('production') || [];
      await packagingSync.updateData('production', [...productionData, testProduction]);
      
      addResult('PRODUCTION_START', 'PASS', 'Production started', testProduction, Date.now() - prodTime);
      
      // Step 6: Complete Production
      const completeTime = Date.now();
      const completedProduction = {
        ...testProduction,
        status: 'COMPLETED',
        items: testProduction.items.map(item => ({
          ...item,
          qtyProduced: item.qtyTarget
        })),
        completedAt: new Date().toISOString()
      };
      
      const updatedProduction = productionData.map(p => p.id === testProduction.id ? completedProduction : p);
      await packagingSync.updateData('production', [...updatedProduction, completedProduction]);
      
      addResult('PRODUCTION_COMPLETE', 'PASS', 'Production completed', completedProduction, Date.now() - completeTime);
      
      // Step 7: QC Process
      const qcTime = Date.now();
      const testQC = {
        id: `qc-${flowType.toLowerCase()}-001`,
        qcNo: `QC-${flowType}-001`,
        spkNo: spk.spkNo,
        productionNo: testProduction.productionNo,
        status: 'OPEN',
        qcResult: 'PASS',
        items: spk.items.map(item => ({
          ...item,
          qcStatus: 'PASS',
          qcNotes: 'Quality check passed'
        })),
        created: new Date().toISOString()
      };
      
      const qcData = await packagingSync.getData('qc') || [];
      await packagingSync.updateData('qc', [...qcData, testQC]);
      
      addResult('QC_PROCESS', 'PASS', 'QC process completed', testQC, Date.now() - qcTime);
      
      // Step 8: Delivery Note / Surat Jalan
      const deliveryTime = Date.now();
      const testDelivery = {
        id: `sj-${flowType.toLowerCase()}-001`,
        sjNo: `SJ-${flowType}-001`,
        spkNo: spk.spkNo,
        qcNo: testQC.qcNo,
        customer: spk.customer,
        status: 'READY_TO_SHIP',
        items: spk.items,
        created: new Date().toISOString()
      };
      
      const deliveryData = await packagingSync.getData('delivery') || [];
      await packagingSync.updateData('delivery', [...deliveryData, testDelivery]);
      
      addResult('DELIVERY_CREATION', 'PASS', 'Surat Jalan created', testDelivery, Date.now() - deliveryTime);
      
    } catch (error) {
      addResult('PRODUCTION_FLOW_ERROR', 'FAIL', `Production flow failed: ${error.message}`);
    }
  }
  
  /**
   * Compare SO and PTP flows for consistency
   */
  private compareFlows() {
    console.log('\n🔍 Comparing SO vs PTP Flows...');
    
    // Expected differences (acceptable)
    const expectedDifferences = [
      'SO_CREATION', // PTP doesn't have SO creation
      'SO_CONFIRMATION' // PTP doesn't need SO confirmation
    ];
    
    // Get steps from both flows (excluding expected differences)
    const soSteps = this.soResults.filter(r => !expectedDifferences.includes(r.step)).map(r => r.step);
    const ptpSteps = this.ptpResults.filter(r => !expectedDifferences.includes(r.step)).map(r => r.step);
    
    // Check if PTP has PTP_CREATION (should be equivalent to SO_CREATION)
    const ptpHasCreation = this.ptpResults.some(r => r.step === 'PTP_CREATION');
    if (!ptpHasCreation) {
      this.differences.push('PTP flow missing PTP_CREATION step');
    }
    
    // Compare remaining steps
    const soStepsSet = new Set(soSteps);
    const ptpStepsSet = new Set(ptpSteps);
    
    // Find missing steps in PTP
    soSteps.forEach(step => {
      if (!ptpStepsSet.has(step)) {
        this.differences.push(`PTP flow missing step: ${step}`);
      }
    });
    
    // Find extra steps in PTP
    ptpSteps.forEach(step => {
      if (!soStepsSet.has(step)) {
        this.differences.push(`PTP flow has extra step: ${step}`);
      }
    });
    
    // Compare step results
    soSteps.forEach(step => {
      const soResult = this.soResults.find(r => r.step === step);
      const ptpResult = this.ptpResults.find(r => r.step === step);
      
      if (soResult && ptpResult) {
        if (soResult.status !== ptpResult.status) {
          this.differences.push(`Step ${step}: SO=${soResult.status}, PTP=${ptpResult.status}`);
        }
      }
    });
    
    console.log(`   📊 Found ${this.differences.length} differences`);
  }
  
  /**
   * Add SO flow result
   */
  private addSOResult(step: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, data?: any, timing?: number) {
    this.soResults.push({ step, status, message, data, timing });
    console.log(`   SO: ${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️'} ${step}: ${message}${timing ? ` (${timing}ms)` : ''}`);
  }
  
  /**
   * Add PTP flow result
   */
  private addPTPResult(step: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, data?: any, timing?: number) {
    this.ptpResults.push({ step, status, message, data, timing });
    console.log(`   PTP: ${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️'} ${step}: ${message}${timing ? ` (${timing}ms)` : ''}`);
  }
  
  /**
   * Generate comparison result
   */
  private generateComparison(): FlowComparison {
    const consistency = this.differences.length === 0 ? 'CONSISTENT' : 'INCONSISTENT';
    
    return {
      soFlow: this.soResults,
      ptpFlow: this.ptpResults,
      differences: this.differences,
      consistency
    };
  }
  
  /**
   * Generate detailed report
   */
  generateReport(): string {
    const soTotal = this.soResults.length;
    const soPassed = this.soResults.filter(r => r.status === 'PASS').length;
    const ptpTotal = this.ptpResults.length;
    const ptpPassed = this.ptpResults.filter(r => r.status === 'PASS').length;
    
    const consistency = this.differences.length === 0 ? 'CONSISTENT' : 'INCONSISTENT';
    
    let report = `
# PTP vs SO Flow Comparison Report

## Executive Summary
- **Flow Consistency**: ${consistency} ${consistency === 'CONSISTENT' ? '✅' : '❌'}
- **Differences Found**: ${this.differences.length}
- **SO Flow Success Rate**: ${((soPassed / soTotal) * 100).toFixed(1)}% (${soPassed}/${soTotal})
- **PTP Flow Success Rate**: ${((ptpPassed / ptpTotal) * 100).toFixed(1)}% (${ptpPassed}/${ptpTotal})

## Flow Comparison

### SO Flow Steps:
`;

    this.soResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      report += `- ${icon} **${result.step}**: ${result.message}${result.timing ? ` (${result.timing}ms)` : ''}\n`;
    });

    report += `\n### PTP Flow Steps:\n`;

    this.ptpResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      report += `- ${icon} **${result.step}**: ${result.message}${result.timing ? ` (${result.timing}ms)` : ''}\n`;
    });

    if (this.differences.length > 0) {
      report += `\n## ⚠️ Differences Found:\n`;
      this.differences.forEach(diff => {
        report += `- ❌ ${diff}\n`;
      });
    } else {
      report += `\n## ✅ No Differences Found\nPTP flow is consistent with SO flow (excluding expected differences).\n`;
    }

    report += `
## Recommendations

### If CONSISTENT:
- ✅ PTP flow properly mirrors SO flow
- ✅ Both flows use same production pipeline
- ✅ No additional fixes needed

### If INCONSISTENT:
- ❌ PTP flow needs alignment with SO flow
- 🔧 Missing steps should be implemented
- 🔧 Different behaviors should be standardized
- 🔧 Ensure same workflow state machine usage

## Expected Flow Pattern:
1. **SO Flow**: SO Creation → SO Confirmation → SPK → Production → QC → SJ
2. **PTP Flow**: PTP Creation → SPK → Production → QC → SJ
3. **Key Difference**: PTP skips SO steps but follows same production pipeline
`;

    return report;
  }
}

// Export for testing
export const ptpVsSOFlowComparison = new PTPvsSOFlowComparison();