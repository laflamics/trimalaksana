/**
 * Workflow State Machine
 * Implementasi dari mdfile/PACKAGING_ACTION_PLAN.md
 * Strict workflow validation dan business rules enforcement
 */

export type WorkflowEntity = 'salesOrder' | 'spk' | 'purchaseOrder' | 'grn' | 'production' | 'qc' | 'delivery' | 'invoice';
export type WorkflowStatus = 'DRAFT' | 'OPEN' | 'CONFIRMED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSE' | 'VOID' | 'CANCELLED';

export interface WorkflowTransition {
  from: WorkflowStatus;
  to: WorkflowStatus;
  condition?: (entity: any, data?: any) => Promise<boolean>;
  action?: (entity: any, data?: any) => Promise<void>;
  description: string;
}

export interface WorkflowRule {
  entity: WorkflowEntity;
  transitions: WorkflowTransition[];
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  missingRequirements?: string[];
}

class WorkflowStateMachine {
  private rules: Map<WorkflowEntity, WorkflowTransition[]> = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * Initialize workflow rules
   */
  private initializeRules() {
    // Sales Order workflow
    this.addRule('salesOrder', [
      {
        from: 'DRAFT',
        to: 'OPEN',
        condition: async (so) => this.validateSOItems(so),
        description: 'Submit SO for approval'
      },
      {
        from: 'OPEN',
        to: 'CONFIRMED',
        condition: async (so) => this.validateSOApproval(so),
        action: async (so) => this.autoCreateSPK(so),
        description: 'Approve SO and create SPK'
      },
      {
        from: 'CONFIRMED',
        to: 'CLOSE',
        condition: async (so) => this.validateSOCompletion(so),
        description: 'Close completed SO'
      },
      {
        from: 'OPEN',
        to: 'VOID',
        description: 'Void SO'
      },
      {
        from: 'CONFIRMED',
        to: 'VOID',
        description: 'Void confirmed SO'
      }
    ]);

    // SPK (Work Order) workflow
    this.addRule('spk', [
      {
        from: 'DRAFT',
        to: 'OPEN',
        condition: async (spk) => this.validateSPKMaterials(spk),
        description: 'Open SPK for production'
      },
      {
        from: 'OPEN',
        to: 'IN_PROGRESS',
        condition: async (spk) => this.validateMaterialAvailability(spk),
        description: 'Start production'
      },
      {
        from: 'IN_PROGRESS',
        to: 'COMPLETED',
        condition: async (spk) => this.validateProductionCompletion(spk),
        description: 'Complete production'
      },
      {
        from: 'COMPLETED',
        to: 'CLOSE',
        condition: async (spk) => this.validateQCPass(spk),
        description: 'Close SPK after QC pass'
      }
    ]);

    // Purchase Order workflow
    this.addRule('purchaseOrder', [
      {
        from: 'DRAFT',
        to: 'OPEN',
        condition: async (po) => this.validatePOItems(po),
        description: 'Submit PO to supplier'
      },
      {
        from: 'OPEN',
        to: 'APPROVED',
        condition: async (po) => this.validatePOApproval(po),
        description: 'Approve PO'
      },
      {
        from: 'APPROVED',
        to: 'CLOSE',
        condition: async (po) => this.validateGRNCompletion(po),
        description: 'Close PO after GRN'
      }
    ]);

    // GRN (Goods Receipt Note) workflow
    this.addRule('grn', [
      {
        from: 'DRAFT',
        to: 'OPEN',
        condition: async (grn) => this.validateGRNItems(grn),
        description: 'Submit GRN'
      },
      {
        from: 'OPEN',
        to: 'CLOSE',
        action: async (grn) => this.updateInventoryFromGRN(grn),
        description: 'Post GRN to inventory'
      }
    ]);

    // Production workflow
    this.addRule('production', [
      {
        from: 'DRAFT',
        to: 'OPEN',
        condition: async (prod) => this.validateProductionResult(prod),
        description: 'Submit production result'
      },
      {
        from: 'OPEN',
        to: 'CLOSE',
        condition: async (prod) => this.validateQCApproval(prod),
        description: 'Close production after QC'
      }
    ]);

    // QC workflow
    this.addRule('qc', [
      {
        from: 'DRAFT',
        to: 'OPEN',
        condition: async (qc) => this.validateQCForm(qc),
        description: 'Submit QC result'
      },
      {
        from: 'OPEN',
        to: 'CLOSE',
        action: async (qc) => this.processQCResult(qc),
        description: 'Process QC result'
      }
    ]);

    // Delivery workflow
    this.addRule('delivery', [
      {
        from: 'DRAFT',
        to: 'OPEN',
        condition: async (delivery) => this.validateDeliveryItems(delivery),
        description: 'Create delivery note'
      },
      {
        from: 'OPEN',
        to: 'CLOSE',
        condition: async (delivery) => this.validateDeliveryCompletion(delivery),
        action: async (delivery) => this.autoCreateInvoice(delivery),
        description: 'Complete delivery and create invoice'
      }
    ]);

    // Invoice workflow
    this.addRule('invoice', [
      {
        from: 'DRAFT',
        to: 'OPEN',
        condition: async (invoice) => this.validateInvoiceItems(invoice),
        description: 'Submit invoice'
      },
      {
        from: 'OPEN',
        to: 'CLOSE',
        condition: async (invoice) => this.validatePaymentReceived(invoice),
        description: 'Close paid invoice'
      }
    ]);
  }

