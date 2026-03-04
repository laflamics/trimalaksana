/**
 * Optimistic Operations Service
 * Implementasi optimistic updates untuk semua flow di packaging/GT/trucking
 * User langsung melihat hasil, sync berjalan di background tanpa loading
 */

import { packagingSync } from './packaging-sync';
import { workflowStateMachine } from './workflow-state-machine';
import { StorageKeys } from './storage';

export interface OptimisticResult {
  success: boolean;
  message: string;
  localData?: any;
  syncQueued: boolean;
}

class OptimisticOperations {
  
  /**
   * Optimistic GRN Submit
   * User langsung melihat GRN CLOSE, inventory ter-update, material ready
   */
  async submitGRN(grnData: {
    id: string;
    grnNo: string;
    poNo: string;
    spkNo?: string;
    materialId: string;
    qtyReceived: number;
    receivedDate: string;
    notes?: string;
    invoiceNo?: string;
  }): Promise<OptimisticResult> {
    
    try {
      // 1. INSTANT LOCAL UPDATE - User melihat hasil langsung (0ms lag)
      const updatedGRN = {
        ...grnData,
        status: 'CLOSE',
        lastUpdated: new Date().toISOString(),
        synced: false // Mark as unsynced for background processing
      };
      
      // 2. Update GRN data immediately
      const currentGRNs = await packagingSync.getData(StorageKeys.PACKAGING.GRN);
      const existingIndex = currentGRNs.findIndex((g: any) => g.id === grnData.id);
      
      let updatedGRNs;
      if (existingIndex >= 0) {
        updatedGRNs = [...currentGRNs];
        updatedGRNs[existingIndex] = updatedGRN;
      } else {
        updatedGRNs = [...currentGRNs, updatedGRN];
      }
      
      // 3. INSTANT inventory update (optimistic)
      const currentInventory = await packagingSync.getData(StorageKeys.PACKAGING.INVENTORY);
      const updatedInventory = currentInventory.map((item: any) => {
        if (item.codeItem === grnData.materialId || item.id === grnData.materialId) {
          return {
            ...item,
            receive: (item.receive || 0) + grnData.qtyReceived,
            nextStock: (item.nextStock || item.stockPremonth || 0) + 
                      (item.receive || 0) + grnData.qtyReceived - 
                      (item.outgoing || 0) + (item.return || 0),
            lastUpdate: new Date().toISOString(),
            synced: false
          };
        }
        return item;
      });
      
      // 4. INSTANT notifications update (optimistic)
      const currentNotifications = await packagingSync.getData(StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS);
      const updatedNotifications = currentNotifications.map((notif: any) => {
        if (notif.spkNo === grnData.spkNo || notif.soNo === grnData.poNo) {
          return {
            ...notif,
            materialStatus: 'RECEIVED',
            status: 'READY_TO_PRODUCE',
            grnNo: grnData.grnNo,
            lastUpdate: new Date().toISOString(),
            synced: false
          };
        }
        return notif;
      });
      
      // 5. Update all data immediately using packagingSync (HIGH priority for instant UI)
      await Promise.all([
        packagingSync.updateData(StorageKeys.PACKAGING.GRN, updatedGRNs, 'CRITICAL'),
        packagingSync.updateData(StorageKeys.PACKAGING.INVENTORY, updatedInventory, 'HIGH'),
        packagingSync.updateData(StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS, updatedNotifications, 'MEDIUM')
      ]);
      
      // 6. Queue background workflow processing (non-blocking)
      this.queueWorkflowTransition(StorageKeys.PACKAGING.GRN, grnData.id, 'CLOSE');
      
      return {
        success: true,
        message: `GRN ${grnData.grnNo} submitted successfully`,
        localData: updatedGRN,
        syncQueued: true
      };
      
    } catch (error) {
      console.error('[OptimisticOperations] GRN submit failed:', error);
      return {
        success: false,
        message: `Failed to submit GRN: ${error instanceof Error ? error.message : 'Unknown error'}`,
        syncQueued: false
      };
    }
  }
  
