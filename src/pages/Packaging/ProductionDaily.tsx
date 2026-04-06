import { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Table from '../../components/Table';
import DateRangeFilter from '../../components/DateRangeFilter';
import { storageService, StorageKeys } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { loadLogoAsBase64Cached } from '../../utils/logo-loader';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import { generateWOHtml } from '../../pdf/wo-pdf-template';
import '../../styles/common.css';
import '../../styles/compact.css';
import './ProductionDaily.css';

interface SPKItem {
  id: string;
  spkNo: string;
  soNo: string;
  productId: string;
  product_id?: string;
  productCode: string;
  kode?: string;
  productName: string;
  product?: string;
  targetQty: number;
  qty?: number;
  unit: string;
  customer?: string;
  status: string;
  notes?: string;
  created?: string;
  progress?: number;
  stockFulfilled?: boolean;
}

interface ProductionDailyItem {
  id: string;
  spkNo: string;
  soNo?: string;
  productCode: string;
  productName: string;
  targetQty: number;
  unit: string;
  customer?: string;
  wipCutting: number;
  wipSlitter: number;
  wipDieCut: number;
  wipCentralRotary: number;
  wipLongWay: number;
  wipSablon: number;
  wipStitching: number;
  resultFinishGood: number;
  approvedBy: string;
  checkedBy: string;
  noted: string;
  productionDate: string;
  shift: string;
  createdAt: string;
  createdBy: string;
  materialSelected?: string;
  qtyTerpakai?: number;
}

const ProductionDaily = () => {
  const [spkList, setSpkList] = useState<SPKItem[]>([]);
  const [productionDailyList, setProductionDailyList] = useState<ProductionDailyItem[]>([]);
  const [materialList, setMaterialList] = useState<any[]>([]);
  const [bomData, setBomData] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [spkSearchQuery, setSpkSearchQuery] = useState('');
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<ProductionDailyItem | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [bomMaterials, setBomMaterials] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    spkNo: '',
    productCode: '',
    productName: '',
    targetQty: '',
    unit: '',
    wipCutting: '',
    wipSlitter: '',
    wipDieCut: '',
    wipCentralRotary: '',
    wipLongWay: '',
    wipSablon: '',
    wipStitching: '',
    resultFinishGood: '',
    approvedBy: '',
    checkedBy: '',
    noted: '',
    productionDate: new Date().toISOString().split('T')[0],
    shift: '1',
    materialSelected: '',
    qtyTerpakai: '',
  });

  useEffect(() => {
    loadSPKData();
    loadBOMData();
    loadMaterialData();
  }, []);

  useEffect(() => {
    loadProductionDailyData();
  }, [dateFrom, dateTo, searchQuery]);

  const loadMaterialData = async () => {
    try {
      const data = await storageService.get<any[]>(StorageKeys.PACKAGING.MATERIALS) || [];
      const materials = filterActiveItems(Array.isArray(data) ? data : []);
      console.log('[ProductionDaily] Loaded materials:', materials.length, 'records');
      setMaterialList(materials);
    } catch (error) {
      console.error('Error loading material data:', error);
      setMaterialList([]);
    }
  };

  const loadSPKData = async () => {
    try {
      const spkRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK) || [];
      const spk = filterActiveItems(Array.isArray(spkRaw) ? spkRaw : []);
      const activeSPK = spk.filter((s: any) => 
        s.status !== 'CLOSE' && s.status !== 'VOID' && s.status !== 'CANCELLED'
      );
      console.log('[ProductionDaily] Loaded SPK:', activeSPK.length, 'records');
      setSpkList(activeSPK);
    } catch (error) {
      console.error('Error loading SPK data:', error);
      setSpkList([]);
    }
  };

  const loadBOMData = async () => {
    try {
      const bomRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.BOM) || [];
      const bom = filterActiveItems(Array.isArray(bomRaw) ? bomRaw : []);
      console.log('[ProductionDaily] Loaded BOM:', bom.length, 'records');
      setBomData(bom);
    } catch (error) {
      console.error('Error loading BOM data:', error);
      setBomData([]);
    }
  };

  const loadProductionDailyData = async () => {
    try {
      const prodDailyRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTION_DAILY) || [];
      const prodDaily = filterActiveItems(Array.isArray(prodDailyRaw) ? prodDailyRaw : []);
      console.log('[ProductionDaily] Loaded from server:', prodDaily.length, 'records');
      
      // Filter by date range
      let filtered = prodDaily;
      if (dateFrom || dateTo) {
        filtered = prodDaily.filter((p: any) => {
          if (!p.createdAt) return false;
          const itemDate = new Date(p.createdAt);
          const fromDate = dateFrom ? new Date(dateFrom) : null;
          const toDate = dateTo ? new Date(dateTo) : null;
          
          if (fromDate && itemDate < fromDate) return false;
          if (toDate) {
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (itemDate > endOfDay) return false;
          }
          return true;
        });
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((p: any) =>
          (p.spkNo?.toLowerCase() || '').includes(query) ||
          (p.productCode?.toLowerCase() || '').includes(query) ||
          (p.productName?.toLowerCase() || '').includes(query)
        );
      }
      
      setProductionDailyList(filtered);
    } catch (error) {
      console.error('Error loading production daily data:', error);
      setProductionDailyList([]);
    }
  };

  // Calculate remaining quantity for a specific SPK
  const calculateRemainingQty = (spkNo: string, targetQty: number): number => {
    // Get all production records for this SPK
    const spkRecords = productionDailyList.filter((p: any) => p.spkNo === spkNo);
    
    // Sum all finish good quantities
    const totalProduced = spkRecords.reduce((sum: number, p: any) => sum + (p.resultFinishGood || 0), 0);
    
    // Calculate remaining
    const remaining = targetQty - totalProduced;
    return Math.max(0, remaining); // Don't go below 0
  };

  const handleViewDetail = (item: ProductionDailyItem) => {
    setSelectedDetail(item);
    setShowDetailModal(true);
  };

  const handleEditItem = (item: ProductionDailyItem) => {
    setFormData({
      spkNo: item.spkNo,
      productCode: item.productCode,
      productName: item.productName,
      targetQty: item.targetQty.toString(),
      unit: item.unit,
      wipCutting: item.wipCutting.toString(),
      wipSlitter: item.wipSlitter.toString(),
      wipDieCut: item.wipDieCut.toString(),
      wipCentralRotary: item.wipCentralRotary.toString(),
      wipLongWay: item.wipLongWay.toString(),
      wipSablon: item.wipSablon.toString(),
      wipStitching: item.wipStitching.toString(),
      resultFinishGood: item.resultFinishGood.toString(),
      approvedBy: item.approvedBy,
      checkedBy: item.checkedBy,
      noted: item.noted,
      productionDate: item.productionDate,
      shift: item.shift,
      materialSelected: item.materialSelected || '',
      qtyTerpakai: (item.qtyTerpakai || 0).toString(),
    });
    setShowForm(true);
  };

  const toggleExpandRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSelectSPK = (spk: SPKItem) => {
    const productCode = spk.kode || spk.productCode || '';
    const productName = spk.product || spk.productName || '';
    const targetQty = spk.qty || spk.targetQty || 0;
    
    // Auto-fill BOM materials dari product code
    const productId = spk.product_id || spk.productCode || spk.kode || '';
    const bomMaterialsForProduct = bomData.filter((b: any) => {
      const bomProductId = (b.product_id || b.kode || b.productCode || '').toString().toLowerCase();
      return bomProductId === productId.toLowerCase();
    });
    
    // Format materials untuk display
    const materialsList = bomMaterialsForProduct.map((b: any) => {
      const materialCode = b.material_id || b.materialCode || b.kode || '';
      const materialName = b.material_name || b.nama || '';
      return `${materialCode}${materialCode && materialName ? ' - ' : ''}${materialName}`;
    }).join(', ');
    
    setFormData({
      spkNo: spk.spkNo,
      productCode: productCode,
      productName: productName,
      targetQty: targetQty.toString(),
      unit: spk.unit,
      wipCutting: '',
      wipSlitter: '',
      wipDieCut: '',
      wipCentralRotary: '',
      wipLongWay: '',
      wipSablon: '',
      wipStitching: '',
      resultFinishGood: '',
      approvedBy: '',
      checkedBy: '',
      noted: spk.notes || '',
      productionDate: new Date().toISOString().split('T')[0],
      shift: '1',
      materialSelected: materialsList || '',
      qtyTerpakai: '',
    });
    
    // Store BOM materials untuk reference
    setBomMaterials(bomMaterialsForProduct);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewForm = () => {
    setFormData({
      spkNo: '',
      productCode: '',
      productName: '',
      targetQty: '',
      unit: '',
      wipCutting: '',
      wipSlitter: '',
      wipDieCut: '',
      wipCentralRotary: '',
      wipLongWay: '',
      wipSablon: '',
      wipStitching: '',
      resultFinishGood: '',
      approvedBy: '',
      checkedBy: '',
      noted: '',
      productionDate: new Date().toISOString().split('T')[0],
      shift: '1',
      materialSelected: '',
      qtyTerpakai: '',
    });
    setSpkSearchQuery('');
    setShowForm(true);
  };

  const handleViewWO = async () => {
    try {
      if (!formData.spkNo) {
        alert('Please select SPK first');
        return;
      }

      console.log('[ProductionDaily] Viewing SPK:', formData.spkNo);

      // Fetch SPK data from server
      let spk: any = null;
      let spkList: any[] = [];
      try {
        const spkRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK) || [];
        spkList = filterActiveItems(Array.isArray(spkRaw) ? spkRaw : []);
        console.log('[ProductionDaily] SPK list:', spkList.length, 'records');
        
        spk = spkList.find((s: any) => s.spkNo === formData.spkNo);
        if (spk) {
          console.log('[ProductionDaily] Found SPK:', spk.spkNo);
        }
      } catch (error) {
        console.error('[ProductionDaily] Error loading SPK:', error);
      }

      if (!spk) {
        console.error('[ProductionDaily] SPK not found. Searched for:', formData.spkNo);
        console.error('[ProductionDaily] Available SPKs:', spkList.map((s: any) => s.spkNo).join(', '));
        alert('SPK not found: ' + formData.spkNo);
        return;
      }

      // Fetch SO data
      let so: any = null;
      try {
        const soRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SALES_ORDERS) || [];
        const soList = filterActiveItems(Array.isArray(soRaw) ? soRaw : []);
        so = soList.find((s: any) => s.soNo === spk.soNo);
      } catch (error) {
        console.warn('[ProductionDaily] Error loading SO:', error);
      }

      // Fetch Products
      let products: any[] = [];
      try {
        const productsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTS) || [];
        products = filterActiveItems(Array.isArray(productsRaw) ? productsRaw : []);
      } catch (error) {
        console.warn('[ProductionDaily] Error loading products:', error);
      }

      // Fetch Materials
      let materials: any[] = [];
      try {
        const materialsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.MATERIALS) || [];
        materials = filterActiveItems(Array.isArray(materialsRaw) ? materialsRaw : []);
      } catch (error) {
        console.warn('[ProductionDaily] Error loading materials:', error);
      }

      // Get logo
      const logo = await loadLogoAsBase64Cached();

      // Prepare WO data - KOSONG WIP data, ambil dari SPK
      const woData = {
        id: spk.spkNo || spk.id || '',
        soNo: spk.soNo || '',
        customer: spk.customer || so?.customer || '',
        product: spk.product || spk.productName || '',
        qty: spk.qty || spk.targetQty || 0,
        kode: spk.kode || spk.productCode || '',
        unit: spk.unit || '',
        status: spk.status || 'OPEN',
        createdAt: spk.created || spk.createdAt || new Date().toISOString(),
        materials: spk.materials || [],
        docs: {
          scheduleDate: spk.scheduleDate || spk.created || spk.createdAt,
          scheduleEndDate: spk.scheduleEndDate || ''
        },
        // KOSONG - tidak ada productionDaily data di form view
        productionDaily: null
      };

      // Generate WO HTML
      const woHtml = generateWOHtml({
        logo: logo,
        company: {
          companyName: 'PT TRIMA LAKSANA JAYA PRATAMA',
          address: 'Jl. Raya Cikarang Cibarusah Kp. Kukun RT 11/06 Desa Ciantra Kecamatan Cikarang Selatan Kabupaten Bekasi'
        },
        wo: woData,
        so: so || null,
        products: products,
        materials: materials,
        rawMaterials: []
      });

      // Open in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(woHtml);
        newWindow.document.close();
        
        setTimeout(() => {
          newWindow.print();
        }, 1000);
      }
    } catch (error) {
      console.error('Error viewing WO:', error);
      alert('Error generating WO PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleViewWOFromTable = async (spkNo: string) => {
    try {
      if (!spkNo) {
        alert('SPK not found');
        return;
      }

      console.log('[ProductionDaily] Viewing SPK with Production Daily data:', spkNo);

      // Get the production daily record from the table
      const prodDailyRecord = productionDailyList.find((p: any) => p.spkNo === spkNo);
      if (!prodDailyRecord) {
        alert('Production Daily record not found');
        return;
      }

      // Fetch SPK data from server
      let spk: any = null;
      try {
        const spkRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK) || [];
        const spkList = filterActiveItems(Array.isArray(spkRaw) ? spkRaw : []);
        spk = spkList.find((s: any) => s.spkNo === spkNo);
      } catch (error) {
        console.error('[ProductionDaily] Error loading SPK:', error);
      }

      if (!spk) {
        alert('SPK not found');
        return;
      }

      // Fetch SO data
      let so: any = null;
      try {
        const soRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SALES_ORDERS) || [];
        const soList = filterActiveItems(Array.isArray(soRaw) ? soRaw : []);
        so = soList.find((s: any) => s.soNo === spk.soNo);
      } catch (error) {
        console.warn('[ProductionDaily] Error loading SO:', error);
      }

      // Fetch Products
      let products: any[] = [];
      try {
        const productsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTS) || [];
        products = filterActiveItems(Array.isArray(productsRaw) ? productsRaw : []);
      } catch (error) {
        console.warn('[ProductionDaily] Error loading products:', error);
      }

      // Fetch Materials
      let materials: any[] = [];
      try {
        const materialsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.MATERIALS) || [];
        materials = filterActiveItems(Array.isArray(materialsRaw) ? materialsRaw : []);
      } catch (error) {
        console.warn('[ProductionDaily] Error loading materials:', error);
      }

      // Get logo
      const logo = await loadLogoAsBase64Cached();

      // Prepare WO data with production daily info
      // Map ProductionDaily fields to WO template
      const woData = {
        id: spk.spkNo || spk.id || '',
        soNo: spk.soNo || '',
        customer: spk.customer || so?.customer || '',
        product: spk.product || spk.productName || prodDailyRecord.productName || '',
        qty: spk.qty || spk.targetQty || prodDailyRecord.targetQty || 0,
        kode: spk.kode || spk.productCode || prodDailyRecord.productCode || '',
        unit: spk.unit || prodDailyRecord.unit || 'PCS',
        status: spk.status || 'OPEN',
        createdAt: spk.created || spk.createdAt || prodDailyRecord.productionDate || new Date().toISOString(),
        materials: spk.materials || [],
        docs: {
          scheduleDate: spk.scheduleDate || spk.created || spk.createdAt || prodDailyRecord.productionDate,
          scheduleEndDate: spk.scheduleEndDate || prodDailyRecord.productionDate || ''
        },
        // Add production daily data to WO - ini yang penting untuk fill template
        productionDaily: {
          ...prodDailyRecord,
          // Map WIP data untuk template
          wipCutting: prodDailyRecord.wipCutting || 0,
          wipSlitter: prodDailyRecord.wipSlitter || 0,
          wipDieCut: prodDailyRecord.wipDieCut || 0,
          wipCentralRotary: prodDailyRecord.wipCentralRotary || 0,
          wipLongWay: prodDailyRecord.wipLongWay || 0,
          wipSablon: prodDailyRecord.wipSablon || 0,
          wipStitching: prodDailyRecord.wipStitching || 0,
          resultFinishGood: prodDailyRecord.resultFinishGood || 0,
          approvedBy: prodDailyRecord.approvedBy || '',
          checkedBy: prodDailyRecord.checkedBy || '',
          noted: prodDailyRecord.noted || '',
          shift: prodDailyRecord.shift || '1',
          productionDate: prodDailyRecord.productionDate || new Date().toISOString().split('T')[0],
          qtyTerpakai: prodDailyRecord.qtyTerpakai || 0,
          materialSelected: prodDailyRecord.materialSelected || '',
        }
      };

      console.log('[ProductionDaily] WO data prepared:', {
        spkNo: woData.id,
        productionDaily: woData.productionDaily
      });

      // Generate WO HTML using existing template
      const woHtml = generateWOHtml({
        logo: logo,
        company: {
          companyName: 'PT TRIMA LAKSANA JAYA PRATAMA',
          address: 'Jl. Raya Cikarang Cibarusah Kp. Kukun RT 11/06 Desa Ciantra Kecamatan Cikarang Selatan Kabupaten Bekasi'
        },
        wo: woData,
        so: so || null,
        products: products,
        materials: materials,
        rawMaterials: []
      });

      // Open in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.open();
        newWindow.document.write(woHtml);
        newWindow.document.close();
        
        setTimeout(() => {
          newWindow.print();
        }, 1000);
      }
    } catch (error) {
      console.error('Error viewing SPK:', error);
      alert('Error generating SPK: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.spkNo) {
        alert('Please select SPK first');
        return;
      }

      const newItem: ProductionDailyItem = {
        id: `pd-${Date.now()}`,
        spkNo: formData.spkNo,
        productCode: formData.productCode,
        productName: formData.productName,
        targetQty: parseFloat(formData.targetQty) || 0,
        unit: formData.unit,
        wipCutting: parseFloat(formData.wipCutting) || 0,
        wipSlitter: parseFloat(formData.wipSlitter) || 0,
        wipDieCut: parseFloat(formData.wipDieCut) || 0,
        wipCentralRotary: parseFloat(formData.wipCentralRotary) || 0,
        wipLongWay: parseFloat(formData.wipLongWay) || 0,
        wipSablon: parseFloat(formData.wipSablon) || 0,
        wipStitching: parseFloat(formData.wipStitching) || 0,
        resultFinishGood: parseFloat(formData.resultFinishGood) || 0,
        approvedBy: formData.approvedBy,
        checkedBy: formData.checkedBy,
        noted: formData.noted,
        productionDate: formData.productionDate,
        shift: formData.shift,
        createdAt: new Date().toISOString(),
        createdBy: 'current-user',
        materialSelected: formData.materialSelected,
        qtyTerpakai: parseFloat(formData.qtyTerpakai) || 0,
      };

      // Get existing data from server
      const existingRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTION_DAILY) || [];
      const existing = filterActiveItems(Array.isArray(existingRaw) ? existingRaw : []);
      const updated = [...existing, newItem];
      
      // Save to server only
      await storageService.set(StorageKeys.PACKAGING.PRODUCTION_DAILY, updated);
      console.log('[ProductionDaily] Saved to server successfully');
      
      // Reload data immediately
      await loadProductionDailyData();
      
      // Close form and show success
      setShowForm(false);
      alert('Production Daily saved successfully');
    } catch (error) {
      console.error('Error saving production daily:', error);
      alert('Error saving production daily: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      // Get existing data from server
      const existingRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTION_DAILY) || [];
      const existing = filterActiveItems(Array.isArray(existingRaw) ? existingRaw : []);
      
      // Mark as deleted
      const updated = existing.map((item: any) => 
        item.id === id ? { ...item, deleted: true } : item
      );
      
      // Save to server only
      await storageService.set(StorageKeys.PACKAGING.PRODUCTION_DAILY, updated);
      console.log('[ProductionDaily] Deleted from server successfully');

      await loadProductionDailyData();
      alert('Record deleted successfully');
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleExportExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();
      const columns: ExcelColumn[] = [
        { header: 'SPK No', key: 'spkNo', width: 15 },
        { header: 'Product Code', key: 'productCode', width: 15 },
        { header: 'Product Name', key: 'productName', width: 25 },
        { header: 'Target Qty', key: 'targetQty', width: 12 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Cutting', key: 'wipCutting', width: 12 },
        { header: 'Slitter', key: 'wipSlitter', width: 12 },
        { header: 'Die Cut', key: 'wipDieCut', width: 12 },
        { header: 'Central Rotary', key: 'wipCentralRotary', width: 15 },
        { header: 'Long Way', key: 'wipLongWay', width: 12 },
        { header: 'Sablon', key: 'wipSablon', width: 12 },
        { header: 'Stitching', key: 'wipStitching', width: 12 },
        { header: 'Finish Good', key: 'resultFinishGood', width: 15 },
        { header: 'Approved By', key: 'approvedBy', width: 15 },
        { header: 'Checked By', key: 'checkedBy', width: 15 },
        { header: 'Notes', key: 'noted', width: 25 },
        { header: 'Created At', key: 'createdAt', width: 20 },
      ];

      const ws = createStyledWorksheet(productionDailyList, columns);
      setColumnWidths(ws, columns);
      XLSX.utils.book_append_sheet(wb, ws, 'Production Daily');
      XLSX.writeFile(wb, `Production_Daily_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel');
    }
  };

  const filteredSPK = spkList.filter(spk =>
    (spk.spkNo?.toLowerCase() || '').includes(spkSearchQuery.toLowerCase()) ||
    (spk.productCode?.toLowerCase() || '').includes(spkSearchQuery.toLowerCase()) ||
    (spk.productName?.toLowerCase() || '').includes(spkSearchQuery.toLowerCase())
  );

  const columns = [
    { 
      key: 'actions', 
      header: 'Actions',
      width: '80px',
      render: (item: ProductionDailyItem) => (
        <button
          onClick={() => toggleExpandRow(item.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '6px 12px',
            color: expandedRows.has(item.id) ? '#007bff' : '#999',
            transition: 'all 0.2s',
            fontWeight: 'bold'
          }}
          title={expandedRows.has(item.id) ? 'Hide actions' : 'Show actions'}
        >
          {expandedRows.has(item.id) ? '⋯' : '⋮'}
        </button>
      )
    },
    { key: 'spkNo', header: 'SPK No', width: '120px' },
    { key: 'productCode', header: 'Product Code', width: '120px' },
    { key: 'productName', header: 'Product Name', width: '180px' },
    { key: 'targetQty', header: 'Target Qty', width: '100px' },
    { key: 'resultFinishGood', header: 'Finish Good', width: '100px' },
    { key: 'approvedBy', header: 'Approved By', width: '120px' },
    { key: 'checkedBy', header: 'Checked By', width: '120px' },
  ];

  return (
    <div className="production-daily-page">
      {/* Header */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>Production Daily</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <Button onClick={handleNewForm}>+ New Production Daily</Button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SPK No, Product Code, Product Name..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                color: '#333',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '400px' }}>
            <DateRangeFilter
              onDateChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
              defaultFrom={dateFrom}
              defaultTo={dateTo}
            />
          </div>
        </div>
      </Card>

      {/* Form Dialog - Enterprise Style */}
      {showForm && (
        <div className="dialog-overlay" onClick={() => setShowForm(false)}>
          <div className="enterprise-form-dialog" style={{ maxWidth: '700px', width: '95vw' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="form-header">
              <h2>Production Daily Entry</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>

            {/* Body */}
            <div className="form-body">

              {/* SPK Field - autocomplete dropdown */}
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>SPK No <span style={{ color: '#999', fontWeight: 'normal', fontSize: '11px' }}>(pilih dari list atau ketik manual)</span></label>
                    <input
                      type="text"
                      value={formData.spkNo || spkSearchQuery}
                      onChange={(e) => {
                        setSpkSearchQuery(e.target.value);
                        handleInputChange('spkNo', e.target.value);
                      }}
                      onFocus={() => setSpkSearchQuery(formData.spkNo || '')}
                      placeholder="Cari atau ketik SPK No..."
                      className="form-input"
                      autoComplete="off"
                    />
                    {/* Dropdown list */}
                    {spkSearchQuery && filteredSPK.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                        backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: '6px', maxHeight: '220px', overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: '2px'
                      }}>
                        {filteredSPK.slice(0, 10).map(spk => {
                          const targetQty = spk.qty || spk.targetQty || 0;
                          const remaining = calculateRemainingQty(spk.spkNo, targetQty);
                          return (
                            <div
                              key={spk.id}
                              onClick={() => { handleSelectSPK(spk); setSpkSearchQuery(''); }}
                              style={{
                                padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                                borderLeft: remaining === 0 ? '3px solid #28a745' : '3px solid #007bff',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                            >
                              <div style={{ fontWeight: '600', fontSize: '13px' }}>{spk.spkNo} <span style={{ color: '#999', fontSize: '11px' }}>SO: {spk.soNo}</span></div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{spk.kode || spk.productCode} — {spk.product || spk.productName}</div>
                              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                Target: {targetQty} {spk.unit} &nbsp;|&nbsp;
                                <span style={{ color: remaining === 0 ? '#28a745' : '#ff9800', fontWeight: '600' }}>Sisa: {remaining}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Product Code</label>
                    <input type="text" value={formData.productCode} onChange={(e) => handleInputChange('productCode', e.target.value)} placeholder="Kode produk" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Product Name</label>
                    <input type="text" value={formData.productName} onChange={(e) => handleInputChange('productName', e.target.value)} placeholder="Nama produk" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Target Qty</label>
                    <input type="number" value={formData.targetQty} onChange={(e) => handleInputChange('targetQty', e.target.value)} placeholder="0" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <input type="text" value={formData.unit} onChange={(e) => handleInputChange('unit', e.target.value)} placeholder="PCS / Roll / dll" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Production Date</label>
                    <input type="date" value={formData.productionDate} onChange={(e) => handleInputChange('productionDate', e.target.value)} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Shift</label>
                    <select value={formData.shift} onChange={(e) => handleInputChange('shift', e.target.value)} className="form-input">
                      <option value="1">Shift 1</option>
                      <option value="2">Shift 2</option>
                      <option value="3">Shift 3</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* WIP */}
              <div className="form-section">
                <div className="section-title">Work In Progress (WIP)</div>
                <div className="form-grid-4">
                  <div className="form-group"><label>Cutting</label><input type="number" value={formData.wipCutting} onChange={(e) => handleInputChange('wipCutting', e.target.value)} placeholder="0" className="form-input" /></div>
                  <div className="form-group"><label>Slitter</label><input type="number" value={formData.wipSlitter} onChange={(e) => handleInputChange('wipSlitter', e.target.value)} placeholder="0" className="form-input" /></div>
                  <div className="form-group"><label>Die Cut</label><input type="number" value={formData.wipDieCut} onChange={(e) => handleInputChange('wipDieCut', e.target.value)} placeholder="0" className="form-input" /></div>
                  <div className="form-group"><label>Central Rotary</label><input type="number" value={formData.wipCentralRotary} onChange={(e) => handleInputChange('wipCentralRotary', e.target.value)} placeholder="0" className="form-input" /></div>
                  <div className="form-group"><label>Long Way</label><input type="number" value={formData.wipLongWay} onChange={(e) => handleInputChange('wipLongWay', e.target.value)} placeholder="0" className="form-input" /></div>
                  <div className="form-group"><label>Sablon</label><input type="number" value={formData.wipSablon} onChange={(e) => handleInputChange('wipSablon', e.target.value)} placeholder="0" className="form-input" /></div>
                  <div className="form-group"><label>Stitching</label><input type="number" value={formData.wipStitching} onChange={(e) => handleInputChange('wipStitching', e.target.value)} placeholder="0" className="form-input" /></div>
                  <div className="form-group"><label>Result FG</label><input type="number" value={formData.resultFinishGood} onChange={(e) => handleInputChange('resultFinishGood', e.target.value)} placeholder="0" className="form-input" /></div>
                </div>
              </div>

              {/* Notes */}
              <div className="form-section">
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea value={formData.noted} onChange={(e) => handleInputChange('noted', e.target.value)} placeholder="Catatan tambahan..." rows={2} className="form-textarea" />
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="form-footer">
              <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                className="btn-secondary"
                onClick={handleViewWO}
                disabled={!formData.spkNo}
                style={{ marginRight: '8px', opacity: formData.spkNo ? 1 : 0.5, cursor: formData.spkNo ? 'pointer' : 'not-allowed' }}
              >
                📄 View WO
              </button>
              <button className="btn-save" onClick={handleSave}>
                Save Production Daily
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Daily List */}
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
            Production Daily Records ({productionDailyList.length})
          </h3>
        </div>
        {productionDailyList.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                  {columns.map(col => (
                    <th key={col.key} style={{ 
                      padding: '12px 8px', 
                      textAlign: 'left', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      width: col.width,
                      borderBottom: '2px solid var(--border-color)'
                    }}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productionDailyList.map((item, idx) => (
                  <>
                    <tr key={item.id} style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: idx % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      transition: 'background-color 0.2s'
                    }}>
                      {columns.map(col => (
                        <td key={`${item.id}-${col.key}`} style={{ 
                          padding: '10px 8px', 
                          fontSize: '13px',
                          width: col.width,
                          color: 'var(--text-primary)',
                          borderBottom: '1px solid var(--border-color)'
                        }}>
                          {col.render ? col.render(item) : (item as any)[col.key]}
                        </td>
                      ))}
                    </tr>
                    {expandedRows.has(item.id) && (
                      <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                        <td colSpan={columns.length} style={{ padding: '16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '16px' }}>
                            {/* WIP Data */}
                            <div>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: '#007bff', textTransform: 'uppercase' }}>
                                Work In Progress (WIP)
                              </h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Cutting:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.wipCutting}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Slitter:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.wipSlitter}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Die Cut:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.wipDieCut}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Central Rotary:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.wipCentralRotary}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Long Way:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.wipLongWay}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Sablon:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.wipSablon}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Stitching:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.wipStitching}</strong></div>
                                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>Finish Good:</span> <strong style={{ color: '#28a745' }}>{item.resultFinishGood}</strong></div>
                              </div>
                            </div>

                            {/* Material & Qty */}
                            <div>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: '#007bff', textTransform: 'uppercase' }}>
                                Material & Qty
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Material:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.materialSelected || '-'}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Qty Terpakai:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.qtyTerpakai}</strong></div>
                              </div>
                            </div>

                            {/* Approval & Notes */}
                            <div>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: '#007bff', textTransform: 'uppercase' }}>
                                Approval & Notes
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Approved By:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.approvedBy}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Checked By:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.checkedBy}</strong></div>
                                {item.noted && <div><span style={{ color: 'var(--text-secondary)' }}>Notes:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.noted}</strong></div>}
                              </div>
                            </div>

                            {/* Metadata */}
                            <div>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: '600', color: '#007bff', textTransform: 'uppercase' }}>
                                Metadata
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Date:</span> <strong style={{ color: 'var(--text-primary)' }}>{item.productionDate}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Shift:</span> <strong style={{ color: 'var(--text-primary)' }}>Shift {item.shift}</strong></div>
                                <div><span style={{ color: 'var(--text-secondary)' }}>Created:</span> <strong style={{ color: 'var(--text-primary)' }}>{new Date(item.createdAt).toLocaleString('id-ID')}</strong></div>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                            <Button 
                              variant="secondary" 
                              onClick={() => handleEditItem(item)}
                              style={{ fontSize: '12px', padding: '8px 16px' }}
                            >
                              ✏️ Edit
                            </Button>
                            <Button 
                              variant="secondary" 
                              onClick={() => handleViewWOFromTable(item.spkNo)}
                              style={{ fontSize: '12px', padding: '8px 16px' }}
                            >
                              📄 View WO
                            </Button>
                            <Button 
                              variant="danger" 
                              onClick={() => handleDelete(item.id)}
                              style={{ fontSize: '12px', padding: '8px 16px' }}
                            >
                              🗑️ Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            No production daily records found
          </div>
        )}
      </Card>

      {/* Detail Modal - REMOVED, using expandable rows instead */}

    </div>
  );
};

export default ProductionDaily;