  /**
   * Add workflow rule
   */
  private addRule(entity: WorkflowEntity, transitions: WorkflowTransition[]) {
    this.rules.set(entity, transitions);
  }

  /**
   * Check if transition is allowed
   */
  async canTransition(entity: WorkflowEntity, id: string, from: WorkflowStatus, to: WorkflowStatus, data?: any): Promise<ValidationResult> {
    const transitions = this.rules.get(entity);
    if (!transitions) {
      return { valid: false, message: `Unknown entity: ${entity}` };
    }

    const transition = transitions.find(t => t.from === from && t.to === to);
    if (!transition) {
      return { valid: false, message: `Invalid transition from ${from} to ${to}` };
    }

    // Check condition if exists
    if (transition.condition) {
      try {
        const entityData = await this.getEntityData(entity, id);
        const conditionMet = await transition.condition(entityData, data);
        
        if (!conditionMet) {
          return { 
            valid: false, 
            message: `Condition not met for transition: ${transition.description}`,
            missingRequirements: await this.getMissingRequirements(entity, entityData, transition)
          };
        }
      } catch (error) {
        return { valid: false, message: `Condition check failed: ${error.message}` };
      }
    }

    return { valid: true, message: transition.description };
  }

  /**
   * Execute transition
   */
  async transition(entity: WorkflowEntity, id: string, to: WorkflowStatus, data?: any): Promise<void> {
    const entityData = await this.getEntityData(entity, id);
    const from = entityData.status;

    // Validate transition
    const validation = await this.canTransition(entity, id, from, to, data);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Find transition
    const transitions = this.rules.get(entity)!;
    const transition = transitions.find(t => t.from === from && t.to === to)!;

    // Execute action if exists
    if (transition.action) {
      await transition.action(entityData, data);
    }

    // Update status
    await this.updateEntityStatus(entity, id, to);

    console.log(`[WorkflowStateMachine] ${entity} ${id}: ${from} → ${to}`);
  }

  /**
   * Auto-progress workflow
   */
  async autoProgress(entity: WorkflowEntity, id: string, data?: any): Promise<WorkflowStatus[]> {
    const progressedStates: WorkflowStatus[] = [];
    const entityData = await this.getEntityData(entity, id);
    let currentStatus = entityData.status;

    const transitions = this.rules.get(entity) || [];
    
    // Try to progress through all possible transitions
    let canProgress = true;
    while (canProgress) {
      canProgress = false;
      
      for (const transition of transitions) {
        if (transition.from === currentStatus) {
          const validation = await this.canTransition(entity, id, currentStatus, transition.to, data);
          
          if (validation.valid) {
            await this.transition(entity, id, transition.to, data);
            progressedStates.push(transition.to);
            currentStatus = transition.to;
            canProgress = true;
            break;
          }
        }
      }
    }

    return progressedStates;
  }