  /**
   * Optimistic Production Submit
   * User langsung melihat production progress, material usage, QC record
   */
  async submitProduction(productionData: {
    id: string;
    productionNo: string;
    spkNo: string;
    soNo: string;
    qtyProduced: number;
    qtySurplus?: number;
    target?: number;
    productId?: string;
    notes?: string;
  }): Promise<OptimisticResult> {
    
    try {
      // 1. INSTANT LOCAL UPDATE
      const currentProductions = await packagingSync.getData(StorageKeys.PACKAGING.PRODUCTION);
      const existingProduction = currentProductions.find((p: any) => p.id === productionData.id);
      
      const prevProgress = existingProduction?.progress || existingProduction?.producedQty || 0;
      const newProgress = prevProgress + productionData.qtyProduced;
      const targetQty = productionData.target || existingProduction?.target || existingProduction?.targetQty || 0;
      const remainingQty = Math.max(targetQty - newProgress, 0);
      
      // Auto-close if target reached
      const shouldClose = targetQty > 0 && newProgress >= targetQty;
      
      const updatedProduction = {
        ...existingProduction,
        ...productionData,
        progress: newProgress,
        producedQty: newProgress,
        remaining: remainingQty,
        status: shouldClose ? 'CLOSE' : 'OPEN',
        lastUpdated: new Date().toISOString(),
        synced: false
      };
      
      // 2. Update production data immediately
      const updatedProductions = currentProductions.map((p: any) => 
        p.id === productionData.id ? updatedProduction : p
      );
      
      // 3. INSTANT QC record creation (optimistic)
      const currentQC = await packagingSync.getData(StorageKeys.PACKAGING.QC);
      const newQCRecord = {
        id: 'qc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        qcNo: `QC-${productionData.productionNo}-${Date.now()}`,
        productionNo: productionData.productionNo,
        spkNo: productionData.spkNo,
        soNo: productionData.soNo,
        productId: productionData.productId || '',
        qtyChecked: productionData.qtyProduced,
        result: 'PASS', // Optimistic assumption
        status: 'CLOSE',
        created: new Date().toISOString(),
        synced: false
      };
      const updatedQC = [...currentQC, newQCRecord];
      
      // 4. INSTANT material usage calculation (optimistic)
      const materialUsageResult = await this.calculateOptimisticMaterialUsage(
        productionData.spkNo, 
        productionData.qtyProduced
      );
      
      // 5. Update all data immediately
      await Promise.all([
        packagingSync.updateData(StorageKeys.PACKAGING.PRODUCTION, updatedProductions, 'CRITICAL'),
        packagingSync.updateData(StorageKeys.PACKAGING.QC, updatedQC, 'HIGH'),
        ...(materialUsageResult.inventoryUpdated ? 
          [packagingSync.updateData(StorageKeys.PACKAGING.INVENTORY, materialUsageResult.updatedInventory, 'HIGH')] : 
          []
        )
      ]);
      
      // 6. Queue background workflow processing
      this.queueWorkflowTransition('production', productionData.id, shouldClose ? 'CLOSE' : 'IN_PROGRESS');
      
      return {
        success: true,
        message: `Production ${productionData.productionNo} submitted successfully. Progress: ${newProgress}/${targetQty}`,
        localData: updatedProduction,
        syncQueued: true
      };
      
    } catch (error) {
      console.error('[OptimisticOperations] Production submit failed:', error);
      return {
        success: false,
        message: `Failed to submit production: ${error instanceof Error ? error.message : 'Unknown error'}`,
        syncQueued: false
      };
    }
  }
  
  /**
   * Optimistic Sales Order Confirmation
   * User langsung melihat SO confirmed, SPK created, notifications generated
   */
  async confirmSalesOrder(soData: {
    id: string;
    soNo: string;
    customer: string;
    items: any[];
  }): Promise<OptimisticResult> {
    
    try {
      // 1. INSTANT SO confirmation
      const currentSOs = await packagingSync.getData(StorageKeys.PACKAGING.SALES_ORDERS);
      const updatedSOs = currentSOs.map((so: any) => {
        if (so.id === soData.id) {
          return {
            ...so,
            confirmed: true,
            confirmedAt: new Date().toISOString(),
            status: 'CONFIRMED',
            synced: false
          };
        }
        return so;
      });
      
      // 2. INSTANT SPK creation (optimistic)
      const currentSPKs = await packagingSync.getData(StorageKeys.PACKAGING.SPK);
      const newSPKs = soData.items.map((item: any, index: number) => ({
        id: 'spk-' + Date.now() + '-' + index,
        spkNo: `SPK-${soData.soNo}-${String.fromCharCode(65 + index)}`, // SPK-SO001-A, SPK-SO001-B, etc.
        soNo: soData.soNo,
        soId: soData.id,
        customer: soData.customer,
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        target: item.qty,
        targetQty: item.qty,
        status: 'DRAFT',
        created: new Date().toISOString(),
        synced: false
      }));
      const updatedSPKs = [...currentSPKs, ...newSPKs];
      
      // 3. INSTANT production notifications (optimistic)
      const currentNotifications = await packagingSync.getData(StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS);
      const newNotifications = newSPKs.map((spk: any) => ({
        id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        spkNo: spk.spkNo,
        soNo: soData.soNo,
        customer: soData.customer,
        productId: spk.productId,
        productName: spk.productName,
        qty: spk.qty,
        status: 'WAITING_MATERIAL',
        materialStatus: 'PENDING',
        created: new Date().toISOString(),
        synced: false
      }));
      const updatedNotifications = [...currentNotifications, ...newNotifications];
      
      // 4. Update all data immediately
      await Promise.all([
        packagingSync.updateData(StorageKeys.PACKAGING.SALES_ORDERS, updatedSOs, 'CRITICAL'),
        packagingSync.updateData(StorageKeys.PACKAGING.SPK, updatedSPKs, 'HIGH'),
        packagingSync.updateData(StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS, updatedNotifications, 'MEDIUM')
      ]);
      
      // 5. Queue background workflow processing
      this.queueWorkflowTransition('salesOrder', soData.id, 'CONFIRMED');
      
      return {
        success: true,
        message: `Sales Order ${soData.soNo} confirmed successfully. ${newSPKs.length} SPK(s) created.`,
        localData: { confirmedSO: updatedSOs.find((so: any) => so.id === soData.id), createdSPKs: newSPKs },
        syncQueued: true
      };
      
    } catch (error) {
      console.error('[OptimisticOperations] SO confirmation failed:', error);
      return {
        success: false,
        message: `Failed to confirm SO: ${error instanceof Error ? error.message : 'Unknown error'}`,
        syncQueued: false
      };
    }
  }
  
