/**
 * PTP Flow Integration Test
 * Tests the complete Procure-to-Pay flow
 */

import { workflowStateMachine } from '../services/workflow-state-machine';
import { materialAllocator } from '../services/material-allocator';
import { packagingSync } from '../services/packaging-sync';

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL';
  message: string;
  data?: any;
}

class PTPFlowTest {
  private results: TestResult[] = [];

  /**
   * Test complete PTP flow
   */
  async runCompleteFlow(): Promise<TestResult[]> {
    console.log('🧪 Starting PTP Flow Test...');
    
    try {
      // Step 1: Create Sales Order
      await this.testSalesOrderCreation();
      
      // Step 2: PPIC Processing
      await this.testPPICProcessing();
      
      // Step 3: Production
      await this.testProductionFlow();
      
      // Step 4: Quality Control
      await this.testQCFlow();
      
      // Step 5: Delivery Note
      await this.testDeliveryNoteFlow();
      
      console.log('✅ PTP Flow Test Completed');
      return this.results;
      
    } catch (error) {
      this.addResult('COMPLETE_FLOW', 'FAIL', `Test failed: ${error.message}`);
      return this.results;
    }
  }

  /**
   * Test Sales Order Creation
   */
  private async testSalesOrderCreation(): Promise<void> {
    try {
      const testSO = {
        id: 'test-so-001',
        soNo: 'SO-TEST-001',
        customer: 'Test Customer',
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
        ]
      };

      // Test workflow transition: DRAFT → OPEN
      const canTransition = await workflowStateMachine.canTransition('salesOrder', testSO.id, 'OPEN');
      
      if (canTransition) {
        await workflowStateMachine.transition('salesOrder', testSO.id, 'OPEN', testSO);
        this.addResult('SO_CREATION', 'PASS', 'Sales Order created and transitioned to OPEN');
      } else {
        this.addResult('SO_CREATION', 'FAIL', 'Cannot transition SO from DRAFT to OPEN');
      }

      // Test SO confirmation: OPEN → CONFIRMED
      const canConfirm = await workflowStateMachine.canTransition('salesOrder', testSO.id, 'CONFIRMED');
      
      if (canConfirm) {
        await workflowStateMachine.transition('salesOrder', testSO.id, 'CONFIRMED', testSO);
        this.addResult('SO_CONFIRMATION', 'PASS', 'Sales Order confirmed successfully');
      } else {
        this.addResult('SO_CONFIRMATION', 'FAIL', 'Cannot confirm Sales Order');
      }

    } catch (error) {
      this.addResult('SO_CREATION', 'FAIL', `SO Creation failed: ${error.message}`);
    }
  }

  /**
   * Test PPIC Processing
   */
  private async testPPICProcessing(): Promise<void> {
    try {
      const testSPK = {
        id: 'test-spk-001',
        spkNo: 'SPK-TEST-001',
        soNo: 'SO-TEST-001',
        status: 'DRAFT',
        items: [
          {
            productId: 'PROD-001',
            qty: 100,
            materials: [
              { materialId: 'MAT-001', qty: 50, unit: 'KG' },
              { materialId: 'MAT-002', qty: 20, unit: 'PCS' }
            ]
          }
        ]
      };

      // Test SPK creation: DRAFT → OPEN
      const canOpen = await workflowStateMachine.canTransition('spk', testSPK.id, 'OPEN');
      
      if (canOpen) {
        await workflowStateMachine.transition('spk', testSPK.id, 'OPEN', testSPK);
        this.addResult('SPK_CREATION', 'PASS', 'SPK created and opened successfully');
      } else {
        this.addResult('SPK_CREATION', 'FAIL', 'Cannot open SPK');
      }

      // Test material availability check
      const materials = testSPK.items[0].materials;
      const availability = await materialAllocator.checkMaterialAvailability('SPK-TEST-001', materials);
      
      if (availability.success) {
        this.addResult('MATERIAL_CHECK', 'PASS', 'Material availability check passed');
      } else {
        this.addResult('MATERIAL_CHECK', 'FAIL', `Material shortage: ${availability.shortages?.length || 0} items`);
      }

    } catch (error) {
      this.addResult('PPIC_PROCESSING', 'FAIL', `PPIC Processing failed: ${error.message}`);
    }
  }

  /**
   * Test Production Flow
   */
  private async testProductionFlow(): Promise<void> {
    try {
      const testProduction = {
        id: 'test-prod-001',
        spkNo: 'SPK-TEST-001',
        status: 'DRAFT'
      };

      // Test production start: OPEN → IN_PROGRESS
      const canStart = await workflowStateMachine.canTransition('production', testProduction.id, 'IN_PROGRESS');
      
      if (canStart) {
        await workflowStateMachine.transition('production', testProduction.id, 'IN_PROGRESS', testProduction);
        this.addResult('PRODUCTION_START', 'PASS', 'Production started successfully');
      } else {
        this.addResult('PRODUCTION_START', 'FAIL', 'Cannot start production');
      }

      // Test production completion: IN_PROGRESS → COMPLETED
      const canComplete = await workflowStateMachine.canTransition('production', testProduction.id, 'COMPLETED');
      
      if (canComplete) {
        await workflowStateMachine.transition('production', testProduction.id, 'COMPLETED', testProduction);
        this.addResult('PRODUCTION_COMPLETE', 'PASS', 'Production completed successfully');
      } else {
        this.addResult('PRODUCTION_COMPLETE', 'FAIL', 'Cannot complete production');
      }

    } catch (error) {
      this.addResult('PRODUCTION_FLOW', 'FAIL', `Production Flow failed: ${error.message}`);
    }
  }

  /**
   * Test QC Flow
   */
  private async testQCFlow(): Promise<void> {
    try {
      const testQC = {
        id: 'test-qc-001',
        spkNo: 'SPK-TEST-001',
        status: 'OPEN',
        qcResult: 'PASS'
      };

      // Test QC completion: OPEN → CLOSE
      const canClose = await workflowStateMachine.canTransition('qc', testQC.id, 'CLOSE');
      
      if (canClose) {
        await workflowStateMachine.transition('qc', testQC.id, 'CLOSE', testQC);
        this.addResult('QC_PROCESS', 'PASS', 'QC process completed with PASS result');
      } else {
        this.addResult('QC_PROCESS', 'FAIL', 'Cannot complete QC process');
      }

    } catch (error) {
      this.addResult('QC_FLOW', 'FAIL', `QC Flow failed: ${error.message}`);
    }
  }

  /**
   * Test Delivery Note Flow
   */
  private async testDeliveryNoteFlow(): Promise<void> {
    try {
      const testDelivery = {
        id: 'test-dn-001',
        sjNo: 'SJ-TEST-001',
        spkNo: 'SPK-TEST-001',
        status: 'READY_TO_SHIP'
      };

      // Test delivery creation
      const canCreate = await workflowStateMachine.canTransition('delivery', testDelivery.id, 'CLOSE');
      
      if (canCreate) {
        await workflowStateMachine.transition('delivery', testDelivery.id, 'CLOSE', testDelivery);
        this.addResult('DELIVERY_CREATION', 'PASS', 'Delivery Note created successfully');
      } else {
        this.addResult('DELIVERY_CREATION', 'FAIL', 'Cannot create Delivery Note');
      }

    } catch (error) {
      this.addResult('DELIVERY_FLOW', 'FAIL', `Delivery Flow failed: ${error.message}`);
    }
  }

  /**
   * Add test result
   */
  private addResult(step: string, status: 'PASS' | 'FAIL', message: string, data?: any): void {
    this.results.push({ step, status, message, data });
    console.log(`${status === 'PASS' ? '✅' : '❌'} ${step}: ${message}`);
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;

    let report = `
# PTP Flow Test Report

## Summary
- **Total Tests:** ${totalTests}
- **Passed:** ${passedTests} ✅
- **Failed:** ${failedTests} ${failedTests > 0 ? '❌' : '✅'}
- **Success Rate:** ${((passedTests / totalTests) * 100).toFixed(1)}%

## Detailed Results
`;

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      report += `\n### ${icon} ${result.step}
**Status:** ${result.status}
**Message:** ${result.message}
`;
      if (result.data) {
        report += `**Data:** \`${JSON.stringify(result.data, null, 2)}\`\n`;
      }
    });

    return report;
  }
}

// Export for use in tests
export { PTPFlowTest };

// Example usage:
// const test = new PTPFlowTest();
// test.runCompleteFlow().then(results => {
//   console.log(test.generateReport());
// });