  /**
   * Get entity data from storage
   */
  private async getEntityData(entity: WorkflowEntity, id: string): Promise<any> {
    const storageKey = this.getStorageKey(entity);
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) {
      throw new Error(`No data found for ${entity}`);
    }

    const parsed = JSON.parse(stored);
    const data = parsed && typeof parsed === 'object' && 'value' in parsed ? parsed.value : parsed;
    const items = Array.isArray(data) ? data : [];
    
    const item = items.find(item => item.id === id);
    if (!item) {
      throw new Error(`${entity} with id ${id} not found`);
    }

    return item;
  }

  /**
   * Update entity status
   */
  private async updateEntityStatus(entity: WorkflowEntity, id: string, status: WorkflowStatus): Promise<void> {
    const storageKey = this.getStorageKey(entity);
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return;

    const parsed = JSON.parse(stored);
    const isWrapped = parsed && typeof parsed === 'object' && 'value' in parsed;
    const data = isWrapped ? parsed.value : parsed;
    const items = Array.isArray(data) ? data : [];
    
    const itemIndex = items.findIndex(item => item.id === id);
    if (itemIndex > -1) {
      items[itemIndex].status = status;
      items[itemIndex].lastUpdated = new Date().toISOString();
      
      const updatedData = isWrapped ? { ...parsed, value: items, timestamp: Date.now() } : items;
      localStorage.setItem(storageKey, JSON.stringify(updatedData));
      
      // Emit storage change event
      window.dispatchEvent(new CustomEvent('app-storage-changed', {
        detail: { key: storageKey, data: items }
      }));
    }
  }

  /**
   * Get storage key for entity
   */
  private getStorageKey(entity: WorkflowEntity): string {
    const keyMap: Record<WorkflowEntity, string> = {
      'salesOrder': 'salesOrders',
      'spk': 'spk',
      'purchaseOrder': 'purchaseOrders',
      'grn': 'grn',
      'production': 'production',
      'qc': 'qc',
      'delivery': 'delivery',
      'invoice': 'invoices'
    };
    
    return keyMap[entity] || entity;
  }

  /**
   * Get missing requirements for transition
   */
  private async getMissingRequirements(entity: WorkflowEntity, entityData: any, transition: WorkflowTransition): Promise<string[]> {
    const requirements: string[] = [];

    // Add specific requirement checks based on entity and transition
    switch (entity) {
      case 'salesOrder':
        if (transition.to === 'OPEN' && (!entityData.items || entityData.items.length === 0)) {
          requirements.push('At least one item required');
        }
        if (transition.to === 'CONFIRMED' && !entityData.customer) {
          requirements.push('Customer required');
        }
        break;
        
      case 'spk':
        if (transition.to === 'IN_PROGRESS') {
          const materialsReady = await this.validateMaterialAvailability(entityData);
          if (!materialsReady) {
            requirements.push('Materials not available');
          }
        }
        break;
    }

    return requirements;
  }

  // Validation methods
  private async validateSOItems(so: any): Promise<boolean> {
    return so.items && so.items.length > 0 && so.customer;
  }

  private async validateSOApproval(so: any): Promise<boolean> {
    return so.status === 'OPEN' && so.customer;
  }

  private async validateSOCompletion(so: any): Promise<boolean> {
    // Check if all related SPKs are closed
    const spks = await this.getRelatedSPKs(so.id);
    return spks.every(spk => spk.status === 'CLOSE');
  }

  private async validateSPKMaterials(spk: any): Promise<boolean> {
    return spk.materials && spk.materials.length > 0;
  }

  private async validateMaterialAvailability(spk: any): Promise<boolean> {
    // Import material allocator to check availability
    const { materialAllocator } = await import('./material-allocator');
    return await materialAllocator.checkSPKMaterialsReady(spk.spkNo);
  }

  private async validateProductionCompletion(spk: any): Promise<boolean> {
    const productions = await this.getRelatedProductions(spk.spkNo);
    const totalProduced = productions.reduce((sum, p) => sum + (p.qtyProduced || 0), 0);
    return totalProduced >= spk.qty;
  }

  private async validateQCPass(spk: any): Promise<boolean> {
    const qcResults = await this.getRelatedQC(spk.spkNo);
    return qcResults.some(qc => qc.result === 'PASS' && qc.status === 'CLOSE');
  }

  private async validatePOItems(po: any): Promise<boolean> {
    return po.lines && po.lines.length > 0 && po.supplier;
  }

  private async validatePOApproval(po: any): Promise<boolean> {
    return po.status === 'OPEN' && po.supplier;
  }

  private async validateGRNCompletion(po: any): Promise<boolean> {
    const grns = await this.getRelatedGRNs(po.id);
    return grns.some(grn => grn.status === 'CLOSE');
  }

  private async validateGRNItems(grn: any): Promise<boolean> {
    return grn.lines && grn.lines.length > 0;
  }

  private async validateProductionResult(prod: any): Promise<boolean> {
    return prod.qtyProduced > 0 && prod.product;
  }

  private async validateQCApproval(prod: any): Promise<boolean> {
    const qcResults = await this.getRelatedQC(prod.soNo);
    return qcResults.some(qc => qc.result === 'PASS');
  }

  private async validateQCForm(qc: any): Promise<boolean> {
    return qc.result && (qc.result === 'PASS' || qc.result === 'FAIL');
  }

  private async validateDeliveryItems(delivery: any): Promise<boolean> {
    return delivery.items && delivery.items.length > 0;
  }

  private async validateDeliveryCompletion(delivery: any): Promise<boolean> {
    return delivery.driver && delivery.vehicleNo;
  }

  private async validateInvoiceItems(invoice: any): Promise<boolean> {
    return invoice.lines && invoice.lines.length > 0;
  }

  private async validatePaymentReceived(invoice: any): Promise<boolean> {
    return invoice.paidAt || invoice.paymentProof;
  }

  // Action methods
  private async autoCreateSPK(so: any): Promise<void> {
    // Auto-create SPK from SO
    console.log(`[WorkflowStateMachine] Auto-creating SPK for SO ${so.soNo}`);
  }

  private async updateInventoryFromGRN(grn: any): Promise<void> {
    // Update inventory from GRN
    console.log(`[WorkflowStateMachine] Updating inventory from GRN ${grn.grnNo}`);
  }

  private async processQCResult(qc: any): Promise<void> {
    if (qc.result === 'PASS') {
      // Auto-close related SPK
      const spks = await this.getRelatedSPKs(qc.soId);
      for (const spk of spks) {
        if (spk.status === 'COMPLETED') {
          await this.updateEntityStatus('spk', spk.id, 'CLOSE');
        }
      }
    }
  }

  private async autoCreateInvoice(delivery: any): Promise<void> {
    // Auto-create invoice from delivery
    console.log(`[WorkflowStateMachine] Auto-creating invoice for delivery ${delivery.sjNo}`);
  }

  // Helper methods to get related data
  private async getRelatedSPKs(soId: string): Promise<any[]> {
    const stored = localStorage.getItem('spk');
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    const data = parsed && typeof parsed === 'object' && 'value' in parsed ? parsed.value : parsed;
    const spks = Array.isArray(data) ? data : [];
    
    return spks.filter(spk => spk.soId === soId);
  }

  private async getRelatedProductions(spkNo: string): Promise<any[]> {
    const stored = localStorage.getItem('production');
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    const data = parsed && typeof parsed === 'object' && 'value' in parsed ? parsed.value : parsed;
    const productions = Array.isArray(data) ? data : [];
    
    return productions.filter(prod => prod.spkNo === spkNo);
  }

  private async getRelatedQC(soNo: string): Promise<any[]> {
    const stored = localStorage.getItem('qc');
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    const data = parsed && typeof parsed === 'object' && 'value' in parsed ? parsed.value : parsed;
    const qcs = Array.isArray(data) ? data : [];
    
    return qcs.filter(qc => qc.soNo === soNo);
  }

  private async getRelatedGRNs(poId: string): Promise<any[]> {
    const stored = localStorage.getItem('grn');
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    const data = parsed && typeof parsed === 'object' && 'value' in parsed ? parsed.value : parsed;
    const grns = Array.isArray(data) ? data : [];
    
    return grns.filter(grn => grn.poId === poId);
  }
}

// Singleton instance
export const workflowStateMachine = new WorkflowStateMachine();