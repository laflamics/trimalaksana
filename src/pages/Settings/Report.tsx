import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService, extractStorageValue } from '../../services/storage';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../utils/actions';
import * as XLSX from 'xlsx';
import '../../styles/common.css';
import '../../styles/compact.css';

const Report = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'comprehensive' | 'so' | 'po' | 'production' | 'delivery' | 'invoice' | 'inventory' | 'hr' | 'finance' | 'ar' | 'ap' | 'tax' | 'payment' | 'ops'>('summary');
  const [soData, setSoData] = useState<any[]>([]);
  const [poData, setPoData] = useState<any[]>([]);
  const [productionData, setProductionData] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [hrData, setHrData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states for each tab
  const [soStatusFilter, setSoStatusFilter] = useState<string>('all');
  const [soDateFrom, setSoDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [soDateTo, setSoDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  const [poStatusFilter, setPoStatusFilter] = useState<string>('all');
  const [poDateFrom, setPoDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [poDateTo, setPoDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  const [prodStatusFilter, setProdStatusFilter] = useState<string>('all');
  const [prodDateFrom, setProdDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [prodDateTo, setProdDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');
  const [deliveryDateFrom, setDeliveryDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [deliveryDateTo, setDeliveryDateTo] = useState(new Date().toISOString().split('T')[0]);
  
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [invoiceDateFrom, setInvoiceDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [invoiceDateTo, setInvoiceDateTo] = useState(new Date().toISOString().split('T')[0]);
  // Finance modules
  const [arData, setArData] = useState<any[]>([]);
  const [apData, setApData] = useState<any[]>([]);
  const [taxData, setTaxData] = useState<any[]>([]);
  const [opsExpensesData, setOpsExpensesData] = useState<any[]>([]);
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: null,
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

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
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
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: null,
      title: '',
      message: '',
    });
  };

  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [paymentData, setPaymentData] = useState<any[]>([]);
  
  // Format date function - format: dd/mm/yyyy hh:mm:ss
  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return '-';
    }
  };
  
  // Filtered SO data with status, date range, and search
  const filteredSoData = useMemo(() => {
    let filtered = soData;
    
    // Filter by status
    if (soStatusFilter !== 'all') {
      filtered = filtered.filter(item => (item.status || '').toLowerCase() === soStatusFilter.toLowerCase());
    }
    
    // Filter by date range
    if (soDateFrom || soDateTo) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created || item.orderDate);
        const from = soDateFrom ? new Date(soDateFrom) : null;
        const to = soDateTo ? new Date(soDateTo) : null;
        
        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
        return true;
      });
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const itemsMatch = item.items?.some((itm: any) => 
          (itm.productName || itm.product || '').toLowerCase().includes(query)
        );
        return (
          (item.soNo || '').toLowerCase().includes(query) ||
          (item.customer || '').toLowerCase().includes(query) ||
          (item.paymentTerms || '').toLowerCase().includes(query) ||
          (item.status || '').toLowerCase().includes(query) ||
          itemsMatch
        );
      });
    }
    
    return filtered;
  }, [soData, soStatusFilter, soDateFrom, soDateTo, searchQuery]);
  
  // SO Metrics calculation
  const soMetrics = useMemo(() => {
    const openSOs = soData.filter(item => (item.status || '').toLowerCase() === 'open');
    const closeSOs = soData.filter(item => (item.status || '').toLowerCase() === 'close');
    
    const openTotal = openSOs.reduce((sum, item) => {
      if (item.items && Array.isArray(item.items)) {
        return sum + item.items.reduce((itemSum: number, itm: any) => itemSum + (itm.total || 0), 0);
      }
      return sum + (item.total || 0);
    }, 0);
    
    const closeTotal = closeSOs.reduce((sum, item) => {
      if (item.items && Array.isArray(item.items)) {
        return sum + item.items.reduce((itemSum: number, itm: any) => itemSum + (itm.total || 0), 0);
      }
      return sum + (item.total || 0);
    }, 0);
    
    // Last month vs This month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonthSOs = soData.filter(item => {
      const itemDate = new Date(item.created || item.orderDate);
      return itemDate >= thisMonthStart;
    });
    
    const lastMonthSOs = soData.filter(item => {
      const itemDate = new Date(item.created || item.orderDate);
      return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
    });
    
    const thisMonthTotal = thisMonthSOs.reduce((sum, item) => {
      if (item.items && Array.isArray(item.items)) {
        return sum + item.items.reduce((itemSum: number, itm: any) => itemSum + (itm.total || 0), 0);
      }
      return sum + (item.total || 0);
    }, 0);
    
    const lastMonthTotal = lastMonthSOs.reduce((sum, item) => {
      if (item.items && Array.isArray(item.items)) {
        return sum + item.items.reduce((itemSum: number, itm: any) => itemSum + (itm.total || 0), 0);
      }
      return sum + (item.total || 0);
    }, 0);
    
    return {
      openCount: openSOs.length,
      openTotal,
      closeCount: closeSOs.length,
      closeTotal,
      thisMonthCount: thisMonthSOs.length,
      thisMonthTotal,
      lastMonthCount: lastMonthSOs.length,
      lastMonthTotal,
    };
  }, [soData]);
  
  const filteredPoData = useMemo(() => {
    let filtered = poData;
    
    // Filter by status
    if (poStatusFilter !== 'all') {
      filtered = filtered.filter(item => (item.status || '').toLowerCase() === poStatusFilter.toLowerCase());
    }
    
    // Filter by date range
    if (poDateFrom || poDateTo) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created || item.poDate);
        const from = poDateFrom ? new Date(poDateFrom) : null;
        const to = poDateTo ? new Date(poDateTo) : null;
        
        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
        return true;
      });
    }
    
    // Filter by search query
    if (!searchQuery) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(item => 
      (item.poNo || '').toLowerCase().includes(query) ||
      (item.supplier || '').toLowerCase().includes(query) ||
      (item.soNo || '').toLowerCase().includes(query) ||
      (item.materialItem || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      String(item.qty || '').includes(query) ||
      String(item.price || '').includes(query) ||
      String(item.total || '').includes(query)
    );
  }, [poData, poStatusFilter, poDateFrom, poDateTo, searchQuery]);
  
  // PO Metrics calculation
  const poMetrics = useMemo(() => {
    const openPOs = poData.filter(item => (item.status || '').toLowerCase() === 'open');
    const closePOs = poData.filter(item => (item.status || '').toLowerCase() === 'close');
    
    const openTotal = openPOs.reduce((sum, item) => sum + (item.total || 0), 0);
    const closeTotal = closePOs.reduce((sum, item) => sum + (item.total || 0), 0);
    
    // Last month vs This month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonthPOs = poData.filter(item => {
      const itemDate = new Date(item.created || item.poDate);
      return itemDate >= thisMonthStart;
    });
    
    const lastMonthPOs = poData.filter(item => {
      const itemDate = new Date(item.created || item.poDate);
      return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
    });
    
    const thisMonthTotal = thisMonthPOs.reduce((sum, item) => sum + (item.total || 0), 0);
    const lastMonthTotal = lastMonthPOs.reduce((sum, item) => sum + (item.total || 0), 0);
    
    return {
      openCount: openPOs.length,
      openTotal,
      closeCount: closePOs.length,
      closeTotal,
      thisMonthCount: thisMonthPOs.length,
      thisMonthTotal,
      lastMonthCount: lastMonthPOs.length,
      lastMonthTotal,
    };
  }, [poData]);
  
  const filteredProductionData = useMemo(() => {
    let filtered = productionData;
    
    // Filter by status
    if (prodStatusFilter !== 'all') {
      filtered = filtered.filter(item => (item.status || '').toLowerCase() === prodStatusFilter.toLowerCase());
    }
    
    // Filter by date range
    if (prodDateFrom || prodDateTo) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.date || item.producedDate || item.created);
        const from = prodDateFrom ? new Date(prodDateFrom) : null;
        const to = prodDateTo ? new Date(prodDateTo) : null;
        
        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
        return true;
      });
    }
    
    // Filter by search query
    if (!searchQuery) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(item => 
      (item.grnNo || '').toLowerCase().includes(query) ||
      (item.soNo || '').toLowerCase().includes(query) ||
      (item.customer || '').toLowerCase().includes(query) ||
      (item.productName || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      String(item.target || '').includes(query) ||
      String(item.progress || '').includes(query) ||
      String(item.remaining || '').includes(query)
    );
  }, [productionData, prodStatusFilter, prodDateFrom, prodDateTo, searchQuery]);
  
  // Production Metrics calculation
  const prodMetrics = useMemo(() => {
    const openProds = productionData.filter(item => (item.status || '').toLowerCase() === 'open');
    const closeProds = productionData.filter(item => (item.status || '').toLowerCase() === 'close' || (item.status || '').toLowerCase() === 'completed');
    
    // Last month vs This month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonthProds = productionData.filter(item => {
      const itemDate = new Date(item.date || item.producedDate || item.created);
      return itemDate >= thisMonthStart;
    });
    
    const lastMonthProds = productionData.filter(item => {
      const itemDate = new Date(item.date || item.producedDate || item.created);
      return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
    });
    
    return {
      openCount: openProds.length,
      closeCount: closeProds.length,
      thisMonthCount: thisMonthProds.length,
      lastMonthCount: lastMonthProds.length,
    };
  }, [productionData]);
  
  const filteredDeliveryData = useMemo(() => {
    if (!Array.isArray(deliveryData)) return [];
    let filtered = deliveryData;
    
    // Filter by status
    if (deliveryStatusFilter !== 'all') {
      filtered = filtered.filter(item => (item.status || '').toLowerCase() === deliveryStatusFilter.toLowerCase());
    }
    
    // Filter by date range
    if (deliveryDateFrom || deliveryDateTo) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.deliveryDate || item.created);
        const from = deliveryDateFrom ? new Date(deliveryDateFrom) : null;
        const to = deliveryDateTo ? new Date(deliveryDateTo) : null;
        
        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
        return true;
      });
    }
    
    // Filter by search query
    if (!searchQuery) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(item => {
      const itemsMatch = item.items?.some((itm: any) => 
        (itm.product || '').toLowerCase().includes(query)
      );
      return (
        (item.sjNo || '').toLowerCase().includes(query) ||
        (item.soNo || '').toLowerCase().includes(query) ||
        (item.customer || '').toLowerCase().includes(query) ||
        (item.product || '').toLowerCase().includes(query) ||
        (item.status || '').toLowerCase().includes(query) ||
        String(item.qty || '').includes(query) ||
        itemsMatch
      );
    });
  }, [deliveryData, deliveryStatusFilter, deliveryDateFrom, deliveryDateTo, searchQuery]);
  
  // Delivery Metrics calculation
  const deliveryMetrics = useMemo(() => {
    const openDeliveries = deliveryData.filter(item => (item.status || '').toLowerCase() === 'open');
    const closeDeliveries = deliveryData.filter(item => (item.status || '').toLowerCase() === 'close' || (item.status || '').toLowerCase() === 'delivered');
    
    // Last month vs This month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonthDeliveries = deliveryData.filter(item => {
      const itemDate = new Date(item.deliveryDate || item.created);
      return itemDate >= thisMonthStart;
    });
    
    const lastMonthDeliveries = deliveryData.filter(item => {
      const itemDate = new Date(item.deliveryDate || item.created);
      return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
    });
    
    return {
      openCount: openDeliveries.length,
      closeCount: closeDeliveries.length,
      thisMonthCount: thisMonthDeliveries.length,
      lastMonthCount: lastMonthDeliveries.length,
    };
  }, [deliveryData]);
  
  const filteredInvoiceData = useMemo(() => {
    if (!Array.isArray(invoiceData)) return [];
    let filtered = invoiceData;
    
    // Filter by status
    if (invoiceStatusFilter !== 'all') {
      filtered = filtered.filter(item => (item.status || '').toLowerCase() === invoiceStatusFilter.toLowerCase());
    }
    
    // Filter by date range
    if (invoiceDateFrom || invoiceDateTo) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.invoiceDate || item.created);
        const from = invoiceDateFrom ? new Date(invoiceDateFrom) : null;
        const to = invoiceDateTo ? new Date(invoiceDateTo) : null;
        
        if (from && itemDate < from) return false;
        if (to && itemDate > to) return false;
        return true;
      });
    }
    
    // Filter by search query
    if (!searchQuery) return filtered;
    const query = searchQuery.toLowerCase();
    return filtered.filter(item => 
      (item.invoiceNo || '').toLowerCase().includes(query) ||
      (item.customer || '').toLowerCase().includes(query) ||
      (item.soNo || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      String(item.totalAmount || '').includes(query)
    );
  }, [invoiceData, invoiceStatusFilter, invoiceDateFrom, invoiceDateTo, searchQuery]);
  
  // Invoice Metrics calculation
  const invoiceMetrics = useMemo(() => {
    const openInvoices = invoiceData.filter(item => (item.status || '').toLowerCase() === 'open');
    const closeInvoices = invoiceData.filter(item => (item.status || '').toLowerCase() === 'close' || (item.status || '').toLowerCase() === 'paid');
    
    const openTotal = openInvoices.reduce((sum, item) => sum + (item.total || item.totalAmount || item.bom?.total || 0), 0);
    const closeTotal = closeInvoices.reduce((sum, item) => sum + (item.total || item.totalAmount || item.bom?.total || 0), 0);
    
    // Last month vs This month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonthInvoices = invoiceData.filter(item => {
      const itemDate = new Date(item.invoiceDate || item.created);
      return itemDate >= thisMonthStart;
    });
    
    const lastMonthInvoices = invoiceData.filter(item => {
      const itemDate = new Date(item.invoiceDate || item.created);
      return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
    });
    
    const thisMonthTotal = thisMonthInvoices.reduce((sum, item) => sum + (item.total || item.totalAmount || item.bom?.total || 0), 0);
    const lastMonthTotal = lastMonthInvoices.reduce((sum, item) => sum + (item.total || item.totalAmount || item.bom?.total || 0), 0);
    
    return {
      openCount: openInvoices.length,
      openTotal,
      closeCount: closeInvoices.length,
      closeTotal,
      thisMonthCount: thisMonthInvoices.length,
      thisMonthTotal,
      lastMonthCount: lastMonthInvoices.length,
      lastMonthTotal,
    };
  }, [invoiceData]);
  
  const filteredInventoryData = useMemo(() => {
    if (!Array.isArray(inventoryData)) return [];
    if (!searchQuery) return inventoryData;
    const query = searchQuery.toLowerCase();
    return inventoryData.filter(item => 
      (item.codeItem || '').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query) ||
      (item.kategori || '').toLowerCase().includes(query) ||
      (item.satuan || '').toLowerCase().includes(query) ||
      String(item.price || '').includes(query) ||
      String(item.nextStock || '').includes(query)
    );
  }, [inventoryData, searchQuery]);
  
  const filteredHrData = useMemo(() => {
    if (!Array.isArray(hrData)) return [];
    if (!searchQuery) return hrData;
    const query = searchQuery.toLowerCase();
    return hrData.filter(item => 
      (item.NIP || '').toLowerCase().includes(query) ||
      (item['NAMA LENGKAP'] || '').toLowerCase().includes(query) ||
      (item.DEPARTEMEN || '').toLowerCase().includes(query) ||
      (item.JABATAN || '').toLowerCase().includes(query) ||
      String(item['GAJI POKOK'] || '').includes(query)
    );
  }, [hrData, searchQuery]);

  // Filtered AR Data
  const filteredArData = useMemo(() => {
    if (!Array.isArray(arData)) return [];
    if (!searchQuery) return arData;
    const query = searchQuery.toLowerCase();
    return arData.filter(item =>
      (item.invoiceNo || '').toLowerCase().includes(query) ||
      (item.customer || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      String(item.amount || '').includes(query)
    );
  }, [arData, searchQuery]);

  // Filtered AP Data
  const filteredApData = useMemo(() => {
    if (!Array.isArray(apData)) return [];
    if (!searchQuery) return apData;
    const query = searchQuery.toLowerCase();
    return apData.filter(item =>
      (item.poNo || '').toLowerCase().includes(query) ||
      (item.supplier || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      String(item.amount || '').includes(query)
    );
  }, [apData, searchQuery]);

  // Filtered Tax Data
  const filteredTaxData = useMemo(() => {
    if (!Array.isArray(taxData)) return [];
    if (!searchQuery) return taxData;
    const query = searchQuery.toLowerCase();
    return taxData.filter(item =>
      (item.reference || '').toLowerCase().includes(query) ||
      (item.taxType || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      String(item.taxAmount || '').includes(query)
    );
  }, [taxData, searchQuery]);

  // Filtered Ops Expenses Data
  const filteredOpsData = useMemo(() => {
    if (!Array.isArray(opsExpensesData)) return [];
    if (!searchQuery) return opsExpensesData;
    const query = searchQuery.toLowerCase();
    return opsExpensesData.filter(item =>
      (item.expenseNo || '').toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query) ||
      (item.description || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      String(item.amount || '').includes(query)
    );
  }, [opsExpensesData, searchQuery]);

  // Helper function untuk deduplicate inventory berdasarkan codeItem
  const deduplicateInventory = (inventoryData: any[]): any[] => {
    const inventoryMap = new Map<string, any>();
    
    inventoryData.forEach((item) => {
      const codeItem = (item.codeItem || '').toString().trim().toUpperCase();
      if (!codeItem) return; // Skip jika tidak ada codeItem
      
      const existing = inventoryMap.get(codeItem);
      
      // Jika belum ada atau item ini lebih baru, simpan
      if (!existing || (item.lastUpdate && existing.lastUpdate && 
          new Date(item.lastUpdate) > new Date(existing.lastUpdate))) {
        inventoryMap.set(codeItem, item);
      }
    });
    
    return Array.from(inventoryMap.values());
  };

  // Calculate total inventory value by category (Material & Product) - menggunakan unique inventory
  const inventoryValueSummary = useMemo(() => {
    // inventoryData sudah ter-deduplicate di loadData, jadi langsung pakai
    const uniqueInventory = inventoryData;
    
    const isProduct = (item: any) => {
      const kategori = (item.kategori || '').toString().trim().toLowerCase();
      if (!kategori) return false;
      // Sama persis dengan logika di script calculate-inventory-production-value.js
      return kategori === 'product' || 
             kategori === 'produk' ||
             kategori.includes('product') || 
             kategori.includes('finished') || 
             kategori.includes('fg') ||
             kategori.includes('finished goods');
    };

    const materialItems = uniqueInventory.filter((item: any) => !isProduct(item));
    const productItems = uniqueInventory.filter((item: any) => isProduct(item));

    const materialValue = materialItems.reduce((sum: number, item: any) => {
      const nextStock = item.nextStock || 0;
      const price = item.price || 0;
      return sum + (nextStock * price);
    }, 0);

    const productValue = productItems.reduce((sum: number, item: any) => {
      const nextStock = item.nextStock || 0;
      const price = item.price || 0;
      return sum + (nextStock * price);
    }, 0);

    // Debug logging
    console.log('[Report] Inventory Summary:', {
      totalItems: uniqueInventory.length,
      materialItems: materialItems.length,
      productItems: productItems.length,
      materialValue,
      productValue,
      totalValue: materialValue + productValue,
    });

    return {
      materialValue,
      productValue,
      totalValue: materialValue + productValue,
    };
  }, [inventoryData]);

  // Reset search saat ganti tab
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);
  

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'comprehensive', label: 'Comprehensive' },
    { id: 'so', label: 'SO' },
    { id: 'po', label: 'PO' },
    { id: 'production', label: 'Production' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'finance', label: 'Finance' },
    { id: 'ar', label: 'AR' },
    { id: 'ap', label: 'AP' },
    { id: 'tax', label: 'Tax' },
    { id: 'payment', label: 'Payment' },
    { id: 'ops', label: 'Ops Expense' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'hr', label: 'HR' },
  ];

  const soColumns = [
    { 
      key: 'soNo', 
      header: 'SO No (PO Customer)',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.soNo}</strong>
      ),
    },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: any) => (
        <span style={{ color: '#ffffff' }}>{item.customer}</span>
      ),
    },
    {
      key: 'paymentTerms',
      header: 'Payment Terms',
      render: (item: any) => (
        <span>
          {item.paymentTerms || '-'}
          {item.paymentTerms === 'TOP' && item.topDays && ` (${item.topDays} days)`}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || '-'}
        </span>
      ),
    },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: any) => formatDateTime(item.created)
    },
    {
      key: 'items',
      header: 'Items',
      render: (item: any) => {
        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          const itemKey = `${item.soNo || item.id}`;
          const isExpanded = expandedItems.has(itemKey);
          const hasMultiple = item.items.length > 1;
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {hasMultiple && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const newExpanded = new Set(expandedItems);
                    if (isExpanded) {
                      newExpanded.delete(itemKey);
                    } else {
                      newExpanded.add(itemKey);
                    }
                    setExpandedItems(newExpanded);
                  }}
                  style={{ fontSize: '10px', padding: '2px 6px', alignSelf: 'flex-start', marginBottom: '4px' }}
                >
                  {isExpanded ? '▼ Hide' : '▶ Show'} ({item.items.length})
                </Button>
              )}
              {(!hasMultiple || isExpanded) && item.items.map((itm: any, idx: number) => (
                <div key={idx} style={{ fontSize: '12px' }}>
                  {itm.productName || itm.product} - Qty: {itm.qty || 0} - Rp {(itm.total || 0).toLocaleString('id-ID')}
                </div>
              ))}
              {hasMultiple && !isExpanded && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {item.items[0].productName || item.items[0].product} - Qty: {item.items[0].qty || 0} - Rp {(item.items[0].total || 0).toLocaleString('id-ID')}...
                </div>
              )}
            </div>
          );
        }
        return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
      },
    },
  ];

  const poColumns = [
    { 
      key: 'poNo', 
      header: 'PO No',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.poNo}</strong>
      ),
    },
    { 
      key: 'supplier', 
      header: 'Supplier',
      render: (item: any) => (
        <span style={{ color: '#ffffff' }}>{item.supplier}</span>
      ),
    },
    { 
      key: 'soNo', 
      header: 'SO No',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.soNo || '-'}</strong>
      ),
    },
    {
      key: 'purchaseReason',
      header: 'Reason',
      render: (item: any) => (
        <span style={{ color: item.purchaseReason ? '#ffffff' : 'var(--text-secondary)' }}>
          {item.purchaseReason || '-'}
        </span>
      ),
    },
    { key: 'materialItem', header: 'Material/Item' },
    { key: 'qty', header: 'Qty' },
    {
      key: 'price',
      header: 'Price',
      render: (item: any) => `Rp ${Math.ceil(item.price || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`,
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: any) => `Rp ${Math.ceil(item.total || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`,
    },
    { key: 'paymentTerms', header: 'Payment Terms' },
    {
      key: 'topDays',
      header: 'TOP Days',
      render: (item: any) => {
        if (item.paymentTerms === 'COD' || item.paymentTerms === 'CBD') {
          return '-';
        }
        return item.topDays || 0;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || '-'}
        </span>
      ),
    },
    { key: 'receiptDate', header: 'Receipt Date' },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: any) => formatDateTime(item.created)
    },
  ];

  const productionColumns = [
    { 
      key: 'soNo', 
      header: 'SO No',
      render: (item: any) => (
        <strong style={{ color: '#2e7d32', fontSize: '14px' }}>{item.soNo}</strong>
      ),
    },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: any) => (
        <span style={{ color: '#ffffff' }}>{item.customer}</span>
      ),
    },
    {
      key: 'productionDetails',
      header: 'Production Details',
      render: (item: any) => {
        const itemKey = `prod_${item.id || item.productionNo || item.grnNo}`;
        const isExpanded = expandedItems.has(itemKey);
        const details = [
          { label: 'Product', value: item.productName || item.product || '-' },
          { label: 'Target', value: item.target || item.targetQty || 0 },
          { label: 'Progress', value: item.progress || item.producedQty || 0 },
          { label: 'Remaining', value: item.remaining || ((item.target || item.targetQty || 0) - (item.progress || item.producedQty || 0)) },
          ...(item.spkNo ? [{ label: 'SPK', value: item.spkNo }] : [])
        ];
        const hasMultiple = details.length > 3;
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
            {hasMultiple && (
              <Button
                variant="secondary"
                onClick={() => {
                  const newExpanded = new Set(expandedItems);
                  if (isExpanded) {
                    newExpanded.delete(itemKey);
                  } else {
                    newExpanded.add(itemKey);
                  }
                  setExpandedItems(newExpanded);
                }}
                style={{ fontSize: '10px', padding: '2px 6px', alignSelf: 'flex-start', marginBottom: '4px' }}
              >
                {isExpanded ? '▼ Hide' : '▶ Show'} Details
              </Button>
            )}
            {(!hasMultiple || isExpanded) && details.map((detail, idx) => (
              <div key={idx}><strong>{detail.label}:</strong> {detail.value}</div>
            ))}
            {hasMultiple && !isExpanded && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                <strong>Product:</strong> {details[0].value}...
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || '-'}
        </span>
      ),
    },
    { 
      key: 'date', 
      header: 'Date',
      render: (item: any) => {
        const dateStr = item.date || item.producedDate || item.created;
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
      }
    },
  ];

  const deliveryColumns = [
    { key: 'sjNo', header: 'SJ No (Surat Jalan No)' },
    { key: 'soNo', header: 'SO No' },
    { key: 'customer', header: 'Customer' },
    {
      key: 'product',
      header: 'Product(s)',
      render: (item: any) => {
        const items = item.items && Array.isArray(item.items) && item.items.length > 0 ? item.items : [];
        const hasItems = items.length > 0;
        const displayItems = hasItems ? items : [{ product: item.product || '-', qty: item.qty || 0, unit: item.unit || 'PCS' }];
        const itemKey = `${item.sjNo || item.id}`;
        const isExpanded = expandedItems.has(itemKey);
        const hasMultiple = displayItems.length > 1;
        
        return (
          <div>
            {hasMultiple && (
              <Button
                variant="secondary"
                onClick={() => {
                  const newExpanded = new Set(expandedItems);
                  if (isExpanded) {
                    newExpanded.delete(itemKey);
                  } else {
                    newExpanded.add(itemKey);
                  }
                  setExpandedItems(newExpanded);
                }}
                style={{ fontSize: '10px', padding: '2px 6px', marginBottom: '4px' }}
              >
                {isExpanded ? '▼ Hide' : '▶ Show'} ({displayItems.length})
              </Button>
            )}
            {(!hasMultiple || isExpanded) && displayItems.map((itm: any, idx: number) => (
              <div key={idx} style={{ marginBottom: idx < displayItems.length - 1 ? '4px' : '0', fontSize: '12px' }}>
                {itm.product} ({itm.qty} {itm.unit || 'PCS'})
              </div>
            ))}
            {hasMultiple && !isExpanded && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {displayItems[0].product} ({displayItems[0].qty} {displayItems[0].unit || 'PCS'})...
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'qty',
      header: 'Total Qty',
      render: (item: any) => {
        if (item.items && Array.isArray(item.items) && item.items.length > 0) {
          const totalQty = item.items.reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0);
          return <div>{totalQty} PCS</div>;
        }
        return <div>{item.qty || 0} PCS</div>;
      },
    },
    {
      key: 'deliveryDate',
      header: 'Tanggal Kirim',
      render: (item: any) => {
        const dateStr = item.deliveryDate || item.created;
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
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || '-'}
        </span>
      ),
    },
  ];

  const invoiceColumns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'invoiceDate', header: 'Invoice Date' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'customer', header: 'Customer' },
    { key: 'soNo', header: 'SO No' },
    {
      key: 'total',
      header: 'Invoice Amount',
      render: (item: any) => {
        const total = item.total || item.totalAmount || item.bom?.total || 0;
        return `Rp ${total.toLocaleString('id-ID')}`;
      },
    },
    { key: 'status', header: 'Status' },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: any) => formatDateTime(item.created || item.invoiceDate)
    },
  ];

  // AR (Accounts Receivable) Columns
  const arColumns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { key: 'customer', header: 'Customer' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => `Rp ${(item.amount || item.total || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'paidAmount',
      header: 'Paid Amount',
      render: (item: any) => `Rp ${(item.paidAmount || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      render: (item: any) => {
        const outstanding = (item.amount || item.total || 0) - (item.paidAmount || 0);
        return `Rp ${outstanding.toLocaleString('id-ID')}`;
      },
    },
    { key: 'dueDate', header: 'Due Date' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || 'Open'}
        </span>
      ),
    },
  ];

  // AP (Accounts Payable) Columns
  const apColumns = [
    { key: 'poNo', header: 'PO No' },
    { key: 'supplier', header: 'Supplier' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => `Rp ${(item.amount || item.total || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'paidAmount',
      header: 'Paid Amount',
      render: (item: any) => `Rp ${(item.paidAmount || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      render: (item: any) => {
        const outstanding = (item.amount || item.total || 0) - (item.paidAmount || 0);
        return `Rp ${outstanding.toLocaleString('id-ID')}`;
      },
    },
    { key: 'dueDate', header: 'Due Date' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || 'Open'}
        </span>
      ),
    },
  ];

  // Tax Columns
  const taxColumns = [
    { key: 'taxDate', header: 'Tax Date' },
    { key: 'reference', header: 'Reference' },
    { key: 'referenceType', header: 'Type' },
    { key: 'taxType', header: 'Tax Type' },
    {
      key: 'baseAmount',
      header: 'Base Amount',
      render: (item: any) => `Rp ${(item.baseAmount || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'taxPercent',
      header: 'Tax %',
      render: (item: any) => `${(item.taxPercent || 0).toFixed(2)}%`,
    },
    {
      key: 'taxAmount',
      header: 'Tax Amount',
      render: (item: any) => `Rp ${(item.taxAmount || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || 'Open'}
        </span>
      ),
    },
  ];

  // Payment Columns
  const paymentColumns = [
    { key: 'paymentNo', header: 'Payment No' },
    { key: 'paymentDate', header: 'Payment Date' },
    { key: 'type', header: 'Type' },
    { key: 'reference', header: 'Reference' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
    },
    { key: 'paymentMethod', header: 'Method' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || '-'}
        </span>
      ),
    },
  ];

  // Operational Expenses Columns
  const opsColumns = [
    { key: 'expenseNo', header: 'Expense No' },
    { key: 'expenseDate', header: 'Date' },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
    },
    { key: 'approvedBy', header: 'Approved By' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${(item.status || '').toLowerCase()}`}>
          {item.status || 'Pending'}
        </span>
      ),
    },
  ];

  const inventoryColumns = [
    { 
      key: 'supplierName', 
      header: 'Supplier/Customer Name',
    },
    { key: 'codeItem', header: 'CODE item' },
    { key: 'description', header: 'DESCRIPTION/Nama Item' },
    { key: 'kategori', header: 'Kategori' },
    { key: 'satuan', header: 'Satuan/UOM' },
    {
      key: 'price',
      header: 'PRICE',
      render: (item: any) => `Rp ${(item.price || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'stockPremonth',
      header: 'STOCK/Premonth',
      render: (item: any) => (item.stockPremonth || 0).toLocaleString('id-ID'),
    },
    {
      key: 'receive',
      header: 'Receive',
      render: (item: any) => (item.receive || 0).toLocaleString('id-ID'),
    },
    {
      key: 'outgoing',
      header: 'Outgoing',
      render: (item: any) => (item.outgoing || 0).toLocaleString('id-ID'),
    },
    {
      key: 'return',
      header: 'Return',
      render: (item: any) => (item.return || 0).toLocaleString('id-ID'),
    },
    {
      key: 'nextStock',
      header: 'Next Stock',
      render: (item: any) => {
        const nextStock = (item.stockPremonth || 0) + (item.receive || 0) - (item.outgoing || 0) + (item.return || 0);
        return (
          <span style={{ fontWeight: 'bold', color: nextStock < 0 ? '#f44336' : 'var(--text-primary)' }}>
            {nextStock.toLocaleString('id-ID')}
          </span>
        );
      },
    },
    { 
      key: 'lastUpdate', 
      header: 'Last Update',
      render: (item: any) => formatDateTime(item.lastUpdate)
    },
  ];

  const hrColumns = [
    { key: 'NIP', header: 'NIP' },
    { key: 'NAMA LENGKAP', header: 'Name' },
    { key: 'DEPARTEMEN', header: 'Department' },
    { key: 'JABATAN', header: 'Position' },
    { key: 'GAJI POKOK', header: 'Salary' },
  ];

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    // Load SO data - keep structure like module
    const salesOrdersRaw = await storageService.get<any[]>('salesOrders');
    const salesOrders = extractStorageValue(salesOrdersRaw);
    setSoData(Array.isArray(salesOrders) ? salesOrders : []);

    // Load PO data
    const purchaseOrdersRaw = await storageService.get<any[]>('purchaseOrders');
    const purchaseOrders = extractStorageValue(purchaseOrdersRaw);
    setPoData(Array.isArray(purchaseOrders) ? purchaseOrders : []);

    // Load Production data
    const productionRaw = await storageService.get<any[]>('production');
    const production = extractStorageValue(productionRaw);
    setProductionData(Array.isArray(production) ? production : []);

    // Load Delivery data - from delivery key only
    const deliveryRaw = await storageService.get<any[]>('delivery');
    const delivery = extractStorageValue(deliveryRaw);
    setDeliveryData(Array.isArray(delivery) ? delivery : []);

    // Load Invoice data
    const invoicesRaw = await storageService.get<any[]>('invoices');
    const invoices = extractStorageValue(invoicesRaw);
    setInvoiceData(Array.isArray(invoices) ? invoices : []);

    // Load Payment data
    const paymentRecordsRaw = await storageService.get<any[]>('payments');
    const paymentRecords = extractStorageValue(paymentRecordsRaw);
    setPaymentData(Array.isArray(paymentRecords) ? paymentRecords : []);

    // Load Finance Modules Data (Packaging)
    // AR - Accounts Receivable (from Invoices)
    const packagingInvoicesRaw = await storageService.get<any[]>('invoices');
    const packagingInvoices = extractStorageValue(packagingInvoicesRaw);
    const arRecords = (Array.isArray(packagingInvoices) ? packagingInvoices : []).map((inv: any) => ({
      invoiceNo: inv.invoiceNo,
      customer: inv.customer,
      amount: inv.bom?.total || inv.total || 0,
      paidAmount: inv.paidAmount || 0,
      dueDate: inv.dueDate || inv.created,
      status: inv.status === 'CLOSE' ? 'Paid' : 'Open',
    }));
    setArData(arRecords);

    // AP - Accounts Payable (from PO)
    const packagingPOsRaw = await storageService.get<any[]>('purchaseOrders');
    const packagingPOs = extractStorageValue(packagingPOsRaw);
    const apRecords = (Array.isArray(packagingPOs) ? packagingPOs : []).map((po: any) => ({
      poNo: po.poNo,
      supplier: po.supplier,
      amount: po.total || 0,
      paidAmount: po.paidAmount || 0,
      dueDate: po.dueDate || po.created,
      status: po.status === 'CLOSE' ? 'Paid' : 'Open',
    }));
    setApData(apRecords);

    // Tax Records
    const taxRecordsRaw = await storageService.get<any[]>('taxRecords');
    const taxRecords = extractStorageValue(taxRecordsRaw);
    setTaxData(Array.isArray(taxRecords) ? taxRecords : []);

    // Operational Expenses
    const opsExpensesRaw = await storageService.get<any[]>('operationalExpenses');
    const opsExpenses = extractStorageValue(opsExpensesRaw);
    setOpsExpensesData(Array.isArray(opsExpenses) ? opsExpenses : []);

    // Load Inventory data dan deduplicate berdasarkan codeItem
    const inventoryDataRaw = await storageService.get<any[]>('inventory');
    const inventoryData = extractStorageValue(inventoryDataRaw);
    const inventoryArray = Array.isArray(inventoryData) ? inventoryData : [];
    
    // Deduplicate inventory berdasarkan codeItem
    const inventoryMap = new Map<string, any>();
    inventoryArray.forEach((item: any) => {
      const codeItem = (item.codeItem || '').toString().trim().toUpperCase();
      if (!codeItem) return;
      
      const existing = inventoryMap.get(codeItem);
      if (!existing || (item.lastUpdate && existing.lastUpdate && 
          new Date(item.lastUpdate) > new Date(existing.lastUpdate))) {
        inventoryMap.set(codeItem, item);
      }
    });
    const uniqueInventory = Array.from(inventoryMap.values());
    console.log(`[Report] Loaded ${inventoryArray.length} items, ${uniqueInventory.length} unique items (after deduplication)`);
    setInventoryData(uniqueInventory);

    // Load HR data
    const staffRaw = await storageService.get<any[]>('staff');
    const staff = extractStorageValue(staffRaw);
    setHrData(Array.isArray(staff) ? staff : []);

    // Load Financial data
    const entriesRaw = await storageService.get<any[]>('journalEntries');
    const accsRaw = await storageService.get<any[]>('accounts');
    const entries = extractStorageValue(entriesRaw);
    const accs = extractStorageValue(accsRaw);
    setJournalEntries(Array.isArray(entries) ? entries : []);
    setAccounts(Array.isArray(accs) ? accs : []);

    // Calculate Financial Summary from Journal Entries
    const balances: Record<string, { debit: number; credit: number; balance: number }> = {};
    const filteredEntries = (entries || []).filter((e: any) => {
      if (!dateTo) return true;
      const entryDate = new Date(e.entryDate);
      const to = new Date(dateTo);
      return entryDate <= to;
    });
    
    filteredEntries.forEach((entry: any) => {
      if (!balances[entry.account]) {
        balances[entry.account] = { debit: 0, credit: 0, balance: 0 };
      }
      balances[entry.account].debit += entry.debit || 0;
      balances[entry.account].credit += entry.credit || 0;
    });
    
    (accs || []).forEach(acc => {
      if (!balances[acc.code]) {
        balances[acc.code] = { debit: 0, credit: 0, balance: 0 };
      }
      if (acc.type === 'Asset' || acc.type === 'Expense') {
        balances[acc.code].balance = balances[acc.code].debit - balances[acc.code].credit;
      } else {
        balances[acc.code].balance = balances[acc.code].credit - balances[acc.code].debit;
      }
    });

    // Calculate Summary using AllReportsFinance logic
    const totalSO = salesOrders.length;
    const totalPO = purchaseOrders.length;
    const totalProduction = production.length;
    const totalDelivery = delivery.length;
    const totalInvoice = invoices.length;
    
    // AR Close (Dana Masuk) - Invoices paid
    const arClose = (Array.isArray(invoices) ? invoices : [])
      .filter(inv => inv.status === 'CLOSE')
      .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

    // AR Open (Outstanding Invoice)
    const arOpen = (Array.isArray(invoices) ? invoices : [])
      .filter(inv => inv.status === 'OPEN')
      .reduce((sum, inv) => sum + (inv.bom?.total || inv.total || 0), 0);

    // AP Close (Dana Keluar - Paid Out)
    const paymentsByPO: Record<string, number> = {};
    (Array.isArray(paymentRecords) ? paymentRecords : []).forEach((p: any) => {
      if (p.type === 'Payment') {
        const poNo = p.poNo || p.purchaseOrderNo || '';
        if (poNo) {
          paymentsByPO[poNo] = (paymentsByPO[poNo] || 0) + (p.amount || 0);
        }
      }
    });
    
    const apClose = (Array.isArray(purchaseOrders) ? purchaseOrders : [])
      .filter(po => po.status === 'CLOSE')
      .reduce((sum, po) => sum + (paymentsByPO[po.poNo] || 0), 0);

    // AP Open (Dana Belum Keluar - Unpaid)
    const apOpen = (Array.isArray(purchaseOrders) ? purchaseOrders : [])
      .filter(po => po.status === 'OPEN')
      .reduce((sum, po) => {
        const balance = Math.max(0, (po.total || 0) - (paymentsByPO[po.poNo] || 0));
        return sum + balance;
      }, 0);

    // Tax Paid
    const taxPaid = (Array.isArray(taxData) ? taxData : [])
      .filter(r => r.status === 'Paid' || r.status === 'paid')
      .reduce((sum, r) => sum + (r.taxAmount || 0), 0);

    // Tax Outstanding
    const taxOutstanding = (Array.isArray(taxData) ? taxData : [])
      .filter(r => r.status === 'Open' || r.status === 'open')
      .reduce((sum, r) => sum + (r.taxAmount || 0), 0);

    // Operational Expenses Total
    const operationalExpensesTotal = (Array.isArray(opsExpensesData) ? opsExpensesData : [])
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Inventory Total Value (Products only)
    const inventoryTotalValue = (Array.isArray(inventoryData) ? inventoryData : [])
      .filter(item => (item.kategori || '').toLowerCase().includes('product'))
      .reduce((sum, item) => sum + ((item.nextStock || 0) * (item.price || 0)), 0);

    // Materials Total Value
    const materialsTotalValue = (Array.isArray(inventoryData) ? inventoryData : [])
      .filter(item => (item.kategori || '').toLowerCase().includes('material'))
      .reduce((sum, item) => sum + ((item.nextStock || 0) * (item.price || 0)), 0);

    // Margin Percentage
    const revenue = arClose;
    const cost = apClose + operationalExpensesTotal + taxPaid;
    const marginPercentage = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
    const netProfit = revenue - cost;
    
    setSummaryData({
      totalSO,
      totalPO,
      totalProduction,
      totalDelivery,
      totalInvoice,
      // Financial metrics from AllReportsFinance
      arClose,
      arOpen,
      apClose,
      apOpen,
      taxPaid,
      taxOutstanding,
      operationalExpensesTotal,
      inventoryTotalValue,
      materialsTotalValue,
      marginPercentage,
      revenue,
      cost,
      netProfit,
    });
  };

  // Chart data for summary
  const chartData = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const data: any[] = [];
    let currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const monthKey = currentDate.toLocaleDateString('en-US', { month: 'short' });
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const monthEntries = (journalEntries || []).filter((e: any) => {
        const entryDate = new Date(e.entryDate);
        return entryDate <= monthEnd;
      });
      const monthBalances: Record<string, { debit: number; credit: number; balance: number }> = {};
      monthEntries.forEach((entry: any) => {
        if (!monthBalances[entry.account]) {
          monthBalances[entry.account] = { debit: 0, credit: 0, balance: 0 };
        }
        monthBalances[entry.account].debit += entry.debit || 0;
        monthBalances[entry.account].credit += entry.credit || 0;
      });
      (accounts || []).forEach((acc: any) => {
        if (!monthBalances[acc.code]) {
          monthBalances[acc.code] = { debit: 0, credit: 0, balance: 0 };
        }
        if (acc.type === 'Asset' || acc.type === 'Expense') {
          monthBalances[acc.code].balance = monthBalances[acc.code].debit - monthBalances[acc.code].credit;
        } else {
          monthBalances[acc.code].balance = monthBalances[acc.code].credit - monthBalances[acc.code].debit;
        }
      });
      const totalAssets = (accounts || []).filter((a: any) => a.type === 'Asset').reduce((sum: number, acc: any) => sum + (monthBalances[acc.code]?.balance || 0), 0);
      data.push({ month: monthKey, value: Math.max(0, totalAssets) });
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    return data;
  }, [journalEntries, accounts, dateFrom, dateTo]);

  // Generate HTML untuk export PDF seluruh data report
  const generateReportHtml = useMemo(() => {
    return (): string => {
    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch {
        return '-';
      }
    };

    const formatCurrency = (value: number) => {
      return `Rp ${(value || 0).toLocaleString('id-ID')}`;
    };

    const generateTableHtml = (data: any[], columns: any[], title: string) => {
      if (!data || data.length === 0) {
        return `<h3>${title}</h3><p>No data available</p>`;
      }

      let html = `<h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 5px;">${title}</h3>`;
      html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px;">`;
      html += `<thead><tr style="background-color: #f0f0f0;">`;
      columns.forEach(col => {
        html += `<th style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: bold;">${col.header || col.key}</th>`;
      });
      html += `</tr></thead><tbody>`;
      
      data.forEach((item, idx) => {
        html += `<tr style="background-color: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">`;
        columns.forEach(col => {
          let value = '';
          if (col.render) {
            try {
              // Try to extract value from render function
              if (col.key === 'items' && item.items && Array.isArray(item.items)) {
                value = item.items.map((itm: any) => 
                  `${itm.productName || itm.product || '-'} - Qty: ${itm.qty || 0} - Rp ${(itm.total || 0).toLocaleString('id-ID')}`
                ).join('; ');
              } else if (col.key === 'productionDetails') {
                value = `${item.productName || item.product || '-'} | Target: ${item.target || 0} | Progress: ${item.progress || 0} | Remaining: ${item.remaining || 0}`;
              } else if (col.key === 'product' && item.items && Array.isArray(item.items)) {
                value = item.items.map((itm: any) => 
                  `${itm.product} (${itm.qty} ${itm.unit || 'PCS'})`
                ).join('; ');
              } else if (col.key === 'qty' && item.items && Array.isArray(item.items)) {
                const totalQty = item.items.reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0);
                value = `${totalQty} PCS`;
              } else {
                // Fallback: try to get value directly
                const rawValue = item[col.key];
                if (typeof rawValue === 'number') {
                  value = rawValue.toLocaleString('id-ID');
                } else {
                  value = rawValue || '-';
                }
              }
            } catch (e) {
              const rawValue = item[col.key];
              value = rawValue || '-';
            }
          } else {
            const rawValue = item[col.key];
            if (typeof rawValue === 'number') {
              value = rawValue.toLocaleString('id-ID');
            } else {
              value = rawValue || '-';
            }
          }
          // Escape HTML
          value = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html += `<td style="border: 1px solid #ddd; padding: 6px;">${value}</td>`;
        });
        html += `</tr>`;
      });
      
      html += `</tbody></table>`;
      return html;
    };

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Complete Report - ${new Date().toLocaleDateString('id-ID')}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            font-size: 11px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          h2 {
            color: #34495e;
            margin-top: 30px;
            margin-bottom: 15px;
            border-left: 4px solid #3498db;
            padding-left: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
          }
          .summary-box {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .summary-item {
            display: inline-block;
            margin: 5px 15px 5px 0;
            padding: 8px 12px;
            background-color: white;
            border-radius: 3px;
            border-left: 3px solid #3498db;
          }
          .summary-label {
            font-size: 9px;
            color: #7f8c8d;
            display: block;
          }
          .summary-value {
            font-size: 14px;
            font-weight: bold;
            color: #2c3e50;
          }
          @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <h1>COMPLETE REPORT</h1>
        <p style="color: #7f8c8d; margin-bottom: 20px;">
          Generated on: ${new Date().toLocaleString('id-ID')} | 
          Period: ${formatDate(dateFrom)} - ${formatDate(dateTo)}
        </p>
    `;

    // Summary Section
    html += `
      <div class="summary-box">
        <h2 style="margin-top: 0;">SUMMARY</h2>
        <div class="summary-item">
          <span class="summary-label">Total Sales Orders</span>
          <span class="summary-value">${summaryData.totalSO || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Purchase Orders</span>
          <span class="summary-value">${summaryData.totalPO || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Production</span>
          <span class="summary-value">${summaryData.totalProduction || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Delivery</span>
          <span class="summary-value">${summaryData.totalDelivery || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Invoice</span>
          <span class="summary-value">${summaryData.totalInvoice || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Revenue</span>
          <span class="summary-value">${formatCurrency(summaryData.revenue || 0)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Expenses</span>
          <span class="summary-value">${formatCurrency(summaryData.expenses || 0)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Net Profit</span>
          <span class="summary-value">${formatCurrency(summaryData.netProfit || 0)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Inventory Material Value</span>
          <span class="summary-value">${formatCurrency(inventoryValueSummary?.materialValue || 0)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Inventory Product Value</span>
          <span class="summary-value">${formatCurrency(inventoryValueSummary?.productValue || 0)}</span>
        </div>
      </div>
    `;

    // Sales Orders
    html += generateTableHtml(filteredSoData, soColumns, 'SALES ORDERS');

    // Purchase Orders
    html += generateTableHtml(filteredPoData, poColumns, 'PURCHASE ORDERS');

    // Production
    html += generateTableHtml(filteredProductionData, productionColumns, 'PRODUCTION');

    // Delivery
    html += generateTableHtml(filteredDeliveryData, deliveryColumns, 'DELIVERY NOTES');

    // Invoice
    html += generateTableHtml(filteredInvoiceData, invoiceColumns, 'INVOICES');

    // Inventory - Materials
    const materialInventory = filteredInventoryData.filter((item: any) => {
      const kategori = (item.kategori || '').toLowerCase();
      return kategori.includes('material') || kategori === '' || !item.kategori;
    });
    html += generateTableHtml(materialInventory, inventoryColumns, 'INVENTORY - MATERIALS');

    // Inventory - Products
    const productInventory = filteredInventoryData.filter((item: any) => {
      const kategori = (item.kategori || '').toLowerCase();
      return kategori.includes('product') || kategori.includes('finished') || kategori.includes('fg');
    });
    html += generateTableHtml(productInventory, inventoryColumns, 'INVENTORY - PRODUCTS');

    // HR Data
    html += generateTableHtml(filteredHrData, hrColumns, 'HR DATA');

    html += `
      </body>
      </html>
    `;

      return html;
    };
  }, [filteredSoData, filteredPoData, filteredProductionData, filteredDeliveryData, filteredInvoiceData, filteredInventoryData, filteredHrData, soColumns, poColumns, productionColumns, deliveryColumns, invoiceColumns, inventoryColumns, hrColumns, summaryData, inventoryValueSummary, dateFrom, dateTo, formatDateTime]);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Helper function untuk set column widths
      const setWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
        if (!ws['!cols']) ws['!cols'] = [];
        widths.forEach((width, idx) => {
          if (ws['!cols']) {
            ws['!cols'][idx] = { wch: width };
          }
        });
      };
      
      // Sheet 1: Sales Orders (with flattened items)
      const soExportData = filteredSoData.flatMap((so: any) => {
        if (so.items && Array.isArray(so.items) && so.items.length > 0) {
          return so.items.map((item: any, idx: number) => ({
            'SO No': idx === 0 ? so.soNo : '',
            'Customer': idx === 0 ? so.customer : '',
            'Payment Terms': idx === 0 ? so.paymentTerms : '',
            'Status': idx === 0 ? so.status : '',
            'Created': idx === 0 ? formatDateTime(so.created) : '',
            'Product': item.productName || item.product,
            'Qty': item.qty || 0,
            'Total': item.total || 0,
          }));
        }
        return [{
          'SO No': so.soNo,
          'Customer': so.customer,
          'Payment Terms': so.paymentTerms,
          'Status': so.status,
          'Created': formatDateTime(so.created),
          'Product': '-',
          'Qty': 0,
          'Total': 0,
        }];
      });
      const wsSO = XLSX.utils.json_to_sheet(soExportData);
      setWidths(wsSO, [20, 25, 15, 12, 20, 30, 10, 15]);
      XLSX.utils.book_append_sheet(wb, wsSO, 'Sales Orders');
      
      // Sheet 2: Purchase Orders
      const poExportData = filteredPoData.map((po: any) => ({
        'PO No': po.poNo,
        'Supplier': po.supplier,
        'SO No': po.soNo || '-',
        'Reason': po.purchaseReason || '-',
        'Material/Item': po.materialItem,
        'Qty': po.qty,
        'Price': po.price || 0,
        'Total': po.total || 0,
        'Payment Terms': po.paymentTerms,
        'TOP Days': po.paymentTerms === 'COD' || po.paymentTerms === 'CBD' ? '-' : po.topDays || 0,
        'Status': po.status,
        'Receipt Date': po.receiptDate || '-',
        'Created': formatDateTime(po.created),
      }));
      const wsPO = XLSX.utils.json_to_sheet(poExportData);
      setWidths(wsPO, [20, 25, 20, 15, 30, 10, 15, 15, 15, 10, 12, 15, 20]);
      XLSX.utils.book_append_sheet(wb, wsPO, 'Purchase Orders');
      
      // Sheet 3: Production
      const prodExportData = filteredProductionData.map((prod: any) => ({
        'SO No': prod.soNo,
        'Customer': prod.customer,
        'Product': prod.productName || prod.product || '-',
        'Target': prod.target || prod.targetQty || 0,
        'Progress': prod.progress || prod.producedQty || 0,
        'Remaining': prod.remaining || ((prod.target || prod.targetQty || 0) - (prod.progress || prod.producedQty || 0)),
        'SPK No': prod.spkNo || '-',
        'Status': prod.status,
        'Date': formatDateTime(prod.date || prod.producedDate || prod.created),
      }));
      const wsProd = XLSX.utils.json_to_sheet(prodExportData);
      setWidths(wsProd, [20, 25, 30, 10, 10, 10, 20, 12, 15]);
      XLSX.utils.book_append_sheet(wb, wsProd, 'Production');
      
      // Sheet 4: Delivery (with flattened items)
      const deliveryExportData = filteredDeliveryData.flatMap((del: any) => {
        if (del.items && Array.isArray(del.items) && del.items.length > 0) {
          return del.items.map((item: any, idx: number) => ({
            'SJ No': idx === 0 ? del.sjNo : '',
            'SO No': idx === 0 ? del.soNo : '',
            'Customer': idx === 0 ? del.customer : '',
            'Product': item.product,
            'Qty': item.qty,
            'Unit': item.unit || 'PCS',
            'Delivery Date': idx === 0 ? formatDateTime(del.deliveryDate || del.created) : '',
            'Status': idx === 0 ? del.status : '',
          }));
        }
        return [{
          'SJ No': del.sjNo,
          'SO No': del.soNo,
          'Customer': del.customer,
          'Product': del.product || '-',
          'Qty': del.qty || 0,
          'Unit': del.unit || 'PCS',
          'Delivery Date': formatDateTime(del.deliveryDate || del.created),
          'Status': del.status,
        }];
      });
      const wsDel = XLSX.utils.json_to_sheet(deliveryExportData);
      setWidths(wsDel, [20, 20, 25, 30, 10, 10, 15, 12]);
      XLSX.utils.book_append_sheet(wb, wsDel, 'Delivery');
      
      // Sheet 5: Invoice
      const invExportData = filteredInvoiceData.map((inv: any) => ({
        'Invoice No': inv.invoiceNo,
        'Invoice Date': inv.invoiceDate || '-',
        'Due Date': inv.dueDate || '-',
        'Customer': inv.customer,
        'SO No': inv.soNo,
        'Total Amount': inv.total || inv.totalAmount || inv.bom?.total || 0,
        'Status': inv.status,
        'Created': formatDateTime(inv.created || inv.invoiceDate),
      }));
      const wsInv = XLSX.utils.json_to_sheet(invExportData);
      setWidths(wsInv, [20, 15, 15, 25, 20, 15, 12, 20]);
      XLSX.utils.book_append_sheet(wb, wsInv, 'Invoice');
      
      // Sheet 6: Inventory
      const invtExportData = filteredInventoryData.map((item: any) => ({
        'Supplier/Customer': item.supplierName || '-',
        'Code Item': item.codeItem,
        'Description': item.description,
        'Kategori': item.kategori,
        'Satuan': item.satuan,
        'Price': item.price || 0,
        'Stock Premonth': item.stockPremonth || 0,
        'Receive': item.receive || 0,
        'Outgoing': item.outgoing || 0,
        'Return': item.return || 0,
        'Next Stock': (item.stockPremonth || 0) + (item.receive || 0) - (item.outgoing || 0) + (item.return || 0),
        'Last Update': formatDateTime(item.lastUpdate),
      }));
      const wsInvt = XLSX.utils.json_to_sheet(invtExportData);
      setWidths(wsInvt, [25, 15, 35, 15, 10, 15, 12, 10, 10, 10, 12, 20]);
      XLSX.utils.book_append_sheet(wb, wsInvt, 'Inventory');
      
      // Sheet 7: HR
      const hrExportData = filteredHrData.map((hr: any) => ({
        'NIP': hr.NIP,
        'Name': hr['NAMA LENGKAP'],
        'Department': hr.DEPARTEMEN,
        'Position': hr.JABATAN,
        'Salary': hr['GAJI POKOK'],
      }));
      const wsHR = XLSX.utils.json_to_sheet(hrExportData);
      setWidths(wsHR, [20, 30, 20, 20, 15]);
      XLSX.utils.book_append_sheet(wb, wsHR, 'HR');
      
      // Sheet 8: Payment Data
      const paymentExportData = paymentData.map((payment: any) => ({
        'Payment No': payment.paymentNo || payment.id,
        'Type': payment.type || '-',
        'Amount': payment.amount || 0,
        'Date': formatDateTime(payment.paymentDate || payment.created),
        'Reference': payment.reference || payment.invoiceNo || payment.poNo || '-',
        'Status': payment.status || '-',
      }));
      const wsPayment = XLSX.utils.json_to_sheet(paymentExportData);
      setWidths(wsPayment, [20, 15, 15, 15, 25, 12]);
      XLSX.utils.book_append_sheet(wb, wsPayment, 'Payments');
      
      // Sheet 9: Summary
      const summaryExportData = [
        { 'Metric': 'Total SO', 'Value': summaryData.totalSO || 0 },
        { 'Metric': 'Total PO', 'Value': summaryData.totalPO || 0 },
        { 'Metric': 'Total Production', 'Value': summaryData.totalProduction || 0 },
        { 'Metric': 'Total Delivery', 'Value': summaryData.totalDelivery || 0 },
        { 'Metric': 'Total Invoice', 'Value': summaryData.totalInvoice || 0 },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'Total Revenue', 'Value': summaryData.totalRevenue || 0 },
        { 'Metric': 'Total Expenses', 'Value': summaryData.expenses || 0 },
        { 'Metric': 'Net Profit', 'Value': summaryData.netProfit || 0 },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'Total Assets', 'Value': summaryData.totalAssets || 0 },
        { 'Metric': 'Total Liabilities', 'Value': summaryData.totalLiabilities || 0 },
        { 'Metric': 'Total Equity', 'Value': summaryData.totalEquity || 0 },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'Material Inventory Value', 'Value': inventoryValueSummary.materialValue || 0 },
        { 'Metric': 'Product Inventory Value', 'Value': inventoryValueSummary.productValue || 0 },
        { 'Metric': 'Total Inventory Value', 'Value': inventoryValueSummary.totalValue || 0 },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryExportData);
      setWidths(wsSummary, [30, 20]);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      
      const fileName = `Packaging_Report_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete report (SO, PO, Production, Delivery, Invoice, Inventory, HR, Payments, Summary) to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const handleSaveToPDF = async () => {
    try {
      const html = generateReportHtml();
      const electronAPI = (window as any).electronAPI;
      const fileName = `Complete_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        const result = await electronAPI.savePdf(html, fileName);
        if (result.success) {
          showAlert(`✅ PDF berhasil disimpan ke:\n${result.path}`, 'Success');
        } else if (!result.canceled) {
          showAlert(`❌ Error saving PDF: ${result.error || 'Unknown error'}`, 'Error');
        }
      } else if (isMobile() || isCapacitor()) {
        // Mobile/Capacitor: Use Web Share API or download link
        await savePdfForMobile(
          html,
          fileName,
          (message) => showAlert(message, 'Success'),
          (message) => showAlert(message, 'Error')
        );
      } else {
        // Browser: Open print dialog, user can select "Save as PDF"
        openPrintWindow(html, { autoPrint: false });
      }
    } catch (error: any) {
      showAlert(`❌ Error generating PDF: ${error.message}`, 'Error');
    }
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Report Module</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            📥 Export Excel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveToPDF}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            💾 Save to PDF
          </Button>
        </div>
      </div>

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
          {activeTab === 'summary' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '18px' }}>Financial Reports Summary</h1>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Start
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(value) => setDateFrom(value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      End
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(value) => setDateTo(value)}
                    />
                  </div>
                  <Button onClick={loadAllData} style={{ padding: '8px 16px', fontSize: '12px', marginTop: '20px' }}>🔄 Refresh</Button>
                </div>
              </div>

              {/* Profit Margin & Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Profit Margin</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: summaryData.marginPercentage >= 0 ? '#2e7d32' : '#d32f2f' }}>
                    {(summaryData.marginPercentage || 0).toFixed(2)}%
                  </div>
                </Card>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Revenue (Dana Masuk)</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2e7d32' }}>
                    Rp {(summaryData.arClose || 0).toLocaleString('id-ID')}
                  </div>
                </Card>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cost (Dana Keluar + Expenses + Tax)</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d32f2f' }}>
                    Rp {(summaryData.cost || 0).toLocaleString('id-ID')}
                  </div>
                </Card>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Net Profit</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: summaryData.netProfit >= 0 ? '#2e7d32' : '#d32f2f' }}>
                    Rp {(summaryData.netProfit || 0).toLocaleString('id-ID')}
                  </div>
                </Card>
              </div>

              {/* Accounts Receivable */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <Card style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Accounts Receivable</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '11px' }}>
                    <span>Dana Masuk (AR Close)</span>
                    <span style={{ fontWeight: '600' }}>Rp {(summaryData.arClose || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px' }}>
                    <span>Outstanding (AR Open)</span>
                    <span style={{ fontWeight: '600', color: '#d32f2f' }}>Rp {(summaryData.arOpen || 0).toLocaleString('id-ID')}</span>
                  </div>
                </Card>

                <Card style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Accounts Payable</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '11px' }}>
                    <span>Dana Keluar (AP Close)</span>
                    <span style={{ fontWeight: '600' }}>Rp {(summaryData.apClose || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px' }}>
                    <span>Unpaid Supplier (AP Open)</span>
                    <span style={{ fontWeight: '600', color: '#d32f2f' }}>Rp {(summaryData.apOpen || 0).toLocaleString('id-ID')}</span>
                  </div>
                </Card>
              </div>

              {/* Tax Management */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <Card style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Tax Management</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '11px' }}>
                    <span>Tax Paid</span>
                    <span style={{ fontWeight: '600' }}>Rp {(summaryData.taxPaid || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px' }}>
                    <span>Tax Outstanding</span>
                    <span style={{ fontWeight: '600', color: '#d32f2f' }}>Rp {(summaryData.taxOutstanding || 0).toLocaleString('id-ID')}</span>
                  </div>
                </Card>

                <Card style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Operational Expenses</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px' }}>
                    <span>Total Expenses</span>
                    <span style={{ fontWeight: '600' }}>Rp {(summaryData.operationalExpensesTotal || 0).toLocaleString('id-ID')}</span>
                  </div>
                </Card>
              </div>

              {/* Inventory & Materials */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <Card style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Inventory & Materials</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '11px' }}>
                    <span>Inventory Value</span>
                    <span style={{ fontWeight: '600' }}>Rp {(summaryData.inventoryTotalValue || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '11px' }}>
                    <span>Materials Value</span>
                    <span style={{ fontWeight: '600' }}>Rp {(summaryData.materialsTotalValue || 0).toLocaleString('id-ID')}</span>
                  </div>
                </Card>

                <Card style={{ padding: '12px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Operational Summary</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '10px' }}>
                    <span>Total SO</span>
                    <span style={{ fontWeight: '600' }}>{summaryData.totalSO || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '10px' }}>
                    <span>Total PO</span>
                    <span style={{ fontWeight: '600' }}>{summaryData.totalPO || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '10px' }}>
                    <span>Total Production</span>
                    <span style={{ fontWeight: '600' }}>{summaryData.totalProduction || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '10px' }}>
                    <span>Total Delivery</span>
                    <span style={{ fontWeight: '600' }}>{summaryData.totalDelivery || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '10px' }}>
                    <span>Total Invoice</span>
                    <span style={{ fontWeight: '600' }}>{summaryData.totalInvoice || 0}</span>
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'comprehensive' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Comprehensive Report</h2>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Payment No, Invoice No, Supplier, Customer, Amount..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Payment Supplier ({paymentData.filter((p: any) => p.type === 'Payment').length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table 
                      columns={[
                        { key: 'paymentNo', header: 'Payment No' },
                        { key: 'paymentDate', header: 'Date' },
                        { key: 'supplierName', header: 'Supplier' },
                        { key: 'poNo', header: 'PO No' },
                        {
                          key: 'amount',
                          header: 'Amount',
                          render: (item: any) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
                        },
                        { key: 'paymentMethod', header: 'Method' },
                      ]} 
                      data={paymentData.filter((p: any) => {
                        if (p.type !== 'Payment') return false;
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                          (p.paymentNo || '').toLowerCase().includes(query) ||
                          (p.supplierName || '').toLowerCase().includes(query) ||
                          (p.poNo || p.purchaseOrderNo || '').toLowerCase().includes(query) ||
                          String(p.amount || '').includes(query)
                        );
                      })} 
                      emptyMessage="No Payment Supplier data" 
                    />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Invoices ({invoiceData.length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table 
                      columns={invoiceColumns} 
                      data={filteredInvoiceData} 
                      emptyMessage="No Invoice data" 
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'so' && (
            <div style={{ padding: '8px' }}>
              {/* Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>SO Open</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9800', marginBottom: '4px' }}>
                    {soMetrics.openCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#ff9800' }}>
                    Rp {soMetrics.openTotal.toLocaleString('id-ID')}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>SO Close</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '4px' }}>
                    {soMetrics.closeCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#2e7d32' }}>
                    Rp {soMetrics.closeTotal.toLocaleString('id-ID')}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>This Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2', marginBottom: '4px' }}>
                    {soMetrics.thisMonthCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1976d2' }}>
                    Rp {soMetrics.thisMonthTotal.toLocaleString('id-ID')}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Last Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#757575', marginBottom: '4px' }}>
                    {soMetrics.lastMonthCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#757575' }}>
                    Rp {soMetrics.lastMonthTotal.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '10px', color: soMetrics.thisMonthTotal >= soMetrics.lastMonthTotal ? '#2e7d32' : '#d32f2f', marginTop: '4px' }}>
                    {soMetrics.lastMonthTotal > 0 
                      ? `${soMetrics.thisMonthTotal >= soMetrics.lastMonthTotal ? '▲' : '▼'} ${Math.abs(((soMetrics.thisMonthTotal - soMetrics.lastMonthTotal) / soMetrics.lastMonthTotal) * 100).toFixed(1)}%`
                      : '-'}
                  </div>
                </Card>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 150px 150px 1fr', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Status Filter
                  </label>
                  <select
                    value={soStatusFilter}
                    onChange={(e) => setSoStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="close">Close</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date From
                  </label>
                  <Input
                    type="date"
                    value={soDateFrom}
                    onChange={(value) => setSoDateFrom(value)}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date To
                  </label>
                  <Input
                    type="date"
                    value={soDateTo}
                    onChange={(value) => setSoDateTo(value)}
                  />
                </div>
                
                <div>
                  <Input
                    label="Search"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by SO No, Customer, Product..."
                  />
                </div>
              </div>

              {/* Results Summary */}
              <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Showing {filteredSoData.length} of {soData.length} Sales Orders
                {soStatusFilter !== 'all' && ` (Status: ${soStatusFilter})`}
                {(soDateFrom || soDateTo) && ` (Date: ${soDateFrom || 'Start'} - ${soDateTo || 'End'})`}
              </div>

              {/* Table */}
              <Card style={{ padding: '8px' }}>
                <Table 
                  columns={soColumns} 
                  data={filteredSoData} 
                  emptyMessage={searchQuery || soStatusFilter !== 'all' ? "No SO data found with current filters" : "No SO report data"} 
                />
              </Card>
            </div>
          )}
          {activeTab === 'po' && (
            <div style={{ padding: '8px' }}>
              {/* Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>PO Open</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9800', marginBottom: '4px' }}>
                    {poMetrics.openCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#ff9800' }}>
                    Rp {poMetrics.openTotal.toLocaleString('id-ID')}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>PO Close</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '4px' }}>
                    {poMetrics.closeCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#2e7d32' }}>
                    Rp {poMetrics.closeTotal.toLocaleString('id-ID')}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>This Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2', marginBottom: '4px' }}>
                    {poMetrics.thisMonthCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1976d2' }}>
                    Rp {poMetrics.thisMonthTotal.toLocaleString('id-ID')}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Last Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#757575', marginBottom: '4px' }}>
                    {poMetrics.lastMonthCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#757575' }}>
                    Rp {poMetrics.lastMonthTotal.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '10px', color: poMetrics.thisMonthTotal >= poMetrics.lastMonthTotal ? '#2e7d32' : '#d32f2f', marginTop: '4px' }}>
                    {poMetrics.lastMonthTotal > 0 
                      ? `${poMetrics.thisMonthTotal >= poMetrics.lastMonthTotal ? '▲' : '▼'} ${Math.abs(((poMetrics.thisMonthTotal - poMetrics.lastMonthTotal) / poMetrics.lastMonthTotal) * 100).toFixed(1)}%`
                      : '-'}
                  </div>
                </Card>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 150px 150px 1fr', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Status Filter
                  </label>
                  <select
                    value={poStatusFilter}
                    onChange={(e) => setPoStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="close">Close</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date From
                  </label>
                  <Input
                    type="date"
                    value={poDateFrom}
                    onChange={(value) => setPoDateFrom(value)}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date To
                  </label>
                  <Input
                    type="date"
                    value={poDateTo}
                    onChange={(value) => setPoDateTo(value)}
                  />
                </div>
                
                <div>
                  <Input
                    label="Search"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by PO No, Supplier, Material..."
                  />
                </div>
              </div>

              {/* Results Summary */}
              <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Showing {filteredPoData.length} of {poData.length} Purchase Orders
                {poStatusFilter !== 'all' && ` (Status: ${poStatusFilter})`}
                {(poDateFrom || poDateTo) && ` (Date: ${poDateFrom || 'Start'} - ${poDateTo || 'End'})`}
              </div>

              {/* Table */}
              <Card style={{ padding: '8px' }}>
                <Table 
                  columns={poColumns} 
                  data={filteredPoData} 
                  emptyMessage={searchQuery || poStatusFilter !== 'all' ? "No PO data found with current filters" : "No PO report data"} 
                />
              </Card>
            </div>
          )}
          {activeTab === 'production' && (
            <div style={{ padding: '8px' }}>
              {/* Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Production Open</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9800' }}>
                    {prodMetrics.openCount}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Production Close</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>
                    {prodMetrics.closeCount}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>This Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
                    {prodMetrics.thisMonthCount}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Last Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#757575' }}>
                    {prodMetrics.lastMonthCount}
                  </div>
                  <div style={{ fontSize: '10px', color: prodMetrics.thisMonthCount >= prodMetrics.lastMonthCount ? '#2e7d32' : '#d32f2f', marginTop: '4px' }}>
                    {prodMetrics.lastMonthCount > 0 
                      ? `${prodMetrics.thisMonthCount >= prodMetrics.lastMonthCount ? '▲' : '▼'} ${Math.abs(((prodMetrics.thisMonthCount - prodMetrics.lastMonthCount) / prodMetrics.lastMonthCount) * 100).toFixed(1)}%`
                      : '-'}
                  </div>
                </Card>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 150px 150px 1fr', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Status Filter
                  </label>
                  <select
                    value={prodStatusFilter}
                    onChange={(e) => setProdStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="close">Close</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date From
                  </label>
                  <Input
                    type="date"
                    value={prodDateFrom}
                    onChange={(value) => setProdDateFrom(value)}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date To
                  </label>
                  <Input
                    type="date"
                    value={prodDateTo}
                    onChange={(value) => setProdDateTo(value)}
                  />
                </div>
                
                <div>
                  <Input
                    label="Search"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by SO No, Customer, Product..."
                  />
                </div>
              </div>

              {/* Results Summary */}
              <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Showing {filteredProductionData.length} of {productionData.length} Production Records
                {prodStatusFilter !== 'all' && ` (Status: ${prodStatusFilter})`}
                {(prodDateFrom || prodDateTo) && ` (Date: ${prodDateFrom || 'Start'} - ${prodDateTo || 'End'})`}
              </div>

              {/* Table */}
              <Card style={{ padding: '8px' }}>
                <Table 
                  columns={productionColumns} 
                  data={filteredProductionData} 
                  emptyMessage={searchQuery || prodStatusFilter !== 'all' ? "No Production data found with current filters" : "No Production report data"} 
                />
              </Card>
            </div>
          )}
          {activeTab === 'delivery' && (
            <div style={{ padding: '8px' }}>
              {/* Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Delivery Open</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9800' }}>
                    {deliveryMetrics.openCount}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Delivery Close</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>
                    {deliveryMetrics.closeCount}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>This Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
                    {deliveryMetrics.thisMonthCount}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Last Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#757575' }}>
                    {deliveryMetrics.lastMonthCount}
                  </div>
                  <div style={{ fontSize: '10px', color: deliveryMetrics.thisMonthCount >= deliveryMetrics.lastMonthCount ? '#2e7d32' : '#d32f2f', marginTop: '4px' }}>
                    {deliveryMetrics.lastMonthCount > 0 
                      ? `${deliveryMetrics.thisMonthCount >= deliveryMetrics.lastMonthCount ? '▲' : '▼'} ${Math.abs(((deliveryMetrics.thisMonthCount - deliveryMetrics.lastMonthCount) / deliveryMetrics.lastMonthCount) * 100).toFixed(1)}%`
                      : '-'}
                  </div>
                </Card>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 150px 150px 1fr', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Status Filter
                  </label>
                  <select
                    value={deliveryStatusFilter}
                    onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="close">Close</option>
                    <option value="delivered">Delivered</option>
                    <option value="in_transit">In Transit</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date From
                  </label>
                  <Input
                    type="date"
                    value={deliveryDateFrom}
                    onChange={(value) => setDeliveryDateFrom(value)}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date To
                  </label>
                  <Input
                    type="date"
                    value={deliveryDateTo}
                    onChange={(value) => setDeliveryDateTo(value)}
                  />
                </div>
                
                <div>
                  <Input
                    label="Search"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by SJ No, SO No, Customer..."
                  />
                </div>
              </div>

              {/* Results Summary */}
              <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Showing {filteredDeliveryData.length} of {deliveryData.length} Delivery Records
                {deliveryStatusFilter !== 'all' && ` (Status: ${deliveryStatusFilter})`}
                {(deliveryDateFrom || deliveryDateTo) && ` (Date: ${deliveryDateFrom || 'Start'} - ${deliveryDateTo || 'End'})`}
              </div>

              {/* Table */}
              <Card style={{ padding: '8px' }}>
                <Table 
                  columns={deliveryColumns} 
                  data={filteredDeliveryData} 
                  emptyMessage={searchQuery || deliveryStatusFilter !== 'all' ? "No Delivery data found with current filters" : "No Delivery report data"} 
                />
              </Card>
            </div>
          )}
          {activeTab === 'invoice' && (
            <div style={{ padding: '8px' }}>
              {/* Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Invoice Open</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9800', marginBottom: '4px' }}>
                    {invoiceMetrics.openCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#ff9800' }}>
                    Rp {invoiceMetrics.openTotal.toLocaleString('id-ID')}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Invoice Close</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32', marginBottom: '4px' }}>
                    {invoiceMetrics.closeCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#2e7d32' }}>
                    Rp {invoiceMetrics.closeTotal.toLocaleString('id-ID')}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>This Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2', marginBottom: '4px' }}>
                    {invoiceMetrics.thisMonthCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1976d2' }}>
                    Rp {invoiceMetrics.thisMonthTotal.toLocaleString('id-ID')}
                  </div>
                </Card>
                
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Last Month</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#757575', marginBottom: '4px' }}>
                    {invoiceMetrics.lastMonthCount}
                  </div>
                  <div style={{ fontSize: '12px', color: '#757575' }}>
                    Rp {invoiceMetrics.lastMonthTotal.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '10px', color: invoiceMetrics.thisMonthTotal >= invoiceMetrics.lastMonthTotal ? '#2e7d32' : '#d32f2f', marginTop: '4px' }}>
                    {invoiceMetrics.lastMonthTotal > 0 
                      ? `${invoiceMetrics.thisMonthTotal >= invoiceMetrics.lastMonthTotal ? '▲' : '▼'} ${Math.abs(((invoiceMetrics.thisMonthTotal - invoiceMetrics.lastMonthTotal) / invoiceMetrics.lastMonthTotal) * 100).toFixed(1)}%`
                      : '-'}
                  </div>
                </Card>
              </div>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 150px 150px 1fr', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Status Filter
                  </label>
                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="close">Close</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date From
                  </label>
                  <Input
                    type="date"
                    value={invoiceDateFrom}
                    onChange={(value) => setInvoiceDateFrom(value)}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Date To
                  </label>
                  <Input
                    type="date"
                    value={invoiceDateTo}
                    onChange={(value) => setInvoiceDateTo(value)}
                  />
                </div>
                
                <div>
                  <Input
                    label="Search"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by Invoice No, Customer, SO No..."
                  />
                </div>
              </div>

              {/* Results Summary */}
              <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Showing {filteredInvoiceData.length} of {invoiceData.length} Invoices
                {invoiceStatusFilter !== 'all' && ` (Status: ${invoiceStatusFilter})`}
                {(invoiceDateFrom || invoiceDateTo) && ` (Date: ${invoiceDateFrom || 'Start'} - ${invoiceDateTo || 'End'})`}
              </div>

              {/* Table */}
              <Card style={{ padding: '8px' }}>
                <Table 
                  columns={invoiceColumns} 
                  data={filteredInvoiceData} 
                  emptyMessage={searchQuery || invoiceStatusFilter !== 'all' ? "No Invoice data found with current filters" : "No Invoice report data"} 
                />
              </Card>
            </div>
          )}
          {activeTab === 'finance' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Finance Summary</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total AR</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32' }}>
                    Rp {arData.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString('id-ID')}
                  </div>
                </Card>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total AP</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>
                    Rp {apData.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString('id-ID')}
                  </div>
                </Card>
                <Card style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Tax</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
                    Rp {taxData.reduce((sum, item) => sum + (item.taxAmount || 0), 0).toLocaleString('id-ID')}
                  </div>
                </Card>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>AR Outstanding</h3>
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    <Table columns={arColumns} data={arData.filter(item => item.status === 'Open')} emptyMessage="No outstanding AR" />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>AP Outstanding</h3>
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    <Table columns={apColumns} data={apData.filter(item => item.status === 'Open')} emptyMessage="No outstanding AP" />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'ar' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Accounts Receivable (AR)</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {arData.length} | Outstanding: {arData.filter(item => item.status === 'Open').length}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Invoice No, Customer, Status, Amount..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>All AR ({filteredArData.length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={arColumns} data={filteredArData} emptyMessage="No AR data" />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Outstanding ({filteredArData.filter(item => item.status === 'Open').length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={arColumns} data={filteredArData.filter(item => item.status === 'Open')} emptyMessage="No outstanding AR" />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'ap' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Accounts Payable (AP)</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {apData.length} | Outstanding: {apData.filter(item => item.status === 'Open').length}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by PO No, Supplier, Status, Amount..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>All AP ({filteredApData.length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={apColumns} data={filteredApData} emptyMessage="No AP data" />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Outstanding ({filteredApData.filter(item => item.status === 'Open').length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={apColumns} data={filteredApData.filter(item => item.status === 'Open')} emptyMessage="No outstanding AP" />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'tax' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Tax Management</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {taxData.length} | Open: {taxData.filter(item => item.status === 'Open').length}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Reference, Tax Type, Status, Amount..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>All Tax Records ({filteredTaxData.length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={taxColumns} data={filteredTaxData} emptyMessage="No tax data" />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Open Tax ({filteredTaxData.filter(item => item.status === 'Open').length})</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table columns={taxColumns} data={filteredTaxData.filter(item => item.status === 'Open')} emptyMessage="No open tax records" />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'payment' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Payment Records</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {paymentData.length}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Payment No, Type, Reference, Amount..."
                />
              </div>
              <Card style={{ padding: '8px' }}>
                <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>All Payments ({paymentData.length})</h3>
                <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                  <Table columns={paymentColumns} data={paymentData} emptyMessage="No payment data" />
                </div>
              </Card>
            </div>
          )}
          {activeTab === 'ops' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Operational Expenses</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {opsExpensesData.length}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Expense No, Category, Description, Status..."
                />
              </div>
              <Card style={{ padding: '8px' }}>
                <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>All Expenses ({filteredOpsData.length})</h3>
                <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                  <Table columns={opsColumns} data={filteredOpsData} emptyMessage="No operational expense data" />
                </div>
              </Card>
            </div>
          )}
          {activeTab === 'inventory' && (
            <div style={{ padding: '8px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0 }}>Inventory Report</h2>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by Code, Description, Category, Unit, Price, Stock..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Materials</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table 
                      columns={inventoryColumns.map(col => ({
                        ...col,
                        header: col.key === 'supplierName' ? 'Supplier Name' : col.header
                      }))} 
                      data={filteredInventoryData.filter((item: any) => {
                        const kategori = (item.kategori || '').toLowerCase();
                        return kategori.includes('material') || kategori === '' || !item.kategori;
                      })} 
                      emptyMessage="No Material data" 
                    />
                  </div>
                </Card>
                <Card style={{ padding: '8px' }}>
                  <h3 style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Products</h3>
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <Table 
                      columns={inventoryColumns.map(col => ({
                        ...col,
                        header: col.key === 'supplierName' ? 'Customer Name' : col.header
                      }))} 
                      data={filteredInventoryData.filter((item: any) => {
                        const kategori = (item.kategori || '').toLowerCase();
                        return kategori.includes('product') || kategori.includes('produk');
                      })} 
                      emptyMessage="No Product data" 
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}
          {activeTab === 'hr' && (
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <Input
                  label="Search & Filter"
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by NIP, Name, Department, Position, Salary..."
                />
              </div>
              <Table columns={hrColumns} data={filteredHrData} emptyMessage={searchQuery ? "No HR data found matching your search" : "No HR report data"} />
            </div>
          )}
        </div>
      </Card>
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>{dialogState.title}</h2>
                <Button variant="secondary" onClick={closeDialog} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <p style={{ marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{dialogState.message}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {dialogState.type === 'confirm' && (
                  <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (dialogState.onConfirm) dialogState.onConfirm();
                    closeDialog();
                  }}
                >
                  {dialogState.type === 'confirm' ? 'Confirm' : 'OK'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
};

export default Report;
