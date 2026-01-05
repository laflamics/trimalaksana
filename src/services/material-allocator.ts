/**
 * Material Allocation Engine
 * Implementasi dari mdfile/PACKAGING_ACTION_PLAN.md
 * Prevent race conditions dan manage material reservations
 */

export interface MaterialReservation {
  id: string;
  spkNo: string;
  materialId: string;
  materialName: string;
  qty: number;
  unit: string;
  reservedAt: number;
  expiresAt: number;
  status: 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'RELEASED';
}

export interface MaterialAvailability {
  materialId: string;
  materialName: string;
  totalStock: number;
  reserved: number;
  available: number;
  unit: string;
}

export interface MaterialShortage {
  materialId: string;
  materialName: string;
  required: number;
  available: number;
  shortage: number;
  unit: string;
  spkNo: string;
}

export interface AllocationResult {
  success: boolean;
  reservations: MaterialReservation[];
  shortages: MaterialShortage[];
  message: string;
}

class MaterialAllocator {
  private reservations: Map<string, MaterialReservation[]> = new Map();
  private reservationExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.loadReservations();
    this.startCleanupTimer();
  }

  /**
   * Load reservations from localStorage
   */
  private loadReservations() {
    try {
      const stored = localStorage.getItem('material_reservations');
      if (stored) {
        const data = JSON.parse(stored);
        this.reservations = new Map(data);
      }
    } catch (error) {
      console.error('[MaterialAllocator] Error loading reservations:', error);
    }
  }

  /**
   * Save reservations to localStorage
   */
  private saveReservations() {
    try {
      const data = Array.from(this.reservations.entries());
      localStorage.setItem('material_reservations', JSON.stringify(data));
    } catch (error) {
      console.error('[MaterialAllocator] Error saving reservations:', error);
    }
  }

  /**
   * Start cleanup timer untuk expired reservations - OPTIMIZED
   */
  private startCleanupTimer() {
    // Use requestIdleCallback untuk non-blocking cleanup
    const scheduleCleanup = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          this.cleanupExpiredReservations();
          setTimeout(scheduleCleanup, 5 * 60 * 1000); // Schedule next cleanup
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          this.cleanupExpiredReservations();
          scheduleCleanup();
        }, 5 * 60 * 1000);
      }
    };
    
    scheduleCleanup();
  }

  /**
   * Cleanup expired reservations - OPTIMIZED with batching
   */
  private cleanupExpiredReservations() {
    const now = Date.now();
    let hasChanges = false;
    const expiredReservations: string[] = [];

    // Batch process reservations
    for (const [materialId, reservations] of this.reservations) {
      const activeReservations = reservations.filter(r => {
        if (r.expiresAt < now && r.status === 'ACTIVE') {
          r.status = 'EXPIRED';
          hasChanges = true;
          expiredReservations.push(`${r.materialName} (SPK: ${r.spkNo})`);
        }
        return r.status !== 'EXPIRED';
      });

      if (activeReservations.length !== reservations.length) {
        this.reservations.set(materialId, activeReservations);
      }
    }

    // Single save operation instead of multiple
    if (hasChanges) {
      this.saveReservations();
      if (expiredReservations.length > 0) {
        console.log(`[MaterialAllocator] Expired ${expiredReservations.length} reservations:`, expiredReservations);
      }
    }
  }

  /**
   * Get current inventory from storage
   */
  private async getInventory(): Promise<any[]> {
    try {
      const stored = localStorage.getItem('inventory');
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      
      // Handle wrapped format {value: ..., timestamp: ...}
      if (parsed && typeof parsed === 'object' && 'value' in parsed) {
        return Array.isArray(parsed.value) ? parsed.value : [];
      }
      
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[MaterialAllocator] Error reading inventory:', error);
      return [];
    }
  }

  /**
   * Get material availability - ENHANCED with better material lookup
   */
  async getMaterialAvailability(materialId: string): Promise<MaterialAvailability | null> {
    const inventory = await this.getInventory();
    
    // Try multiple material ID formats for better matching
    const normalizedId = materialId.toLowerCase();
    const material = inventory.find(item => {
      const itemCode = (item.codeItem || item.id || '').toLowerCase();
      return itemCode === normalizedId || 
             itemCode === materialId ||
             item.codeItem === materialId ||
             item.id === materialId;
    });
    
    if (!material) {
      return null;
    }

    const reserved = this.getReservedQty(materialId);
    const totalStock = material.stock || material.qty || material.nextStock || 0;
    const available = Math.max(0, totalStock - reserved);

    return {
      materialId,
      materialName: material.nama || material.name || material.description,
      totalStock,
      reserved,
      available,
      unit: material.satuan || material.unit || 'pcs'
    };
  }

  /**
   * Get reserved quantity for material - ENHANCED with case-insensitive matching
   */
  private getReservedQty(materialId: string): number {
    // Normalize material ID untuk consistent lookup
    const normalizedId = materialId.toUpperCase();
    
    let totalReserved = 0;
    
    // Check all reservations dengan case-insensitive matching
    for (const [key, reservations] of this.reservations) {
      if (key.toUpperCase() === normalizedId) {
        totalReserved += reservations
          .filter(r => r.status === 'ACTIVE')
          .reduce((total, r) => total + r.qty, 0);
      }
    }
    
    return totalReserved;
  }

  /**
   * Reserve materials untuk SPK
   */
  async reserveMaterials(spkNo: string, materials: Array<{id: string, nama: string, qty: number, unit: string}>): Promise<AllocationResult> {
    const reservations: MaterialReservation[] = [];
    const shortages: MaterialShortage[] = [];
    const now = Date.now();

    // Check availability untuk semua materials
    for (const material of materials) {
      const availability = await this.getMaterialAvailability(material.id);
      
      if (!availability) {
        shortages.push({
          materialId: material.id,
          materialName: material.nama,
          required: material.qty,
          available: 0,
          shortage: material.qty,
          unit: material.unit,
          spkNo
        });
        continue;
      }

      if (availability.available < material.qty) {
        shortages.push({
          materialId: material.id,
          materialName: material.nama,
          required: material.qty,
          available: availability.available,
          shortage: material.qty - availability.available,
          unit: material.unit,
          spkNo
        });
        continue;
      }

      // Create reservation
      const reservation: MaterialReservation = {
        id: `${spkNo}_${material.id}_${now}`,
        spkNo,
        materialId: material.id,
        materialName: material.nama,
        qty: material.qty,
        unit: material.unit,
        reservedAt: now,
        expiresAt: now + this.reservationExpiry,
        status: 'ACTIVE'
      };

      reservations.push(reservation);
    }

    // Jika ada shortage, jangan reserve apapun
    if (shortages.length > 0) {
      return {
        success: false,
        reservations: [],
        shortages,
        message: `Material shortage detected for ${shortages.length} items`
      };
    }

    // Reserve semua materials dengan normalized keys
    for (const reservation of reservations) {
      const normalizedKey = reservation.materialId.toUpperCase();
      if (!this.reservations.has(normalizedKey)) {
        this.reservations.set(normalizedKey, []);
      }
      this.reservations.get(normalizedKey)!.push(reservation);
    }

    this.saveReservations();

    return {
      success: true,
      reservations,
      shortages: [],
      message: `Successfully reserved ${reservations.length} materials for SPK ${spkNo}`
    };
  }

  /**
   * Release reservations untuk SPK
   */
  async releaseReservation(spkNo: string): Promise<void> {
    let hasChanges = false;

    for (const [materialId, reservations] of this.reservations) {
      const updatedReservations = reservations.map(r => {
        if (r.spkNo === spkNo && r.status === 'ACTIVE') {
          r.status = 'RELEASED';
          hasChanges = true;
          console.log(`[MaterialAllocator] Released reservation for ${r.materialName} (SPK: ${spkNo})`);
        }
        return r;
      });

      this.reservations.set(materialId, updatedReservations);
    }

    if (hasChanges) {
      this.saveReservations();
    }
  }

  /**
   * Consume materials (saat production)
   */
  async consumeMaterials(spkNo: string, consumedMaterials: Array<{id: string, qty: number}>): Promise<void> {
    let hasChanges = false;

    for (const consumed of consumedMaterials) {
      const reservations = this.reservations.get(consumed.id) || [];
      let remainingQty = consumed.qty;

      for (const reservation of reservations) {
        if (reservation.spkNo === spkNo && reservation.status === 'ACTIVE' && remainingQty > 0) {
          const consumeQty = Math.min(reservation.qty, remainingQty);
          
          if (consumeQty === reservation.qty) {
            reservation.status = 'CONSUMED';
          } else {
            reservation.qty -= consumeQty;
          }
          
          remainingQty -= consumeQty;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      this.saveReservations();
    }
  }

  /**
   * Check if SPK materials are ready
   */
  async checkSPKMaterialsReady(spkNo: string): Promise<boolean> {
    const spkReservations: MaterialReservation[] = [];
    
    for (const reservations of this.reservations.values()) {
      spkReservations.push(...reservations.filter(r => r.spkNo === spkNo && r.status === 'ACTIVE'));
    }

    return spkReservations.length > 0;
  }

  /**
   * Get reservations untuk SPK
   */
  getSPKReservations(spkNo: string): MaterialReservation[] {
    const spkReservations: MaterialReservation[] = [];
    
    for (const reservations of this.reservations.values()) {
      spkReservations.push(...reservations.filter(r => r.spkNo === spkNo));
    }

    return spkReservations;
  }

  /**
   * Get all active reservations
   */
  getAllActiveReservations(): MaterialReservation[] {
    const allReservations: MaterialReservation[] = [];
    
    for (const reservations of this.reservations.values()) {
      allReservations.push(...reservations.filter(r => r.status === 'ACTIVE'));
    }

    return allReservations;
  }

  /**
   * Get material shortages untuk multiple SPKs
   */
  async detectMaterialShortages(): Promise<MaterialShortage[]> {
    const shortages: MaterialShortage[] = [];
    const inventory = await this.getInventory();
    
    // Group reservations by material
    const materialDemand = new Map<string, {total: number, spks: string[]}>();
    
    for (const reservations of this.reservations.values()) {
      for (const reservation of reservations) {
        if (reservation.status === 'ACTIVE') {
          if (!materialDemand.has(reservation.materialId)) {
            materialDemand.set(reservation.materialId, {total: 0, spks: []});
          }
          const demand = materialDemand.get(reservation.materialId)!;
          demand.total += reservation.qty;
          if (!demand.spks.includes(reservation.spkNo)) {
            demand.spks.push(reservation.spkNo);
          }
        }
      }
    }

    // Check shortages
    for (const [materialId, demand] of materialDemand) {
      const material = inventory.find(item => item.id === materialId || item.sku === materialId);
      const totalStock = material ? (material.stock || material.qty || 0) : 0;
      
      if (totalStock < demand.total) {
        shortages.push({
          materialId,
          materialName: material ? (material.nama || material.name) : 'Unknown Material',
          required: demand.total,
          available: totalStock,
          shortage: demand.total - totalStock,
          unit: material ? (material.satuan || material.unit || 'pcs') : 'pcs',
          spkNo: demand.spks.join(', ')
        });
      }
    }

    return shortages;
  }

  /**
   * Clear all reservations (untuk testing)
   */
  clearAllReservations(): void {
    this.reservations.clear();
    localStorage.removeItem('material_reservations');
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const allReservations = this.getAllActiveReservations();
    const materialCount = this.reservations.size;
    const spkCount = new Set(allReservations.map(r => r.spkNo)).size;
    
    return {
      totalReservations: allReservations.length,
      uniqueMaterials: materialCount,
      uniqueSPKs: spkCount,
      totalReservedValue: allReservations.reduce((sum, r) => sum + r.qty, 0)
    };
  }
}

// Singleton instance
export const materialAllocator = new MaterialAllocator();