  /**
   * Calculate optimistic material usage for production
   */
  private async calculateOptimisticMaterialUsage(spkNo: string, qtyProduced: number) {
    try {
      // Get BOM data for material calculation
      const bomData = await packagingSync.getData(StorageKeys.PACKAGING.BOM);
      const spkData = await packagingSync.getData(StorageKeys.PACKAGING.SPK);
      const currentInventory = await packagingSync.getData(StorageKeys.PACKAGING.INVENTORY);
      
      const spk = spkData.find((s: any) => s.spkNo === spkNo);
      if (!spk || !spk.productId) {
        return { inventoryUpdated: false };
      }
      
      // Find BOM for this product
      const productBOM = bomData.filter((bom: any) => 
        (bom.product_id || bom.kode) === spk.productId
      );
      
      if (productBOM.length === 0) {
        return { inventoryUpdated: false };
      }
      
      // Calculate material usage and update inventory optimistically
      const updatedInventory = currentInventory.map((item: any) => {
        const bomEntry = productBOM.find((bom: any) => 
          (bom.material_id || bom.kode) === item.codeItem
        );
        
        if (bomEntry) {
          const ratio = bomEntry.ratio || 1;
          const materialUsed = qtyProduced * ratio;
          
          return {
            ...item,
            outgoing: (item.outgoing || 0) + materialUsed,
            nextStock: Math.max(
              (item.stockPremonth || 0) + 
              (item.receive || 0) - 
              ((item.outgoing || 0) + materialUsed) + 
              (item.return || 0), 
              0
            ),
            lastUpdate: new Date().toISOString(),
            synced: false
          };
        }
        
        return item;
      });
      
      return {
        inventoryUpdated: true,
        updatedInventory
      };
      
    } catch (error) {
      console.error('[OptimisticOperations] Material usage calculation failed:', error);
      return { inventoryUpdated: false };
    }
  }
  
  /**
   * Queue workflow transition for background processing
   */
  private queueWorkflowTransition(entity: string, id: string, toStatus: string) {
    // Queue workflow processing in background (non-blocking)
    setTimeout(async () => {
      try {
        await workflowStateMachine.transition(
          entity as any, 
          id, 
          toStatus as any
        );
        console.log(`[OptimisticOperations] Workflow transition completed: ${entity} ${id} -> ${toStatus}`);
      } catch (error) {
        console.error(`[OptimisticOperations] Workflow transition failed: ${entity} ${id} -> ${toStatus}`, error);
        // Could implement retry logic here
      }
    }, 100); // Small delay to ensure local updates are processed first
  }
  
  /**
   * Optimistic Delete Operation
   * User langsung melihat item terhapus, sync berjalan di background
   */
  async deleteItem(deleteData: {
    storageKey: string;
    itemId: string;
    idField?: string;
    reason?: string;
  }): Promise<OptimisticResult> {
    
    try {
      // 1. INSTANT LOCAL UPDATE - User melihat item terhapus langsung (0ms lag)
      const currentData = await packagingSync.getData(deleteData.storageKey);
      const idField = deleteData.idField || 'id';
      
      const updatedData = currentData.map((item: any) => {
        const itemIdValue = item[idField];
        if (itemIdValue === deleteData.itemId) {
          return {
            ...item,
            deleted: true,
            deletedAt: new Date().toISOString(),
            deletedTimestamp: Date.now(),
            deletedBy: this.getDeviceId(),
            deletionReason: deleteData.reason || 'user_action',
            synced: false
          };
        }
        return item;
      });
      
      // 2. Update data immediately using packagingSync (CRITICAL priority for deletions)
      await packagingSync.updateData(deleteData.storageKey, updatedData, 'CRITICAL');
      
      // 3. Queue background workflow processing (non-blocking)
      this.queueWorkflowTransition('delete', deleteData.itemId, 'DELETED');
      
      return {
        success: true,
        message: `Item ${deleteData.itemId} deleted successfully`,
        localData: updatedData,
        syncQueued: true
      };
      
    } catch (error) {
      console.error('[OptimisticOperations] Delete failed:', error);
      return {
        success: false,
        message: `Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        syncQueued: false
      };
    }
  }

  /**
   * Get device ID for tracking
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Get sync status for UI indicators
   */
  getSyncStatus() {
    return packagingSync.getSyncStatus();
  }
  
  /**
   * Get queue status for debugging
   */
  getQueueStatus() {
    return packagingSync.getQueueStatus();
  }
  
  /**
   * Force sync all pending operations
   */
  async forceSyncAll() {
    return await packagingSync.forceSyncAll();
  }
}

// Singleton instance
export const optimisticOps = new OptimisticOperations();