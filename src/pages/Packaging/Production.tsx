import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ScheduleTable from '../../components/ScheduleTable';
import ScheduleDialog from '../../components/ScheduleDialog';
import NotificationBell from '../../components/NotificationBell';
import { storageService, extractStorageValue } from '../../services/storage';
import { materialAllocator } from '../../services/material-allocator';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { openPrintWindow } from '../../utils/actions';
import { generateWOHtml } from '../../pdf/wo-pdf-template';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import '../../styles/common.css';
import '../../styles/compact.css';

interface Production {
  id: string;
  productionNo?: string;
  grnNo?: string;
  poNo?: string;
  spkNo?: string;
  soNo: string;
  customer: string;
  specNote?: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSE';
  date?: string;
  target: number;
  progress?: number;
  remaining?: number;
  docs?: string;
  productCode?: string;
  productName?: string;
  product?: string;
  productId?: string;
  targetQty?: number;
  producedQty?: number;
  surplusQty?: number;
  leftoverQty?: number;
  producedDate?: string;
  scheduleStartDate?: string;
  scheduleEndDate?: string;
  batches?: any[];
  signedSpkFile?: string;
  signedSpkFileName?: string;
  signedSpkUploadedAt?: string;
}

interface InventoryItem {
  id: string;
  supplierName: string;
  codeItem: string;
  description: string;
  kategori: string;
  satuan: string;
  price: number;
  stockPremonth: number;
  receive: number;
  outgoing: number;
  return: number;
  nextStock: number;
  lastUpdate?: string;
  sitePlan?: string; // Site Plan 1 or Site Plan 2
  // Tracking untuk anti-duplicate
  processedPOs?: string[]; // PO numbers yang sudah diproses (untuk material: RECEIVE dari GRN)
  processedSPKs?: string[]; // SPK numbers yang sudah diproses (untuk product: RECEIVE dari QC PASS dan OUTGOING dari Delivery)
  allocatedSPKs?: string[]; // SPK numbers yang sudah dialokasikan stock saat create PR (untuk material: OUTGOING sudah di-update)
  processedProductions?: string[]; // Production numbers/IDs yang sudah diproses (untuk material: OUTGOING dari Production)
}

const normalize = (value: any): string => (value ?? '').toString().trim().toUpperCase();

const Production = () => {
  const [productions, setProductions] = useState<Production[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'production' | 'schedule' | 'outstanding'>('production');
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [spkData, setSpkData] = useState<any[]>([]);
  const [bomData, setBomData] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [productionViewMode, setProductionViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedProductionForSubmit, setSelectedProductionForSubmit] = useState<Production | null>(null);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; spkNo: string; productionId: string } | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState<boolean>(false);
  
  // Custom Dialog state (untuk ganti confirm/alert)
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });
  
  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
    // Set dialog open untuk disable global event listener
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };
  
  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    // Set dialog open untuk disable global event listener
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  };
  
  const closeDialog = () => {
    // Restore global event listener saat dialog ditutup
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
      onConfirm: undefined,
      onCancel: undefined,
    });
  };

  useEffect(() => {
    loadProductions();
    loadScheduleData();
    // Refresh setiap 2 detik untuk cek notifikasi baru dan update material status
    const interval = setInterval(() => {
      loadProductions();
      loadScheduleData();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadScheduleData = async () => {
    const schedule = await storageService.get<any[]>('schedule') || [];
    const spk = await storageService.get<any[]>('spk') || [];
    const bom = await storageService.get<any[]>('bom') || [];
    const mats = await storageService.get<any[]>('materials') || [];
    setScheduleData(schedule);
    setSpkData(spk);
    setBomData(bom);
    setMaterials(mats);
  };

  const loadProductions = async () => {
    // Load production data
    let data = await storageService.get<Production[]>('production') || [];
    // Ensure data is always an array
    data = Array.isArray(data) ? data : [];
    
    // Auto-close production yang sudah mencapai target tapi masih OPEN
    let hasUpdates = false;
    const updatedData = data.map((prod: Production) => {
      if (prod.status === 'OPEN' || prod.status === 'DRAFT') {
        const targetQty = prod.target || prod.targetQty || 0;
        const progress = prod.progress || prod.producedQty || 0;
        
        // Jika progress sudah mencapai atau melebihi target, auto-close
        if (targetQty > 0 && progress >= targetQty) {
          hasUpdates = true;
          return {
            ...prod,
            status: 'CLOSE' as const,
            remaining: 0,
          };
        }
      }
      return prod;
    });
    
    // Save updated data jika ada perubahan
    if (hasUpdates) {
      await storageService.set('production', updatedData);
      data = updatedData;
    }
    
    // Load schedule data untuk enrich production dengan batch info
    let scheduleData = await storageService.get<any[]>('schedule') || [];
    // Ensure scheduleData is always an array
    scheduleData = Array.isArray(scheduleData) ? scheduleData : [];
    
    // Enrich production dengan schedule data (batches, dates)
    const enrichedProductions = data.map((prod: Production) => {
      const schedule = scheduleData.find((s: any) => s.spkNo === prod.spkNo);
      return {
        ...prod,
        scheduleStartDate: schedule?.scheduleStartDate,
        scheduleEndDate: schedule?.scheduleEndDate,
        batches: schedule?.batches || [],
      };
    });
    
    setProductions(enrichedProductions);

    // Load notifications dari PPIC (schedule)
    const productionNotificationsRaw = extractStorageValue(await storageService.get<any[]>('productionNotifications'));
    
    // Cek material status untuk setiap notification
    // IMPORTANT: Filter deleted items untuk prevent data resurrection dari sync
    const grnListRaw = extractStorageValue(await storageService.get<any[]>('grnPackaging'));
    const purchaseOrdersRaw = extractStorageValue(await storageService.get<any[]>('purchaseOrders'));
    const inventoryItemsRaw = extractStorageValue(await storageService.get<any[]>('inventory'));
    
    const grnList = filterActiveItems(grnListRaw);
    const purchaseOrders = filterActiveItems(purchaseOrdersRaw); // Exclude deleted PO
    const inventoryItems = filterActiveItems(inventoryItemsRaw); // Exclude deleted inventory items
    
    // IMPORTANT: Filter productionNotifications yang reference ke deleted PO
    // Notifikasi yang reference ke PO yang sudah di-delete harus di-exclude
    const productionNotifications = productionNotificationsRaw.filter((notif: any) => {
      // Jika notifikasi reference ke PO (via poNo atau poId), cek apakah PO masih aktif
      if (notif.poNo || notif.poId) {
        const poRef = notif.poNo || notif.poId;
        // Cek apakah PO reference masih ada di active PO
        const hasActivePO = purchaseOrders.some((po: any) => 
          (po.id === poRef || po.poNo === poRef) && !po.deleted
        );
        if (!hasActivePO) {
          // PO sudah di-delete, skip notifikasi ini
          return false;
        }
      }
      // Filter deleted notifications juga
      return !notif.deleted;
    });
    const bomList = extractStorageValue(await storageService.get<any[]>('bom'));
    const materialsList = extractStorageValue(await storageService.get<any[]>('materials'));

    const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
    const toNumber = (value: any) => {
      if (typeof value === 'number' && !Number.isNaN(value)) return value;
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    
    // IMPORTANT: Build map of material received from GRN per SPK (untuk material allocation tracking)
    // Material dari GRN untuk 1 SPK tidak boleh digunakan oleh SPK lain
    const grnMaterialBySPK: { [spkNo: string]: { [materialKey: string]: number } } = {};
    grnList.forEach((grn: any) => {
      const grnSpkNo = (grn.spkNo || '').toString().trim();
      if (!grnSpkNo) return;
      
      const materialId = (grn.materialId || '').toString().trim();
      if (!materialId) return;
      
      const materialKey = normalizeKey(materialId);
      if (!grnMaterialBySPK[grnSpkNo]) {
        grnMaterialBySPK[grnSpkNo] = {};
      }
      
      grnMaterialBySPK[grnSpkNo][materialKey] = (grnMaterialBySPK[grnSpkNo][materialKey] || 0) + (grn.qtyReceived || 0);
    });

    const inventoryMap: Record<string, any> = {};
    inventoryItems.forEach((item: any) => {
      const key = normalizeKey(item.codeItem);
      if (key && !inventoryMap[key]) {
        inventoryMap[key] = item;
      }
    });

    const materialAliasMap: Record<string, string> = {};
    materialsList.forEach((mat: any) => {
      const key = normalizeKey(mat.material_id || mat.kode);
      const alias = normalizeKey(mat.kode || mat.material_id);
      if (key && alias) {
        materialAliasMap[key] = alias;
        if (!materialAliasMap[alias]) {
          materialAliasMap[alias] = key;
        }
      }
    });

    const productBomMap: Record<string, any[]> = {};
    bomList.forEach((bom: any) => {
      const key = normalizeKey(bom.product_id || bom.kode);
      if (!key) return;
      if (!productBomMap[key]) {
        productBomMap[key] = [];
      }
      productBomMap[key].push(bom);
    });

    const getAvailableStock = (item: any) => {
      if (!item) return 0;
      if (typeof item.nextStock === 'number') return item.nextStock;
      const parsed = parseFloat(item.nextStock);
      if (!Number.isNaN(parsed)) return parsed;
      return (
        toNumber(item.stockPremonth) +
        toNumber(item.receive) -
        toNumber(item.outgoing) +
        toNumber(item.return)
      );
    };

    const findInventoryByMaterial = (materialId: string) => {
      const normalized = normalizeKey(materialId);
      if (!normalized) return null;
      if (inventoryMap[normalized]) return inventoryMap[normalized];
      const alias = materialAliasMap[normalized];
      if (alias && inventoryMap[alias]) return inventoryMap[alias];
      return null;
    };

    // SIMPLE MATERIAL READINESS CHECK: Cek material di inventory berdasarkan BOM
    // Tidak perlu first in first serve yang kompleks - cukup cek apakah material tersedia di inventory
    const hasReadyStock = (notif: any, batchQty?: number) => {
      try {
        const productKey = normalizeKey(notif.productId || notif.product || notif.productCode);
        // Jika ada batchQty, gunakan batchQty. Jika tidak, gunakan total qty SPK
        const qtyNeeded = batchQty !== undefined ? batchQty : toNumber(notif.qty || notif.target || notif.targetQty);
        if (!productKey || qtyNeeded <= 0) {
          console.log(`[Material Check] ${notif.spkNo}: Invalid productKey or qtyNeeded`, { productKey, qtyNeeded });
          return false;
        }
        
        const bomForProduct = productBomMap[productKey] || [];
        if (bomForProduct.length === 0) {
          console.log(`[Material Check] ${notif.spkNo}: No BOM found for product`, productKey);
          return false; // Tidak ada BOM, tidak bisa produksi
        }
        
        // SIMPLE CHECK: Cek setiap material di BOM - apakah tersedia di inventory
        for (const bom of bomForProduct) {
          const materialKey = normalizeKey(bom.material_id || bom.kode || bom.materialId);
          if (!materialKey) {
            console.warn(`[Material Check] ${notif.spkNo}: Invalid material key in BOM`, bom);
            continue;
          }
          
          // IMPORTANT: Gunakan override qty jika ada di notif, jika tidak gunakan ratio
          let requiredQty: number;
          const spkBOMOverride = notif.spkBOMOverride || {}; // SPK-specific BOM override dari notif
          if (spkBOMOverride[materialKey] !== undefined && spkBOMOverride[materialKey] !== null) {
            // Gunakan override qty dari PPIC (tidak mengikuti ratio)
            requiredQty = Math.max(Math.ceil(parseFloat(spkBOMOverride[materialKey]) || 0), 0);
            console.log(`[Material Check Override] ${notif.spkNo}: Material ${materialKey} using override qty=${requiredQty}`);
          } else {
            // Gunakan ratio calculation (default)
            const ratio = toNumber(bom.ratio || 1) || 1;
            requiredQty = Math.max(Math.ceil(qtyNeeded * ratio), 0);
          }
          
          if (requiredQty === 0) continue;
          
          const inventoryItem = findInventoryByMaterial(materialKey);
          if (!inventoryItem) {
            console.log(`[Material Check] ${notif.spkNo}: Material ${materialKey} not found in inventory`);
            return false; // Material tidak ada di inventory
          }
          
          // Available stock = nextStock (stockPremonth + receive - outgoing + return)
          const availableStock = getAvailableStock(inventoryItem);
          
          // SIMPLE: Jika available stock kurang dari required, material tidak siap
          if (availableStock < requiredQty) {
            console.log(`[Material Check] ${notif.spkNo}: Material ${materialKey} insufficient. Required: ${requiredQty}, Available: ${availableStock}`);
            return false;
          }
        }
        
        // Semua material tersedia
        console.log(`[Material Check] ✅ ${notif.spkNo}: All materials available`);
        return true;
      } catch (error) {
        console.error(`[Material Check] Error checking stock readiness for ${notif?.spkNo || notif?.soNo}:`, error);
        return false;
      }
    };

    // Check material readiness untuk semua batches dalam notif
    // SIMPLE: Cek material untuk setiap batch berdasarkan qty batch
    const checkBatchesMaterialReadiness = (notif: any) => {
      if (!notif.batches || notif.batches.length === 0) {
        // Tidak ada batches, cek per SPK total
        return hasReadyStock(notif);
      }
      
      // Cek setiap batch
      const batchReadiness: { [batchId: string]: boolean } = {};
      notif.batches.forEach((batch: any) => {
        batchReadiness[batch.id || batch.batchNo] = hasReadyStock(notif, batch.qty);
      });
      
      return batchReadiness;
    };
    
    // Helper untuk normalize SPK (remove batch suffix untuk matching)
    const normalizeSPK = (spk: string) => {
      if (!spk) return '';
      return spk.replace(/-[A-Z]$/, '').trim();
    };
    
    // Helper untuk enrich notifikasi dengan material requirements dari BOM
    const enrichNotificationWithMaterials = (notif: any) => {
      // Jika sudah ada materialRequirements, skip
      if (notif.materialRequirements && Array.isArray(notif.materialRequirements) && notif.materialRequirements.length > 0) {
        return notif;
      }
      
      const productKey = normalizeKey(notif.productId || notif.product || notif.productCode);
      if (!productKey) return notif;
      
      const bomForProduct = productBomMap[productKey] || [];
      if (bomForProduct.length === 0) return notif;
      
      const qtyNeeded = toNumber(notif.qty || notif.target || notif.targetQty);
      if (qtyNeeded <= 0) return notif;
      
      // IMPORTANT: Cek apakah ada override qty dari PPIC (tidak mengikuti ratio)
      const spkBOMOverride = notif.spkBOMOverride || {}; // SPK-specific BOM override dari notif
      
      // Build material requirements dari BOM
      const materialRequirements: any[] = [];
      bomForProduct.forEach((bom: any) => {
        const materialKey = normalizeKey(bom.material_id || bom.kode || bom.materialId);
        if (!materialKey) return;
        
        // IMPORTANT: Gunakan override qty jika ada, jika tidak gunakan ratio
        let requiredQty: number;
        let ratio: number;
        if (spkBOMOverride[materialKey] !== undefined && spkBOMOverride[materialKey] !== null) {
          // Gunakan override qty dari PPIC (tidak mengikuti ratio)
          requiredQty = Math.max(Math.ceil(parseFloat(spkBOMOverride[materialKey]) || 0), 0);
          ratio = requiredQty / qtyNeeded; // Calculate ratio untuk display
        } else {
          // Gunakan ratio calculation (default)
          ratio = toNumber(bom.ratio || 1) || 1;
          requiredQty = Math.max(Math.ceil(qtyNeeded * ratio), 0);
        }
        
        if (requiredQty === 0) return;
        
        // Cari material name dari materials list
        const material = materials.find((m: any) => 
          normalizeKey(m.material_id || m.kode) === materialKey
        );
        
        materialRequirements.push({
          materialId: materialKey,
          materialName: material?.name || material?.material_name || bom.material_name || materialKey,
          materialCode: material?.kode || material?.material_id || materialKey,
          ratio: ratio,
          requiredQty: requiredQty,
          unit: material?.unit || bom.unit || 'PCS',
        });
      });
      
      return {
        ...notif,
        materialRequirements: materialRequirements,
      };
    };
    
    // IMPORTANT: Load SPK data untuk enrich notifications dengan bomOverride
    const spkList = await storageService.get<any[]>('spk') || [];
    
    // Ensure productionNotifications is always an array
    const notificationsArray = Array.isArray(productionNotifications) ? productionNotifications : [];
    
    // Enrich notifications dengan bomOverride dari SPK dan material requirements
    const enrichedNotifications = notificationsArray.map((notif: any) => {
      // Cari SPK yang terkait untuk mendapatkan bomOverride
      const relatedSPK = spkList.find((s: any) => {
        const notifSpkNo = (notif.spkNo || '').toString().trim();
        const spkSpkNo = (s.spkNo || '').toString().trim();
        return notifSpkNo && spkSpkNo && (
          notifSpkNo === spkSpkNo || 
          notifSpkNo.replace(/-SJ\d+$/, '') === spkSpkNo.replace(/-SJ\d+$/, '')
        );
      });
      const spkBOMOverride = relatedSPK?.bomOverride || {}; // SPK-specific BOM override: { materialId: qty }
      
      // Enrich dengan bomOverride dan material requirements
      const enriched = enrichNotificationWithMaterials({
        ...notif,
        spkBOMOverride: spkBOMOverride, // Pass bomOverride ke notification
      });
      
      return enriched;
    });
    
    // Sort notifications: Terbaru di atas, CLOSE di bawah
    const sortedNotifications = [...enrichedNotifications].sort((a: any, b: any) => {
      // Priority 1: Cek apakah ada production dengan status CLOSE
      const aHasClose = a.productionList && a.productionList.some((p: any) => p.status === 'CLOSE');
      const bHasClose = b.productionList && b.productionList.some((p: any) => p.status === 'CLOSE');
      if (aHasClose !== bHasClose) {
        return aHasClose ? 1 : -1; // CLOSE di bawah
      }
      
      // Priority 2: Yang paling baru di atas (berdasarkan created date atau scheduleStartDate)
      const dateA = a.created || a.scheduleStartDate || '';
      const dateB = b.created || b.scheduleStartDate || '';
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime(); // Descending (newest first)
    });
    
    // Pre-calculate material readiness untuk semua notifications (SIMPLE: cek inventory saja)
    const materialReadinessMap: { [notifId: string]: any } = {};
    sortedNotifications.forEach((notif: any) => {
      const batchReadiness = checkBatchesMaterialReadiness(notif);
      materialReadinessMap[notif.id || notif.spkNo] = batchReadiness;
    });
    
    // Update material status berdasarkan progress production/GRN
    const updatedNotifications = productionNotifications.map((notif: any) => {
      const relatedProduction = data.find((p: any) => {
        const matchBySpk = notif.spkNo && p.spkNo === notif.spkNo;
        const matchBySo = !notif.spkNo && notif.soNo && p.soNo === notif.soNo;
        return matchBySpk || matchBySo;
      });
      
      if (relatedProduction) {
        const producedQty = relatedProduction.progress || relatedProduction.producedQty || 0;
        const targetQty = relatedProduction.target || relatedProduction.targetQty || notif.qty || 0;
        const remainingQty = Math.max(targetQty - producedQty, 0);
        
        if (relatedProduction.status === 'CLOSE' || remainingQty <= 0) {
          return {
            ...notif,
            status: 'COMPLETED',
            materialStatus: 'RECEIVED',
            pendingQty: 0,
          };
        }
        
        if (producedQty > 0) {
          return {
            ...notif,
            status: 'NEED_MORE_PRODUCTION',
            materialStatus: 'RECEIVED',
            pendingQty: remainingQty,
            qty: targetQty,
          };
        }
        
        return {
          ...notif,
          status: 'IN_PRODUCTION',
          materialStatus: 'RECEIVED',
          pendingQty: remainingQty,
        };
      }
      
      // Cek apakah stok inventory sudah mencukupi walau belum ada GRN
      // Gunakan pre-calculated material readiness (dengan first in first serve)
      const batchReadiness = materialReadinessMap[notif.id || notif.spkNo];
      const hasAnyReadyBatch = typeof batchReadiness === 'object' 
        ? Object.values(batchReadiness).some((ready: any) => ready === true)
        : batchReadiness;
      
      if (hasAnyReadyBatch) {
        return {
          ...notif,
          materialStatus: 'STOCK_READY', // Material tersedia dari inventory stock
          status: 'READY_TO_PRODUCE', // Siap untuk produksi
          stockReadyCheckedAt: new Date().toISOString(),
          batchMaterialReadiness: typeof batchReadiness === 'object' ? batchReadiness : undefined,
        };
      }
      
      // IMPORTANT: Auto-update status untuk notifikasi yang sudah ada tapi material sekarang sudah tersedia
      // Jika sebelumnya WAITING_MATERIAL tapi sekarang material sudah tersedia, update menjadi READY_TO_PRODUCE
      // SIMPLE: Cek material readiness dari pre-calculated map
      if (notif.status === 'WAITING_MATERIAL' || notif.materialStatus === 'PENDING') {
        const batchReadiness = materialReadinessMap[notif.id || notif.spkNo];
        const hasReadyAfterRecheck = typeof batchReadiness === 'object' 
          ? Object.values(batchReadiness).some((ready: any) => ready === true)
          : batchReadiness;
        
        if (hasReadyAfterRecheck) {
          console.log(`🔄 Auto-updating notification ${notif.spkNo} from WAITING_MATERIAL to READY_TO_PRODUCE (material now available)`);
          return {
            ...notif,
            materialStatus: 'STOCK_READY',
            status: 'READY_TO_PRODUCE',
            stockReadyCheckedAt: new Date().toISOString(),
            batchMaterialReadiness: typeof batchReadiness === 'object' ? batchReadiness : undefined,
          };
        }
      }
      
      // Cek apakah sudah ada GRN untuk SPK ini (bukan SO, karena material dialokasikan per SPK)
      // IMPORTANT: Material dari GRN untuk 1 SPK tidak boleh digunakan oleh SPK lain
      // Helper untuk normalize SPK (remove batch suffix untuk matching) - sudah didefinisikan di atas
      
      const notifSPK = (notif.spkNo || '').toString().trim();
      const notifSO = (notif.soNo || '').toString().trim();
      
      const relatedGRN = grnList.find((g: any) => {
        const grnSPK = (g.spkNo || '').toString().trim();
        const grnSO = (g.soNo || '').toString().trim();
        
        // Match SPK: exact atau normalized (handle batch suffix)
        const spkMatch = notifSPK && grnSPK && (
          grnSPK === notifSPK ||
          normalizeSPK(grnSPK) === normalizeSPK(notifSPK) ||
          grnSPK.startsWith(normalizeSPK(notifSPK)) ||
          notifSPK.startsWith(normalizeSPK(grnSPK))
        );
        
        // Match SO: exact (fallback jika SPK tidak match)
        const soMatch = notifSO && grnSO && grnSO === notifSO;
        
        return spkMatch || soMatch;
      });
      
      if (relatedGRN) {
        // IMPORTANT: Jika sudah ada GRN, tetap cek material readiness di inventory
        // GRN berarti material sudah masuk inventory, tapi tetap perlu cek apakah material benar-benar tersedia
        const batchReadiness = materialReadinessMap[notif.id || notif.spkNo];
        const hasReadyBatch = typeof batchReadiness === 'object' 
          ? Object.values(batchReadiness).some((ready: any) => ready === true)
          : batchReadiness;
        
        if (hasReadyBatch) {
          // Material tersedia di inventory (sudah masuk via GRN)
          return {
            ...notif,
            materialStatus: 'RECEIVED', // Material sudah diterima via GRN dan tersedia di inventory
            status: 'READY_TO_PRODUCE', // Siap untuk produksi
            grnNo: relatedGRN.grnNo,
            batchMaterialReadiness: typeof batchReadiness === 'object' ? batchReadiness : undefined,
            lastUpdate: new Date().toISOString(),
          };
        } else {
          // Ada GRN tapi material belum tersedia di inventory (mungkin belum masuk atau sudah digunakan)
          return {
            ...notif,
            materialStatus: 'PENDING', // Material belum tersedia di inventory
            status: 'WAITING_MATERIAL', // Masih menunggu material
            grnNo: relatedGRN.grnNo,
            lastUpdate: new Date().toISOString(),
          };
        }
      }
      
      // Cek apakah ada PO yang sudah dibuat tapi belum ada GRN
      const relatedPO = purchaseOrders.find((po: any) => {
        const poSPK = (po.spkNo || '').toString().trim();
        const poSO = (po.soNo || '').toString().trim();
        
        // Match SPK: exact atau normalized
        const spkMatch = notifSPK && poSPK && (
          poSPK === notifSPK ||
          normalizeSPK(poSPK) === normalizeSPK(notifSPK) ||
          poSPK.startsWith(normalizeSPK(notifSPK)) ||
          notifSPK.startsWith(normalizeSPK(poSPK))
        );
        
        // Match SO: exact
        const soMatch = notifSO && poSO && poSO === notifSO;
        
        return spkMatch || soMatch;
      });
      
      if (relatedPO) {
        return {
          ...notif,
          materialStatus: 'PO_CREATED', // PO sudah dibuat, menunggu GRN
          status: 'WAITING_MATERIAL',
        };
      }
      
      return notif;
    });
    
    // Auto-cleanup: hapus notifications yang sudah selesai, pertahankan reminder saat produksi belum memenuhi target
    const cleanedNotifications = updatedNotifications.filter((n: any) => {
      const relatedProduction = data.find((p: any) => {
        const matchBySpk = n.spkNo && p.spkNo === n.spkNo;
        const matchBySo = !n.spkNo && n.soNo && p.soNo === n.soNo;
        return matchBySpk || matchBySo;
      });
      
      if (n.status === 'COMPLETED') {
        return false;
      }
      
      if (!relatedProduction) {
        return true;
      }
      
      const producedQty = relatedProduction.progress || relatedProduction.producedQty || 0;
      const targetQty = relatedProduction.target || relatedProduction.targetQty || n.qty || 0;
      const remainingQty = Math.max(targetQty - producedQty, 0);
      
      // Keep notification hanya jika sudah ada progress tapi masih kurang dari target
      return producedQty > 0 && remainingQty > 0;
    });
    
    // Additional cleanup: Hapus notification yang sudah ada production (lebih agresif)
    // DAN hapus notifikasi SPK utama yang sudah di-divide menjadi batch SPKs
    const finalCleanedNotifications = cleanedNotifications.filter((n: any) => {
      // Skip jika status sudah IN_PRODUCTION atau COMPLETED
      if (n.status === 'IN_PRODUCTION' || n.status === 'COMPLETED') {
        return false;
      }
      
      // Skip jika sudah ada production untuk SPK ini (baik OPEN maupun CLOSE)
      // Helper function untuk match SPK (handle batch format)
      const matchSPK = (spk1: string, spk2: string): boolean => {
        if (!spk1 || !spk2) return false;
        if (spk1 === spk2) return true;
        const normalize = (spk: string) => spk.replace(/-/g, '/');
        const normalized1 = normalize(spk1);
        const normalized2 = normalize(spk2);
        if (normalized1 === normalized2) return true;
        const base1 = normalized1.split('/').slice(0, 2).join('/');
        const base2 = normalized2.split('/').slice(0, 2).join('/');
        return base1 === base2;
      };
      
      const hasAnyProduction = productions.some((p: any) => {
        const pSpk = (p.spkNo || '').toString().trim();
        const nSpk = (n.spkNo || '').toString().trim();
        // Match exact atau match base (untuk handle batch SPK)
        return matchSPK(pSpk, nSpk);
      });
      if (hasAnyProduction) {
        console.log(`[Production Filter] Excluding notification for SPK ${n.spkNo}: already has production`);
        return false;
      }
      
      // IMPORTANT: Hapus notifikasi SPK utama jika sudah ada batch SPKs (SPK yang di-divide)
      // Contoh: Jika ada SPK-251212-4QKHH-A dan SPK-251212-4QKHH-B, hapus notifikasi untuk SPK-251212-4QKHH
      const nSpk = (n.spkNo || '').toString().trim();
      const nSpkNormalized = normalizeSPK(nSpk);
      
      // Cek apakah SPK ini adalah SPK utama (tidak punya suffix -A, -B, dll)
      // Pattern: SPK utama tidak punya suffix seperti -A, -B, -C di akhir
      // Contoh: SPK-251212-4QKHH adalah SPK utama, SPK-251212-4QKHH-A adalah batch SPK
      const isMainSPK = nSpk === nSpkNormalized && !nSpk.match(/-[A-Z]$/);
      
      if (isMainSPK) {
        // Cek apakah ada notifikasi lain dengan SPK yang sama tapi dengan batch suffix (A, B, C, dll)
        const hasBatchSPKs = cleanedNotifications.some((otherNotif: any) => {
          if (otherNotif.id === n.id) return false; // Skip diri sendiri
          const otherSpk = (otherNotif.spkNo || '').toString().trim();
          const otherSpkNormalized = normalizeSPK(otherSpk);
          
          // Jika normalized SPK sama tapi other SPK punya suffix, berarti ada batch SPK
          // Pattern: other SPK harus punya format seperti SPK-251212-4QKHH-A (base-A, base-B, dll)
          // Cek: normalized sama DAN other SPK punya suffix -A, -B, dll di akhir
          return otherSpkNormalized === nSpkNormalized && 
                 otherSpk !== otherSpkNormalized && 
                 /-[A-Z]$/.test(otherSpk); // Pastikan ada suffix -A, -B, dll di akhir
        });
        
        if (hasBatchSPKs) {
          console.log(`🧹 Removing main SPK notification ${nSpk} because it has been divided into batch SPKs`);
          return false; // Hapus notifikasi SPK utama
        }
      }
      
      return true;
    });
    
    // Enrich updated notifications dengan material requirements jika belum ada
    const enrichedUpdatedNotifications = updatedNotifications.map((notif: any) => enrichNotificationWithMaterials(notif));
    
    // Update notifications di storage (cleanup yang sudah tidak relevan + auto-update status)
    // IMPORTANT: Simpan enrichedUpdatedNotifications (bukan finalCleanedNotifications) untuk preserve status updates dan material requirements
    // Tapi filter dulu untuk hapus yang sudah completed DAN hapus SPK utama yang sudah di-divide
    const notificationsToSave = enrichedUpdatedNotifications.filter((n: any) => {
      // Keep notifications yang masih relevan (belum completed)
      if (n.status === 'COMPLETED') return false;
      
      // Keep jika belum ada production atau production belum selesai
      const relatedProduction = data.find((p: any) => {
        const matchBySpk = n.spkNo && p.spkNo === n.spkNo;
        const matchBySo = !n.spkNo && n.soNo && p.soNo === n.soNo;
        return matchBySpk || matchBySo;
      });
      
      if (relatedProduction && relatedProduction.status === 'CLOSE') {
        const producedQty = relatedProduction.progress || relatedProduction.producedQty || 0;
        const targetQty = relatedProduction.target || relatedProduction.targetQty || n.qty || 0;
        if (producedQty >= targetQty) return false; // Production sudah selesai
      }
      
      // IMPORTANT: Hapus notifikasi SPK utama jika sudah ada batch SPKs (SPK yang di-divide)
      // Contoh: Jika ada SPK-251212-4QKHH-A dan SPK-251212-4QKHH-B, hapus notifikasi untuk SPK-251212-4QKHH
      const nSpk = (n.spkNo || '').toString().trim();
      const nSpkNormalized = normalizeSPK(nSpk);
      
      // Cek apakah SPK ini adalah SPK utama (tidak punya suffix -A, -B, dll)
      const isMainSPK = nSpk === nSpkNormalized && !nSpk.match(/-[A-Z]$/);
      
      if (isMainSPK) {
        // Cek apakah ada notifikasi lain dengan SPK yang sama tapi dengan batch suffix (A, B, C, dll)
        const hasBatchSPKs = enrichedUpdatedNotifications.some((otherNotif: any) => {
          if (otherNotif.id === n.id) return false; // Skip diri sendiri
          const otherSpk = (otherNotif.spkNo || '').toString().trim();
          const otherSpkNormalized = normalizeSPK(otherSpk);
          
          // Jika normalized SPK sama tapi other SPK punya suffix, berarti ada batch SPK
          return otherSpkNormalized === nSpkNormalized && 
                 otherSpk !== otherSpkNormalized && 
                 /-[A-Z]$/.test(otherSpk); // Pastikan ada suffix -A, -B, dll di akhir
        });
        
        if (hasBatchSPKs) {
          console.log(`🧹 Removing main SPK notification ${nSpk} from storage because it has been divided into batch SPKs`);
          return false; // Hapus notifikasi SPK utama
        }
      }
      
      return true;
    });
    
    // Cek apakah ada perubahan (status, materialStatus, atau materialRequirements)
    const hasChanges = notificationsToSave.some((n: any) => {
      const original = productionNotifications.find((o: any) => (o.id === n.id) || (o.spkNo === n.spkNo && o.spkNo));
      if (!original) return true; // New notification
      // Cek perubahan status, materialStatus, atau materialRequirements
      if (n.status !== original.status || n.materialStatus !== original.materialStatus) return true;
      // Cek apakah materialRequirements ditambahkan atau berubah
      const hasMaterialReqs = n.materialRequirements && Array.isArray(n.materialRequirements) && n.materialRequirements.length > 0;
      const originalHasMaterialReqs = original.materialRequirements && Array.isArray(original.materialRequirements) && original.materialRequirements.length > 0;
      if (hasMaterialReqs !== originalHasMaterialReqs) return true;
      if (hasMaterialReqs && JSON.stringify(n.materialRequirements) !== JSON.stringify(original.materialRequirements)) return true;
      return false;
    }) || notificationsToSave.length !== productionNotifications.length;
    
    if (hasChanges) {
      await storageService.set('productionNotifications', notificationsToSave);
      const cleanedCount = productionNotifications.length - notificationsToSave.length;
      const updatedCount = notificationsToSave.filter((n: any) => {
        const original = productionNotifications.find((o: any) => (o.id === n.id) || (o.spkNo === n.spkNo && o.spkNo));
        return original && (n.status !== original.status || n.materialStatus !== original.materialStatus);
      }).length;
      const enrichedCount = notificationsToSave.filter((n: any) => {
        const original = productionNotifications.find((o: any) => (o.id === n.id) || (o.spkNo === n.spkNo && o.spkNo));
        if (!original) return false;
        const hasMaterialReqs = n.materialRequirements && Array.isArray(n.materialRequirements) && n.materialRequirements.length > 0;
        const originalHasMaterialReqs = original.materialRequirements && Array.isArray(original.materialRequirements) && original.materialRequirements.length > 0;
        return hasMaterialReqs && !originalHasMaterialReqs;
      }).length;
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} obsolete production notifications`);
      }
      if (updatedCount > 0) {
        console.log(`🔄 Auto-updated ${updatedCount} notifications (material now available, status changed to READY_TO_PRODUCE)`);
      }
      if (enrichedCount > 0) {
        console.log(`📦 Enriched ${enrichedCount} notifications with material requirements`);
      }
      
      // Force sync to server untuk prevent data conflict
      const config = storageService.getConfig();
      if (config.type === 'server' && config.serverUrl) {
        try {
          await storageService.syncToServer();
          console.log('[Production] ✅ Updated notifications synced to server');
        } catch (error) {
          console.warn('[Production] ⚠️ Failed to sync updated notifications to server:', error);
        }
      }
    }
    
    // Filter notifications yang masih aktif untuk ditampilkan (belum jadi production)
    setNotifications(finalCleanedNotifications);
  };

  // Group production data per SO No (sama seperti PPIC)
  const groupedProductionData = useMemo(() => {
    const visibleProductions = productions;

    const grouped = visibleProductions.reduce((acc: any, prod: Production) => {
      const soNo = prod.soNo || '';
      if (!acc[soNo]) {
        acc[soNo] = {
          soNo: soNo,
          customer: prod.customer || '',
          productionList: [],
          totalTarget: 0,
          totalProgress: 0,
          statuses: new Set<string>(),
          created: prod.date || prod.producedDate || '',
        };
      }
      
      acc[soNo].productionList.push({
        ...prod,
        progress: prod.progress || prod.producedQty || 0,
        target: prod.target || prod.targetQty || 0,
      });
      
      acc[soNo].totalTarget += (prod.target || prod.targetQty || 0);
      acc[soNo].totalProgress += (prod.progress || prod.producedQty || 0);
      if (prod.status) acc[soNo].statuses.add(prod.status);
      if (prod.date && (!acc[soNo].created || prod.date < acc[soNo].created)) {
        acc[soNo].created = prod.date;
      }
      return acc;
    }, {});

    // Sort: Terbaru di atas, CLOSE di bawah
    return Object.values(grouped).sort((a: any, b: any) => {
      // Priority 1: CLOSE status di bawah, yang lain di atas
      const hasCloseA = a.statuses && a.statuses.has('CLOSE');
      const hasCloseB = b.statuses && b.statuses.has('CLOSE');
      if (hasCloseA !== hasCloseB) {
        return hasCloseA ? 1 : -1; // CLOSE di bawah
      }
      
      // Priority 2: Yang paling baru di atas (berdasarkan created date)
      const dateA = new Date(a.created || 0).getTime();
      const dateB = new Date(b.created || 0).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [productions]);

  // Filter production data berdasarkan search query
  const filteredProductionData = useMemo(() => {
    let filtered = groupedProductionData;
    
    // Tab filter - Outstanding tab hanya show status OPEN
    if (activeTab === 'outstanding') {
      filtered = filtered.map((item: any) => {
        // Filter productionList untuk hanya yang status OPEN
        const openProductions = item.productionList.filter((prod: any) => prod.status === 'OPEN');
        
        // Jika tidak ada production OPEN, skip item ini
        if (openProductions.length === 0) {
          return null;
        }
        
        // Recalculate totalTarget dan totalProgress hanya dari production OPEN
        const totalTarget = openProductions.reduce((sum: number, prod: any) => sum + (prod.target || 0), 0);
        const totalProgress = openProductions.reduce((sum: number, prod: any) => sum + (prod.progress || 0), 0);
        
        // Update statuses untuk hanya berisi OPEN
        const statuses = new Set<string>();
        statuses.add('OPEN');
        
        return {
          ...item,
          productionList: openProductions,
          totalTarget,
          totalProgress,
          statuses,
        };
      }).filter((item: any) => item !== null); // Remove null items
    }
    
    if (!searchQuery) return filtered;
    
    const query = searchQuery.toLowerCase();
    return filtered.filter((item: any) => {
      if (
        (item.soNo || '').toLowerCase().includes(query) ||
        (item.customer || '').toLowerCase().includes(query)
      ) {
        return true;
      }
      
      const statusesArray = Array.from(item.statuses || []) as string[];
      if (statusesArray.some((status: string) => (status || '').toLowerCase().includes(query))) {
        return true;
      }
      
      return item.productionList.some((prod: any) => {
        return (
          (prod.productionNo || '').toLowerCase().includes(query) ||
          (prod.spkNo || '').toLowerCase().includes(query) ||
          (prod.product || '').toLowerCase().includes(query) ||
          (prod.productId || '').toLowerCase().includes(query) ||
          (prod.status || '').toLowerCase().includes(query) ||
          String(prod.target || '').includes(query) ||
          String(prod.progress || '').includes(query)
        );
      });
    });
  }, [groupedProductionData, searchQuery, activeTab]);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Ensure scheduleData is always an array (declare at function start for scope)
      const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
      
      // Helper function untuk add summary row
      const addSummaryRow = (ws: XLSX.WorkSheet, columns: ExcelColumn[], summaryData: Record<string, any>) => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const summaryRowIdx = range.e.r + 2;
        const emptyRowIdx = range.e.r + 1;
        
        columns.forEach((_, colIdx) => {
          const emptyCell = XLSX.utils.encode_cell({ r: emptyRowIdx, c: colIdx });
          ws[emptyCell] = { t: 's', v: '' };
          
          const summaryCell = XLSX.utils.encode_cell({ r: summaryRowIdx, c: colIdx });
          const col = columns[colIdx];
          const value = summaryData[col.key] ?? '';
          
          if (col.format === 'currency' && typeof value === 'number') {
            ws[summaryCell] = { t: 'n', v: value, z: '#,##0' };
          } else if (col.format === 'number' && typeof value === 'number') {
            ws[summaryCell] = { t: 'n', v: value };
          } else {
            ws[summaryCell] = { t: 's', v: String(value || '') };
          }
        });
        
        ws['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: summaryRowIdx, c: range.e.c },
        });
      };
      
      // Sheet 1: Production Data - Detail lengkap semua production
      const allProductionData: any[] = [];
      productions.forEach((prod: Production) => {
        allProductionData.push({
          productionNo: prod.productionNo || '',
          grnNo: prod.grnNo || '',
          poNo: prod.poNo || '',
          spkNo: prod.spkNo || '',
          soNo: prod.soNo,
          customer: prod.customer,
          productCode: prod.productCode || '',
          productName: prod.productName || '',
          target: prod.target,
          progress: prod.progress || 0,
          remaining: prod.remaining || (prod.target - (prod.progress || 0)),
          status: prod.status,
          date: prod.date || '',
          specNote: prod.specNote || '',
          docs: prod.docs || '',
        });
      });

      if (allProductionData.length > 0) {
        const productionColumns: ExcelColumn[] = [
          { key: 'productionNo', header: 'Production No', width: 20 },
          { key: 'grnNo', header: 'GRN No', width: 20 },
          { key: 'poNo', header: 'PO No', width: 20 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'productCode', header: 'Product Code', width: 20 },
          { key: 'productName', header: 'Product Name', width: 40 },
          { key: 'target', header: 'Target', width: 12, format: 'number' },
          { key: 'progress', header: 'Progress', width: 12, format: 'number' },
          { key: 'remaining', header: 'Remaining', width: 12, format: 'number' },
          { key: 'status', header: 'Status', width: 15 },
          { key: 'date', header: 'Date', width: 18, format: 'date' },
          { key: 'specNote', header: 'Spec Note', width: 40 },
        ];
        const wsProduction = createStyledWorksheet(allProductionData, productionColumns, 'Sheet 1 - Production');
        setColumnWidths(wsProduction, productionColumns);
        const totalTarget = allProductionData.reduce((sum, p) => sum + (p.target || 0), 0);
        const totalProgress = allProductionData.reduce((sum, p) => sum + (p.progress || 0), 0);
        addSummaryRow(wsProduction, productionColumns, {
          productionNo: 'TOTAL',
          target: totalTarget,
          progress: totalProgress,
        });
        XLSX.utils.book_append_sheet(wb, wsProduction, 'Sheet 1 - Production');
      }

      // Sheet 2: Schedule Data
      if (scheduleArray.length > 0) {
        const scheduleDataExport = scheduleArray.map((schedule: any) => ({
          scheduleDate: schedule.scheduleDate || '',
          scheduleEndDate: schedule.scheduleEndDate || '',
          soNo: schedule.soNo || '',
          spkNo: schedule.spkNo || '',
          customer: schedule.customer || '',
          productCode: schedule.productCode || '',
          productName: schedule.productName || '',
          qty: schedule.qty || 0,
          unit: schedule.unit || '',
          progress: schedule.progress || 0,
          remaining: (schedule.qty || 0) - (schedule.progress || 0),
          status: schedule.status || '',
          deliveryDate: schedule.deliveryDate || '',
        }));

        const scheduleColumns: ExcelColumn[] = [
          { key: 'scheduleDate', header: 'Schedule Date', width: 18, format: 'date' },
          { key: 'scheduleEndDate', header: 'Schedule End Date', width: 18, format: 'date' },
          { key: 'deliveryDate', header: 'Delivery Date', width: 18, format: 'date' },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'productCode', header: 'Product Code', width: 20 },
          { key: 'productName', header: 'Product Name', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'unit', header: 'Unit', width: 10 },
          { key: 'progress', header: 'Progress', width: 12, format: 'number' },
          { key: 'remaining', header: 'Remaining', width: 12, format: 'number' },
          { key: 'status', header: 'Status', width: 15 },
        ];
        const wsSchedule = createStyledWorksheet(scheduleDataExport, scheduleColumns, 'Sheet 2 - Schedule');
        setColumnWidths(wsSchedule, scheduleColumns);
        const totalScheduleQty = scheduleDataExport.reduce((sum, s) => sum + (s.qty || 0), 0);
        const totalScheduleProgress = scheduleDataExport.reduce((sum, s) => sum + (s.progress || 0), 0);
        addSummaryRow(wsSchedule, scheduleColumns, {
          scheduleDate: 'TOTAL',
          qty: totalScheduleQty,
          progress: totalScheduleProgress,
        });
        XLSX.utils.book_append_sheet(wb, wsSchedule, 'Sheet 2 - Schedule');
      }

      // Sheet 3: Outstanding (Production dengan status OPEN)
      const outstandingProduction = productions.filter((p: Production) => p.status === 'OPEN');
      if (outstandingProduction.length > 0) {
        const outstandingData = outstandingProduction.map((prod: Production) => ({
          productionNo: prod.productionNo || '',
          spkNo: prod.spkNo || '',
          soNo: prod.soNo,
          customer: prod.customer,
          productCode: prod.productCode || '',
          productName: prod.productName || '',
          target: prod.target,
          progress: prod.progress || 0,
          remaining: prod.remaining || (prod.target - (prod.progress || 0)),
          date: prod.date || '',
        }));

        const outstandingColumns: ExcelColumn[] = [
          { key: 'productionNo', header: 'Production No', width: 20 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'productCode', header: 'Product Code', width: 20 },
          { key: 'productName', header: 'Product Name', width: 40 },
          { key: 'target', header: 'Target', width: 12, format: 'number' },
          { key: 'progress', header: 'Progress', width: 12, format: 'number' },
          { key: 'remaining', header: 'Remaining', width: 12, format: 'number' },
          { key: 'date', header: 'Date', width: 18, format: 'date' },
        ];
        const wsOutstanding = createStyledWorksheet(outstandingData, outstandingColumns, 'Sheet 3 - Outstanding');
        setColumnWidths(wsOutstanding, outstandingColumns);
        const totalOutstandingTarget = outstandingData.reduce((sum, o) => sum + (o.target || 0), 0);
        const totalOutstandingProgress = outstandingData.reduce((sum, o) => sum + (o.progress || 0), 0);
        addSummaryRow(wsOutstanding, outstandingColumns, {
          productionNo: 'TOTAL',
          target: totalOutstandingTarget,
          progress: totalOutstandingProgress,
        });
        XLSX.utils.book_append_sheet(wb, wsOutstanding, 'Sheet 3 - Outstanding');
      }

      if (wb.SheetNames.length === 0) {
        showAlert('No data available to export', 'Error');
        return;
      }

      const fileName = `Production_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      // scheduleArray already declared above at line 953
      showAlert(`✅ Exported complete production data (${allProductionData.length} production, ${scheduleArray.length} schedule, ${outstandingProduction.length} outstanding) to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  // Generate row color dari SO No (theme-aware, sama seperti PPIC)
  const getRowColor = (soNo: string) => {
    const soIndex = filteredProductionData.findIndex((g: any) => g.soNo === soNo);
    const theme = document.documentElement.getAttribute('data-theme');
    // Light theme: subtle gray variations, Dark theme: darker variations
    const rowColors = theme === 'light' 
      ? ['#fafafa', '#f0f0f0'] 
      : ['#1b1b1b', '#2f2f2f'];
    const index = soIndex >= 0 ? soIndex : 0;
    return rowColors[index % rowColors.length];
  };

  // Transform scheduleData ke format ScheduleTable (sama seperti PPIC)
  // Pastikan tidak ada duplikasi dengan menggunakan Set untuk track ID yang sudah diproses
  const transformedScheduleData = useMemo(() => {
    const result: any[] = [];
    const processedIds = new Set<string>(); // Track ID yang sudah diproses untuk avoid duplikasi
    
    // Ensure scheduleData is always an array
    const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
    scheduleArray.forEach((schedule: any) => {
      // Skip jika schedule ID sudah diproses (avoid duplikasi)
      if (processedIds.has(schedule.id)) {
        return;
      }
      processedIds.add(schedule.id);
      
      // Find SPK berdasarkan spkNo atau soNo
      let spk = schedule.spkNo ? spkData.find((s: any) => s.spkNo === schedule.spkNo) : null;
      
      // Jika tidak ketemu dengan spkNo, cari berdasarkan soNo
      if (!spk && schedule.soNo) {
        const matchingSPKs = spkData.filter((s: any) => s.soNo === schedule.soNo);
        if (matchingSPKs.length > 0) {
          spk = matchingSPKs[0];
        }
      }
      
      if (!spk) return; // Skip jika SPK tidak ditemukan
      
      // Cek apakah schedule ini punya batch
      const hasBatches = schedule.batches && schedule.batches.length > 0;
      
      if (hasBatches) {
        // Jika ada batches, buat row untuk setiap batch
        schedule.batches.forEach((batch: any) => {
          const batchId = `${schedule.id}-batch-${batch.batchNo || batch.id}`;
          // Skip jika batch ID sudah diproses
          if (processedIds.has(batchId)) {
            return;
          }
          processedIds.add(batchId);
          
          const deliveryBatch = schedule.deliveryBatches?.find((db: any) => 
            db.batchNo === batch.batchNo || (db.qty === batch.qty && !schedule.deliveryBatches?.find((d: any) => d.batchNo === batch.batchNo))
          );
          
          result.push({
            id: batchId,
            spkNo: schedule.spkNo || spk.spkNo,
            soNo: schedule.soNo || spk.soNo,
            customer: spk.customer || '',
            poCustomer: schedule.soNo || spk.soNo,
            code: spk.product_id || spk.kode || '',
            item: spk.product || '',
            quantity: batch.qty || 0,
            unit: 'PCS',
            scheduleDate: batch.scheduleStartDate || schedule.scheduleStartDate || '',
            scheduleStartDate: batch.scheduleStartDate || schedule.scheduleStartDate,
            scheduleEndDate: batch.scheduleEndDate || schedule.scheduleEndDate,
            scheduleDeliveryDate: deliveryBatch?.deliveryDate,
            status: spk.status || 'DRAFT',
            target: batch.qty || spk.qty || 0,
            progress: 0,
            remaining: batch.qty || spk.qty || 0,
            keterangan: batch.batchName || `Batch ${batch.batchNo || ''}`,
          });
        });
      } else {
        // Jika tidak ada batch, buat row untuk schedule utama
        const deliveryBatch = schedule.deliveryBatches?.[0];
        
        result.push({
          id: schedule.id,
          spkNo: schedule.spkNo || spk.spkNo,
          soNo: schedule.soNo || spk.soNo,
          customer: spk.customer || '',
          poCustomer: schedule.soNo || spk.soNo,
          code: spk.product_id || spk.kode || '',
          item: spk.product || '',
          quantity: spk.qty || 0,
          unit: 'PCS',
          scheduleDate: schedule.scheduleStartDate || '',
          scheduleStartDate: schedule.scheduleStartDate,
          scheduleEndDate: schedule.scheduleEndDate,
          scheduleDeliveryDate: deliveryBatch?.deliveryDate,
          status: spk.status || 'DRAFT',
          target: spk.qty || 0,
          progress: schedule.progress || 0,
          remaining: (spk.qty || 0) - (schedule.progress || 0),
        });
      }
    });
    
    // Remove duplikasi berdasarkan ID (setiap item harus unique berdasarkan ID)
    // Juga deduplicate berdasarkan spkNo + scheduleStartDate + scheduleEndDate jika ID berbeda tapi data sama
    const uniqueResult: any[] = [];
    const uniqueIds = new Set<string>();
    const uniqueSpkDateKeys = new Set<string>(); // Track spkNo + dates untuk deduplicate
    
    result.forEach((item) => {
      // Skip jika ID sudah ada (duplikasi berdasarkan ID)
      if (uniqueIds.has(item.id)) {
        return;
      }
      
      // Key untuk deduplicate berdasarkan spkNo + dates (tanpa batch info)
      // Jika ada batch, include batch info di key
      const spkDateKey = item.keterangan 
        ? `${item.spkNo}-${item.scheduleStartDate || ''}-${item.scheduleEndDate || ''}-${item.keterangan}`
        : `${item.spkNo}-${item.scheduleStartDate || ''}-${item.scheduleEndDate || ''}`;
      
      // Skip jika sudah ada item dengan spkNo + dates yang sama (dan batch yang sama jika ada batch)
      if (uniqueSpkDateKeys.has(spkDateKey)) {
        return;
      }
      
      uniqueIds.add(item.id);
      uniqueSpkDateKeys.add(spkDateKey);
      uniqueResult.push(item);
    });
    
    return uniqueResult;
  }, [scheduleData, spkData]);

  const handleScheduleClick = (item: any) => {
    // Find schedule berdasarkan spkNo
    const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
    const schedule = scheduleArray.find((s: any) => s.spkNo === item.spkNo);
    const spk = spkData.find((s: any) => s.spkNo === item.spkNo);
    
    if (!schedule || !spk) {
      showAlert('Schedule atau SPK tidak ditemukan', 'Error');
      return;
    }
    
    setSelectedScheduleItem({
      spkNo: item.spkNo,
      soNo: item.soNo,
      product: item.item,
      qty: item.quantity,
      target: item.target,
      progress: item.progress || 0,
      remaining: item.remaining || item.target,
      scheduleStartDate: schedule.scheduleStartDate,
      scheduleEndDate: schedule.scheduleEndDate,
      batches: schedule.batches || [],
    });
  };

  const handleSaveSchedule = async (data: any) => {
    try {
      const spkNo = selectedScheduleItem?.spkNo || data.spkNo;
      if (!spkNo) {
        showAlert('Error: SPK No tidak ditemukan', 'Error');
        return;
      }
      
      const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
      const existingSchedule = scheduleArray.find((s: any) => s.spkNo === spkNo);
      const spkItem = spkData.find((s: any) => s.spkNo === spkNo);
      
      const scheduleItem = {
        id: existingSchedule?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
        spkNo: spkNo,
        soNo: selectedScheduleItem?.soNo || existingSchedule?.soNo || spkItem?.soNo || '',
        scheduleStartDate: data.startDate ? new Date(data.startDate).toISOString() : (existingSchedule?.scheduleStartDate || new Date().toISOString()),
        scheduleEndDate: data.endDate ? new Date(data.endDate).toISOString() : (existingSchedule?.scheduleEndDate || new Date().toISOString()),
        batches: data.batches || existingSchedule?.batches || [],
        progress: existingSchedule?.progress || 0,
        created: existingSchedule?.created || new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      // scheduleArray already declared above at line 1222
      let updated = scheduleArray.filter(s => s.spkNo !== spkNo);
      updated.push(scheduleItem);
      
      await storageService.set('schedule', updated);
      setScheduleData(updated);
      showAlert('Schedule saved successfully', 'Success');
      setSelectedScheduleItem(null);
      loadScheduleData();
    } catch (error: any) {
      showAlert(`Error saving schedule: ${error.message}`, 'Error');
    }
  };

  const generateSpkHtmlContent = async (item: Production) => {
    // Load data yang diperlukan untuk generate SPK PDF
    const spkList = await storageService.get<any[]>('spk') || [];
    const salesOrders = await storageService.get<any[]>('salesOrders') || [];
    const productsList = await storageService.get<any[]>('products') || [];
    const materialsList = await storageService.get<any[]>('materials') || [];
    const bomList = await storageService.get<any[]>('bom') || [];
    const scheduleList = await storageService.get<any[]>('schedule') || [];

    const targetSpkNo = normalize(item.spkNo || item.productionNo || item.id);
    const targetSoNoRaw = item.soNo || (item as any).so || '';
    const targetSoNo = normalize(targetSoNoRaw);

    // Cari SPK berdasarkan spkNo atau soNo (case-insensitive, trimmed)
    const spk =
      spkList.find((s: any) => {
        const spkNoNorm = normalize(s.spkNo || s.id || '');
        const soNoNorm = normalize(s.soNo || s.so_no || '');
        return (targetSpkNo && spkNoNorm === targetSpkNo) || (targetSoNo && soNoNorm === targetSoNo);
      }) || null;

    const fallbackSpk = {
      spkNo: item.spkNo || item.productionNo || item.id,
      soNo: targetSoNoRaw || spk?.soNo || '',
      customer: item.customer || spk?.customer || '',
      product: item.product || item.productName || spk?.product || '',
      product_id: (item as any).productId || spk?.product_id || '',
      qty: item.target || item.targetQty || spk?.qty || 0,
      unit: spk?.unit || 'PCS',
      specNote: item.specNote || spk?.specNote || '',
      scheduleStartDate: spk?.scheduleStartDate || item.scheduleStartDate,
      scheduleEndDate: spk?.scheduleEndDate || item.scheduleEndDate,
    };

    const effectiveSpk = spk || fallbackSpk;

    // Cari SO berdasarkan soNo (fallback pakai data SPK/production)
    const soFromStore = salesOrders.find((s: any) => {
      const soNoNorm = normalize(s.soNo);
      const spkSoNorm = normalize(effectiveSpk.soNo);
      return (targetSoNo && soNoNorm === targetSoNo) || (spkSoNorm && soNoNorm === spkSoNorm);
    });

    const fallbackSo = {
      id: `fallback-${effectiveSpk.soNo || effectiveSpk.spkNo}`,
      soNo: effectiveSpk.soNo || effectiveSpk.spkNo,
      customer: effectiveSpk.customer || '',
      globalSpecNote: effectiveSpk.specNote || '',
      items: [
        {
          productId: effectiveSpk.product_id || effectiveSpk.product || '',
          productKode: effectiveSpk.product_id || effectiveSpk.product || '',
          productName: effectiveSpk.product || '',
          qty: effectiveSpk.qty || 0,
          unit: effectiveSpk.unit || 'PCS',
        },
      ],
    };

    const so = soFromStore || fallbackSo;

    // Cari schedule untuk mendapatkan scheduleDate
    const schedule =
      scheduleList.find((s: any) => {
        const spkNoNorm = normalize(s.spkNo);
        const soNoNorm = normalize(s.soNo);
        return (
          (targetSpkNo && spkNoNorm === targetSpkNo) ||
          (targetSoNo && soNoNorm === targetSoNo) ||
          (normalize(effectiveSpk.spkNo) && spkNoNorm === normalize(effectiveSpk.spkNo)) ||
          (normalize(effectiveSpk.soNo) && soNoNorm === normalize(effectiveSpk.soNo))
        );
      }) || {
        scheduleStartDate: effectiveSpk.scheduleStartDate,
        scheduleEndDate: effectiveSpk.scheduleEndDate,
      };

    // Siapkan items spesifik SPK (per product), fallback ke data production, terakhir baru SO
    const spkProductItems = spk
      ? [{
          productId: spk.product_id || spk.kode || '',
          productKode: spk.product_id || spk.kode || '',
          productName: spk.product || '',
          qty: spk.qty || 0,
          unit: spk.unit || 'PCS',
        }]
      : [];

    const fallbackProductionItems = (item.product || item.productName)
      ? [{
          productId: (item as any).productId || (item as any).productCode || '',
          productKode: (item as any).productId || (item as any).productCode || '',
          productName: item.product || item.productName || '',
          qty: item.target || item.targetQty || 0,
          unit: 'PCS',
        }]
      : [];

    const soItemsRaw = (so?.items && so.items.length > 0) ? so.items : [];

    const productItems =
      (spkProductItems.length > 0)
        ? spkProductItems
        : (fallbackProductionItems.length > 0)
          ? fallbackProductionItems
          : soItemsRaw;

    // Format SO lines untuk template (gunakan productItems agar hanya 1 product per SPK)
    const soLines = productItems.map((soItem: any) => ({
      itemSku: soItem.productId || soItem.productKode || '',
      qty: soItem.qty || 0,
    }));

    // Format materials dari BOM dengan mempertimbangkan bomOverride dari SPK
    const woMaterials: any[] = [];
    // IMPORTANT: Ambil bomOverride dari SPK
    const spkBOMOverride = spk?.bomOverride || {}; // SPK-specific BOM override: { materialId: qty }
    const spkQty = spk?.qty || item.target || item.targetQty || 0;
    
    productItems.forEach((soItem: any) => {
      const productId = (soItem.productId || soItem.productKode || '').toString().trim();
      const productBOM = bomList.filter((b: any) => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId === productId;
      });

      productBOM.forEach((bom: any) => {
        const material = materialsList.find((m: any) =>
          (m.material_id || m.kode || '').toString().trim() === (bom.material_id || '').toString().trim()
        );

        if (material) {
          const materialId = (material.material_id || material.kode || '').toString().trim();
          
          // IMPORTANT: Hitung qty dengan mempertimbangkan override dari SPK
          let materialQty: number;
          let qtyPerUnit: number;
          
          if (spkBOMOverride[materialId] !== undefined && spkBOMOverride[materialId] !== null) {
            // Gunakan override qty dari PPIC (tidak mengikuti ratio)
            materialQty = Math.max(Math.ceil(parseFloat(spkBOMOverride[materialId]) || 0), 0);
            qtyPerUnit = spkQty > 0 ? materialQty / spkQty : (bom.ratio || 1);
          } else {
            // Gunakan ratio calculation (default)
            qtyPerUnit = parseFloat(bom.ratio || 1) || 1;
            materialQty = Math.max(Math.ceil((soItem.qty || 0) * qtyPerUnit), 0);
          }
          
          woMaterials.push({
            materialId: material.material_id || material.kode || '',
            materialCode: material.material_id || material.kode || '',
            materialName: material.nama || '',
            name: material.nama || '',
            panjang: material.panjang || '0.00',
            lebar: material.lebar || '0.00',
            tinggi: material.tinggi || '0.00',
            unit: material.satuan || 'PCS',
            qtyPerUnit: qtyPerUnit,
            qty: materialQty,
          });
        }
      });
    });

    // Format products untuk template
    const templateProducts = productItems.map((soItem: any) => {
      const product = productsList.find((p: any) =>
        (p.product_id || p.kode || '').toString().trim() === (soItem.productId || soItem.productKode || '').toString().trim()
      );

      if (product) {
        const productBOM = bomList.filter((b: any) => {
          const bomProductId = (b.product_id || b.kode || '').toString().trim();
          return bomProductId === (soItem.productId || soItem.productKode || '').toString().trim();
        });

        const bomMaterials = productBOM.map((bom: any) => {
          const material = materialsList.find((m: any) =>
            (m.material_id || m.kode || '').toString().trim() === (bom.material_id || '').toString().trim()
          );
          return {
            panjang: material?.panjang || '0.00',
            lebar: material?.lebar || '0.00',
            tinggi: material?.tinggi || '0.00',
            unit: material?.satuan || 'PCS',
          };
        });

        return {
          id: product.product_id || product.kode || '',
          sku: product.kode || product.product_id || '',
          name: product.nama || soItem.productName || '',
          bom: {
            materials: bomMaterials,
          },
        };
      }

      return {
        id: soItem.productId || soItem.productKode || '',
        sku: soItem.productKode || soItem.productId || '',
        name: soItem.productName || '',
        bom: {
          materials: [],
        },
      };
    });

    // Format WO untuk template
    const wo = {
      id: effectiveSpk.spkNo || item.productionNo || item.id,
      soId: so?.id || `fallback-${normalize(so?.soNo || effectiveSpk.soNo || effectiveSpk.spkNo)}`,
      soNo: so?.soNo || effectiveSpk.soNo || effectiveSpk.spkNo || '-',
      customer: so?.customer || effectiveSpk.customer || item.customer || '-',
      product: item.product || item.productName || '',
      qty: item.target || item.targetQty || 0,
      status: item.status || 'OPEN',
      createdAt: item.date || item.producedDate || new Date().toISOString(),
      materials: woMaterials,
      docs: {
        scheduleDate: schedule?.scheduleStartDate || item.scheduleStartDate || effectiveSpk.scheduleStartDate || null,
      },
    };

    // Format SO untuk template
    const templateSO = {
      soNo: so?.soNo || effectiveSpk.soNo || effectiveSpk.spkNo || '-',
      customer: so?.customer || effectiveSpk.customer || item.customer || '',
      specNote: so?.globalSpecNote || effectiveSpk.specNote || item.specNote || '',
      lines: soLines,
    };

    // Load company info from settings
    const companySettings = await storageService.get<{ companyName: string; address: string }>('companySettings');
    const company = {
      companyName: companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA',
      address: companySettings?.address || 'Jl. Raya Cikarang Cibarusah Kp. Kukun RT 11/06 Desa Ciantra Kecamatan Cikarang Selatan Kabupaten Bekasi',
    };

    // Logo menggunakan logo-loader utility untuk kompatibilitas development, production, dan Electron
    // Support noxtiz.png, noxtiz.ico, dan Logo.gif
    let logo = await loadLogoAsBase64();

    // Generate HTML menggunakan template
    return generateWOHtml({
      logo,
      company,
      wo,
      so: templateSO,
      products: templateProducts,
      materials: materialsList.map((m: any) => ({
        id: m.material_id || m.kode || '',
        sku: m.kode || m.material_id || '',
        name: m.nama || '',
        materialId: m.material_id || m.kode || '',
        materialCode: m.material_id || m.kode || '',
        materialName: m.nama || '',
      })),
      rawMaterials: [],
    });
  };

  const handlePrint = async (item: Production) => {
    try {
      const html = await generateSpkHtmlContent(item);
      openPrintWindow(html);
    } catch (error: any) {
      showAlert(`Error generating SPK PDF: ${error.message}`, 'Error');
      console.error('Error generating SPK PDF:', error);
    }
  };

  const handleViewDetail = async (item: Production) => {
    try {
      const html = await generateSpkHtmlContent(item);
      setViewPdfData({ html, spkNo: item.spkNo || item.productionNo || item.id, productionId: item.id });
    } catch (error: any) {
      showAlert(`Error menampilkan SPK: ${error.message}`, 'Error');
      console.error('Error previewing SPK:', error);
    }
  };

  const handleUploadSignedSpk = (production: Production) => {
    if (!production) {
      showAlert('Data produksi tidak ditemukan.', 'Error');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        showAlert('Ukuran file maksimal 10MB.', 'Validation');
        return;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const updatedProductions = productions.map((p) =>
            p.id === production.id
              ? {
                  ...p,
                  signedSpkFile: base64,
                  signedSpkFileName: file.name,
                  signedSpkUploadedAt: new Date().toISOString(),
                }
              : p
          );
          await storageService.set('production', updatedProductions);
          setProductions(updatedProductions);
          showAlert('SPK bertanda tangan berhasil diupload.', 'Success');
        } catch (error: any) {
          showAlert(`Error upload SPK: ${error.message}`, 'Error');
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleViewSignedSpk = (production: Production) => {
    if (!production?.signedSpkFile) {
      showAlert('Belum ada SPK bertanda tangan yang diupload.', 'Info');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      showAlert('Popup diblokir browser. Izinkan popup untuk melihat dokumen.', 'Warning');
      return;
    }
    win.document.write(`
      <html>
        <head><title>${production.signedSpkFileName || 'SPK Signed'}</title></head>
        <body style="margin:0;">
          <iframe src="${production.signedSpkFile}" style="border:0;width:100%;height:100vh;"></iframe>
        </body>
      </html>
    `);
  };

  const handleDownloadSpkPdf = async () => {
    if (!viewPdfData) return;
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.savePdf) {
        const fileName = `${viewPdfData.spkNo}.pdf`;
        const result = await electronAPI.savePdf(viewPdfData.html, fileName);
        if (!result?.success) {
          showAlert(result?.message || 'Gagal menyimpan PDF', 'Error');
        } else {
          showAlert('SPK berhasil disimpan sebagai PDF', 'Success');
        }
      } else {
        openPrintWindow(viewPdfData.html);
      }
    } catch (error: any) {
      showAlert(`Error download PDF: ${error.message}`, 'Error');
    }
  };

  const handlePrintSpkPdf = () => {
    if (!viewPdfData) return;
    openPrintWindow(viewPdfData.html);
  };

  // Update inventory when production is submitted
  const updateInventoryFromProduction = async (item: Production, materialsUsedData: any[] = []) => {
    try {
      console.log('🔍 [Production Inventory] ===== STARTING UPDATE =====');
      console.log('🔍 [Production Inventory] Production item:', item);
      
      // Load required data
      const salesOrders = await storageService.get<any[]>('salesOrders') || [];
      const bomData = await storageService.get<any[]>('bom') || [];
      const materials = await storageService.get<any[]>('materials') || [];
      const products = await storageService.get<any[]>('products') || [];
      const suppliers = await storageService.get<any[]>('suppliers') || [];
      const purchaseOrders = await storageService.get<any[]>('purchaseOrders') || [];
      const inventory = await storageService.get<InventoryItem[]>('inventory') || [];
      
      console.log(`🔍 [Production Inventory] Loaded: ${inventory.length} inventory items, ${products.length} products`);

      // Find SO to get product info
      const so = salesOrders.find(s => s.soNo === item.soNo);
      if (!so || !so.items || so.items.length === 0) {
        console.warn(`SO ${item.soNo} not found or has no items`);
        return;
      }

      console.log('🔍 [Production Inventory] Starting update for production:', item.productionNo || item.grnNo, 'SO:', item.soNo);
      console.log('🔍 [Production Inventory] Progress/Target:', item.progress, item.target);

      // IMPORTANT: Baca material usage dari productionResults per product (key jelas: product + material)
      // Setiap product punya productionResult sendiri dengan materials yang jelas
      const productionResults = await storageService.get<any[]>('productionResults') || [];
      const productionResultsForSO = productionResults.filter((pr: any) => pr.soNo === item.soNo);
      
      console.log(`🔍 [Production Inventory] Found ${productionResultsForSO.length} production result(s) for SO ${item.soNo}`);
      
      // Aggregate material usage dari semua productionResults (per product, key jelas)
      const materialUsageMap: { [materialId: string]: { materialName: string; materialUsed: number } } = {};

      // Jika ada data dari dialog (materialsUsedData), pakai itu (untuk production yang baru di-submit)
      if (materialsUsedData.length > 0) {
        console.log('🔍 [Production Inventory] Using materials data from dialog form (current submission)');
        console.log('🔍 [Production Inventory] Materials data received:', materialsUsedData);
        materialsUsedData.forEach((m: any) => {
          const materialId = (m.materialId || '').toString().trim();
          const qtyUsed = parseFloat(m.qtyUsed || '0') || 0;
          console.log(`🔍 [Production Inventory] Processing material from form: ${m.materialName} (${materialId}), qtyUsed: ${qtyUsed}`);
          if (materialId) {
            // Aggregate jika material yang sama muncul lebih dari sekali
            materialUsageMap[materialId] = {
              materialName: m.materialName || '',
              materialUsed: (materialUsageMap[materialId]?.materialUsed || 0) + qtyUsed,
            };
          } else {
            console.warn(`⚠️ [Production Inventory] Material ID kosong untuk: ${m.materialName}`);
          }
        });
      }
      
      // IMPORTANT: Jangan baca dari productionResults jika materialsUsedData sudah ada
      // Ini untuk avoid double counting - materialsUsedData dari dialog form sudah mencakup material usage yang benar
      // Hanya baca dari productionResults jika materialsUsedData tidak ada (untuk backward compatibility)
      if (materialsUsedData.length === 0 && productionResultsForSO.length > 0) {
        console.log('🔍 [Production Inventory] Reading materials from existing productionResults (per product) - no form data available');
        productionResultsForSO.forEach((pr: any) => {
          console.log(`🔍 [Production Inventory] Processing productionResult for product: ${pr.product}`);
          if (pr.materials && Array.isArray(pr.materials)) {
            pr.materials.forEach((m: any) => {
              const materialId = (m.materialId || '').toString().trim();
              const qtyUsed = parseFloat(m.qtyUsed || '0') || 0;
              console.log(`🔍 [Production Inventory]   Material from productionResult: ${m.materialName} (${materialId}), qtyUsed: ${qtyUsed} (for product: ${pr.product})`);
              if (materialId) {
                // Aggregate material usage dari semua productionResults
                materialUsageMap[materialId] = {
                  materialName: m.materialName || '',
                  materialUsed: (materialUsageMap[materialId]?.materialUsed || 0) + qtyUsed,
                };
              }
            });
          }
        });
      } else if (materialsUsedData.length > 0 && productionResultsForSO.length > 0) {
        console.log('🔍 [Production Inventory] Skipping existing productionResults - using materialsUsedData from form to avoid double counting');
      }

      // Fallback: Kalau tidak ada data dari dialog dan productionResults, hitung dari BOM per product
      if (materialsUsedData.length === 0 && productionResultsForSO.length === 0) {
        console.log('🔍 [Production Inventory] No form data or productionResults found, calculating from BOM per product');
        for (const soItem of so.items) {
          const productId = soItem.productId || soItem.productKode;
          const productQty = soItem.qty || 0; // Qty per product di SO
          
          if (productQty <= 0) continue;
          
          const productBOM = bomData.filter(b => {
            const bomProductId = (b.product_id || b.kode || '').toString().trim();
            return bomProductId === (productId || '').toString().trim();
          });

          productBOM.forEach((bom: any) => {
            const material = materials.find(m => (m.material_id || m.kode) === bom.material_id);
            if (!material) return;
            
            const materialId = (material.material_id || material.kode || '').toString().trim();
            const materialUsed = productQty * (bom.ratio || 1);
            
            if (materialId) {
              materialUsageMap[materialId] = {
                materialName: material.nama || '',
                materialUsed: (materialUsageMap[materialId]?.materialUsed || 0) + materialUsed,
              };
            }
          });
        }
      }

      console.log('🔍 [Production Inventory] Final aggregated material usage:', materialUsageMap);

      // Process materials (update inventory OUTGOING)
      for (const materialId in materialUsageMap) {
        const materialData = materialUsageMap[materialId];
        const materialUsed = materialData.materialUsed;
        const materialName = materialData.materialName;

        // Update inventory for MATERIAL - TAMBAHKAN OUTGOING
        // Matching yang lebih robust: coba beberapa cara
        const materialIdTrimmed = materialId.toString().trim();
        let existingMaterialInventory = inventory.find(inv => {
          const invCode = (inv.codeItem || '').toString().trim();
          return invCode.toLowerCase() === materialIdTrimmed.toLowerCase();
        });
        
        // Jika tidak ketemu, coba match dengan material_id atau kode dari master
        if (!existingMaterialInventory) {
          const materialFromMaster = materials.find(m => {
            const mId = ((m.material_id || m.kode) || '').toString().trim();
            return mId.toLowerCase() === materialIdTrimmed.toLowerCase();
          });
          
          if (materialFromMaster) {
            const masterCode = ((materialFromMaster.material_id || materialFromMaster.kode) || '').toString().trim();
            existingMaterialInventory = inventory.find(inv => {
              const invCode = (inv.codeItem || '').toString().trim();
              return invCode.toLowerCase() === masterCode.toLowerCase();
            });
          }
        }

        // ANTI-DUPLICATE: Cek di inventory apakah PO number sudah pernah diproses untuk material ini
        // Key tracking: PO number (bukan production number), karena material berasal dari PO
        // Cari PO yang terkait dengan material ini untuk production ini
        // IMPORTANT: Cari PO yang sudah CLOSE (ada receiptDate) untuk material ini
        const relatedPO = purchaseOrders.find((po: any) => {
          const poMaterialId = (po.materialId || '').toString().trim();
          const poSoNo = (po.soNo || '').toString().trim();
          const poSpkNo = (po.spkNo || '').toString().trim();
          const prodSoNo = (item.soNo || '').toString().trim();
          const prodSpkNo = (item.spkNo || '').toString().trim();
          // PO harus sudah CLOSE dan punya receiptDate (material sudah received)
          const isPOReceived = (po.status === 'CLOSE' || po.receiptDate) && po.receiptDate;
          return poMaterialId.toLowerCase() === materialIdTrimmed.toLowerCase() &&
                 (poSoNo === prodSoNo || poSpkNo === prodSpkNo) &&
                 isPOReceived;
        });
        
        const poNo = relatedPO?.poNo || '';
        console.log(`🔍 [Production Inventory] Material ${materialName} (${materialId}): PO found = ${poNo || 'NOT FOUND'}`);
        
        // IMPORTANT: Material yang sudah dialokasikan saat create PR hanya reserve material
        // Material baru benar-benar digunakan saat production di-submit
        // Jadi outgoing HARUS di-update saat production di-submit, tidak boleh skip
        // allocatedSPKs hanya untuk tracking material allocation, bukan untuk skip outgoing update
        
        // ANTI-DUPLICATE: Track per production submission, bukan per PO
        // Satu PO bisa digunakan untuk multiple production submissions (misalnya produksi 300 pertama, lalu 300 kedua)
        // Jadi kita perlu track per production number + material ID untuk unique tracking
        const productionNo = item.productionNo || item.id || '';
        // Gunakan production number + material ID + timestamp untuk unique tracking per submission
        const productionResultId = materialsUsedData.length > 0 ? `${productionNo || item.id || 'PR'}-${materialId}-${Date.now()}` : '';
        const trackingKey = productionResultId || `${productionNo || item.id || 'PROD'}-${item.spkNo || ''}-${materialId}`;
        
        // Cek apakah production submission ini sudah pernah diproses untuk material ini
        // Gunakan processedProductions untuk track production submissions
        if (existingMaterialInventory) {
          const processedProductions = existingMaterialInventory.processedProductions || [];
          if (processedProductions.includes(trackingKey)) {
            console.warn(`⚠️ [Production Inventory] Production ${trackingKey} sudah pernah diproses untuk material ${materialId} (OUTGOING). Skip update.`);
            continue; // Skip material ini, lanjut ke material berikutnya
          }
        }
        
        if (!poNo) {
          console.warn(`⚠️ [Production Inventory] PO tidak ditemukan untuk material ${materialId}. Tetap update inventory (mungkin material dari source lain).`);
        }

        if (existingMaterialInventory) {
          // Update existing material inventory - TAMBAHKAN OUTGOING
          const oldOutgoing = existingMaterialInventory.outgoing || 0;
          const oldReceive = existingMaterialInventory.receive || 0;
          const newOutgoing = oldOutgoing + materialUsed;
          
          // Track production submission untuk anti-duplicate (bukan PO, karena satu PO bisa multiple submissions)
          const processedProductions = existingMaterialInventory.processedProductions || [];
          if (trackingKey && !processedProductions.includes(trackingKey)) {
            processedProductions.push(trackingKey);
          }
          existingMaterialInventory.processedProductions = processedProductions;
          
          // Track PO untuk reference (tapi tidak untuk skip update)
          const existingProcessedPOs = existingMaterialInventory.processedPOs || [];
          if (poNo && !existingProcessedPOs.includes(poNo)) {
            existingProcessedPOs.push(poNo);
          }
          existingMaterialInventory.processedPOs = existingProcessedPOs;
          
          existingMaterialInventory.outgoing = newOutgoing;
          
          // Recalculate nextStock: stockPremonth + receive - outgoing + return
          existingMaterialInventory.nextStock =
            (existingMaterialInventory.stockPremonth || 0) +
            (existingMaterialInventory.receive || 0) -
            newOutgoing +
            (existingMaterialInventory.return || 0);
          existingMaterialInventory.lastUpdate = new Date().toISOString();
          console.log(`✅ [Production Inventory] Material inventory updated (OUTGOING from PO ${poNo}):`);
          console.log(`   Material: ${materialName} (${materialId})`);
          console.log(`   PO: ${poNo} (key tracking untuk OUTGOING)`);
          console.log(`   Receive: ${oldReceive}`);
          console.log(`   Outgoing: ${oldOutgoing} → ${newOutgoing} (+${materialUsed})`);
          console.log(`   NextStock: ${existingMaterialInventory.nextStock}`);
        } else {
          // Material tidak ditemukan di inventory - SKIP update, jangan create entry baru
          // CRITICAL: Produksi hanya cek inventory, bukan create material inventory
          // Material harus sudah ada di inventory (dari GRN) sebelum bisa digunakan untuk produksi
          console.error(`❌ [Production Inventory] Material NOT FOUND in inventory: ${materialName} (${materialId})`);
          console.error(`   Material sudah digunakan untuk produksi tapi tidak ada di inventory!`);
          console.error(`   Ini berarti material belum pernah masuk ke inventory (belum ada GRN).`);
          console.error(`   Production: ${item.productionNo || item.grnNo}, SO: ${item.soNo}`);
          console.error(`   ⚠️ SKIPPING inventory update untuk material ini - tidak akan create entry baru`);
          console.error(`   Material harus masuk ke inventory melalui GRN terlebih dahulu.`);
          
          // JANGAN create entry baru - hanya log error dan skip
          // Material inventory hanya bisa dibuat melalui GRN (Purchasing), bukan dari Production
        }
      }

      // Update PRODUCT inventory (finished goods) - TAMBAHKAN RECEIVE
      // Product yang dihasilkan dari production harus masuk ke inventory sebagai finished goods
      // IMPORTANT: Gunakan qtyProduced dari item (yang baru di-submit), bukan total progress
      // IMPORTANT: Juga tambahkan surplusQty ke received inventory
      const qtyProduced = (item as any).qtyProduced || item.progress || 0; // Qty yang baru dihasilkan dari production submission ini
      const qtySurplus = (item as any).surplusQty || 0; // Surplus quantity yang juga harus masuk ke received inventory
      const totalQtyReceived = qtyProduced + qtySurplus; // Total qty yang masuk ke received (produced + surplus)
      
      if (qtyProduced > 0 || qtySurplus > 0) {
        // Cari product dari SO atau production - coba beberapa cara matching
        let productId = item.productId || '';
        let productName = item.product || '';
        
        // Jika tidak ada di item, cari dari SO items
        if (!productId && so.items && so.items.length > 0) {
          // Cari product yang match dengan SPK ini (jika ada)
          const matchingSOItem = so.items.find((soItem: any) => {
            // Cek apakah SO item ini terkait dengan SPK ini
            // Bisa match berdasarkan product name atau product code
            const soProductName = (soItem.productName || '').toString().trim().toLowerCase();
            const itemProductName = (item.product || '').toString().trim().toLowerCase();
            return soProductName && itemProductName && soProductName === itemProductName;
          }) || so.items[0]; // Fallback ke item pertama jika tidak ada match
          
          productId = matchingSOItem.productId || matchingSOItem.productKode || '';
          productName = matchingSOItem.productName || '';
        }
        
        if (productId) {
          // Cari product di master untuk mendapatkan info lengkap - coba beberapa cara matching
          let product = products.find((p: any) => {
            const pId = (p.product_id || p.kode || '').toString().trim();
            return pId.toLowerCase() === productId.toString().trim().toLowerCase();
          });
          
          // Jika tidak ketemu dengan ID, coba match dengan nama
          if (!product && productName) {
            product = products.find((p: any) => {
              const pName = (p.nama || '').toString().trim().toLowerCase();
              return pName === productName.toString().trim().toLowerCase();
            });
          }
          
          if (product) {
            const productCode = (product.product_id || product.kode || productId).toString().trim();
            const productNameFinal = product.nama || productName || '';
            const productUnit = product.satuan || 'PCS';
            
            // IMPORTANT: Ambil price dari master product dengan prioritas: hargaSales > hargaFg > harga > 0
            // Sama seperti di SalesOrders untuk konsistensi
            const productPrice = product.hargaSales || product.hargaFg || product.harga || (product as any).hargaJual || 0;
            
            // Cari existing product inventory - coba beberapa cara matching
            let existingProductInventory = inventory.find((inv: any) => {
              const invCode = (inv.codeItem || '').toString().trim().toLowerCase();
              const invDesc = (inv.description || '').toString().trim().toLowerCase();
              const searchCode = productCode.toLowerCase();
              const searchName = productNameFinal.toLowerCase();
              return invCode === searchCode || invDesc === searchName;
            });
            
            // ANTI-DUPLICATE: Track production submission untuk product inventory
            const productionNo = item.productionNo || item.id || '';
            const productTrackingKey = `${productionNo || item.id || 'PROD'}-${item.spkNo || ''}-PRODUCT`;
            
            if (existingProductInventory) {
              // Cek apakah production submission ini sudah pernah diproses untuk product ini
              const processedProductions = existingProductInventory.processedProductions || [];
              if (processedProductions.includes(productTrackingKey)) {
                console.warn(`⚠️ [Production Inventory] Production ${productTrackingKey} sudah pernah diproses untuk product ${productCode} (RECEIVE). Skip update.`);
              } else {
                // Update existing product inventory - TAMBAHKAN RECEIVE (termasuk surplus)
                const oldReceive = existingProductInventory.receive || 0;
                const oldOutgoing = existingProductInventory.outgoing || 0;
                const oldReturn = existingProductInventory.return || 0;
                const newReceive = oldReceive + totalQtyReceived; // Tambahkan qtyProduced + surplusQty
                
                // Update price dari master product (selalu update untuk konsistensi)
                // Prioritas: hargaSales > hargaFg > harga > hargaJual
                const oldPrice = existingProductInventory.price || 0;
                existingProductInventory.price = productPrice;
                if (oldPrice !== productPrice) {
                  console.log(`   Price updated: ${oldPrice} → ${productPrice} (from master product)`);
                }
                
                // Track production submission untuk anti-duplicate
                if (!processedProductions.includes(productTrackingKey)) {
                  processedProductions.push(productTrackingKey);
                }
                
                // Recalculate nextStock: stockPremonth + receive - outgoing + return
                existingProductInventory.receive = newReceive;
                existingProductInventory.processedProductions = processedProductions;
                existingProductInventory.nextStock =
                  (existingProductInventory.stockPremonth || 0) +
                  newReceive -
                  oldOutgoing +
                  oldReturn;
                // Get sitePlan from item (passed from handleSaveProductionResult)
                existingProductInventory.sitePlan = (item as any).sitePlan || 'Site Plan 1';
                existingProductInventory.lastUpdate = new Date().toISOString();
                
                console.log(`✅ [Production Inventory] Product inventory updated (RECEIVE from Production):`);
                console.log(`   Product: ${productNameFinal} (${productCode})`);
                console.log(`   Production: ${productionNo || item.id}`);
                console.log(`   Receive: ${oldReceive} → ${newReceive} (+${qtyProduced} produced${qtySurplus > 0 ? ` + ${qtySurplus} surplus` : ''})`);
                console.log(`   NextStock: ${existingProductInventory.nextStock}`);
              }
            } else {
              // Create new product inventory entry dengan receive
              // IMPORTANT: Ambil price dari master product dengan prioritas: hargaSales > hargaFg > harga > hargaJual
              // Sama seperti di SalesOrders untuk konsistensi
              const newProductInventory = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                supplierName: so.customer || '',
                codeItem: productCode,
                description: productNameFinal,
                kategori: product.kategori || 'Product',
                satuan: productUnit,
                price: productPrice, // Price dari master product
                stockPremonth: 0,
                receive: totalQtyReceived, // qtyProduced + surplusQty
                outgoing: 0,
                return: 0,
                nextStock: 0 + totalQtyReceived - 0 + 0, // stockPremonth + receive - outgoing + return
                processedProductions: [productTrackingKey], // Track production submission untuk anti-duplicate
                lastUpdate: new Date().toISOString(),
              };
              inventory.push(newProductInventory);
              console.log(`✅ [Production Inventory] New product inventory created (RECEIVE from Production):`);
              console.log(`   Product: ${productNameFinal} (${productCode})`);
              console.log(`   Production: ${productionNo || item.id}`);
              console.log(`   Receive: ${totalQtyReceived} (${qtyProduced} produced${qtySurplus > 0 ? ` + ${qtySurplus} surplus` : ''}) | Stock: ${totalQtyReceived}`);
            }
          } else {
            console.error(`❌ [Production Inventory] Product not found in master:`);
            console.error(`   ProductId: ${productId}`);
            console.error(`   ProductName: ${productName}`);
            console.error(`   Production: ${item.productionNo || item.id}`);
            console.error(`   SO: ${item.soNo}`);
            console.error(`   Available products (first 5):`, products.slice(0, 5).map((p: any) => ({ 
              product_id: p.product_id, 
              kode: p.kode, 
              nama: p.nama 
            })));
            showAlert(`⚠️ Product tidak ditemukan di master data!\n\nProductId: ${productId}\nProductName: ${productName}\n\nInventory product tidak dapat di-update.`, 'Warning');
          }
        } else {
          console.error(`❌ [Production Inventory] Product ID not found for production:`);
          console.error(`   Production: ${item.productionNo || item.id}`);
          console.error(`   SO: ${item.soNo}`);
          console.error(`   SO Items:`, so.items?.map((i: any) => ({ 
            productId: i.productId, 
            productKode: i.productKode, 
            productName: i.productName 
          })));
          showAlert(`⚠️ Product ID tidak ditemukan untuk production!\n\nProduction: ${item.productionNo || item.id}\nSO: ${item.soNo}\n\nInventory product tidak dapat di-update.`, 'Warning');
        }
      }

      // Save updated inventory
      await storageService.set('inventory', inventory);
      console.log('✅ [Production Inventory] ===== INVENTORY SAVED =====');
      console.log('✅ [Production Inventory] Total inventory items after update:', inventory.length);
    } catch (error: any) {
      console.error('❌ [Production Inventory] Error updating inventory from production:', error);
      showAlert(`Error updating inventory from production: ${error.message}`, 'Error');
      throw error;
    }
  };


  const handleSubmitProduction = (item: Production) => {
    if (item.status === 'CLOSE') {
      showAlert(`Production ${item.grnNo || item.productionNo} sudah selesai (CLOSE).`, 'Cannot Submit');
      return;
    }
    setSelectedProductionForSubmit(item);
  };

  const handlePrintPreview = (item: Production) => {
    handlePrint(item);
  };

  // Fix inventory dari production yang sudah CLOSE tapi inventory belum ter-update
  const handleFixInventory = async () => {
    showConfirm(
      'Fix Inventory dari Production yang sudah CLOSE?\n\nIni akan update OUTGOING untuk material yang sudah digunakan.\n\nLanjutkan?',
      async () => {

    try {
      const productionList = await storageService.get<any[]>('production') || [];
      const closedProductions = productionList.filter((p: any) => p.status === 'CLOSE');
      
      if (closedProductions.length === 0) {
        showAlert('Tidak ada production yang sudah CLOSE.', 'Information');
        closeDialog();
        return;
      }

      const inventory = await storageService.get<InventoryItem[]>('inventory') || [];
      const salesOrders = await storageService.get<any[]>('salesOrders') || [];
      const bomDataForFix = await storageService.get<any[]>('bom') || [];
      const materialsForFix = await storageService.get<any[]>('materials') || [];

      // Aggregate material usage dari semua closed production
      // Key: codeItem dari inventory (bukan material_id dari BOM, untuk menghindari duplikasi)
      const materialUsageMap: { [codeItem: string]: { materialUsed: number; inventoryItem: InventoryItem | null; details: string[] } } = {};

      // Step 1: Aggregate semua material yang digunakan dari semua closed production
      for (const prod of closedProductions) {
        if (!prod.soNo) continue;

        const so = salesOrders.find((s: any) => s.soNo === prod.soNo);
        if (!so || !so.items) continue;

        // Gunakan progress atau producedQty (bukan target) untuk qtyProduced
        const qtyProduced = prod.progress || prod.producedQty || 0;
        if (qtyProduced <= 0) {
          console.log(`⚠️ Skip production ${prod.productionNo || prod.grnNo}: qtyProduced = ${qtyProduced} (progress: ${prod.progress}, producedQty: ${prod.producedQty}, target: ${prod.target})`);
          continue;
        }

        console.log(`🔍 Processing production: ${prod.productionNo || prod.grnNo}`);
        console.log(`   qtyProduced: ${qtyProduced} (from progress: ${prod.progress}, producedQty: ${prod.producedQty})`);
        console.log(`   SO: ${prod.soNo}, SPK: ${prod.spkNo}`);

        // Process each product in SO
        // IMPORTANT: qtyProduced adalah total untuk semua product di SO, bukan per product
        // Jadi kita perlu bagi qtyProduced dengan jumlah product di SO, atau gunakan qty dari soItem
        for (const soItem of so.items) {
          // Gunakan qty dari soItem jika ada, atau bagi qtyProduced dengan jumlah items
          const itemQty = parseFloat(soItem.qty || '0') || (qtyProduced / (so.items.length || 1));
          const productId = (soItem.productId || soItem.productKode || '').toString().trim();
          const productBOM = bomDataForFix.filter((b: any) => {
            const bomProductId = (b.product_id || b.kode || '').toString().trim();
            return bomProductId === productId;
          });

          if (productBOM.length === 0) {
            console.log(`⚠️ No BOM found for product: ${productId} in production ${prod.productionNo || prod.grnNo}`);
            continue;
          }

          // Calculate materials used from BOM
          // IMPORTANT: materialUsed = itemQty (per product) * ratio
          for (const bom of productBOM) {
            const bomMaterialId = (bom.material_id || '').toString().trim();
            const bomRatio = parseFloat(bom.ratio || '1') || 1;
            const materialUsed = itemQty * bomRatio;
            
            console.log(`    📦 BOM: ${bomMaterialId}, ratio: ${bomRatio}, itemQty: ${itemQty}, materialUsed: ${materialUsed}`);

            if (materialUsed <= 0) continue;

            // Find material in inventory - robust matching
            const materialIdTrimmed = bomMaterialId.trim();
            let existingMaterialInventory = inventory.find(inv => {
              const invCode = (inv.codeItem || '').toString().trim();
              return invCode.toLowerCase() === materialIdTrimmed.toLowerCase();
            });

            // Jika tidak ketemu, coba match dengan material_id atau kode dari master
            if (!existingMaterialInventory) {
              const materialFromMaster = materialsForFix.find(m => {
                const mId = ((m.material_id || m.kode) || '').toString().trim();
                return mId.toLowerCase() === materialIdTrimmed.toLowerCase();
              });

              if (materialFromMaster) {
                const masterCode = ((materialFromMaster.material_id || materialFromMaster.kode) || '').toString().trim();
                existingMaterialInventory = inventory.find(inv => {
                  const invCode = (inv.codeItem || '').toString().trim();
                  return invCode.toLowerCase() === masterCode.toLowerCase();
                });
              }
            }

            // Aggregate material usage per codeItem dari inventory (bukan material_id dari BOM)
            // Ini penting untuk menghindari duplikasi jika material_id berbeda tapi codeItem sama
            const materialKey = existingMaterialInventory?.codeItem || bomMaterialId;
            
            if (!materialUsageMap[materialKey]) {
              materialUsageMap[materialKey] = {
                materialUsed: 0,
                inventoryItem: existingMaterialInventory || null,
                details: [],
              };
            }
            
            // Cek apakah production ini sudah pernah dihitung untuk material ini
            const detailKey = `${prod.productionNo || prod.grnNo}-${productId}`;
            if (!materialUsageMap[materialKey].details.includes(detailKey)) {
              materialUsageMap[materialKey].materialUsed += materialUsed;
              materialUsageMap[materialKey].details.push(detailKey);
              
              console.log(`  📦 Material: ${bomMaterialId} (${existingMaterialInventory?.description || 'NOT FOUND'}) | qtyProduced: ${qtyProduced} × ratio: ${bomRatio} = ${materialUsed} | Total so far: ${materialUsageMap[materialKey].materialUsed}`);
            } else {
              console.warn(`  ⚠️ Duplicate detected: ${detailKey} already processed for ${materialKey}`);
            }
          }
        }
      }

      // Step 2: Update inventory dengan total material usage
      let fixedCount = 0;
      const fixedMaterials: string[] = [];
      const skippedMaterials: string[] = [];

      console.log(`\n📊 Summary - Total materials to process: ${Object.keys(materialUsageMap).length}`);

      for (const [materialKey, usageData] of Object.entries(materialUsageMap)) {
        const { materialUsed, inventoryItem, details } = usageData;

        if (!inventoryItem) {
          console.warn(`⚠️ Material not found in inventory: ${materialKey}`);
          skippedMaterials.push(`${materialKey} (not found)`);
          continue;
        }

        const currentOutgoing = inventoryItem.outgoing || 0;
        const currentReceive = inventoryItem.receive || 0;
        const expectedOutgoing = materialUsed;

        console.log(`\n🔍 Processing: ${inventoryItem.description} (${materialKey})`);
        console.log(`   Current: Receive=${currentReceive}, Outgoing=${currentOutgoing}, NextStock=${inventoryItem.nextStock || 0}`);
        console.log(`   Expected Outgoing: ${expectedOutgoing}`);
        console.log(`   Details: ${details.join(', ')}`);

        // Validasi: expectedOutgoing tidak boleh lebih besar dari receive (kecuali ada stock premonth)
        const maxPossibleOutgoing = (inventoryItem.stockPremonth || 0) + currentReceive;
        if (expectedOutgoing > maxPossibleOutgoing * 1.1) { // Allow 10% tolerance
          console.error(`❌ ERROR: Expected outgoing (${expectedOutgoing}) terlalu besar dibanding receive (${currentReceive}) + stockPremonth (${inventoryItem.stockPremonth || 0}) = ${maxPossibleOutgoing}`);
          console.error(`   Material: ${inventoryItem.description} (${materialKey})`);
          console.error(`   Ini mungkin bug di perhitungan!`);
          skippedMaterials.push(`${materialKey} (calculation error: ${expectedOutgoing} > ${maxPossibleOutgoing})`);
          continue;
        }

        // Update jika current < expected (belum ter-update)
        // Tapi juga cek apakah current sudah mendekati expected (untuk menghindari overwrite yang sudah benar)
        const diff = Math.abs(currentOutgoing - expectedOutgoing);
        const tolerance = expectedOutgoing * 0.01; // 1% tolerance

        if (currentOutgoing < expectedOutgoing - tolerance) {
          const oldOutgoing = currentOutgoing;
          const newOutgoing = expectedOutgoing;
          inventoryItem.outgoing = newOutgoing;
          inventoryItem.nextStock =
            (inventoryItem.stockPremonth || 0) +
            (inventoryItem.receive || 0) -
            newOutgoing +
            (inventoryItem.return || 0);
          inventoryItem.lastUpdate = new Date().toISOString();

          fixedMaterials.push(`${materialKey} (${oldOutgoing} → ${newOutgoing})`);
          fixedCount++;

          console.log(`✅ Fixed inventory: ${inventoryItem.description} (${materialKey}) | Outgoing: ${oldOutgoing} → ${newOutgoing} (diff: +${newOutgoing - oldOutgoing})`);
        } else if (diff <= tolerance) {
          console.log(`ℹ️ Inventory already correct: ${inventoryItem.description} (${materialKey}) | Current: ${currentOutgoing}, Expected: ${expectedOutgoing} (diff: ${diff})`);
        } else {
          console.warn(`⚠️ Current outgoing (${currentOutgoing}) > expected (${expectedOutgoing}) - mungkin sudah di-update manual atau ada perhitungan lain`);
          skippedMaterials.push(`${materialKey} (current ${currentOutgoing} > expected ${expectedOutgoing})`);
        }
      }

      // Save updated inventory
      await storageService.set('inventory', inventory);

      let alertMessage = `✅ Inventory Fixed!\n\n`;
      alertMessage += `📊 ${closedProductions.length} production(s) processed\n`;
      alertMessage += `✅ ${fixedCount} material(s) updated\n\n`;
      
      if (fixedMaterials.length > 0) {
        alertMessage += `Materials fixed:\n${fixedMaterials.slice(0, 10).join('\n')}`;
        if (fixedMaterials.length > 10) {
          alertMessage += `\n... and ${fixedMaterials.length - 10} more`;
        }
      }
      
      if (skippedMaterials.length > 0) {
        alertMessage += `\n\n⚠️ Skipped (${skippedMaterials.length}):\n${skippedMaterials.slice(0, 5).join('\n')}`;
        if (skippedMaterials.length > 5) {
          alertMessage += `\n... and ${skippedMaterials.length - 5} more`;
        }
      }
      
      closeDialog();
      showAlert(alertMessage, 'Fix Inventory Complete');
      
      console.log(`\n✅ Fix Inventory Complete!`);
      console.log(`   Fixed: ${fixedCount} materials`);
      console.log(`   Skipped: ${skippedMaterials.length} materials`);
      
      // Reload data
      loadProductions();
    } catch (error: any) {
      closeDialog();
      showAlert(`Error fixing inventory: ${error.message}`, 'Error');
      console.error('Error fixing inventory:', error);
    }
      },
      () => closeDialog(),
      'Fix Inventory'
    );
  };

  const handleSaveProductionResult = async (data: any) => {
    if (!selectedProductionForSubmit) return;
    
    try {
      const qtyProduced = parseFloat(data.qtyProduced || '0') || 0;
      const qtySurplusValue = parseFloat(data.qtySurplus || '0') || 0;
      const prevProgress = selectedProductionForSubmit.progress || selectedProductionForSubmit.producedQty || 0;
      const targetQty = selectedProductionForSubmit.target || selectedProductionForSubmit.targetQty || 0;
      
      // Validasi: Pastikan progress tidak melebihi target (dengan tolerance 5%)
      const tolerance = targetQty * 0.05;
      const maxAllowedProgress = targetQty + tolerance;
      const newProgress = prevProgress + qtyProduced;
      
      if (targetQty > 0 && newProgress > maxAllowedProgress) {
        const maxQtyProduced = Math.max(0, maxAllowedProgress - prevProgress);
        showAlert(
          `⚠️ Qty Produced akan membuat progress melebihi target!\n\nTarget: ${targetQty} PCS\nProgress sebelumnya: ${prevProgress} PCS\nQty Produced: ${qtyProduced} PCS\nTotal Progress: ${newProgress} PCS\n\nMaksimal Qty Produced yang bisa di-submit: ${maxQtyProduced} PCS`,
          'Qty Exceeds Target'
        );
        return;
      }
      
      // Pastikan progress tidak melebihi target (cap di target jika melebihi)
      const cappedProgress = targetQty > 0 ? Math.min(newProgress, maxAllowedProgress) : newProgress;
      const remainingQty = Math.max(targetQty - cappedProgress, 0);
      const isPartialInput = Boolean(data?.docs?.isPartial);
      // Close production jika progress sudah mencapai atau melebihi target (terlepas dari isPartialInput)
      // Atau jika remainingQty <= 0 dan bukan partial input
      const shouldCloseProduction = (cappedProgress >= targetQty && targetQty > 0) || (!isPartialInput && remainingQty <= 0);
      const nowIso = new Date().toISOString();

      // Save production result (setelah update inventory untuk avoid double counting)
      // Production result akan disimpan setelah inventory di-update
      const newProductionResultId = Date.now().toString();
      const newProductionResult = {
        id: newProductionResultId,
        ...data,
        created: nowIso,
      };

      // Update production status and progress
      // Gunakan cappedProgress untuk memastikan tidak melebihi target
      const updated = productions.map(p =>
        p.id === selectedProductionForSubmit.id
          ? { 
              ...p, 
              status: shouldCloseProduction ? ('CLOSE' as const) : ('OPEN' as const),
              progress: cappedProgress,
              producedQty: cappedProgress,
              surplusQty: qtySurplusValue,
              remaining: remainingQty,
            }
          : p
      );
      await storageService.set('production', updated);
      setProductions(updated);

      // Update inventory automatically dengan data dari dialog
      // IMPORTANT: Pass qtyProduced sebagai progress untuk update product inventory
      // IMPORTANT: Juga pass qtySurplus untuk ditambahkan ke received inventory
      const updatedProductionContext = {
        ...selectedProductionForSubmit,
        progress: qtyProduced, // Qty yang baru di-submit (bukan total progress)
        qtyProduced: qtyProduced, // Tambahkan qtyProduced untuk reference
        surplusQty: qtySurplusValue, // Tambahkan surplus untuk ditambahkan ke received inventory
        target: selectedProductionForSubmit.target || selectedProductionForSubmit.targetQty || targetQty || qtyProduced,
      };
      console.log('🔍 [Production Inventory] Updating inventory with qtyProduced:', qtyProduced);
      console.log('🔍 [Production Inventory] Updating inventory with qtySurplus:', qtySurplusValue);
      console.log('🔍 [Production Inventory] Materials data from form:', data.materials);
      console.log('🔍 [Production Inventory] Materials array length:', data.materials?.length || 0);
      if (data.materials && data.materials.length > 0) {
        console.log('🔍 [Production Inventory] First material sample:', data.materials[0]);
      }
      console.log('🔍 [Production Inventory] Actual materials data from form:', data.actualMaterials);
      console.log('🔍 [Production Inventory] Actual materials array length:', data.actualMaterials?.length || 0);
      
      // Combine materials and actualMaterials for inventory update
      const allMaterialsUsed = [
        ...(data.materials || []),
        ...(data.actualMaterials || []),
      ];
      
      // Update inventory SEBELUM save production result untuk avoid double counting
      await updateInventoryFromProduction(updatedProductionContext, allMaterialsUsed);
      
      // Save production result SETELAH inventory di-update
      const productionResults = await storageService.get<any[]>('productionResults') || [];
      productionResults.push(newProductionResult);
      await storageService.set('productionResults', productionResults);
      
      // Update Schedule progress/close ketika sudah selesai
      const scheduleList = await storageService.get<any[]>('schedule') || [];
      const updatedSchedules = scheduleList.map((s: any) => {
        if (s.spkNo !== selectedProductionForSubmit.spkNo) return s;
        
        if (shouldCloseProduction && s.status === 'OPEN') {
          return { ...s, status: 'CLOSE', progress: cappedProgress, remaining: 0 };
        }
        
        return {
          ...s,
          progress: cappedProgress,
          remaining: remainingQty,
        };
      });
      await storageService.set('schedule', updatedSchedules);

      // Update Production notifications (reminder jika masih kurang)
      const productionNotifications = await storageService.get<any[]>('productionNotifications') || [];
      const notifIndex = productionNotifications.findIndex((n: any) => {
        if (selectedProductionForSubmit.spkNo) {
          return n.spkNo === selectedProductionForSubmit.spkNo;
        }
        return !n.spkNo && n.soNo === selectedProductionForSubmit.soNo;
      });
      
      if (shouldCloseProduction) {
        if (notifIndex >= 0) {
          productionNotifications[notifIndex] = {
            ...productionNotifications[notifIndex],
            status: 'COMPLETED',
            pendingQty: 0,
            updated: nowIso,
          };
          await storageService.set('productionNotifications', productionNotifications);
        }
      } else {
        const reminderNotification = {
          ...(notifIndex >= 0
            ? productionNotifications[notifIndex]
            : {
                id: `REM-${Date.now()}`,
                type: 'PRODUCTION_SCHEDULE',
                spkNo: selectedProductionForSubmit.spkNo || '',
                soNo: selectedProductionForSubmit.soNo,
                customer: selectedProductionForSubmit.customer,
                product: selectedProductionForSubmit.product,
                productId: selectedProductionForSubmit.productId || selectedProductionForSubmit.productCode || '',
                scheduleStartDate: selectedProductionForSubmit.scheduleStartDate,
                scheduleEndDate: selectedProductionForSubmit.scheduleEndDate,
                qty: targetQty || qtyProduced,
                created: nowIso,
              }),
          status: 'NEED_MORE_PRODUCTION',
          materialStatus: 'RECEIVED',
          pendingQty: remainingQty,
          qty: targetQty || qtyProduced,
          note: 'Production result still below target',
          updated: nowIso,
        };

        if (notifIndex >= 0) {
          productionNotifications[notifIndex] = reminderNotification;
        } else {
          productionNotifications.push(reminderNotification);
        }
        await storageService.set('productionNotifications', productionNotifications);
      }

      // Create QC record untuk notifikasi ke QAQC hanya jika produksi sudah selesai
      // IMPORTANT: QC dibuat per SPK dan per batch (jika ada batch di schedule)
      // Mirip dengan delivery batch trigger, QC juga dibuat per batch dengan sjGroupId
      if (shouldCloseProduction) {
        let qcList = await storageService.get<any[]>('qc') || [];
        // Ensure qcList is always an array
        qcList = Array.isArray(qcList) ? qcList : [];
        
        // Helper function untuk match SPK
        const matchSPK = (spk1: string, spk2: string): boolean => {
          if (!spk1 || !spk2) return false;
          if (spk1 === spk2) return true;
          // Support both formats: old format (strip) and new format (slash)
          const normalize = (spk: string) => {
            return spk.replace(/-/g, '/');
          };
          const normalized1 = normalize(spk1);
          const normalized2 = normalize(spk2);
          return normalized1 === normalized2;
        };
        
        const productionSpkNo = selectedProductionForSubmit.spkNo || '';
        
        // Load schedule untuk mendapatkan batch info dan deliveryBatches
        const scheduleList = await storageService.get<any[]>('schedule') || [];
        const relatedSchedule = scheduleList.find((s: any) => {
          if (!s.spkNo) return false;
          return matchSPK(s.spkNo, productionSpkNo);
        });
        
        // Cek apakah schedule punya deliveryBatches (batch 1-2-3)
        const hasDeliveryBatches = relatedSchedule && relatedSchedule.deliveryBatches && relatedSchedule.deliveryBatches.length > 0;
        
        if (hasDeliveryBatches && relatedSchedule.deliveryBatches.length > 0) {
          // IMPORTANT: Buat QC per batch (mirip dengan delivery batch trigger)
          // Setiap batch = 1 QC record dengan sjGroupId yang sesuai
          for (const deliveryBatch of relatedSchedule.deliveryBatches) {
            const batchNo = deliveryBatch.batchNo || '';
            const sjGroupId = deliveryBatch.sjGroupId || '';
            const batchQty = deliveryBatch.qty || qtyProduced;
            
            // Cek apakah sudah ada QC untuk batch ini (berdasarkan SPK + sjGroupId)
            const existingQCForBatch = qcList.find((q: any) => {
              if (!productionSpkNo) return false;
              const qSpkNo = q.spkNo || '';
              const qSjGroupId = q.sjGroupId || '';
              return qSpkNo && matchSPK(qSpkNo, productionSpkNo) && qSjGroupId === sjGroupId;
            });
            
            if (!existingQCForBatch && productionSpkNo && sjGroupId) {
              // Generate random QC number dengan batch info
              const now = new Date();
              const year = String(now.getFullYear()).slice(-2);
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const day = String(now.getDate()).padStart(2, '0');
              const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
              const qcNo = `QC-${year}${month}${day}-${randomCode}${batchNo ? `-${batchNo}` : ''}`;
              
              const newQC = {
                id: Date.now().toString() + `-batch-${batchNo || deliveryBatch.id || ''}`,
                qcNo: qcNo,
                productionNo: selectedProductionForSubmit.productionNo || selectedProductionForSubmit.grnNo || '',
                spkNo: productionSpkNo,
                soNo: data.soNo,
                customer: data.customer,
                product: data.product,
                qty: batchQty, // Qty dari batch, bukan total qtyProduced
                batchNo: batchNo, // Batch number
                sjGroupId: sjGroupId, // SJ Group ID untuk delivery batch trigger
                deliveryBatches: [deliveryBatch], // Include deliveryBatch info
                qcResult: '',
                status: 'OPEN',
                created: nowIso,
              };
              qcList.push(newQC);
              console.log(`✅ QC record created per batch: ${newQC.qcNo} for SPK ${productionSpkNo}, Batch ${batchNo}, sjGroupId: ${sjGroupId}`);
            } else if (existingQCForBatch) {
              console.log(`ℹ️ QC record already exists for SPK ${productionSpkNo}, Batch ${batchNo}, sjGroupId: ${sjGroupId}: ${existingQCForBatch.qcNo}`);
            }
          }
        } else {
          // Fallback: Buat QC tanpa batch (old format)
          const existingQC = qcList.find((q: any) => {
            if (!productionSpkNo) return false;
            const qSpkNo = q.spkNo || '';
            return qSpkNo && matchSPK(qSpkNo, productionSpkNo);
          });

          if (!existingQC && productionSpkNo) {
            // Generate random QC number
            const now = new Date();
            const year = String(now.getFullYear()).slice(-2);
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
            const qcNo = `QC-${year}${month}${day}-${randomCode}`;
            
            const newQC = {
              id: Date.now().toString(),
              qcNo: qcNo,
              productionNo: selectedProductionForSubmit.productionNo || selectedProductionForSubmit.grnNo || '',
              spkNo: productionSpkNo, // IMPORTANT: Per SPK
              soNo: data.soNo,
              customer: data.customer,
              product: data.product,
              qty: qtyProduced,
              qcResult: '',
              status: 'OPEN',
              created: nowIso,
            };
            qcList.push(newQC);
            await storageService.set('qc', qcList);
            console.log(`✅ QC record created per SPK: ${newQC.qcNo} for SPK ${productionSpkNo}`);
          } else if (existingQC) {
            console.log(`ℹ️ QC record already exists for SPK ${productionSpkNo}: ${existingQC.qcNo}`);
          }
        }
        
        // Save QC list setelah semua batch diproses
        await storageService.set('qc', qcList);
      }

      const alertMessage = shouldCloseProduction
        ? `✅ Production result submitted successfully!\n\n✅ Inventory updated\n✅ Schedule auto-closed\n📧 Notification sent to QA/QC for quality check`
        : `⚠️ Production result saved.\n\nRemaining target: ${remainingQty} PCS.\nProduction stays OPEN and reminder sent to continue.`;
      showAlert(alertMessage, shouldCloseProduction ? 'Success' : 'Partial Result');
      setSelectedProductionForSubmit(null);
      await loadProductions();
    } catch (error: any) {
      showAlert(`Error submitting production: ${error.message}`, 'Error');
      throw error;
    }
  };

  const formatDateSimple = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  // Format date function untuk Created column (sama seperti di SO)
  const formatDateSimpleWithTime = (dateString: string | undefined) => {
    if (!dateString) return { date: '-', time: '', full: '-' };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { date: '-', time: '', full: '-' };
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutes}:${seconds}`,
        full: `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
      };
    } catch {
      return { date: '-', time: '', full: '-' };
    }
  };

  const formatNumber = (value?: number) => {
    if (value === undefined || value === null || isNaN(Number(value))) return '0';
    return Number(value).toLocaleString('id-ID');
  };

  const getStatusSummary = (group: any) => {
    const summary: Record<string, number> = {};
    (group.productionList || []).forEach((prod: any) => {
      const statusKey = (prod.status || 'DRAFT').toUpperCase();
      summary[statusKey] = (summary[statusKey] || 0) + 1;
    });
    return summary;
  };

  const getLatestProductionTimestamp = (group: any) => {
    let latest = 0;
    (group.productionList || []).forEach((prod: any) => {
      const candidates = [
        prod.updatedAt,
        prod.producedDate,
        prod.date,
        prod.scheduleEndDate,
        prod.scheduleStartDate,
      ];
      candidates.forEach((candidate) => {
        if (!candidate) return;
        const ts = new Date(candidate).getTime();
        if (!isNaN(ts)) {
          latest = Math.max(latest, ts);
        }
      });
    });
    return latest;
  };

  const renderProductionActions = (prod: any) => (
    <>
      <Button 
        variant="secondary" 
        onClick={() => handleViewDetail(prod)}
        style={{ fontSize: '11px', padding: '4px 8px' }}
      >
        View Detail
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleUploadSignedSpk(prod)}
        style={{ fontSize: '11px', padding: '4px 8px' }}
      >
        {prod.signedSpkFile ? 'Replace SPK (TTD)' : 'Upload SPK (TTD)'}
      </Button>
      {prod.signedSpkFile && (
        <Button
          variant="secondary"
          onClick={() => handleViewSignedSpk(prod)}
          style={{ fontSize: '11px', padding: '4px 8px' }}
        >
          View SPK (TTD)
        </Button>
      )}
      {prod.status !== 'CLOSE' && (
        <Button 
          variant="primary" 
          onClick={() => handleSubmitProduction(prod)}
          style={{ fontSize: '11px', padding: '4px 8px' }}
        >
          Submit Result
        </Button>
      )}
    </>
  );

  const renderProductionEntries = (group: any) => (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
    }}>
      {group.productionList.map((prod: any, idx: number) => {
        const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
        const schedule = scheduleArray.find((s: any) => s.spkNo === prod.spkNo);
        const spk = spkData.find((s: any) => s.spkNo === prod.spkNo);
        const productId = (prod.productId || spk?.product_id || spk?.kode || '').toString().trim();
        
        // IMPORTANT: Ambil bomOverride dari SPK seperti di submit result
        const spkBOMOverride = spk?.bomOverride || {}; // SPK-specific BOM override: { materialId: qty }
        const spkQty = spk?.qty || prod.target || 0;
        
        // Load BOM untuk product ini
        const prodBOMRaw = bomData.filter((b: any) => {
          const bomProductId = (b.product_id || b.kode || '').toString().trim();
          return bomProductId === productId;
        });
        
        // IMPORTANT: Deduplikasi BOM berdasarkan material_id dan enrich dengan override qty dari SPK
        const bomMap = new Map<string, any>();
        prodBOMRaw.forEach((bom: any) => {
          const materialId = (bom.material_id || '').toString().trim();
          if (!materialId) return;
          
          if (!bomMap.has(materialId)) {
            // IMPORTANT: Hitung requiredQty dengan mempertimbangkan override dari SPK
            let requiredQty: number;
            if (spkBOMOverride[materialId] !== undefined && spkBOMOverride[materialId] !== null) {
              // Gunakan override qty dari PPIC (tidak mengikuti ratio)
              requiredQty = Math.max(Math.ceil(parseFloat(spkBOMOverride[materialId]) || 0), 0);
            } else {
              // Gunakan ratio calculation (default)
              const ratio = parseFloat(bom.ratio || 1) || 1;
              requiredQty = Math.max(Math.ceil(spkQty * ratio), 0);
            }
            
            bomMap.set(materialId, {
              ...bom,
              requiredQty: requiredQty, // Store calculated requiredQty
            });
          } else {
            // Jika material sudah ada, keep yang pertama (skip duplikasi)
            console.log(`⚠️ [Production BOM] Duplicate BOM entry found for material ${materialId}, keeping first entry`);
          }
        });
        
        const prodBOM = Array.from(bomMap.values());

        const progress = prod.progress || 0;
        const target = prod.target || 0;
        const surplusQty = prod.surplusQty || 0;
        const progressText = `${progress}/${target}`;
        
        let progressColor = '#d32f2f';
        if (progress === target && target > 0) {
          progressColor = '#2e7d32';
        } else if (progress > target) {
          progressColor = '#f57c00';
        }

        return (
          <Card key={prod.id || idx} style={{ 
            padding: '10px',
            fontSize: '12px',
            borderLeft: '3px solid var(--primary)',
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '6px', color: 'var(--text-primary)' }}>
              {prod.spkNo || '-'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {prod.productionNo || prod.grnNo || '-'} - {prod.product || spk?.product || '-'}
            </div>
            
            {/* Related SPKs - hanya SPK yang terkait dengan production ini (SO dan product sama) */}
            {(() => {
              // Cari SPK terkait dari group yang memiliki SO dan product yang sama
              const relatedSPKs = group.productionList
                .filter((p: any) => {
                  const pProductId = (p.productId || spkData.find((s: any) => s.spkNo === p.spkNo)?.product_id || spkData.find((s: any) => s.spkNo === p.spkNo)?.kode || '').toString().trim();
                  const currentProductId = (prod.productId || spk?.product_id || spk?.kode || '').toString().trim();
                  return p.soNo === prod.soNo && pProductId === currentProductId && p.spkNo !== prod.spkNo;
                })
                .map((p: any) => {
                  const relatedSpk = spkData.find((s: any) => s.spkNo === p.spkNo);
                  return {
                    spkNo: p.spkNo,
                    product: p.product || relatedSpk?.product || '-',
                  };
                });
              
              if (relatedSPKs.length === 0) return null;
              
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {relatedSPKs.map((relatedSpk: any, idx: number) => (
                    <div
                      key={relatedSpk.spkNo || idx}
                      style={{
                        padding: '3px 6px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        fontSize: '9px',
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{relatedSpk.spkNo}</span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>{relatedSpk.product}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
              <div>
                <strong style={{ color: progressColor, fontSize: '13px' }}>
                  {progressText}
                </strong>
                {surplusQty > 0 && (
                  <div style={{ fontSize: '10px', color: '#2e7d32', marginTop: '2px', fontWeight: 'bold' }}>
                    +{surplusQty}
                  </div>
                )}
              </div>
              <span className={`status-badge status-${prod.status?.toLowerCase() || 'draft'}`} style={{ fontSize: '10px' }}>
                {prod.status || 'DRAFT'}
              </span>
            </div>

            {prod.date && (
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                {formatDateSimple(prod.date)}
              </div>
            )}

            {/* Schedule dan Materials Used (BOM) - Compact Layout */}
            {(schedule || prodBOM.length > 0) && (
              <div style={{ 
                marginTop: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                {schedule && (
                  <div style={{ 
                    padding: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '10px',
                  }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                      📅 Schedule
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {schedule.scheduleStartDate && formatDateSimple(schedule.scheduleStartDate)}
                      {schedule.scheduleStartDate && schedule.scheduleEndDate && ' - '}
                      {schedule.scheduleEndDate && formatDateSimple(schedule.scheduleEndDate)}
                    </div>
                    {schedule.batches && schedule.batches.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {schedule.batches.map((batch: any, batchIdx: number) => (
                          <div 
                            key={batch.id || batchIdx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 5px',
                              backgroundColor: 'var(--bg-secondary)',
                              borderRadius: '3px',
                              fontSize: '9px',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                              {batch.batchNo || String.fromCharCode(65 + batchIdx)}
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {batch.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {prodBOM.length > 0 && (
                  <div style={{ 
                    padding: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '10px',
                  }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>
                      📦 Materials ({prodBOM.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {prodBOM.slice(0, 3).map((bom: any, bomIdx: number) => {
                        const material = materials.find((m: any) => 
                          ((m.material_id || m.kode || '').toString().trim()) === ((bom.material_id || '').toString().trim())
                        );
                        // IMPORTANT: Gunakan requiredQty yang sudah dihitung dari SPK (dengan override jika ada)
                        const requiredQty = bom.requiredQty || Math.ceil((prod.target || 0) * (bom.ratio || 1));
                        return (
                          <div 
                            key={bom.id || bomIdx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 5px',
                              backgroundColor: 'var(--bg-secondary)',
                              borderRadius: '3px',
                              fontSize: '9px',
                              border: '1px solid var(--border-color)',
                            }}
                      >
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {material?.nama || bom.material_id || '-'}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Required: {requiredQty}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {material?.satuan || bom.unit || 'PCS'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ 
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-color)'
            }}>
              {renderProductionActions(prod)}
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderViewModeToggle = () => (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', alignSelf: 'flex-end' }}>
      <button
        onClick={() => setProductionViewMode('cards')}
        style={{
          padding: '6px 12px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          backgroundColor: productionViewMode === 'cards' ? 'var(--accent-color)' : 'transparent',
          color: productionViewMode === 'cards' ? '#fff' : 'var(--text-secondary)',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        Card View
      </button>
      <button
        onClick={() => setProductionViewMode('table')}
        style={{
          padding: '6px 12px',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          backgroundColor: productionViewMode === 'table' ? 'var(--accent-color)' : 'transparent',
          color: productionViewMode === 'table' ? '#fff' : 'var(--text-secondary)',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        Table View
      </button>
    </div>
  );

  const renderProductionCardView = (data: any[], emptyMessage: string) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {emptyMessage}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {data.map((group: any, idx: number) => {
          const statusSummary = getStatusSummary(group);
          const totalRemaining = Math.max((group.totalTarget || 0) - (group.totalProgress || 0), 0);
          const progressPercent = group.totalTarget > 0
            ? Math.min(100, Math.round((group.totalProgress / group.totalTarget) * 100))
            : 0;
          const latestTimestamp = getLatestProductionTimestamp(group);
          const latestLabel = latestTimestamp
            ? formatDateSimple(new Date(latestTimestamp).toISOString())
            : '-';

          // Warna selang-seling untuk SO card - lebih jelas perbedaannya
          const cardBgColors = [
            'var(--bg-primary)', // Default
            'rgba(33, 150, 243, 0.25)', // Light blue - lebih jelas
            'rgba(76, 175, 80, 0.25)', // Light green - lebih jelas
            'rgba(255, 152, 0, 0.25)', // Light orange - lebih jelas
            'rgba(156, 39, 176, 0.25)', // Light purple - lebih jelas
          ];
          const cardBgColor = cardBgColors[idx % cardBgColors.length];

          return (
            <div key={`${group.soNo}-${group.customer}`} style={{ backgroundColor: cardBgColor, borderRadius: '8px', padding: '1px' }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>SO No</div>
                    <div style={{ fontSize: '20px', fontWeight: 600 }}>{group.soNo || '-'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{group.customer || '-'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {Object.entries(statusSummary)
                      .filter(([, value]) => value > 0)
                      .map(([status, value]) => (
                        <span key={status} className={`status-badge status-${status.toLowerCase()}`} style={{ fontSize: '12px' }}>
                          {status}: {value}
                        </span>
                      ))}
                  </div>
                </div>

              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div>
                  <div>Total Target</div>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{formatNumber(group.totalTarget)}</strong> PCS
                </div>
                <div>
                  <div>Total Progress</div>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{formatNumber(group.totalProgress)}</strong> PCS
                </div>
                <div>
                  <div>Remaining</div>
                  <strong style={{ fontSize: '16px', color: totalRemaining > 0 ? '#ff9800' : '#2e7d32' }}>
                    {formatNumber(totalRemaining)}
                  </strong> PCS
                </div>
                <div>
                  <div>Productions</div>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{group.productionList.length}</strong> SPK
                </div>
                <div>
                  <div>Last Update</div>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{latestLabel}</strong>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ height: '10px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, #00c853, #64dd17)',
                      height: '100%',
                    }}
                  />
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Progress {progressPercent}% ({formatNumber(group.totalProgress)} / {formatNumber(group.totalTarget)} PCS)
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                {renderProductionEntries(group)}
              </div>
              </Card>
            </div>
          );
        })}
      </div>
    );
  };

  // Flatten production data untuk table view (Excel-like)
  const flattenedProductionData = useMemo(() => {
    if (productionViewMode !== 'table') return [];
    
    const flattened: any[] = [];
    filteredProductionData.forEach((group: any) => {
      group.productionList.forEach((prod: any) => {
        const scheduleArray = Array.isArray(scheduleData) ? scheduleData : [];
        const schedule = scheduleArray.find((s: any) => s.spkNo === prod.spkNo);
        const spk = spkData.find((s: any) => s.spkNo === prod.spkNo);
        
        flattened.push({
          id: prod.id || `${group.soNo}-${prod.spkNo}`,
          soNo: group.soNo,
          customer: group.customer,
          spkNo: prod.spkNo || '-',
          productionNo: prod.productionNo || prod.grnNo || '-',
          product: prod.product || spk?.product || '-',
          productCode: prod.productId || spk?.product_id || spk?.kode || '-',
          qty: prod.target || prod.targetQty || spk?.qty || 0,
          progress: prod.progress || prod.producedQty || 0,
          target: prod.target || prod.targetQty || spk?.qty || 0,
          remaining: Math.max((prod.target || 0) - (prod.progress || 0), 0),
          surplusQty: prod.surplusQty || 0,
          status: prod.status || 'DRAFT',
          date: prod.date || prod.producedDate || '-',
          scheduleStartDate: schedule?.scheduleStartDate || prod.scheduleStartDate || '-',
          scheduleEndDate: schedule?.scheduleEndDate || prod.scheduleEndDate || '-',
          _group: group, // Keep reference untuk row color
        });
      });
    });
    return flattened;
  }, [filteredProductionData, scheduleData, spkData, productionViewMode]);

  const columns = [
    { 
      key: 'soNo', 
      header: 'SO No',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '13px' }}>{item.soNo}</strong>
      ),
    },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: any) => (
        <span style={{ fontSize: '13px' }}>{item.customer}</span>
      ),
    },
    {
      key: 'spkNo',
      header: 'SPK No',
      render: (item: any) => (
        <strong style={{ fontSize: '13px', color: 'var(--primary)' }}>{item.spkNo}</strong>
      ),
    },
    {
      key: 'productionNo',
      header: 'Production No',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.productionNo}</span>
      ),
    },
    {
      key: 'productCode',
      header: 'Product Code',
      render: (item: any) => (
        <span style={{ fontSize: '12px' }}>{item.productCode}</span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (item: any) => (
        <span style={{ fontSize: '13px' }}>{item.product}</span>
      ),
    },
    {
      key: 'qty',
      header: 'Qty',
      render: (item: any) => (
        <span style={{ fontSize: '13px', textAlign: 'right', display: 'block' }}>
          {formatNumber(item.qty)} PCS
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (item: any) => {
        const progress = item.progress || 0;
        const target = item.target || 0;
        const progressText = `${formatNumber(progress)}/${formatNumber(target)}`;
        let color = '#d32f2f';
        if (progress === target && target > 0) {
          color = '#2e7d32';
        } else if (progress > target) {
          color = '#f57c00';
        }
        return (
          <span style={{ fontSize: '13px', fontWeight: 'bold', color, textAlign: 'right', display: 'block' }}>
            {progressText}
          </span>
        );
      },
    },
    {
      key: 'remaining',
      header: 'Remaining',
      render: (item: any) => (
        <span style={{ fontSize: '13px', textAlign: 'right', display: 'block', color: item.remaining > 0 ? '#ff9800' : '#2e7d32' }}>
          {formatNumber(item.remaining)} PCS
        </span>
      ),
    },
    {
      key: 'surplusQty',
      header: 'Surplus',
      render: (item: any) => {
        if (!item.surplusQty || item.surplusQty === 0) return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>;
        return (
          <span style={{ fontSize: '12px', color: '#2e7d32', fontWeight: 'bold', textAlign: 'right', display: 'block' }}>
            +{formatNumber(item.surplusQty)} PCS
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${item.status?.toLowerCase() || 'draft'}`} style={{ fontSize: '11px' }}>
          {item.status || 'DRAFT'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {item.date && item.date !== '-' ? formatDateSimple(item.date) : '-'}
        </span>
      ),
    },
    {
      key: 'scheduleStartDate',
      header: 'Schedule Start',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {item.scheduleStartDate && item.scheduleStartDate !== '-' ? formatDateSimple(item.scheduleStartDate) : '-'}
        </span>
      ),
    },
    {
      key: 'scheduleEndDate',
      header: 'Schedule End',
      render: (item: any) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {item.scheduleEndDate && item.scheduleEndDate !== '-' ? formatDateSimple(item.scheduleEndDate) : '-'}
        </span>
      ),
    },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: any) => {
        const createdDate = item.created || item.date || '';
        const { date, time } = formatDateSimpleWithTime(createdDate);
        return (
          <div style={{ fontSize: '12px' }}>
            <div style={{ fontWeight: '500' }}>{date}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{time}</div>
          </div>
        );
      },
    },
  ];

  const handleStartProduction = async (notif: any, batch?: any) => {
    // Tutup semua dialog yang mungkin masih terbuka
    // Reset semua dialog state
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
      onConfirm: undefined,
      onCancel: undefined,
    });
    
    // Pastikan global listener di-restore
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    
    // Tutup dialog lain
    setSelectedScheduleItem(null);
    setSelectedProductionForSubmit(null);
    setViewPdfData(null);
    
    // Tunggu sebentar untuk memastikan dialog tertutup dan state ter-reset
    await new Promise(resolve => setTimeout(resolve, 150));
    const existingOpenProduction = productions.find((p: any) => {
      const sameProduct = (p.productId || p.product) === (notif.productId || notif.product);
      if (!sameProduct) return false;
      
      if (notif.spkNo) {
        return p.spkNo === notif.spkNo && p.status !== 'CLOSE';
      }
      
      return !!notif.soNo && p.soNo === notif.soNo && p.status !== 'CLOSE';
    });
    
    if (notif.status === 'NEED_MORE_PRODUCTION' && existingOpenProduction) {
      setSelectedProductionForSubmit(existingOpenProduction);
      return;
    }
    
    // SIMPLE MATERIAL READINESS CHECK: Cek material di inventory berdasarkan BOM
    // Tidak perlu first in first serve yang kompleks - cukup cek apakah material tersedia di inventory
    const validateMaterialReadiness = async (notif: any, batchQty?: number) => {
      try {
        // IMPORTANT: Filter deleted items untuk prevent data resurrection
        const inventoryItemsRaw = await storageService.get<any[]>('inventory') || [];
        const inventoryItems = filterActiveItems(inventoryItemsRaw);
        const bomList = await storageService.get<any[]>('bom') || [];
        const materialsList = await storageService.get<any[]>('materials') || [];
        
        const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
        const toNumber = (value: any) => {
          if (typeof value === 'number' && !Number.isNaN(value)) return value;
          const parsed = parseFloat(value);
          return Number.isNaN(parsed) ? 0 : parsed;
        };
        
        const productKey = normalizeKey(notif.productId || notif.product || notif.productCode);
        const qtyNeeded = batchQty !== undefined ? batchQty : toNumber(notif.qty || notif.target || notif.targetQty);
        if (!productKey || qtyNeeded <= 0) {
          console.log(`[Start Production] ${notif.spkNo}: Invalid productKey or qtyNeeded`, { productKey, qtyNeeded });
          return false;
        }
        
        const productBomMap: Record<string, any[]> = {};
        bomList.forEach((bom: any) => {
          const key = normalizeKey(bom.product_id || bom.kode);
          if (!key) return;
          if (!productBomMap[key]) {
            productBomMap[key] = [];
          }
          productBomMap[key].push(bom);
        });
        
        const bomForProduct = productBomMap[productKey] || [];
        if (bomForProduct.length === 0) {
          console.log(`[Start Production] ${notif.spkNo}: No BOM found for product`, productKey);
          return false; // Tidak ada BOM, tidak bisa produksi
        }
        
        const inventoryMap: Record<string, any> = {};
        inventoryItems.forEach((item: any) => {
          const key = normalizeKey(item.codeItem);
          if (key && !inventoryMap[key]) {
            inventoryMap[key] = item;
          }
        });
        
        const materialAliasMap: Record<string, string> = {};
        materialsList.forEach((mat: any) => {
          const key = normalizeKey(mat.material_id || mat.kode);
          const alias = normalizeKey(mat.kode || mat.material_id);
          if (key && alias) {
            materialAliasMap[key] = alias;
            if (!materialAliasMap[alias]) {
              materialAliasMap[alias] = key;
            }
          }
        });
        
        const findInventoryByMaterial = (materialId: string) => {
          const normalized = normalizeKey(materialId);
          if (!normalized) return null;
          if (inventoryMap[normalized]) return inventoryMap[normalized];
          const alias = materialAliasMap[normalized];
          if (alias && inventoryMap[alias]) return inventoryMap[alias];
          return null;
        };
        
        const getAvailableStock = (item: any) => {
          if (!item) return 0;
          if (typeof item.nextStock === 'number') return item.nextStock;
          const parsed = parseFloat(item.nextStock);
          if (!Number.isNaN(parsed)) return parsed;
          return (
            toNumber(item.stockPremonth) +
            toNumber(item.receive) -
            toNumber(item.outgoing) +
            toNumber(item.return)
          );
        };
        
        // ENHANCED CHECK: Consider material reservations untuk proper stock allocation
        for (const bom of bomForProduct) {
          const materialKey = normalizeKey(bom.material_id || bom.kode || bom.materialId);
          if (!materialKey) {
            console.warn(`[Enhanced Validation] ${notif.spkNo}: Invalid material key in BOM`, bom);
            continue;
          }
          
          const ratio = toNumber(bom.ratio || 1) || 1;
          const requiredQty = Math.max(Math.ceil(qtyNeeded * ratio), 0);
          if (requiredQty === 0) continue;
          
          // CRITICAL: Check if SPK already has reservation for this material
          const spkHasReservation = await materialAllocator.checkSPKMaterialsReady(notif.spkNo);
          
          if (spkHasReservation) {
            // SPK sudah punya reservation, berarti material ready
            console.log(`[Enhanced Validation] ${notif.spkNo}: Material ${materialKey} reserved for this SPK`);
            continue;
          }
          
          // SPK belum punya reservation, check available stock AFTER considering other reservations
          const availability = await materialAllocator.getMaterialAvailability(materialKey);
          
          if (!availability) {
            // Fallback to old logic if material allocator fails
            const inventoryItem = findInventoryByMaterial(materialKey);
            if (!inventoryItem) {
              console.log(`[Enhanced Validation] ${notif.spkNo}: Material ${materialKey} not found in inventory`);
              return false;
            }
            
            const availableStock = getAvailableStock(inventoryItem);
            if (availableStock < requiredQty) {
              console.log(`[Enhanced Validation] ${notif.spkNo}: Material ${materialKey} insufficient (fallback). Required: ${requiredQty}, Available: ${availableStock}`);
              return false;
            }
          } else {
            // Use material allocator result (considers reservations)
            if (availability.available < requiredQty) {
              console.log(`[Enhanced Validation] ${notif.spkNo}: Material ${materialKey} insufficient after reservations. Required: ${requiredQty}, Available: ${availability.available} (Total: ${availability.totalStock}, Reserved: ${availability.reserved})`);
              return false;
            } else {
              console.log(`[Enhanced Validation] ${notif.spkNo}: Material ${materialKey} available. Required: ${requiredQty}, Available: ${availability.available}`);
            }
          }
        }
        
        // Semua material tersedia (considering reservations)
        console.log(`[Enhanced Validation] ✅ ${notif.spkNo}: All materials available (considering reservations)`);
        return true;
      } catch (error) {
        console.error('Error validating material readiness', error);
        return false;
      }
    };
    
    // Info material readiness (tidak block, hanya kasih info)
    const isMaterialReady = await validateMaterialReadiness(notif, batch ? batch.qty : undefined);
    
    if (!isMaterialReady) {
      showAlert(
        `ℹ️ Material BOM belum tersedia untuk SPK: ${notif.spkNo}${batch ? ` (Batch: ${batch.batchNo || batch.batchName || ''})` : ''}.\n\n` +
        `Material mungkin sudah digunakan oleh SPK lain atau stok inventory tidak mencukupi.\n\n` +
        `💡 Anda tetap bisa memulai produksi dan menggunakan material lain yang tersedia saat submit production result.`,
        'Material BOM Info'
      );
      // Tidak return, biarkan user tetap bisa start production
    }
    
    // Info material status (tidak block, hanya kasih info)
    let materialStatusCheck = (notif.materialStatus || '').toString().toUpperCase();
    
    if (batch) {
      // Cek material untuk batch tertentu
      const batchReady = notif.batchMaterialReadiness && notif.batchMaterialReadiness[batch.id || batch.batchNo];
      const canStartProduction = ['RECEIVED', 'STOCK_READY'].includes(materialStatusCheck) && batchReady !== false;
      
      if (!canStartProduction && !batchReady) {
        showAlert(
          `ℹ️ Material untuk Batch ${batch.batchNo || batch.batchName || ''} belum siap.\n\n` +
          `Material mungkin belum diterima Purchasing atau stok inventory tidak mencukupi.\n\n` +
          `💡 Anda tetap bisa memulai produksi dan menggunakan material lain yang tersedia saat submit production result.`,
          'Material BOM Info'
        );
        // Tidak return, biarkan user tetap bisa start production
      }
    } else {
      // Cek material untuk seluruh SPK
      const canStartProduction = ['RECEIVED', 'STOCK_READY'].includes(materialStatusCheck);
      
      if (!canStartProduction) {
        showAlert(
          `ℹ️ Material BOM belum siap.\n\n` +
          `Material mungkin belum diterima Purchasing atau stok inventory tidak mencukupi.\n\n` +
          `💡 Anda tetap bisa memulai produksi dan menggunakan material lain yang tersedia saat submit production result.`,
          'Material BOM Info'
        );
        // Tidak return, biarkan user tetap bisa start production
      }
    }

    const productionQty = batch ? batch.qty : notif.qty;
    
    try {
      // Cek apakah sudah ada production untuk SPK ini (jika start batch, boleh ada production yang sama)
      if (!batch && existingOpenProduction) {
        showAlert(`Production already exists for SPK: ${notif.spkNo}`, 'Production Exists');
        return;
      }

      // Create production record
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      
      // Generate random alphanumeric code (5 chars) - fallback untuk SPK tanpa nomor
      const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      const randomCode = generateRandomCode();
      const spkGeneratedNo = `SPK/${year}${month}${day}/${randomCode}`;

      // Generate random PROD number (reuse year/month/day, but new randomCode for PROD)
      const prodRandomCode = generateRandomCode();
      const productionNo = `PROD-${year}${month}${day}-${prodRandomCode}${batch ? `-${batch.batchNo || ''}` : ''}`;
      
      const newProduction: Production = {
        id: Date.now().toString() + (batch ? `-batch-${batch.id || batch.batchNo}` : ''),
        productionNo: productionNo,
        grnNo: notif.grnNo || '',
        spkNo: notif.spkNo || spkGeneratedNo,
        soNo: notif.soNo,
        customer: notif.customer,
        product: notif.product,
        productId: notif.productId,
        target: productionQty,
        targetQty: productionQty,
        status: 'OPEN',
        date: new Date().toISOString().split('T')[0],
        progress: 0,
        producedQty: 0,
        remaining: productionQty,
        batches: batch ? [batch] : (notif.batches || []),
      };

      // Update productions state immediately (no reload needed)
      const updatedProductions = [...productions, newProduction];
      await storageService.set('production', updatedProductions);
      setProductions(updatedProductions);

      // Update notification status ke IN_PRODUCTION
      const productionNotifications = extractStorageValue(await storageService.get<any[]>('productionNotifications'));
      const updatedNotifications = productionNotifications.map((n: any) =>
        n.id === notif.id ? { ...n, status: 'IN_PRODUCTION', lastUpdate: new Date().toISOString() } : n
      );
      await storageService.set('productionNotifications', updatedNotifications);
      
      // Force sync to server immediately untuk prevent data conflict
      const config = storageService.getConfig();
      if (config.type === 'server' && config.serverUrl) {
        try {
          await storageService.syncToServer();
          console.log('[Production] ✅ Notification status synced to server');
        } catch (error) {
          console.warn('[Production] ⚠️ Failed to sync notification to server:', error);
        }
      }
      
      // Update notifications state immediately (no reload needed)
      // Filter out notifications yang sudah IN_PRODUCTION atau sudah ada production
      const filteredNotifications = updatedNotifications.filter((n: any) => {
        // Filter 1: Status sudah IN_PRODUCTION
        if (n.status === 'IN_PRODUCTION') return false;
        
        // Filter 2: Sudah ada production yang OPEN untuk SPK ini
        const hasProduction = updatedProductions.some((p: any) => {
          const pSpk = (p.spkNo || '').toString().trim();
          const nSpk = (n.spkNo || '').toString().trim();
          return pSpk === nSpk && p.status !== 'CLOSE';
        });
        if (hasProduction) return false;
        
        // Filter 3: Notification terlalu lama (lebih dari 30 hari) dan sudah ada production CLOSE
        const hasClosedProduction = updatedProductions.some((p: any) => {
          const pSpk = (p.spkNo || '').toString().trim();
          const nSpk = (n.spkNo || '').toString().trim();
          return pSpk === nSpk && p.status === 'CLOSE';
        });
        if (hasClosedProduction) {
          const notifDate = n.created ? new Date(n.created).getTime() : 0;
          const daysDiff = (Date.now() - notifDate) / (1000 * 60 * 60 * 24);
          if (daysDiff > 30) return false; // Hapus notification lama yang sudah ada production CLOSE
        }
        
        return true;
      });
      
      // Update state tanpa reload
      setNotifications(filteredNotifications);
      
      // Clean up: Hapus notification yang sudah tidak relevan dari storage
      if (filteredNotifications.length < updatedNotifications.length) {
        await storageService.set('productionNotifications', filteredNotifications);
        console.log(`[Production] 🧹 Cleaned up ${updatedNotifications.length - filteredNotifications.length} obsolete notifications`);
      }

      const batchText = batch ? `\nBatch: ${batch.batchNo || batch.batchName || ''}` : '';
      showAlert(`✅ Production started: ${newProduction.productionNo}\n\nSPK: ${notif.spkNo}${batchText}\nTarget: ${productionQty} PCS`, 'Success');
    } catch (error: any) {
      showAlert(`Error starting production: ${error.message}`, 'Error');
    }
  };

  // Format notifications untuk NotificationBell
  const productionNotifications = useMemo(() => {
    return notifications.map((notif: any) => {
      const materialStatus = (notif.materialStatus || '').toString().toUpperCase();
      const statusText = notif.status === 'NEED_MORE_PRODUCTION' 
        ? '⚠️ Production masih kurang'
        : materialStatus === 'RECEIVED' 
        ? '✅ Material diterima'
        : materialStatus === 'STOCK_READY'
        ? '✅ Stock ready'
        : materialStatus === 'PO_CREATED'
        ? '⏳ Menunggu GRN'
        : '⏳ Waiting material';
      
      return {
        id: notif.id || notif.spkNo,
        title: `SPK ${notif.spkNo}`,
        message: `SO: ${notif.soNo} | ${notif.qty} PCS | ${statusText}`,
        notif: notif,
      };
    });
  }, [notifications]);

  const tabs = [
    { id: 'production', label: 'Production' },
    { id: 'outstanding', label: `Outstanding (${productions.filter(p => p.status === 'OPEN').length})` },
    { id: 'schedule', label: 'Schedule' },
  ];

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Production</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notifications.length > 0 && (
            <NotificationBell
              notifications={productionNotifications}
              onNotificationClick={(notification) => {
                if (notification.notif) {
                  handleStartProduction(notification.notif);
                }
              }}
              icon="📧"
              emptyMessage="Tidak ada notifikasi produksi"
            />
          )}
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
        </div>
      </div>

      {/* Notifications dari PPIC (Schedule) - HIDDEN, menggunakan NotificationBell di header */}
      {false && notifications.length > 0 && (
        <Card className="mb-4">
          <div style={{ 
            padding: '12px', 
            backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#4caf50' : '#2e7d32', 
            borderRadius: '8px',
            color: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: showNotificationsPanel ? '10px' : 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                  📧 Production Notifications ({notifications.length})
                </h3>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>Mulai produksi setelah material ready</div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowNotificationsPanel(prev => !prev)}
                style={{ 
                  padding: '6px 12px', 
                  color: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#1b1b1b', 
                  backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#ffffff', 
                  border: 'none' 
                }}
              >
                {showNotificationsPanel ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showNotificationsPanel && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {notifications.map((notif: any) => {
                  const materialStatus = (notif.materialStatus || '').toString().toUpperCase();
                  const canStartButton = ['RECEIVED', 'STOCK_READY'].includes(materialStatus);
                  
                  return (
                  <div key={notif.id} style={{ 
                    flex: '0 1 260px', 
                    minWidth: '220px', 
                    maxWidth: '320px',
                    padding: '10px', 
                    backgroundColor: 'rgba(255,255,255,0.12)', 
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>SPK {notif.spkNo}</div>
                    <div>SO: {notif.soNo}</div>
                    <div>Customer: {notif.customer}</div>
                    <div>Product: {notif.product}</div>
                    <div>Qty: {notif.qty} PCS</div>
                    {notif.batches && notif.batches.length > 0 && (
                      <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.9 }}>
                        <strong>Batches ({notif.batches.length}):</strong>
                        {notif.batches.map((batch: any, idx: number) => (
                          <div key={batch.id || idx} style={{ marginLeft: '8px', marginTop: '2px' }}>
                            • Batch {batch.batchNo || String.fromCharCode(65 + idx)}: {batch.qty} PCS
                            {notif.batchMaterialReadiness && notif.batchMaterialReadiness[batch.id || batch.batchNo] && (
                              <span style={{ color: '#4caf50', marginLeft: '4px' }}>✅ Ready</span>
                            )}
                            {notif.batchMaterialReadiness && !notif.batchMaterialReadiness[batch.id || batch.batchNo] && (
                              <span style={{ color: '#f57c00', marginLeft: '4px' }}>⏳ Waiting</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div>Schedule: {notif.scheduleStartDate ? new Date(notif.scheduleStartDate).toLocaleDateString('id-ID') : '-'} - {notif.scheduleEndDate ? new Date(notif.scheduleEndDate).toLocaleDateString('id-ID') : '-'}</div>
                    <div style={{ marginTop: '6px', padding: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}>
                      {notif.status === 'NEED_MORE_PRODUCTION' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong>Status:</strong>
                          <span>⚠️ Production masih kurang</span>
                          <span>Sisa target: {Math.max(notif.pendingQty || 0, 0)} PCS</span>
                        </div>
                      ) : (
                        <>
                          <strong>Status:</strong>{' '}
                          {
                            notif.materialStatus === 'RECEIVED' 
                              ? '✅ Material diterima'
                              : materialStatus === 'STOCK_READY'
                              ? '✅ Stock ready (Inventory)'
                              : notif.materialStatus === 'PO_CREATED'
                              ? '⏳ Menunggu GRN'
                              : '⏳ Waiting material'
                          }
                        </>
                      )}
                    </div>
                    {notif.status === 'NEED_MORE_PRODUCTION' ? (
                      <Button 
                        variant="primary" 
                        onClick={() => handleStartProduction(notif)}
                        style={{ marginTop: '8px', fontSize: '11px', padding: '5px 10px' }}
                      >
                        ➕ Tambah Data Produksi
                      </Button>
                    ) : canStartButton && notif.batches && notif.batches.length > 0 ? (
                      // Jika ada batches, tampilkan tombol per batch
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                        {notif.batches.map((batch: any, idx: number) => {
                          const batchReady = notif.batchMaterialReadiness && notif.batchMaterialReadiness[batch.id || batch.batchNo];
                          const canStartBatch = ['RECEIVED', 'STOCK_READY'].includes(materialStatus) && batchReady !== false;
                          
                          return (
                            <Button
                              key={batch.id || idx}
                              variant={canStartBatch ? "primary" : "secondary"}
                              onClick={() => canStartBatch && handleStartProduction(notif, batch)}
                              disabled={!canStartBatch}
                              style={{ fontSize: '10px', padding: '4px 8px' }}
                            >
                              {canStartBatch ? `🚀 Start Batch ${batch.batchNo || String.fromCharCode(65 + idx)}` : `⏳ Batch ${batch.batchNo || String.fromCharCode(65 + idx)} (Waiting)`}
                            </Button>
                          );
                        })}
                        {/* Tombol untuk start semua batch sekaligus (jika semua ready) */}
                        {notif.batches.every((batch: any) => {
                          const batchReady = notif.batchMaterialReadiness && notif.batchMaterialReadiness[batch.id || batch.batchNo];
                          return ['RECEIVED', 'STOCK_READY'].includes(materialStatus) && batchReady !== false;
                        }) && (
                          <Button
                            variant="primary"
                            onClick={() => handleStartProduction(notif)}
                            style={{ marginTop: '4px', fontSize: '10px', padding: '4px 8px', backgroundColor: '#2e7d32' }}
                          >
                            🚀 Start All Batches
                          </Button>
                        )}
                      </div>
                    ) : (
                      canStartButton && (
                        <Button 
                          variant="primary" 
                          onClick={() => handleStartProduction(notif)}
                          style={{ marginTop: '8px', fontSize: '11px', padding: '5px 10px' }}
                        >
                          🚀 Start Production
                        </Button>
                      )
                    )}
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="tab-container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'production' && (
            <>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', minWidth: '240px' }}>
                  <Input
                    label="Search & Filter"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by SO No, Customer, Production No, SPK No, Product, Status..."
                  />
                </div>
                {renderViewModeToggle()}
                <Button 
                  variant="secondary" 
                  onClick={handleFixInventory}
                  style={{ marginTop: '24px', backgroundColor: '#ff9800', color: '#fff', alignSelf: 'flex-end' }}
                >
                  🔧 Fix Inventory
                </Button>
              </div>
              {productionViewMode === 'cards'
                ? renderProductionCardView(
                    filteredProductionData,
                    searchQuery ? "No Production data found matching your search" : "No Production data"
                  )
                : (
                  <Table 
                    columns={columns} 
                    data={flattenedProductionData} 
                    emptyMessage={searchQuery ? "No Production data found matching your search" : "No Production data"}
                    getRowStyle={(item: any) => ({
                      backgroundColor: getRowColor(item.soNo),
                    })}
                  />
                )}
            </>
          )}
          {activeTab === 'outstanding' && (
            <>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', minWidth: '240px' }}>
                  <Input
                    label="Search & Filter"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by SO No, Customer, Production No, SPK No, Product, Status..."
                  />
                </div>
                {renderViewModeToggle()}
              </div>
              {productionViewMode === 'cards'
                ? renderProductionCardView(
                    filteredProductionData,
                    searchQuery ? "No Production data found matching your search" : "No outstanding production data"
                  )
                : (
                  <Table 
                    columns={columns} 
                    data={flattenedProductionData} 
                    emptyMessage="No outstanding production data"
                    getRowStyle={(item: any) => ({
                      backgroundColor: getRowColor(item.soNo),
                    })}
                  />
                )}
            </>
          )}
          {activeTab === 'schedule' && (
            <ScheduleTable
              data={transformedScheduleData}
              onScheduleClick={handleScheduleClick}
            />
          )}
        </div>
      </Card>

      {selectedScheduleItem && (
        <ScheduleDialog
          item={selectedScheduleItem}
          onClose={() => setSelectedScheduleItem(null)}
          onSave={handleSaveSchedule}
        />
      )}

      {selectedProductionForSubmit && (
        <SubmitProductionResultDialog
          production={selectedProductionForSubmit}
          onClose={() => setSelectedProductionForSubmit(null)}
          onSave={handleSaveProductionResult}
        />
      )}

      {/* Custom Dialog untuk Alert/Confirm */}
      {dialogState.show && (() => {
        const titleLower = dialogState.title.toLowerCase();
        let iconType = 'info';
        let iconChar = 'ℹ️';
        if (titleLower.includes('success') || titleLower.includes('berhasil')) {
          iconType = 'success';
          iconChar = '✓';
        } else if (titleLower.includes('error') || titleLower.includes('gagal') || titleLower.includes('cannot')) {
          iconType = 'error';
          iconChar = '✕';
        } else if (titleLower.includes('warning') || titleLower.includes('peringatan') || titleLower.includes('validation')) {
          iconType = 'warning';
          iconChar = '⚠';
        }
        
        return (
          <div className="dialog-overlay" onClick={dialogState.type === 'alert' ? closeDialog : undefined}>
            <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
              <div className={`dialog-icon ${iconType}`}>
                {iconChar}
              </div>
              <h3 className="dialog-title">
                {dialogState.title}
              </h3>
              <div className="dialog-message">
                {dialogState.message}
              </div>
              <div className="dialog-actions">
                {dialogState.type === 'confirm' && (
                  <Button variant="secondary" onClick={() => {
                    if (dialogState.onCancel) dialogState.onCancel();
                    closeDialog();
                  }}>
                    Cancel
                  </Button>
                )}
                <Button variant="primary" onClick={async () => {
                  if (dialogState.onConfirm) {
                    try {
                      await dialogState.onConfirm();
                    } catch (error) {
                      console.error('Error in onConfirm:', error);
                    }
                  }
                  closeDialog();
                }}>
                  {dialogState.type === 'alert' ? 'OK' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {viewPdfData && (
        <div className="dialog-overlay" onClick={() => setViewPdfData(null)} style={{ zIndex: 11000 }}>
          <div
            className="dialog-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '70%',
              maxWidth: '820px',
              maxHeight: '92vh',
              minHeight: '72vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Preview SPK - {viewPdfData.spkNo}</h2>
              <Button variant="danger" onClick={() => setViewPdfData(null)} style={{ fontSize: '12px', padding: '4px 10px' }}>
                Close
              </Button>
            </div>
            <div
              style={{
                flex: 1,
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                backgroundColor: '#f5f5f5',
                padding: '12px',
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '680px',
                  margin: '0 auto',
                  backgroundColor: '#fff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                <iframe
                  title={`SPK-${viewPdfData.spkNo}`}
                  srcDoc={viewPdfData.html}
                  style={{
                    width: '100%',
                    height: 'calc(100vh - 280px)',
                    minHeight: '720px',
                    border: 'none',
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={handleDownloadSpkPdf}>
                  Download PDF
                </Button>
                <Button variant="primary" onClick={handlePrintSpkPdf}>
                  Print
                </Button>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  onClick={() => {
                    const targetProduction =
                      productions.find((p) => p.id === viewPdfData.productionId) ||
                      productions.find(
                        (p) =>
                          (p.spkNo && p.spkNo === viewPdfData.spkNo) ||
                          (p.productionNo && p.productionNo === viewPdfData.spkNo) ||
                          p.id === viewPdfData.spkNo
                      );
                    if (targetProduction) {
                      handleUploadSignedSpk(targetProduction);
                    } else {
                      showAlert('Data produksi tidak ditemukan untuk upload SPK.', 'Error');
                    }
                  }}
                >
                  Upload SPK (TTD)
                </Button>
                <Button variant="secondary" onClick={() => setViewPdfData(null)}>
                  Tutup Preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Submit Production Result Dialog Component
const SubmitProductionResultDialog = ({ production, onClose, onSave }: { production: Production; onClose: () => void; onSave: (data: any) => Promise<void> }) => {
  const [qtyProduced, setQtyProduced] = useState<string>((production.progress || production.target || 0).toString());
  const [qtySurplus, setQtySurplus] = useState<string>('0');
  const [qtySurplusUnit, setQtySurplusUnit] = useState<string>('pcs');
  const [materialsUsed, setMaterialsUsed] = useState<any[]>([]);
  const [leftovers, setLeftovers] = useState<any[]>([]);
  const [actualMaterials, setActualMaterials] = useState<any[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);
  const [resultFiles, setResultFiles] = useState<File[]>([]);
  const [isPartial, setIsPartial] = useState<boolean>(true);
  const [sitePlan, setSitePlan] = useState<string>('Site Plan 1');
  const [loading, setLoading] = useState<boolean>(false);

  // Custom Dialog state untuk component ini
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });

  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
    });
  };

  useEffect(() => {
    // Reset materialsUsed saat dialog dibuka untuk memastikan data fresh
    setMaterialsUsed([]);
    setLeftovers([]);
    // Load data fresh dari inventory
    loadBOMData();
    loadAvailableMaterials();
  }, [production]);

  const loadAvailableMaterials = async () => {
    try {
      const inventoryRaw = await storageService.get<any[]>('inventory');
      const materialsDataRaw = await storageService.get<any[]>('materials');
      
      // IMPORTANT: Filter deleted items untuk prevent data resurrection
      const inventoryRawArray = Array.isArray(inventoryRaw) ? inventoryRaw : [];
      const inventory = filterActiveItems(inventoryRawArray);
      const materialsData = Array.isArray(materialsDataRaw) ? materialsDataRaw : [];
      
      const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
      const toNumber = (value: any) => {
        if (typeof value === 'number' && !Number.isNaN(value)) return value;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      
      // Get available materials from inventory (materials that have stock > 0)
      const available: any[] = [];
      // Ensure inventory is always an array
      const inventoryArray = Array.isArray(inventory) ? inventory : [];
      inventoryArray.forEach((inv: any) => {
        const invCode = normalizeKey(inv.codeItem);
        if (!invCode) return;
        
        // Get available stock
        const getAvailableStock = (item: any) => {
          if (!item) return 0;
          if (typeof item.nextStock === 'number') return item.nextStock;
          const parsed = parseFloat(item.nextStock);
          if (!Number.isNaN(parsed)) return parsed;
          return (
            toNumber(item.stockPremonth) +
            toNumber(item.receive) -
            toNumber(item.outgoing) +
            toNumber(item.return)
          );
        };
        
        const availableStock = getAvailableStock(inv);
        if (availableStock <= 0) return;
        
        // Find material info - ensure materialsData is always an array
        const materialsDataArray = Array.isArray(materialsData) ? materialsData : [];
        const material = materialsDataArray.find((m: any) => {
          const matCode = normalizeKey(m.material_id || m.kode);
          return matCode === invCode;
        });
        
        if (material) {
          available.push({
            materialId: (material.material_id || material.kode || '').toString().trim(),
            materialName: material.nama || inv.description || inv.codeItem,
            unit: material.satuan || inv.satuan || 'PCS',
            availableStock: availableStock,
          });
        } else {
          // If material not found in materials, use inventory data
          available.push({
            materialId: inv.codeItem,
            materialName: inv.description || inv.codeItem,
            unit: inv.satuan || 'PCS',
            availableStock: availableStock,
          });
        }
      });
      
      // Remove duplicates
      const uniqueMaterials = available.filter((m, idx, self) => {
        // Ensure self is always an array
        const selfArray = Array.isArray(self) ? self : [];
        return idx === selfArray.findIndex((t: any) => normalizeKey(t.materialId) === normalizeKey(m.materialId));
      });
      
      // Ensure uniqueMaterials is always an array before setting
      setAvailableMaterials(Array.isArray(uniqueMaterials) ? uniqueMaterials : []);
    } catch (error: any) {
      console.error('Error loading available materials:', error);
    }
  };

  const loadBOMData = async () => {
    try {
      const spkDataRaw = await storageService.get<any[]>('spk');
      const bomDataRaw = await storageService.get<any[]>('bom');
      const materialsDataRaw = await storageService.get<any[]>('materials');
      const inventoryRaw = await storageService.get<any[]>('inventory');
      const productionResultsRaw = await storageService.get<any[]>('productionResults');
      
      // Ensure data is always an array and filter deleted items
      const spkData = Array.isArray(spkDataRaw) ? filterActiveItems(spkDataRaw) : [];
      const bomData = Array.isArray(bomDataRaw) ? filterActiveItems(bomDataRaw) : [];
      const materialsData = Array.isArray(materialsDataRaw) ? filterActiveItems(materialsDataRaw) : [];
      const inventory = Array.isArray(inventoryRaw) ? filterActiveItems(inventoryRaw) : []; // Exclude deleted inventory
      const productionResults = Array.isArray(productionResultsRaw) ? filterActiveItems(productionResultsRaw) : [];
      
      const spk = spkData.find((s: any) => {
        const prodSpkNo = (production.spkNo || '').toString().trim();
        const spkSpkNo = (s.spkNo || '').toString().trim();
        return prodSpkNo && spkSpkNo && (
          prodSpkNo === spkSpkNo || 
          prodSpkNo.replace(/-SJ\d+$/, '') === spkSpkNo.replace(/-SJ\d+$/, '')
        ) || (s.soNo === production.soNo);
      });
      
      // IMPORTANT: Ambil bomOverride dari SPK untuk digunakan di material calculation
      const spkBOMOverride = spk?.bomOverride || {}; // SPK-specific BOM override: { materialId: qty }
      
      // Prioritaskan production.productId karena itu yang paling akurat untuk product yang sedang di-produce
      // Fallback ke spk.product_id jika production.productId tidak ada
      const productId = (production.productId || spk?.product_id || spk?.kode || '').toString().trim();
      if (!productId) {
        console.warn('⚠️ No productId found for production:', production);
        return;
      }
      
      // IMPORTANT: Enrich production dengan bomOverride untuk digunakan di material calculation
      const productionWithOverride = {
        ...production,
        spkBOMOverride: spkBOMOverride,
      };

      // Load BOM untuk product ini
      const spkBOMRaw = bomData.filter((b: any) => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId === productId;
      });
      
      // IMPORTANT: Deduplikasi BOM berdasarkan material_id (jika ada duplikasi)
      const bomMap = new Map<string, any>();
      spkBOMRaw.forEach((bom: any) => {
        const materialId = (bom.material_id || '').toString().trim();
        if (!materialId) return;
        
        if (!bomMap.has(materialId)) {
          bomMap.set(materialId, bom);
        } else {
          // Jika material sudah ada, keep yang pertama (skip duplikasi)
          console.log(`⚠️ [Submit Dialog BOM] Duplicate BOM entry found for material ${materialId}, keeping first entry`);
        }
      });
      
      const spkBOM = Array.from(bomMap.values());

      // IMPORTANT: Get material received from inventory (available stock) untuk SPK ini
      // Bukan hanya dari GRN, karena material bisa sudah digunakan sebagian
      const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
      const toNumber = (value: any) => {
        if (typeof value === 'number' && !Number.isNaN(value)) return value;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      
      // Get material yang sudah digunakan dari productionResults sebelumnya untuk SPK ini
      const materialUsedPreviously: { [key: string]: number } = {};
      const existingProductionResults = productionResults.filter((pr: any) => 
        pr.spkNo === productionWithOverride.spkNo && pr.soNo === productionWithOverride.soNo
      );
      
      existingProductionResults.forEach((pr: any) => {
        if (pr.materialsUsed && Array.isArray(pr.materialsUsed)) {
          pr.materialsUsed.forEach((m: any) => {
            const materialId = (m.materialId || '').toString().trim();
            if (materialId) {
              materialUsedPreviously[materialId] = (materialUsedPreviously[materialId] || 0) + toNumber(m.qtyUsed || 0);
            }
          });
        }
      });

      // Initialize materials used and leftovers
      const matsUsed: any[] = [];
      const lefts: any[] = [];
      const processedMaterialIds = new Set<string>(); // Track material yang sudah diproses untuk avoid duplikasi
      
      // Use qtyProduced (progress) untuk calculate default material usage, bukan target
      const currentQtyProduced = toNumber(qtyProduced || production.progress || 0);

      spkBOM.forEach((bom: any) => {
        const material = materialsData.find((m: any) => 
          ((m.material_id || m.kode || '').toString().trim()) === ((bom.material_id || '').toString().trim())
        );
        if (!material) return;

        const materialId = (material.material_id || material.kode || '').toString().trim();
        
        // IMPORTANT: Skip jika material sudah diproses (safety check untuk avoid duplikasi)
        if (processedMaterialIds.has(materialId)) {
          console.log(`⚠️ [Submit Dialog] Material ${materialId} already processed, skipping duplicate`);
          return;
        }
        processedMaterialIds.add(materialId);
        
        const materialName = material.nama || '';
        const materialUnit = material.satuan || 'PCS';
        
        // Get available stock from inventory untuk material ini
        // IMPORTANT: Pastikan material benar-benar ada di inventory (tidak deleted)
        const inventoryItem = inventory.find((inv: any) => {
          // Skip deleted items
          if (inv.deleted || inv._deleted) return false;
          const invCode = normalizeKey(inv.codeItem);
          const matCode = normalizeKey(materialId);
          const isMatch = invCode === matCode;
          if (isMatch) {
            console.log(`✅ [Submit Dialog] Material ${materialId} (${materialName}) ditemukan di inventory:`, {
              codeItem: inv.codeItem,
              materialId: materialId,
              nextStock: inv.nextStock,
              stockPremonth: inv.stockPremonth,
              receive: inv.receive,
              outgoing: inv.outgoing,
              return: inv.return
            });
          }
          return isMatch;
        });
        
        // Debug log untuk material yang tidak ditemukan
        if (!inventoryItem) {
          console.log(`⚠️ [Submit Dialog] Material ${materialId} (${materialName}) TIDAK ditemukan di inventory`);
          console.log(`   Inventory items count: ${inventory.length}`);
          console.log(`   Sample inventory codes:`, inventory.slice(0, 5).map((inv: any) => inv.codeItem));
        }
        
        // Available stock = nextStock (sudah dikurangi outgoing dari production sebelumnya)
        const getAvailableStock = (item: any) => {
          if (!item) return 0;
          if (typeof item.nextStock === 'number') return item.nextStock;
          const parsed = parseFloat(item.nextStock);
          if (!Number.isNaN(parsed)) return parsed;
          return (
            toNumber(item.stockPremonth) +
            toNumber(item.receive) -
            toNumber(item.outgoing) +
            toNumber(item.return)
          );
        };
        
        // IMPORTANT: Jika material tidak ditemukan di inventory, set semua nilai ke 0
        const availableStock = inventoryItem ? getAvailableStock(inventoryItem) : 0;
        
        // Material yang sudah digunakan sebelumnya (hanya jika material ada di inventory)
        const usedPreviously = inventoryItem ? (materialUsedPreviously[materialId] || 0) : 0;
        
        // Material yang tersedia untuk produksi ini (bukan total received)
        // IMPORTANT: Jika material tidak ada di inventory, availableForThisProduction = 0
        const availableForThisProduction = inventoryItem ? availableStock : 0;
        
        // Total material yang diterima (available + sudah digunakan) - hanya jika material ada di inventory
        // CRITICAL: Pastikan receivedQty = 0 jika material tidak ada di inventory
        const receivedQty = inventoryItem ? (availableStock + usedPreviously) : 0;
        
        // Debug log untuk memastikan receivedQty benar
        if (!inventoryItem) {
          console.log(`🔍 [Submit Dialog] Material ${materialId} (${materialName}) - NOT IN INVENTORY:`);
          console.log(`   availableStock: ${availableStock}, usedPreviously: ${usedPreviously}, receivedQty: ${receivedQty}, availableForThisProduction: ${availableForThisProduction}`);
        } else {
          console.log(`🔍 [Submit Dialog] Material ${materialId} (${materialName}) - IN INVENTORY:`);
          console.log(`   availableStock: ${availableStock}, usedPreviously: ${usedPreviously}, receivedQty: ${receivedQty}, availableForThisProduction: ${availableForThisProduction}`);
        }
        
        // IMPORTANT: Cek apakah ada override qty dari PPIC (tidak mengikuti ratio)
        // bomOverride sudah di-load di loadBOMData dan di-pass ke production
        const spkBOMOverride = productionWithOverride.spkBOMOverride || {}; // SPK-specific BOM override: { materialId: qty }
        
        // Default material usage berdasarkan qtyProduced (bukan target)
        // IMPORTANT: Gunakan override qty jika ada, jika tidak gunakan ratio
        let defaultUsed: number;
        if (spkBOMOverride[materialId] !== undefined && spkBOMOverride[materialId] !== null) {
          // Gunakan override qty dari PPIC (tidak mengikuti ratio)
          // Calculate per unit override qty
          const spkQty = toNumber(production.target || 0);
          const overrideQtyTotal = parseFloat(spkBOMOverride[materialId]) || 0;
          if (spkQty > 0) {
            const overrideRatio = overrideQtyTotal / spkQty;
            defaultUsed = currentQtyProduced * overrideRatio;
          } else {
            defaultUsed = overrideQtyTotal;
          }
          console.log(`[Submit Dialog Override] Material ${materialId} using override qty=${overrideQtyTotal}, calculated per unit=${defaultUsed} for qtyProduced=${currentQtyProduced}`);
        } else {
          // Gunakan ratio calculation (default)
          const ratio = toNumber(bom.ratio || 1) || 1;
          defaultUsed = currentQtyProduced * ratio;
        }
        
        // Default used tidak boleh melebihi available stock
        const actualDefaultUsed = Math.min(defaultUsed, availableForThisProduction);
        
        // IMPORTANT: Leftover = availableStock (inventory yang tersedia) - qtyUsed (material yang mau dipakai)
        // Bukan totalReceivedQty - totalUsed
        const defaultLeftover = Math.max(0, availableForThisProduction - actualDefaultUsed);

        // Track apakah material tidak ada di inventory (tidak ditemukan sama sekali, bukan hanya stock 0)
        const isMaterialNotInInventory = !inventoryItem;
        
        // CRITICAL: Pastikan receivedQty = 0 jika material tidak ada di inventory
        // Jangan gunakan availableForThisProduction karena mungkin masih ada nilai lama
        const finalReceivedQty = isMaterialNotInInventory ? 0 : availableForThisProduction;
        
        console.log(`🔍 [Submit Dialog Final] Material ${materialId} (${materialName}):`);
        console.log(`   isMaterialNotInInventory: ${isMaterialNotInInventory}`);
        console.log(`   availableForThisProduction: ${availableForThisProduction}`);
        console.log(`   finalReceivedQty: ${finalReceivedQty}`);

        matsUsed.push({
          materialId,
          materialName,
          unit: materialUnit,
          qtyUsed: actualDefaultUsed.toString(),
          receivedQty: finalReceivedQty, // CRITICAL: Pastikan 0 jika material tidak ada di inventory
          totalReceivedQty: receivedQty, // Total material yang diterima (untuk reference)
          isNotInInventory: isMaterialNotInInventory, // Flag untuk material yang belum ada di inventory
        });

        if (defaultLeftover > 0) {
          lefts.push({
            materialId,
            materialName,
            unit: materialUnit,
            qtyLeftover: defaultLeftover.toString(),
          });
        }
      });

      setMaterialsUsed(matsUsed);
      setLeftovers(lefts);
    } catch (error: any) {
      console.error('Error loading BOM data:', error);
    }
  };

  // IMPORTANT: Auto-update material usage ketika qtyProduced berubah
  useEffect(() => {
    if (materialsUsed.length > 0 && qtyProduced) {
      const recalculateMaterialUsage = async () => {
        try {
          const bomData = await storageService.get<any[]>('bom') || [];
          const spkData = await storageService.get<any[]>('spk') || [];
          const inventoryRaw = await storageService.get<any[]>('inventory') || [];
          const inventory = Array.isArray(inventoryRaw) ? filterActiveItems(inventoryRaw) : [];
          
          const spk = spkData.find((s: any) => s.spkNo === production.spkNo || s.soNo === production.soNo);
          const productId = (production.productId || spk?.product_id || spk?.kode || '').toString().trim();
          
          if (!productId) return;
          
          const spkBOM = bomData.filter((b: any) => {
            const bomProductId = (b.product_id || b.kode || '').toString().trim();
            return bomProductId === productId;
          });
          
          const normalizeKey = (value: any) => (value ?? '').toString().trim().toLowerCase();
          const getAvailableStock = (item: any) => {
            if (!item) return 0;
            if (typeof item.nextStock === 'number') return item.nextStock;
            const parsed = parseFloat(item.nextStock);
            if (!Number.isNaN(parsed)) return parsed;
            return (
              (item.stockPremonth || 0) +
              (item.receive || 0) -
              (item.outgoing || 0) +
              (item.return || 0)
            );
          };
          
          const currentQtyProduced = parseFloat(qtyProduced || '0') || 0;
          const updated = materialsUsed.map((m: any) => {
            const bom = spkBOM.find((b: any) => {
              const bomMaterialId = (b.material_id || '').toString().trim();
              return bomMaterialId === m.materialId;
            });
            
            if (bom) {
              // Recalculate receivedQty dari inventory (pastikan selalu up-to-date)
              const inventoryItem = inventory.find((inv: any) => {
                if (inv.deleted || inv._deleted) return false;
                const invCode = normalizeKey(inv.codeItem);
                const matCode = normalizeKey(m.materialId);
                return invCode === matCode;
              });
              
              // CRITICAL: Pastikan receivedQty = 0 jika material tidak ada di inventory
              const availableStock = inventoryItem ? getAvailableStock(inventoryItem) : 0;
              const receivedQty = inventoryItem ? availableStock : 0;
              
              const ratio = parseFloat(bom.ratio || '1') || 1;
              const newUsed = currentQtyProduced * ratio;
              const actualUsed = Math.min(newUsed, receivedQty);
              
              return {
                ...m,
                qtyUsed: actualUsed.toString(),
                receivedQty: receivedQty, // Update receivedQty dari inventory
                isNotInInventory: !inventoryItem, // Update flag
              };
            }
            return m;
          });
          
          setMaterialsUsed(updated);
          
          // IMPORTANT: Leftover = availableStock (inventory yang tersedia) - qtyUsed (material yang mau dipakai)
          // Bukan totalReceivedQty - totalUsed
          const updatedLeftovers = updated.map((m: any) => {
            const availableStock = m.receivedQty || 0; // Material yang tersedia di inventory untuk produksi ini
            const usedQty = parseFloat(m.qtyUsed || '0') || 0;
            const leftoverQty = Math.max(0, availableStock - usedQty);
            
            if (leftoverQty > 0) {
              return {
                materialId: m.materialId,
                materialName: m.materialName,
                unit: m.unit,
                qtyLeftover: leftoverQty.toString(),
              };
            }
            return null;
          }).filter((l: any) => l !== null);
          
          setLeftovers(updatedLeftovers);
        } catch (error) {
          console.error('Error recalculating material usage:', error);
        }
      };
      
      recalculateMaterialUsage();
    }
  }, [qtyProduced]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setResultFiles(files);
  };

  const handleMaterialUsedChange = async (index: number, value: string) => {
    const updated = [...materialsUsed];
    updated[index].qtyUsed = value;
    setMaterialsUsed(updated);
    
    // Update leftovers
    // IMPORTANT: Leftover = availableStock (inventory yang tersedia) - qtyUsed (material yang mau dipakai)
    // Bukan totalReceivedQty - totalUsed
    const material = updated[index];
    const availableStock = material.receivedQty || 0; // Material yang tersedia di inventory untuk produksi ini
    const usedQty = parseFloat(value || '0') || 0;
    
    // Calculate leftover: availableStock - qtyUsed
    const leftoverQty = Math.max(0, availableStock - usedQty);
    
    const leftoverIndex = leftovers.findIndex((l: any) => l.materialId === material.materialId);
    if (leftoverQty > 0) {
      if (leftoverIndex >= 0) {
        const updatedLeftovers = [...leftovers];
        updatedLeftovers[leftoverIndex].qtyLeftover = leftoverQty.toString();
        setLeftovers(updatedLeftovers);
      } else {
        setLeftovers([...leftovers, {
          materialId: material.materialId,
          materialName: material.materialName,
          unit: material.unit,
          qtyLeftover: leftoverQty.toString(),
        }]);
      }
    } else if (leftoverIndex >= 0) {
      const updatedLeftovers = [...leftovers];
      updatedLeftovers.splice(leftoverIndex, 1);
      setLeftovers(updatedLeftovers);
    }
  };

  const handleLeftoverChange = (index: number, value: string) => {
    const updated = [...leftovers];
    updated[index].qtyLeftover = value;
    setLeftovers(updated);
  };

  const handleAddActualMaterial = () => {
    if (availableMaterials.length === 0) {
      showAlert('Tidak ada material yang tersedia di inventory', 'Information');
      return;
    }
    
    // Add first available material that's not already added
    const alreadyAddedIds = actualMaterials.map((m: any) => 
      (m.materialId || '').toString().trim().toLowerCase()
    );
    // Ensure availableMaterials is always an array
    const availableMaterialsArray = Array.isArray(availableMaterials) ? availableMaterials : [];
    const materialToAdd = availableMaterialsArray.find((m: any) => 
      !alreadyAddedIds.includes((m.materialId || '').toString().trim().toLowerCase())
    );
    
    if (!materialToAdd) {
      showAlert('Semua material yang tersedia sudah ditambahkan', 'Information');
      return;
    }
    
    setActualMaterials([...actualMaterials, {
      materialId: materialToAdd.materialId,
      materialName: materialToAdd.materialName,
      unit: materialToAdd.unit,
      qtyUsed: '0',
      availableStock: materialToAdd.availableStock,
    }]);
  };

  const handleRemoveActualMaterial = (index: number) => {
    const updated = [...actualMaterials];
    updated.splice(index, 1);
    setActualMaterials(updated);
  };

  const handleActualMaterialChange = (index: number, field: string, value: string) => {
    const updated = [...actualMaterials];
    if (field === 'materialId') {
      // Ensure availableMaterials is always an array
      const availableMaterialsArray = Array.isArray(availableMaterials) ? availableMaterials : [];
      const selectedMaterial = availableMaterialsArray.find((m: any) => 
        (m.materialId || '').toString().trim() === value
      );
      if (selectedMaterial) {
        updated[index] = {
          materialId: selectedMaterial.materialId,
          materialName: selectedMaterial.materialName,
          unit: selectedMaterial.unit,
          qtyUsed: updated[index].qtyUsed || '0',
          availableStock: selectedMaterial.availableStock,
        };
      }
    } else if (field === 'qtyUsed') {
      updated[index].qtyUsed = value;
    }
    setActualMaterials(updated);
  };

  const handleSubmit = async () => {
    try {
      const qtyProducedNum = parseFloat(qtyProduced || '0') || 0;
      if (qtyProducedNum <= 0) {
        showAlert('Qty Produced harus lebih dari 0', 'Validation Error');
        return;
      }
      
      // Validasi: Cek apakah stock material cukup untuk qtyProduced
      const inventoryRaw = await storageService.get<any[]>('inventory');
      const bomDataRaw = await storageService.get<any[]>('bom');
      const materialsDataRaw = await storageService.get<any[]>('materials');
      const spkDataRaw = await storageService.get<any[]>('spk');
      
      // Ensure data is always an array - defensive check
      const inventory = Array.isArray(inventoryRaw) ? inventoryRaw : [];
      const bomData = Array.isArray(bomDataRaw) ? bomDataRaw : [];
      const materialsData = Array.isArray(materialsDataRaw) ? materialsDataRaw : [];
      const spkData = Array.isArray(spkDataRaw) ? spkDataRaw : [];
    
    // Get product ID
    const spk = spkData.find((s: any) => s.spkNo === production.spkNo || s.soNo === production.soNo);
    const productId = (production.productId || spk?.product_id || spk?.kode || '').toString().trim();
    
    // Info material BOM (tidak block, hanya kasih info)
    // Jika ada actual materials yang ditambahkan, skip info BOM (karena user menggunakan material lain)
    const hasActualMaterials = actualMaterials.length > 0 && actualMaterials.some((m: any) => parseFloat(m.qtyUsed || '0') > 0);
    
    const missingBOMMaterials: string[] = [];
    const insufficientBOMMaterials: string[] = [];
    
    if (productId && !hasActualMaterials) {
      const spkBOM = bomData.filter((b: any) => {
        const bomProductId = (b.product_id || b.kode || '').toString().trim();
        return bomProductId === productId;
      });
      
      // Cek stock untuk setiap material BOM (hanya untuk info, tidak block)
      for (const bom of spkBOM) {
        const bomMaterialId = (bom.material_id || '').toString().trim();
        const material = materialsData.find((m: any) => {
          const mId = (m.material_id || m.kode || '').toString().trim();
          return mId === bomMaterialId;
        });
        
        if (!material) continue;
        
        const ratio = parseFloat(bom.ratio || '1') || 1;
        const requiredQty = qtyProducedNum * ratio;
        
        // Cek stock material
        const inventoryItem = inventory.find((inv: any) => {
          const invCode = (inv.codeItem || '').toString().trim();
          return invCode.toLowerCase() === bomMaterialId.toLowerCase();
        });
        
        if (inventoryItem) {
          const availableStock = 
            (inventoryItem.stockPremonth || 0) + 
            (inventoryItem.receive || 0) - 
            (inventoryItem.outgoing || 0) + 
            (inventoryItem.return || 0);
          
          // Cek apakah stock cukup (dengan tolerance 2%)
          const tolerance = requiredQty * 0.02;
          if (availableStock + tolerance < requiredQty) {
            insufficientBOMMaterials.push(`${material.nama} (Butuh: ${requiredQty.toFixed(2)}, Tersedia: ${availableStock.toFixed(2)} ${material.satuan || 'PCS'})`);
          }
        } else {
          // Material tidak ada di inventory
          missingBOMMaterials.push(`${material.nama} (${bomMaterialId}) - Butuh: ${requiredQty.toFixed(2)} ${material.satuan || 'PCS'}`);
        }
      }
      
      // Kasih info kalau ada material BOM yang tidak tersedia (tidak block)
      if (missingBOMMaterials.length > 0 || insufficientBOMMaterials.length > 0) {
        let infoMessage = 'ℹ️ Material BOM tidak tersedia di inventory:\n\n';
        
        if (missingBOMMaterials.length > 0) {
          infoMessage += '❌ Material tidak ditemukan:\n';
          missingBOMMaterials.forEach(m => infoMessage += `  • ${m}\n`);
          infoMessage += '\n';
        }
        
        if (insufficientBOMMaterials.length > 0) {
          infoMessage += '⚠️ Stock tidak cukup:\n';
          insufficientBOMMaterials.forEach(m => infoMessage += `  • ${m}\n`);
          infoMessage += '\n';
        }
        
        infoMessage += '💡 Anda dapat menggunakan material lain yang tersedia dengan menambahkan "Actual Material Usage" di bawah ini.';
        
        showAlert(infoMessage, 'Material BOM Info');
      }
    }
    
    // Validasi stock untuk actual materials (jika ada)
    if (hasActualMaterials) {
      for (const actualMat of actualMaterials) {
        const qtyUsed = parseFloat(actualMat.qtyUsed || '0') || 0;
        if (qtyUsed <= 0) continue;
        
        const inventoryItem = inventory.find((inv: any) => {
          const invCode = (inv.codeItem || '').toString().trim();
          return invCode.toLowerCase() === (actualMat.materialId || '').toString().trim().toLowerCase();
        });
        
        if (inventoryItem) {
          const availableStock = 
            (inventoryItem.stockPremonth || 0) + 
            (inventoryItem.receive || 0) - 
            (inventoryItem.outgoing || 0) + 
            (inventoryItem.return || 0);
          
          if (availableStock < qtyUsed) {
            showAlert(
              `⚠️ Stock actual material tidak cukup!\n\nMaterial: ${actualMat.materialName}\nButuh: ${qtyUsed} ${actualMat.unit || 'PCS'}\nTersedia: ${availableStock} ${actualMat.unit || 'PCS'}\n\nSilakan kurangi quantity atau pilih material lain.`,
              'Stock Insufficient'
            );
            return;
          }
        } else {
          showAlert(
            `⚠️ Actual material tidak ditemukan di inventory!\n\nMaterial: ${actualMat.materialName} (${actualMat.materialId})\n\nPastikan material sudah ada di inventory.`,
            'Material Not Found'
          );
          return;
        }
      }
    }
    
    // Validasi: Cek apakah qtyProduced tidak melebihi target (dengan tolerance)
    const targetQty = production.target || production.targetQty || 0;
    const prevProgress = production.progress || production.producedQty || 0;
    const newProgress = prevProgress + qtyProducedNum;
    const tolerance = targetQty * 0.05; // 5% tolerance
    
    if (targetQty > 0 && newProgress > targetQty + tolerance) {
      showAlert(
        `⚠️ Qty Produced melebihi target!\n\nTarget: ${targetQty} PCS\nProgress sebelumnya: ${prevProgress} PCS\nQty Produced: ${qtyProducedNum} PCS\nTotal Progress: ${newProgress} PCS\n\nMaksimal yang bisa di-submit: ${Math.max(0, targetQty - prevProgress + tolerance)} PCS`,
        'Qty Exceeds Target'
      );
      return;
    }

    // Get SO data
    const salesOrdersRaw = await storageService.get<any[]>('salesOrders');
    const salesOrders = Array.isArray(salesOrdersRaw) ? salesOrdersRaw : [];
    const so = salesOrders.find((s: any) => s.soNo === production.soNo);
    const soId = so?.id || '';

    // Convert files to base64
    const resultFilesBase64: any[] = [];
    for (const file of resultFiles) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      resultFilesBase64.push({
        name: file.name,
        data: base64,
      });
    }

    // Get GRN ID
    const grnListRaw = await storageService.get<any[]>('grn');
    const grnList = Array.isArray(grnListRaw) ? grnListRaw : [];
    const relatedGRN = grnList.find((g: any) => 
      (g.soNo === production.soNo || g.spkNo === production.spkNo) && g.status === 'OPEN'
    );
    const grnId = relatedGRN?.id || '';

    const submitData = {
      soId: soId,
      soNo: production.soNo,
      customer: production.customer,
      product: production.product || '',
      qtyProduced: String(qtyProducedNum),
      qtySurplus: String(parseFloat(qtySurplus || '0') || 0),
      qtySurplusUnit: qtySurplusUnit.trim() || 'pcs',
      sitePlan: sitePlan || 'Site Plan 1',
      materials: materialsUsed.map((m: any) => ({
        materialId: m.materialId,
        materialName: m.materialName,
        unit: m.unit,
        qtyUsed: String(parseFloat(m.qtyUsed || '0') || 0),
      })),
      actualMaterials: actualMaterials.map((m: any) => ({
        materialId: m.materialId,
        materialName: m.materialName,
        unit: m.unit,
        qtyUsed: String(parseFloat(m.qtyUsed || '0') || 0),
      })),
      leftovers: leftovers.map((l: any) => ({
        materialId: l.materialId,
        materialName: l.materialName,
        unit: l.unit,
        qtyLeftover: String(parseFloat(l.qtyLeftover || '0') || 0),
      })),
      docs: {
        resultFiles: resultFilesBase64.length > 0 ? resultFilesBase64 : undefined,
        inputTimestamp: new Date().toISOString(),
        isPartial: isPartial,
      },
      grnId: grnId,
    };

      setLoading(true);
      try {
        await onSave(submitData);
        onClose(); // Close dialog after successful save
      } catch (error: any) {
        console.error('Error submitting production result:', error);
        showAlert(`Error submitting production result: ${error.message || 'Unknown error'}`, 'Error');
      } finally {
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      showAlert(`Error: ${error.message || 'Unknown error'}`, 'Error');
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Submit Production Result</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px' }}>
              <div><strong>Production No:</strong> {production.productionNo || production.grnNo || '-'}</div>
              <div><strong>SO No:</strong> {production.soNo}</div>
              <div><strong>Customer:</strong> {production.customer}</div>
              <div><strong>Product:</strong> {production.product || '-'}</div>
              <div><strong>Target:</strong> {production.target || 0} PCS</div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Site Plan *
            </label>
            <select
              value={sitePlan}
              onChange={(e) => setSitePlan(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            >
              <option value="Site Plan 1">Site Plan 1</option>
              <option value="Site Plan 2">Site Plan 2</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Qty Produced *
            </label>
            <input
              type="text"
              value={qtyProduced}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setQtyProduced(value);
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                const numValue = value === '' ? 0 : Number(value);
                if (isNaN(numValue) || numValue < 0) {
                  setQtyProduced((production.target || 0).toString());
                } else {
                  setQtyProduced(Math.ceil(numValue).toString());
                }
              }}
              placeholder="Enter quantity produced"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Qty Surplus (Optional)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={qtySurplus}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setQtySurplus(value);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 0 : Number(value);
                  if (isNaN(numValue) || numValue < 0) {
                    setQtySurplus('0');
                  } else {
                    setQtySurplus(Math.ceil(numValue).toString());
                  }
                }}
                placeholder="0"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
              <select
                value={qtySurplusUnit}
                onChange={(e) => setQtySurplusUnit(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="pcs">PCS</option>
                <option value="kg">KG</option>
                <option value="m">M</option>
                <option value="m2">M²</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Materials Used
            </label>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Material</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Received</th>
                    <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Used</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {materialsUsed.map((mat: any, idx: number) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', fontSize: '12px' }}>{mat.materialName}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {/* CRITICAL: Pastikan receivedQty = 0 jika material tidak ada di inventory */}
                        {mat.isNotInInventory ? 0 : (mat.receivedQty || 0)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        <input
                          type="text"
                          value={mat.qtyUsed}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              handleMaterialUsedChange(idx, value);
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            const numValue = value === '' ? 0 : Number(value);
                            if (isNaN(numValue) || numValue < 0) {
                              handleMaterialUsedChange(idx, '0');
                            } else {
                              handleMaterialUsedChange(idx, Math.ceil(numValue).toString());
                            }
                          }}
                          style={{
                            width: '80px',
                            padding: '4px 8px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>{mat.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Info untuk material yang belum ada di inventory */}
            {materialsUsed.some((mat: any) => mat.isNotInInventory) && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '4px',
                fontSize: '12px',
                color: 'var(--warning)',
              }}>
                ⚠️ <strong>Info:</strong> Beberapa material belum tersedia di inventory (Received = 0). 
                Mohon tunggu material masuk ke inventory terlebih dahulu, atau gunakan material lain yang tersedia melalui "Actual Material Usage" di bawah ini.
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>
                Actual Material Usage (Packaging)
              </label>
              <Button 
                variant="secondary" 
                onClick={handleAddActualMaterial}
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                + Add Material
              </Button>
            </div>
            {actualMaterials.length > 0 && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Material</th>
                      <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Available</th>
                      <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Used</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>Unit</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', width: '60px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actualMaterials.map((mat: any, idx: number) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px', fontSize: '12px' }}>
                          <select
                            value={mat.materialId}
                            onChange={(e) => handleActualMaterialChange(idx, 'materialId', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          >
                            {availableMaterials.map((m: any) => (
                              <option key={m.materialId} value={m.materialId}>
                                {m.materialName} ({m.materialId})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {mat.availableStock || 0}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <input
                            type="text"
                            value={mat.qtyUsed}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                handleActualMaterialChange(idx, 'qtyUsed', value);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? 0 : Number(value);
                              if (isNaN(numValue) || numValue < 0) {
                                handleActualMaterialChange(idx, 'qtyUsed', '0');
                              } else {
                                const maxQty = mat.availableStock || 0;
                                const finalQty = Math.min(Math.ceil(numValue), maxQty);
                                handleActualMaterialChange(idx, 'qtyUsed', finalQty.toString());
                              }
                            }}
                            style={{
                              width: '80px',
                              padding: '4px 8px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              textAlign: 'right',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>{mat.unit}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <Button
                            variant="secondary"
                            onClick={() => handleRemoveActualMaterial(idx)}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            ✕
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {actualMaterials.length === 0 && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '4px', 
                fontSize: '12px', 
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                No actual materials added. Click "Add Material" to select materials from inventory.
              </div>
            )}
          </div>

          {leftovers.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                Material Leftovers
              </label>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px' }}>Material</th>
                      <th style={{ padding: '8px', textAlign: 'right', fontSize: '12px' }}>Leftover</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leftovers.map((left: any, idx: number) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px', fontSize: '12px' }}>{left.materialName}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <input
                            type="text"
                            value={left.qtyLeftover}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                handleLeftoverChange(idx, value);
                              }
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const numValue = value === '' ? 0 : Number(value);
                              if (isNaN(numValue) || numValue < 0) {
                                handleLeftoverChange(idx, '0');
                              } else {
                                handleLeftoverChange(idx, Math.ceil(numValue).toString());
                              }
                            }}
                            style={{
                              width: '80px',
                              padding: '4px 8px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              textAlign: 'right',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }}>{left.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Result Files (Optional)
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
            {resultFiles.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {resultFiles.length} file(s) selected
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPartial}
                onChange={(e) => setIsPartial(e.target.checked)}
              />
              <span style={{ fontSize: '14px' }}>Partial Input (Is Partial)</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Result'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Custom Dialog untuk Alert/Confirm */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog} style={{ zIndex: 10001 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {dialogState.title}
              </h3>
            </div>
            
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {dialogState.message}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={closeDialog}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Production;
