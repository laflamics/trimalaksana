import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import NotificationBell from '../../components/NotificationBell';
import { storageService } from '../../services/storage';
import { deletePackagingItem, reloadPackagingData } from '../../utils/packaging-delete-helper';
import { generateInvoiceHtml } from '../../pdf/invoice-pdf-template';
import { openPrintWindow, isMobile, isCapacitor, savePdfForMobile } from '../../utils/actions';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import { useDialog } from '../../hooks/useDialog';
import { PageSizeDialog, PageSize } from '../../components/PageSizeDialog';
import '../../styles/common.css';

// Invoice Action Menu Component (similar to DeliveryActionMenu)
const InvoiceActionMenu: React.FC<{
  item: any;
  onViewDetail?: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onUploadPaymentProof?: () => void;
  onViewPaymentProof?: () => void;
  onViewSuratJalan?: () => void;
  onDelete?: () => void;
}> = ({
  item,
  onViewDetail,
  onEdit,
  onPrint,
  onUploadPaymentProof,
  onViewPaymentProof,
  onViewSuratJalan,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = React.useState<boolean>(false);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  React.useEffect(() => {
    if (showMenu && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: buttonRect.bottom + 4,
        right: window.innerWidth - buttonRect.left,
      });
    }
  }, [showMenu]);

  return (
    <>
      <div ref={buttonRef} style={{ position: 'relative', display: 'inline-block' }}>
        <Button 
          variant="secondary" 
          onClick={() => setShowMenu(!showMenu)}
          style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}
        >
          ⋮
        </Button>
      </div>
      {showMenu && (
        <div 
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            minWidth: '180px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {onViewDetail && (
            <button
              onClick={() => { onViewDetail(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              👁️ View
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => { onEdit(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ✏️ Edit
            </button>
          )}
          {item.status === 'OPEN' && onUploadPaymentProof && (
            <button
              onClick={() => { onUploadPaymentProof(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              📎 Upload Bukti TF
            </button>
          )}
          {item.status === 'CLOSE' && item.paymentProof && onViewPaymentProof && (
            <button
              onClick={() => { onViewPaymentProof(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              📄 View Bukti TF
            </button>
          )}
          {onPrint && (
            <button
              onClick={() => { onPrint(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🖨️ Print
            </button>
          )}
          {item.sjNo && onViewSuratJalan && (
            <button
              onClick={() => { onViewSuratJalan(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              📋 Cek SJ
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: '#ff4444',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      )}
    </>
  );
};

const Accounting = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [invoiceNotifications, setInvoiceNotifications] = useState<any[]>([]);
  const [viewPdfData, setViewPdfData] = useState<{ html: string; invoiceNo: string } | null>(null);
  const [showPageSizeDialog, setShowPageSizeDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [viewSJData, setViewSJData] = useState<{ signedDocument: string; signedDocumentName: string; sjNo: string } | null>(null);
  const [viewPaymentProofData, setViewPaymentProofData] = useState<{ paymentProof: string; paymentProofName: string; invoiceNo: string } | null>(null);
  const [signatureViewer, setSignatureViewer] = useState<{ 
    data: string; 
    fileName: string; 
    isPDF: boolean;
  } | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [updatingInvoice, setUpdatingInvoice] = useState<any | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateInvoiceDialog, setShowCreateInvoiceDialog] = useState(false);
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, showConfirm, closeDialog, DialogComponent } = useDialog();

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const showToast = (message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, variant });
  };

  useEffect(() => {
    loadData();
    // Refresh setiap 5 detik untuk cek notifikasi baru (reduced frequency untuk performa)
    const interval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const inv = await storageService.get<any[]>('invoices') || [];
    const exp = await storageService.get<any[]>('expenses') || [];
    const notifs = await storageService.get<any[]>('invoiceNotifications') || [];
    const cust = await storageService.get<any[]>('customers') || [];
    const prod = await storageService.get<any[]>('products') || [];
    const so = await storageService.get<any[]>('salesOrders') || [];
    
    // 🚀 FIX: CRITICAL - Filter deleted items sebelum set ke state
    // Ini prevent data yang sudah di-delete muncul lagi setelah sync
    const { filterActiveItems } = await import('../../utils/packaging-delete-helper');
    const activeInvoices = filterActiveItems(Array.isArray(inv) ? inv : []);
    const activeExpenses = filterActiveItems(Array.isArray(exp) ? exp : []);
    const activeCustomers = filterActiveItems(Array.isArray(cust) ? cust : []);
    const activeProducts = filterActiveItems(Array.isArray(prod) ? prod : []);
    const activeSalesOrders = filterActiveItems(Array.isArray(so) ? so : []);
    
    // 🚀 OPTIMASI: Hanya update state jika benar-benar ada perubahan
    setInvoices((prev: any[]) => {
      if (JSON.stringify(prev) === JSON.stringify(activeInvoices)) {
        return prev;
      }
      return activeInvoices;
    });
    setExpenses((prev: any[]) => {
      if (JSON.stringify(prev) === JSON.stringify(activeExpenses)) {
        return prev;
      }
      return activeExpenses;
    });
    
    // Auto-cleanup: Hapus notifications yang sudah dibuat invoice atau status PROCESSED
    // Ensure notifs and inv are always arrays
    // 🚀 FIX: Pakai activeInvoices (sudah di-filter) bukan inv (raw data)
    const notifsArray = Array.isArray(notifs) ? notifs : [];
    const invArray = activeInvoices; // Pakai activeInvoices yang sudah di-filter
    const cleanedNotifs = notifsArray.filter((n: any) => {
      // Hapus jika sudah ada invoice untuk SO/SJ ini
      const existingInvoice = invArray.find((i: any) => i.soNo === n.soNo && i.sjNo === n.sjNo);
      if (existingInvoice) {
        return false;
      }
      
      // Hapus jika status sudah PROCESSED
      if (n.status === 'PROCESSED') {
        return false;
      }
      
      return true;
    });
    
    // Update notifications di storage (cleanup yang sudah tidak relevan)
    if (JSON.stringify(cleanedNotifs) !== JSON.stringify(notifsArray)) {
      await storageService.set('invoiceNotifications', cleanedNotifs);
      console.log(`🧹 Cleaned up ${notifsArray.length - cleanedNotifs.length} obsolete invoice notifications`);
    }
    
    // Filter notifications yang belum dibuat invoice (status PENDING)
    const pendingNotifs = cleanedNotifs.filter((n: any) => n.status === 'PENDING');
    
    // 🚀 OPTIMASI: Hanya update state jika benar-benar ada perubahan untuk mencegah re-render loop
    setInvoiceNotifications((prev: any[]) => {
      if (JSON.stringify(prev) === JSON.stringify(pendingNotifs)) {
        return prev; // No change, return previous state
      }
      return pendingNotifs;
    });
    // 🚀 FIX: Pakai active data yang sudah di-filter deleted items
    setCustomers(activeCustomers);
    setProducts(activeProducts);
    setSalesOrders(activeSalesOrders);
  };

  // Calculate COGS (Cost of Goods Sold) dari BOM + PO price
  // Best practice: COGS = material cost yang digunakan untuk produksi
  const calculateCOGS = async (so: any, invoiceLines: any[]): Promise<number> => {
    try {
      const [bomData, purchaseOrders, materials] = await Promise.all([
        storageService.get<any[]>('bom') || [],
        storageService.get<any[]>('purchaseOrders') || [],
        storageService.get<any[]>('materials') || [],
      ]);

      if (!bomData || !purchaseOrders || !materials) {
        return 0;
      }

      let totalCOGS = 0;

      // Loop setiap product di invoice
      for (const line of invoiceLines) {
        const productId = (line.itemSku || '').toString().trim();
        const qty = Number(line.qty || 0);

        if (qty <= 0) continue;

        // Cari BOM untuk product ini
        // Ensure bomData is always an array
        const bomDataArray = Array.isArray(bomData) ? bomData : [];
        const productBOM = bomDataArray.filter((b: any) => {
          const bomProductId = (b.product_id || b.kode || '').toString().trim();
          return bomProductId === productId;
        });

        if (productBOM.length === 0) {
          // Product tanpa BOM, skip (atau bisa pakai average cost dari inventory)
          continue;
        }

        // Hitung material cost untuk product ini
        for (const bom of productBOM) {
          const materialId = (bom.material_id || '').toString().trim();
          const ratio = Number(bom.ratio || 1);
          const materialQty = qty * ratio;

          // Cari PO untuk material ini yang terkait dengan SO
          // Ensure purchaseOrders is always an array
          const purchaseOrdersArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
          const relatedPO = purchaseOrdersArray.find((po: any) => 
            po.soNo === so.soNo && 
            (po.materialId || '').toString().trim() === materialId &&
            (po.status === 'OPEN' || po.status === 'CLOSE')
          );

          let materialCostPerUnit = 0;

          if (relatedPO && relatedPO.total > 0 && relatedPO.qty > 0) {
            // Gunakan harga dari PO (actual cost)
            materialCostPerUnit = relatedPO.total / relatedPO.qty;
          } else {
            // Fallback ke master material price
            // Ensure materials is always an array
            const materialsArray = Array.isArray(materials) ? materials : [];
            const material = materialsArray.find((m: any) => 
              ((m.material_id || m.kode || '').toString().trim()) === materialId
            );
            materialCostPerUnit = material?.priceMtr || material?.harga || 0;
          }

          totalCOGS += materialQty * materialCostPerUnit;
        }
      }

      return Math.round(totalCOGS);
    } catch (error: any) {
      console.error('Error calculating COGS:', error);
      return 0; // Return 0 jika error (non-blocking)
    }
  };

  // Invoice Actions
  const handleCreateInvoice = async (item: any) => {
    // Handle dari notification atau dari item langsung
    // Ensure invoiceNotifications is always an array
    const invoiceNotificationsArray = Array.isArray(invoiceNotifications) ? invoiceNotifications : [];
    const notif = invoiceNotificationsArray.find((n: any) => n.soNo === item.soNo && n.sjNo === item.sjNo);
    const deliveryList = await storageService.get<any[]>('delivery') || [];
    // Ensure deliveryList is always an array
    const deliveryListArray = Array.isArray(deliveryList) ? deliveryList : [];
    const delivery = deliveryListArray.find((d: any) => 
      d.soNo === item.soNo && (d.status === 'OPEN' || d.status === 'CLOSE')
    );
    
    if (!delivery) {
      showAlert(`Cannot create Invoice for SO: ${item.soNo}\n\nDelivery Note must be created and OPEN/CLOSE first.\n\nPlease create Delivery Note from QC PASS items first.`, 'Validation Error');
      return;
    }
    
    // Cek apakah invoice sudah ada
    // Ensure invoices is always an array
    const invoicesArray = Array.isArray(invoices) ? invoices : [];
    const existingInvoice = invoicesArray.find((inv: any) => inv.soNo === item.soNo && inv.sjNo === delivery.sjNo);
    if (existingInvoice) {
      showAlert(`Invoice already exists for SO: ${item.soNo}\n\nInvoice No: ${existingInvoice.invoiceNo}`, 'Information');
      return;
    }
    
    // Ensure salesOrders is always an array
    const salesOrdersArray = Array.isArray(salesOrders) ? salesOrders : [];
    const so = salesOrdersArray.find((s: any) => s.soNo === item.soNo);
    if (!so) {
      showAlert(`SO ${item.soNo} not found`, 'Error');
      return;
    }

    // Prepare invoice lines dari delivery items (lebih akurat karena sesuai dengan yang dikirim)
    const invoiceLines: any[] = [];
    
    // Load inventory sekali di luar loop
    const inventory = await storageService.get<any[]>('inventory') || [];
    
    // Prioritaskan dari delivery.items
    if (delivery.items && Array.isArray(delivery.items) && delivery.items.length > 0) {
      for (const deliveryItem of delivery.items) {
        // Cari product berdasarkan nama product di delivery
        // Ensure products is always an array
        const productsArray = Array.isArray(products) ? products : [];
        const product = productsArray.find((p: any) => 
          p.nama === deliveryItem.product || 
          p.sku === deliveryItem.product ||
          p.kode === deliveryItem.product ||
          p.id === deliveryItem.product ||
          (p.description && p.description === deliveryItem.product)
        );
        
        // Cari juga di inventory
        // Ensure inventory is always an array
        const inventoryArray = Array.isArray(inventory) ? inventory : [];
        const invItem = inventoryArray.find((inv: any) => 
          inv.description === deliveryItem.product ||
          inv.codeItem === deliveryItem.product
        );
        
        // Ambil itemSku dari product atau inventory
        const itemSku = product?.sku || product?.kode || product?.id || 
                       invItem?.codeItem || invItem?.sku || invItem?.kode || 
                       deliveryItem.product || '';
        
        // Cari harga dari SO item yang sesuai (berdasarkan product name atau itemSku)
        // Ensure so.items is always an array
        const soItemsArray = Array.isArray(so.items) ? so.items : [];
        const soItem = soItemsArray.find((si: any) => 
          si.productName === deliveryItem.product ||
          si.itemSku === itemSku ||
          si.itemSku === product?.sku ||
          si.itemSku === product?.kode
        );
        
        const price = soItem?.price || soItem?.unitPrice || 
                     product?.hargaJual || product?.hargaFg || product?.hargaSales || 
                     invItem?.price || 0;
        const qty = Number(deliveryItem.qty || 0);
        
        invoiceLines.push({
          itemSku: itemSku,
          qty: qty,
          price: price,
          soNo: item.soNo || delivery.soNo || so.soNo || '', // Simpan SO number jika ada
        });
      }
    } 
    // Fallback ke SO items jika delivery.items tidak ada
    else if (so.items && Array.isArray(so.items) && so.items.length > 0) {
      // Ensure products is always an array
      const productsArray = Array.isArray(products) ? products : [];
      so.items.forEach((soItem: any) => {
        const product = productsArray.find((p: any) => 
          p.id === soItem.itemSku || 
          p.sku === soItem.itemSku || 
          p.kode === soItem.itemSku ||
          p.nama === soItem.productName
        );
        
        const price = soItem.price || soItem.unitPrice || product?.hargaJual || product?.hargaFg || product?.hargaSales || 0;
        const qty = Number(soItem.qty || 0);
        
        invoiceLines.push({
          itemSku: soItem.itemSku || product?.sku || product?.kode || product?.id || soItem.productName || '',
          qty: qty,
          price: price,
          soNo: so.soNo || item.soNo || '', // Simpan SO number jika ada
        });
      });
    }
    // Fallback ke notification items jika tidak ada delivery dan SO items
    else if (notif && notif.items && Array.isArray(notif.items)) {
      // Ensure products is always an array
      const productsArray = Array.isArray(products) ? products : [];
      notif.items.forEach((notifItem: any) => {
        const product = productsArray.find((p: any) => 
          p.nama === notifItem.product || 
          p.sku === notifItem.product ||
          p.kode === notifItem.product
        );
        const price = product?.hargaJual || product?.hargaFg || product?.hargaSales || 0;
        invoiceLines.push({
          itemSku: product?.sku || product?.kode || product?.id || notifItem.product || '',
          qty: Number(notifItem.qty || 0),
          price: price,
          soNo: notifItem.soNo || item.soNo || '', // Simpan SO number jika ada
        });
      });
    }

    // Ensure invoiceLines is always an array
    const invoiceLinesArray = Array.isArray(invoiceLines) ? invoiceLines : [];
    const subtotal = invoiceLinesArray.reduce((sum: number, line: any) => 
      sum + (Number(line.qty || 0) * Number(line.price || 0)), 0
    );
    
    // Show confirmation dialog
    showConfirm(
      `Create Invoice for SO: ${item.soNo}?\n\nPO Customer No: ${notif?.poCustomerNo || item.poCustomerNo || '-'}\nSPK No: ${notif?.spkNos || item.spkNos || '-'}\nFrom Delivery: ${delivery.sjNo}\n\nCustomer: ${item.customer || notif?.customer}\nTotal Qty: ${notif?.totalQty || item.totalQty || 0} PCS`,
      async () => {
        await proceedWithInvoiceCreation();
      },
      () => {},
      'Create Invoice Confirmation'
    );
    
    async function proceedWithInvoiceCreation() {
    try {
      // Ensure invoices is always an array
      const invoicesArray = Array.isArray(invoices) ? invoices : [];
      const invoiceNo = `INV-${new Date().getFullYear()}${String(invoicesArray.length + 1).padStart(6, '0')}`;
      const newInvoice = {
        id: Date.now().toString(),
        invoiceNo,
        soNo: item.soNo,
        soId: so.id,
        sjNo: delivery.sjNo,
        customer: item.customer || notif?.customer,
        lines: invoiceLines,
        productCodeDisplay: delivery.productCodeDisplay || 'padCode', // Ambil dari delivery note
        bom: {
          subtotal: subtotal,
          discount: 0,
          discountPercent: 0,
          tax: 0,
          taxPercent: 0,
          biayaLain: 0,
          total: subtotal,
          paymentTerms: so.paymentTerms || 'TOP',
          poData: {
            topDays: so.topDays || 30,
          },
          sjNo: delivery.sjNo,
          soNo: item.soNo,
          soId: so.id,
        },
        paymentTerms: so.paymentTerms || 'TOP',
        topDays: so.topDays || 30,
        status: 'OPEN',
        created: new Date().toISOString(),
      };
      
      // invoicesArray already declared above at line 370
      const updated = [...invoicesArray, newInvoice];
      await storageService.set('invoices', updated);
      setInvoices(updated);

      // Auto-create journal entries untuk General Ledger
      let cogsAmount = 0; // Simpan untuk ditampilkan di alert (scope di luar try-catch)
      try {
            const journalEntries = await storageService.get<any[]>('journalEntries') || [];
        const accounts = await storageService.get<any[]>('accounts') || [];
        
        // Pastikan accounts ada
        // Ensure accounts is always an array
        const accountsArray = Array.isArray(accounts) ? accounts : [];
        if (accountsArray.length === 0) {
          const defaultAccounts = [
            { code: '1000', name: 'Cash', type: 'Asset', balance: 0 },
            { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
            { code: '1200', name: 'Inventory', type: 'Asset', balance: 0 },
            { code: '1300', name: 'Fixed Assets', type: 'Asset', balance: 0 },
            { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 0 },
            { code: '2100', name: 'Accrued Expenses', type: 'Liability', balance: 0 },
            { code: '3000', name: 'Equity', type: 'Equity', balance: 0 },
            { code: '3100', name: 'Retained Earnings', type: 'Equity', balance: 0 },
            { code: '4000', name: 'Sales Revenue', type: 'Revenue', balance: 0 },
            { code: '4100', name: 'Other Income', type: 'Revenue', balance: 0 },
            { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', balance: 0 },
            { code: '6000', name: 'Operating Expenses', type: 'Expense', balance: 0 },
            { code: '6100', name: 'Administrative Expenses', type: 'Expense', balance: 0 },
            { code: '6200', name: 'Financial Expenses', type: 'Expense', balance: 0 },
          ];
          await storageService.set('accounts', defaultAccounts);
        }
        
        const entryDate = newInvoice.created ? new Date(newInvoice.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        // accountsArray already declared above
        const arAccount = accountsArray.find((a: any) => a.code === '1100') || { code: '1100', name: 'Accounts Receivable' };
        const revenueAccount = accountsArray.find((a: any) => a.code === '4000') || { code: '4000', name: 'Sales Revenue' };
        
        // Use bom.total (final amount) instead of subtotal
        const invoiceTotal = newInvoice.bom?.total || subtotal;
        
        const hasEntry = (account: string, debit: number, credit: number) =>
          journalEntries.some((entry: any) =>
            entry.reference === invoiceNo &&
            entry.account === account &&
            entry.debit === debit &&
            entry.credit === credit
          );

        const entriesToAdd: any[] = [];
        if (!hasEntry('1100', invoiceTotal, 0)) {
          entriesToAdd.push({
            entryDate,
            reference: invoiceNo,
            account: '1100',
            accountName: arAccount.name,
            debit: invoiceTotal,
            credit: 0,
            description: `Invoice ${invoiceNo} - ${newInvoice.customer}`,
          });
        }
        if (!hasEntry('4000', 0, invoiceTotal)) {
          entriesToAdd.push({
            entryDate,
            reference: invoiceNo,
            account: '4000',
            accountName: revenueAccount.name,
            debit: 0,
            credit: invoiceTotal,
            description: `Invoice ${invoiceNo} - ${newInvoice.customer}`,
          });
        }

        if (entriesToAdd.length > 0) {
          // Ensure journalEntries is always an array
          const journalEntriesArray = Array.isArray(journalEntries) ? journalEntries : [];
          const baseLength = journalEntriesArray.length;
          const entriesWithNo = entriesToAdd.map((entry, idx) => ({
            ...entry,
            id: `${Date.now()}-${idx + 1}`,
            no: baseLength + idx + 1,
          }));
          await storageService.set('journalEntries', [...journalEntriesArray, ...entriesWithNo]);
        }

        // Auto-create COGS journal entry (Debit COGS, Credit Inventory)
        // Best practice: COGS di-recognize saat revenue di-recognize (invoice dibuat)
        try {
          cogsAmount = await calculateCOGS(so, invoiceLines);
          
          if (cogsAmount > 0) {
            // accountsArray already declared above
            const cogsAccount = accountsArray.find((a: any) => a.code === '5000') || { code: '5000', name: 'Cost of Goods Sold' };
            const inventoryAccount = accountsArray.find((a: any) => a.code === '1200') || { code: '1200', name: 'Inventory' };
            
            // Cek apakah sudah ada COGS entry untuk invoice ini (prevent duplicate)
            const hasCOGSEntry = journalEntries.some((entry: any) =>
              entry.reference === invoiceNo &&
              entry.account === '5000'
            );

            if (!hasCOGSEntry) {
              const cogsEntries = [
                {
                  entryDate,
                  reference: invoiceNo,
                  account: '5000',
                  accountName: cogsAccount.name,
                  debit: cogsAmount,
                  credit: 0,
                  description: `COGS for Invoice ${invoiceNo} - ${newInvoice.customer}`,
                },
                {
                  entryDate,
                  reference: invoiceNo,
                  account: '1200',
                  accountName: inventoryAccount.name,
                  debit: 0,
                  credit: cogsAmount,
                  description: `COGS for Invoice ${invoiceNo} - ${newInvoice.customer}`,
                },
              ];

              const currentEntries = await storageService.get<any[]>('journalEntries') || [];
              const baseLength = currentEntries.length;
              const cogsEntriesWithNo = cogsEntries.map((entry, idx) => ({
                ...entry,
                id: `${Date.now()}-cogs-${idx + 1}`,
                no: baseLength + idx + 1,
              }));

              await storageService.set('journalEntries', [...currentEntries, ...cogsEntriesWithNo]);
              console.log(`✅ COGS journal entries created for Invoice ${invoiceNo}: COGS +${cogsAmount}, Inventory -${cogsAmount}`);
            }
          }
        } catch (error: any) {
          console.error('Error creating COGS journal entries:', error);
          // Jangan block proses, hanya log error (non-blocking)
        }
      } catch (error: any) {
        console.error('Error creating journal entries:', error);
        // Jangan block proses, hanya log error
      }

      // Update notification status
      if (notif) {
        // invoiceNotificationsArray already declared above
        const updatedNotifs = invoiceNotificationsArray.map((n: any) =>
          n.id === notif.id ? { ...n, status: 'PROCESSED' } : n
        );
        await storageService.set('invoiceNotifications', updatedNotifs);
        setInvoiceNotifications(updatedNotifs.filter((n: any) => n.status === 'PENDING'));
      }

      // Tampilkan alert dengan COGS info (gunakan cogsAmount yang sudah dihitung di atas)
      const cogsMessage = cogsAmount > 0 
        ? `\n✅ COGS journal entries created (COGS: Rp ${cogsAmount.toLocaleString('id-ID')})`
        : `\n⚠️ COGS tidak dapat dihitung (BOM tidak ditemukan atau material cost tidak tersedia)`;
      
      showAlert(`✅ Invoice created: ${invoiceNo}\n\nFrom Delivery: ${delivery.sjNo}\n✅ AR + Revenue journal entries created${cogsMessage}`, 'Success');
      await loadData();
    } catch (error: any) {
      showAlert(`Error creating invoice: ${error.message}`, 'Error');
    }
    }
  };

  const handleCreateManualInvoice = async (manualData: any, soNos?: string[], sjNos?: string[]) => {
    try {
      // Generate random invoice number
      const generateRandomCode = () => {
        const chars = '0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      const year = new Date().getFullYear();
      let invoiceNo = `INV-${year}${generateRandomCode()}`;
      
      // Ensure uniqueness
      const invoicesArray = Array.isArray(invoices) ? invoices : [];
      while (invoicesArray.some((inv: any) => inv.invoiceNo === invoiceNo)) {
        invoiceNo = `INV-${year}${generateRandomCode()}`;
      }

      // Prepare invoice lines - simpan soNo jika ada
      const invoiceLines = manualData.items.map((item: any) => ({
        itemSku: item.sku || item.product,
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
        soNo: item.soNo || '', // Simpan SO number jika ada
      }));

      // Use BOM from manualData if provided, otherwise calculate from items
      const bomData = manualData.bom || {};
      const subtotal = bomData.subtotal || invoiceLines.reduce((sum: number, line: any) => 
        sum + (Number(line.qty || 0) * Number(line.price || 0)), 0
      );
      const discount = bomData.discount || 0;
      const discountPercent = bomData.discountPercent || 0;
      const tax = bomData.tax || 0;
      const taxPercent = bomData.taxPercent || 0;
      const biayaLain = bomData.biayaLain || 0;
      const total = bomData.total || (subtotal - discount + tax + biayaLain);

      // Cari DN yang terkait dengan SO jika ada, atau gunakan sjNos jika langsung dari DN
      let sjNo = '';
      let soNo = '';
      if (sjNos && sjNos.length > 0) {
        // Jika langsung dari DN, gunakan DN pertama
        sjNo = sjNos[0];
        const deliveryData = await storageService.get<any[]>('delivery') || [];
        const relatedDN = deliveryData.find((dn: any) => dn.sjNo === sjNo);
        if (relatedDN) {
          soNo = relatedDN.soNo || '';
        }
      } else if (soNos && soNos.length > 0) {
        // Jika dari SO, cari DN yang terkait
        soNo = soNos[0]; // Use first SO
        const deliveryData = await storageService.get<any[]>('delivery') || [];
        const relatedDN = deliveryData.find((dn: any) => soNos.includes(dn.soNo));
        if (relatedDN) {
          sjNo = relatedDN.sjNo;
        }
      }

      // Ambil productCodeDisplay dari delivery note jika ada
      let productCodeDisplay = 'padCode';
      if (sjNo) {
        const deliveryData = await storageService.get<any[]>('delivery') || [];
        const relatedDN = deliveryData.find((dn: any) => dn.sjNo === sjNo);
        if (relatedDN && relatedDN.productCodeDisplay) {
          productCodeDisplay = relatedDN.productCodeDisplay;
        }
      } else if (manualData.productCodeDisplay) {
        productCodeDisplay = manualData.productCodeDisplay;
      }

      const newInvoice = {
        id: Date.now().toString(),
        invoiceNo,
        soNo: soNo || '',
        sjNo: sjNo || '',
        customer: manualData.customer,
        lines: invoiceLines,
        productCodeDisplay: productCodeDisplay,
        bom: {
          subtotal,
          discount,
          discountPercent,
          tax,
          taxPercent,
          biayaLain,
          total,
          paymentTerms: manualData.paymentTerms || 'TOP',
          poData: {
            topDays: manualData.topDays || 30,
          },
          sjNo: sjNo || '',
          soNo: soNo || '',
          tanggalJt: bomData.tanggalJt || '',
          dpPo: bomData.dpPo || 0,
          tunai: bomData.tunai || 0,
          kredit: bomData.kredit || 0,
          kDebet: bomData.kDebet || 0,
          kKredit: bomData.kKredit || 0,
          kembaliKeKasir: bomData.kembaliKeKasir || 0,
        },
        paymentTerms: manualData.paymentTerms || 'TOP',
        topDays: manualData.topDays || 30,
        status: 'OPEN',
        created: new Date().toISOString(),
        notes: manualData.notes || '',
        templateType: manualData.templateType || 'template1',
      };
      
      const updated = [...invoicesArray, newInvoice];
      await storageService.set('invoices', updated);
      setInvoices(updated);

      // Auto-create journal entries
      try {
        const journalEntries = await storageService.get<any[]>('journalEntries') || [];
        const accounts = await storageService.get<any[]>('accounts') || [];
        
        const arAccount = accounts.find((a: any) => a.code === '1100' || a.name?.toLowerCase().includes('accounts receivable'));
        const revenueAccount = accounts.find((a: any) => a.code === '4000' || a.name?.toLowerCase().includes('revenue'));
        
        if (arAccount && revenueAccount) {
          const entryDate = new Date().toISOString().split('T')[0];
          const currentEntries = await storageService.get<any[]>('journalEntries') || [];
          const baseLength = currentEntries.length;
          
          const newEntries = [
            {
              id: `${Date.now()}-ar`,
              no: baseLength + 1,
              entryDate,
              reference: invoiceNo,
              account: arAccount.code,
              accountName: arAccount.name,
              debit: total,
              credit: 0,
              description: `AR for Invoice ${invoiceNo} - ${manualData.customer}`,
            },
            {
              id: `${Date.now()}-revenue`,
              no: baseLength + 2,
              entryDate,
              reference: invoiceNo,
              account: revenueAccount.code,
              accountName: revenueAccount.name,
              debit: 0,
              credit: total,
              description: `Revenue for Invoice ${invoiceNo} - ${manualData.customer}`,
            },
          ];
          
          await storageService.set('journalEntries', [...currentEntries, ...newEntries]);
          console.log(`✅ Journal entries created for Invoice ${invoiceNo}`);
        }
      } catch (error: any) {
        console.error('Error creating journal entries:', error);
        // Jangan block proses, hanya log error
      }

      // Calculate and create COGS entries if applicable
      try {
        if (soNo) {
          const salesOrdersArray = Array.isArray(salesOrders) ? salesOrders : [];
          const so = salesOrdersArray.find((s: any) => s.soNo === soNo);
          if (so) {
            const cogsAmount = await calculateCOGS(so, invoiceLines);
            if (cogsAmount > 0) {
              const accounts = await storageService.get<any[]>('accounts') || [];
              const cogsAccount = accounts.find((a: any) => a.code === '5000' || a.name?.toLowerCase().includes('cogs'));
              const inventoryAccount = accounts.find((a: any) => a.code === '1200' || a.name?.toLowerCase().includes('inventory'));
              
              if (cogsAccount && inventoryAccount) {
                const entryDate = new Date().toISOString().split('T')[0];
                const currentEntries = await storageService.get<any[]>('journalEntries') || [];
                const baseLength = currentEntries.length;
                
                const cogsEntries = [
                  {
                    entryDate,
                    reference: invoiceNo,
                    account: cogsAccount.code,
                    accountName: cogsAccount.name,
                    debit: cogsAmount,
                    credit: 0,
                    description: `COGS for Invoice ${invoiceNo} - ${manualData.customer}`,
                  },
                  {
                    entryDate,
                    reference: invoiceNo,
                    account: inventoryAccount.code,
                    accountName: inventoryAccount.name,
                    debit: 0,
                    credit: cogsAmount,
                    description: `COGS for Invoice ${invoiceNo} - ${manualData.customer}`,
                  },
                ];
                
                const cogsEntriesWithNo = cogsEntries.map((entry, idx) => ({
                  ...entry,
                  id: `${Date.now()}-cogs-${idx + 1}`,
                  no: baseLength + idx + 1,
                }));
                
                await storageService.set('journalEntries', [...currentEntries, ...cogsEntriesWithNo]);
                console.log(`✅ COGS journal entries created for Invoice ${invoiceNo}: COGS +${cogsAmount}, Inventory -${cogsAmount}`);
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Error creating COGS journal entries:', error);
        // Jangan block proses, hanya log error (non-blocking)
      }

      showAlert(`✅ Invoice created: ${invoiceNo}\n\nCustomer: ${manualData.customer}\n✅ AR + Revenue journal entries created`, 'Success');
      await loadData();
    } catch (error: any) {
      showAlert(`Error creating invoice: ${error.message}`, 'Error');
    }
  };

  const handleEditInvoice = (item: any) => {
    setEditingInvoice(item);
  };

  const handleUpdateInvoice = (item: any) => {
    setUpdatingInvoice(item);
  };

  const handleViewPaymentProof = (item: any) => {
    if (!item.paymentProof) {
      showAlert(`Bukti transfer untuk Invoice ${item.invoiceNo} belum di-upload`, 'Warning');
      return;
    }

    const paymentProof = item.paymentProof;
    const fileName = item.paymentProofName || 'Bukti Transfer';
    
    // Deteksi tipe file
    const isPDF = fileName.toLowerCase().endsWith('.pdf') || 
                  paymentProof.startsWith('data:application/pdf') ||
                  (paymentProof.length > 100 && paymentProof.substring(0, 100).includes('JVBERi0'));
    
    // Normalize data URI format
    let normalizedProof = paymentProof;
    if (!normalizedProof.startsWith('data:')) {
      if (isPDF) {
        normalizedProof = `data:application/pdf;base64,${normalizedProof}`;
      } else {
        normalizedProof = `data:image/jpeg;base64,${normalizedProof}`;
      }
    }

    // Untuk PDF, langsung download
    if (isPDF) {
      handleDownloadPaymentProof(normalizedProof, fileName);
    } else {
      // Untuk image, buka di modal viewer
      setSignatureViewer({
        data: normalizedProof,
        fileName: fileName,
        isPDF: false
      });
    }
  };

  const handleDownloadPaymentProof = (paymentProof: string, fileName: string) => {
    try {
      // Extract base64 data
      let base64Data = paymentProof;
      let mimeType = 'image/jpeg';
      
      if (base64Data.includes(',')) {
        const parts = base64Data.split(',');
        base64Data = parts[1] || '';
        const mimeMatch = parts[0].match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }

      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine file extension
      let extension = 'png';
      if (mimeType.includes('pdf')) {
        extension = 'pdf';
      } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        extension = 'jpg';
      } else if (mimeType.includes('png')) {
        extension = 'png';
      }
      
      link.download = fileName || `PaymentProof.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Error', `Error downloading document: ${error.message}`);
    }
  };

  const generateInvoiceHtmlContent = async (item: any): Promise<string> => {
    // Load customer data
    // Ensure customers is always an array
    const customersArray = Array.isArray(customers) ? customers : [];
    const customerData = customersArray.find((c: any) => c.nama === item.customer);
    const customerAddress = customerData?.alamat || '';
    const customerNpwp = customerData?.npwp || '';

    // Load SO untuk specNote
    // Ensure salesOrders is always an array
    const salesOrdersArray = Array.isArray(salesOrders) ? salesOrders : [];
    const so = salesOrdersArray.find((s: any) => s.soNo === item.soNo);
    const soSpecNote = so?.globalSpecNote || so?.specNote || '';

    // Build product map untuk template
    const productMap: Record<string, string> = {};
    
    // Load inventory untuk mencari product juga
    const inventory = await storageService.get<any[]>('inventory') || [];
    // Ensure inventory is always an array
    const inventoryArray = Array.isArray(inventory) ? inventory : [];
    // Ensure products is always an array
    const productsArray = Array.isArray(products) ? products : [];
    
    const itemLinesArray = Array.isArray(item.lines) ? item.lines : [];
    const productCodeMap: Record<string, string> = {}; // Map untuk kode item
    
    // Build productMap dulu berdasarkan nama produk dari invoice lines atau dari master
    itemLinesArray.forEach((line: any) => {
      // Cari produk berdasarkan itemSku (bisa berupa kode/SKU atau nama)
      let product = productsArray.find((p: any) => 
        p.sku === line.itemSku || 
        p.kode === line.itemSku || 
        p.id === line.itemSku ||
        p.product_id === line.itemSku ||
        (p.codeItem && p.codeItem === line.itemSku) ||
        p.nama === line.itemSku ||
        (p.nama && line.itemSku && p.nama.toLowerCase().trim() === line.itemSku.toLowerCase().trim())
      );
      
      // Jika tidak ketemu, coba cari berdasarkan nama produk jika ada di line
      if (!product && line.productName) {
        product = productsArray.find((p: any) => 
          (p.nama || '').trim().toLowerCase() === (line.productName || '').toLowerCase().trim() ||
          (p.description || '').trim().toLowerCase() === (line.productName || '').toLowerCase().trim() ||
          (p.name || '').trim().toLowerCase() === (line.productName || '').toLowerCase().trim()
        );
      }
      
      // Jika masih tidak ketemu, coba cari di inventory berdasarkan itemSku
      if (!product) {
        const invItem = inventoryArray.find((inv: any) => 
          inv.codeItem === line.itemSku ||
          inv.sku === line.itemSku ||
          inv.kode === line.itemSku ||
          inv.id === line.itemSku ||
          (inv.description && line.itemSku && inv.description.toLowerCase().trim() === line.itemSku.toLowerCase().trim())
        );
        if (invItem) {
          // Setelah ketemu di inventory, coba cari lagi di products berdasarkan nama dari inventory
          const invProductName = invItem.description || invItem.name || '';
          if (invProductName) {
            product = productsArray.find((p: any) => 
              (p.nama || '').trim().toLowerCase() === invProductName.toLowerCase().trim() ||
              (p.description || '').trim().toLowerCase() === invProductName.toLowerCase().trim()
            );
          }
          
          // Jika masih tidak ketemu di products, gunakan data dari inventory
          if (!product) {
            product = {
              nama: invProductName || line.itemSku,
              kode: invItem.codeItem || invItem.sku || invItem.kode || '',
              sku: invItem.codeItem || invItem.sku || invItem.kode || ''
            };
          }
        }
      }
      
      // Simpan kode item dan nama produk
      if (product) {
        // Get productCodeDisplay preference (default: 'padCode')
        const productCodeDisplay = item.productCodeDisplay || 'padCode';
        
        // Helper function untuk mendapatkan product code berdasarkan preference
        const getProductCode = (prod: any, defaultCode: string): string => {
          if (productCodeDisplay === 'padCode') {
            // Default: Pad Code, fallback ke Product ID jika tidak ada
            return prod?.padCode || prod?.sku || prod?.kode || prod?.product_id || prod?.id || defaultCode;
          } else {
            // Product ID / SKU ID
            return prod?.sku || prod?.kode || prod?.product_id || prod?.id || defaultCode;
          }
        };
        
        // Ambil kode berdasarkan preference
        const productCode = getProductCode(product, line.itemSku || '');
        productCodeMap[line.itemSku] = productCode;
        productMap[line.itemSku] = product.nama || product.description || product.name || line.itemSku;
      } else {
        // Fallback: gunakan itemSku sebagai nama jika tidak ditemukan
        productCodeMap[line.itemSku] = ''; // Tidak ada kode
        productMap[line.itemSku] = line.itemSku;
      }
    });

    // Load company settings from storage
    const companySettings = await storageService.get<any>('companySettings');

    // Default company info
    const company = {
      companyName: companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA',
      address: companySettings?.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530',
      phone: '',
      bankName: companySettings?.bankName || '',
      bankAccount: companySettings?.bankAccount || '',
      bankBranch: companySettings?.bankBranch || '',
      bankAccountName: companySettings?.bankAccountName || '',
      npwp: companySettings?.npwp || '',
    };

    // Logo menggunakan logo-loader utility untuk kompatibilitas development, production, dan Electron
    // Support noxtiz.png, noxtiz.ico, dan Logo.gif
    let logoBase64 = await loadLogoAsBase64();

    // Prepare invoice object untuk template
    const inv = {
      invNo: item.invoiceNo,
      customer: item.customer,
      createdAt: item.created,
      notes: item.notes || '', // Include notes untuk ditampilkan di keterangan
      // itemLinesArray already declared above
      lines: itemLinesArray.map((line: any) => ({
        itemSku: line.itemSku || '',
        qty: line.qty || 0,
        price: line.price || 0,
        soNo: line.soNo || item.soNo || '', // Simpan SO number jika ada, fallback ke invoice level
      })),
      bom: item.bom || {},
    };

    return generateInvoiceHtml({
      logo: logoBase64,
      company,
      inv,
      customerAddress,
      customerNpwp,
      soSpecNote,
      productMap,
      productCodeMap, // Pass product code map untuk kode item
      templateType: item.templateType || 'template1', // Default template1
    });
  };

  const handleViewDetail = async (item: any) => {
    try {
      const html = await generateInvoiceHtmlContent(item);
      setViewPdfData({ html, invoiceNo: item.invoiceNo });
    } catch (error: any) {
      showAlert(`Error generating Invoice preview: ${error.message}`, 'Error');
    }
  };

  const handleSaveToPDF = async (pageSize: PageSize = 'A4') => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `${viewPdfData.invoiceNo}.pdf`;

      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        const result = await electronAPI.savePdf(viewPdfData.html, fileName, pageSize);
        if (result.success) {
          showToast(`PDF saved successfully to:\n${result.path}`, 'success');
          setViewPdfData(null);
        } else if (!result.canceled) {
          showToast(`Error saving PDF: ${result.error || 'Unknown error'}`, 'error');
        }
      } else if (isMobile() || isCapacitor()) {
        // Mobile/Capacitor: Use Web Share API or print dialog
        await savePdfForMobile(
          viewPdfData.html,
          fileName,
          (message) => {
            showToast(message, 'success');
            setViewPdfData(null); // Close view setelah save
          },
          (message) => showToast(message, 'error')
        );
      } else {
        openPrintWindow(viewPdfData.html);
      }
    } catch (error: any) {
      showToast(`Error saving PDF: ${error.message}`, 'error');
    }
  };

  const handleShowPageSizeDialog = () => {
    setShowPageSizeDialog(true);
  };

  const handlePrintInvoice = async (item: any) => {
    try {
      const html = await generateInvoiceHtmlContent(item);
      openPrintWindow(html);
    } catch (error: any) {
      showAlert(`Error generating print preview: ${error.message}`, 'Error');
    }
  };

  const handleViewSuratJalan = async (item: any) => {
    try {
      // Load delivery note berdasarkan sjNo
      const deliveryList = await storageService.get<any[]>('delivery') || [];
      // Ensure deliveryList is always an array
      const deliveryListArray = Array.isArray(deliveryList) ? deliveryList : [];
      const delivery = deliveryListArray.find((d: any) => d.sjNo === item.sjNo);
      
      if (!delivery) {
        showAlert(`Surat Jalan ${item.sjNo} tidak ditemukan`, 'Error');
        return;
      }

      if (!delivery.signedDocument && !delivery.signedDocumentPath) {
        showAlert(`Surat Jalan ${item.sjNo} belum di-upload (belum ada TTD)`, 'Warning');
        return;
      }

      let signedDocument = delivery.signedDocument || '';
      const fileName = delivery.signedDocumentName || 'Surat Jalan';
      
      // Jika file disimpan sebagai path (PDF yang besar), load dari file system
      if (delivery.signedDocumentPath) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && typeof electronAPI.loadUploadedFile === 'function') {
          try {
            const result = await electronAPI.loadUploadedFile(delivery.signedDocumentPath);
            if (result && result.success) {
              signedDocument = result.data || '';
            } else {
              throw new Error(result?.error || 'Failed to load file from file system');
            }
          } catch (loadError: any) {
            showAlert('Error', `Gagal memuat file: ${loadError.message}`);
            return;
          }
        } else {
          showAlert('Error', 'File disimpan sebagai file system, tetapi Electron API tidak tersedia.');
          return;
        }
      }

      if (!signedDocument) {
        showAlert('Error', 'No document data available');
        return;
      }

      // Normalize data URI format
      if (!signedDocument.startsWith('data:')) {
        const isPDF = fileName.toLowerCase().endsWith('.pdf') || 
                     signedDocument.length > 100 && signedDocument.substring(0, 100).includes('JVBERi0');
        if (isPDF) {
          signedDocument = `data:application/pdf;base64,${signedDocument}`;
        } else {
          signedDocument = `data:image/jpeg;base64,${signedDocument}`;
        }
      }

      // Deteksi tipe file
      const isPDF = fileName.toLowerCase().endsWith('.pdf') || 
                    signedDocument.startsWith('data:application/pdf') ||
                    delivery.signedDocumentType === 'pdf' ||
                    (signedDocument.length > 100 && signedDocument.substring(0, 100).includes('JVBERi0'));

      // Untuk PDF, langsung download
      if (isPDF) {
        handleDownloadSuratJalan(signedDocument, fileName);
      } else {
        // Untuk image, buka di modal viewer
        setSignatureViewer({
          data: signedDocument,
          fileName: fileName,
          isPDF: false
        });
      }
    } catch (error: any) {
      showAlert(`Error loading Surat Jalan: ${error.message}`, 'Error');
    }
  };

  const handleDownloadSuratJalan = (signedDocument: string, fileName: string) => {
    try {
      // Extract base64 data
      let base64Data = signedDocument;
      let mimeType = 'image/jpeg';
      
      if (base64Data.includes(',')) {
        const parts = base64Data.split(',');
        base64Data = parts[1] || '';
        const mimeMatch = parts[0].match(/data:([^;]+)/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }

      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Determine file extension
      let extension = 'png';
      if (mimeType.includes('pdf')) {
        extension = 'pdf';
      } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        extension = 'jpg';
      } else if (mimeType.includes('png')) {
        extension = 'png';
      }
      
      link.download = fileName || `SJ-signed.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showAlert('Error', `Error downloading document: ${error.message}`);
    }
  };


  // Expense Actions
  const handleEditExpense = (item: any) => {
    showAlert(`Edit Expense: ${item.expenseNo} - Form to be implemented`, 'Information');
    // TODO: Open edit expense form
  };

  const handleDeleteExpense = async (item: any) => {
    showConfirm(
      `Delete expense: ${item.expenseNo}?`,
      async () => {
        await proceedWithDeleteExpense();
      },
      () => {},
      'Delete Expense'
    );
    return;
    
    async function proceedWithDeleteExpense() {
      try {
        // 🚀 FIX: Pakai packaging delete helper untuk konsistensi
        const deleteResult = await deletePackagingItem('expenses', item.id, 'id');
        if (deleteResult.success) {
          // Reload data dengan helper (handle race condition)
          await reloadPackagingData('expenses', setExpenses);
          showAlert(`Expense ${item.expenseNo} deleted successfully`, 'Success');
        } else {
          showAlert(`Error deleting expense: ${deleteResult.error || 'Unknown error'}`, 'Error');
        }
      } catch (error: any) {
        showAlert(`Error deleting expense: ${error.message}`, 'Error');
      }
    }
  };

  const handleDeleteInvoice = async (item: any) => {
    showConfirm(
      `Delete invoice: ${item.invoiceNo}?`,
      async () => {
        await proceedWithDeleteInvoice();
      },
      () => {},
      'Delete Invoice'
    );
    return;
    
    async function proceedWithDeleteInvoice() {
      try {
        // 🚀 FIX: Pakai packaging delete helper untuk konsistensi
        const deleteResult = await deletePackagingItem('invoices', item.id, 'id');
        if (deleteResult.success) {
          // Reload data dengan helper (handle race condition)
          await reloadPackagingData('invoices', setInvoices);
          showAlert(`Invoice ${item.invoiceNo} deleted successfully`, 'Success');
        } else {
          showAlert(`Error deleting invoice: ${deleteResult.error || 'Unknown error'}`, 'Error');
        }
      } catch (error: any) {
        showAlert(`Error deleting invoice: ${error.message}`, 'Error');
      }
    }
  };

  const tabs = [
    { id: 'invoices', label: 'Customer Invoices' },
    { id: 'expenses', label: 'Expenses (Petty Cash)' },
  ];

  const pendingQCColumns = [
    { 
      key: 'message', 
      header: 'Notification', 
      render: (item: any) => (
        <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
          <div><strong>Silahkan membuat invoicing untuk PO Customer no: {item.poCustomerNo || item.soNo}</strong></div>
          <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
            Sesuai SPK no: {item.spkNos || '-'}
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px' }}>
            SO No: {item.soNo} | SJ No: {item.sjNo} | Customer: {item.customer} | Qty: {item.totalQty || 0} PCS
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <Button variant="primary" onClick={() => handleCreateInvoice(item)}>Create Invoice</Button>
      ),
    },
  ];

  const invoiceColumns = [
    { key: 'invoiceNo', header: 'Invoice No' },
    { 
      key: 'customer', 
      header: 'Customer',
      render: (item: any) => <span style={{ color: 'var(--text-primary)' }}>{item.customer}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span className={`status-badge status-${item.status?.toLowerCase() || 'draft'}`}>
          {item.status || 'DRAFT'}
        </span>
      ),
    },
    { 
      key: 'paymentTerms', 
      header: 'Payment Terms',
      render: (item: any) => {
        if (item.paymentTerms === 'TOP' && item.topDays) {
          return <span style={{ fontSize: '12px' }}>TOP ({item.topDays} hari)</span>;
        }
        return <span style={{ fontSize: '12px' }}>{item.paymentTerms || 'TOP'}</span>;
      }
    },
    { 
      key: 'created', 
      header: 'Created',
      render: (item: any) => {
        if (!item.created) return '-';
        try {
          const date = new Date(item.created);
          return <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {date.toLocaleDateString('id-ID', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>;
        } catch {
          return <span style={{ fontSize: '12px' }}>{item.created}</span>;
        }
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <InvoiceActionMenu
          item={item}
          onViewDetail={() => handleViewDetail(item)}
          onEdit={() => handleEditInvoice(item)}
          onPrint={() => handlePrintInvoice(item)}
          onUploadPaymentProof={item.status === 'OPEN' ? () => handleUpdateInvoice(item) : undefined}
          onViewPaymentProof={item.status === 'CLOSE' && item.paymentProof ? () => handleViewPaymentProof(item) : undefined}
          onViewSuratJalan={item.sjNo ? () => handleViewSuratJalan(item) : undefined}
          onDelete={() => handleDeleteInvoice(item)}
        />
      ),
    },
  ];


  // Sort invoices by created date (terbaru di atas)
  const sortedInvoices = useMemo(() => {
    // Ensure invoices is always an array
    const invoicesArray = Array.isArray(invoices) ? invoices : [];
    return [...invoicesArray].sort((a, b) => {
      const dateA = new Date(a.created || 0).getTime();
      const dateB = new Date(b.created || 0).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [invoices]);

  // Filter invoices berdasarkan search query
  const filteredInvoices = useMemo(() => {
    // Ensure sortedInvoices is always an array
    const sortedInvoicesArray = Array.isArray(sortedInvoices) ? sortedInvoices : [];
    if (!searchQuery) return sortedInvoicesArray;
    const query = searchQuery.toLowerCase();
    return sortedInvoicesArray.filter((i: any) =>
      (i.invoiceNo || '').toLowerCase().includes(query) ||
      (i.customer || '').toLowerCase().includes(query) ||
      (i.soNo || '').toLowerCase().includes(query) ||
      (i.status || '').toLowerCase().includes(query) ||
      (i.paymentTerms || '').toLowerCase().includes(query) ||
      (i.sjNo || '').toLowerCase().includes(query)
    );
  }, [sortedInvoices, searchQuery]);

  // Filter expenses berdasarkan search query
  const filteredExpenses = useMemo(() => {
    // Ensure expenses is always an array
    const expensesArray = Array.isArray(expenses) ? expenses : [];
    if (!searchQuery) return expensesArray;
    const query = searchQuery.toLowerCase();
    return expensesArray.filter((e: any) =>
      (e.expenseNo || '').toLowerCase().includes(query) ||
      (e.category || '').toLowerCase().includes(query) ||
      (e.description || '').toLowerCase().includes(query) ||
      (e.paidBy || '').toLowerCase().includes(query) ||
      String(e.amount || 0).includes(query)
    );
  }, [expenses, searchQuery]);

  // Get row color based on SO No (dark theme selang-seling - sama seperti PPIC)
  const getInvoiceRowColor = (soNo: string): string => {
    // Ensure filteredInvoices is always an array
    const filteredInvoicesArray = Array.isArray(filteredInvoices) ? filteredInvoices : [];
    const uniqueSOs = Array.from(new Set(filteredInvoicesArray.map(i => i.soNo)));
    const soIndex = uniqueSOs.indexOf(soNo);
    // Detect theme mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.getAttribute('data-theme');
    // Use light colors for light mode, dark colors for dark mode
    const rowColors = isLightMode 
      ? ['#ffffff', '#f5f5f5'] // Light mode: white and light grey
      : ['#1b1b1b', '#2f2f2f']; // Dark mode: dark grey
    const index = soIndex >= 0 ? soIndex : 0;
    return rowColors[index % rowColors.length];
  };

  // Get row color for expenses (selang-seling berdasarkan theme)
  const getExpenseRowColor = (expenseNo: string): string => {
    const expenseIndex = filteredExpenses.findIndex((e: any) => e.expenseNo === expenseNo);
    // Detect theme mode
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light' || 
                       !document.documentElement.getAttribute('data-theme');
    if (isLightMode) {
      return expenseIndex % 2 === 0 ? '#ffffff' : '#f5f5f5'; // Light mode: white and light grey
    } else {
      return expenseIndex % 2 === 0 ? '#1a1a1a' : '#1f1f1f'; // Dark mode: dark grey
    }
  };

  const expenseColumns = [
    { key: 'expenseNo', header: 'Expense No' },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => `Rp ${(item.amount || 0).toLocaleString('id-ID')}`,
    },
    { key: 'paidBy', header: 'Paid By' },
    { key: 'expenseDate', header: 'Expense Date' },
    { key: 'receiptProof', header: 'Receipt Proof' },
    { key: 'notes', header: 'Notes' },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => handleEditExpense(item)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDeleteExpense(item)}>Delete</Button>
        </div>
      ),
    },
  ];

  // Format notifications untuk NotificationBell
  const invoiceNotifBell = useMemo(() => {
    return invoiceNotifications.map((notif: any) => ({
      id: notif.id,
      title: `Invoice ${notif.sjNo || notif.soNo || 'New'}`,
      message: `SO: ${notif.soNo || '-'} | SJ: ${notif.sjNo || '-'} | Customer: ${notif.customer || '-'}`,
      notif: notif,
    }));
  }, [invoiceNotifications]);

  return (
    <div className="module-compact" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', minHeight: '600px', overflow: 'hidden' }}>
      <div className="page-header">
        <h1>Accounting</h1>
      </div>

      <Card style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '16px', overflow: 'hidden' }}>
          {/* Tab Container dengan NotificationBell */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexShrink: 0 }}>
            <div className="tab-container" style={{ marginBottom: 0 }}>
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
            {invoiceNotifications.length > 0 && (
              <NotificationBell
                notifications={invoiceNotifBell}
                onNotificationClick={(notification) => {
                  if (notification.notif) {
                    handleCreateInvoice(notification.notif);
                  }
                }}
                icon="📧"
                emptyMessage="Tidak ada notifikasi invoice"
              />
            )}
          </div>

          {/* Tab Content */}
          <div className="tab-content" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'invoices' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Header dengan Search dan Create Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <Input
                      label="Search & Filter"
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search by Invoice No, Customer, SO No, Status, Payment Terms, SJ No..."
                    />
                  </div>
                  <Button 
                    variant="primary" 
                    onClick={() => setShowCreateInvoiceDialog(true)}
                    style={{ fontSize: '13px', padding: '6px 12px', flexShrink: 0 }}
                  >
                    ➕ Create Invoice
                  </Button>
                </div>

                {/* Table Container */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <Table 
                      columns={invoiceColumns} 
                      data={filteredInvoices} 
                      emptyMessage={searchQuery ? "No invoices found matching your search" : "No invoices"}
                      getRowStyle={(item: any) => ({
                        backgroundColor: getInvoiceRowColor(item.soNo),
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'expenses' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Search Input */}
                <div style={{ marginBottom: '12px', flexShrink: 0 }}>
                  <Input
                    label="Search & Filter"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by Expense No, Category, Description, Paid By, Amount..."
                  />
                </div>
                {/* Table Container */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <Table 
                      columns={expenseColumns} 
                      data={filteredExpenses} 
                      emptyMessage={searchQuery ? "No expenses found matching your search" : "No expenses"}
                      getRowStyle={(item: any) => ({
                        backgroundColor: getExpenseRowColor(item.expenseNo || item.id || ''),
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* PDF Preview Dialog */}
      {viewPdfData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}
          onClick={() => setViewPdfData(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview Invoice - {viewPdfData.invoiceNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleShowPageSizeDialog}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setViewPdfData(null)}>
                    ✕ Close
                  </Button>
                </div>
              </div>
              <iframe
                srcDoc={viewPdfData.html}
                style={{
                  width: '100%',
                  height: '70vh',
                  border: 'none',
                  backgroundColor: '#fff',
                }}
                title="PDF Preview"
              />
            </Card>
          </div>
        </div>
      )}

      {/* Signature Viewer Modal untuk Image */}
      {signatureViewer && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 10001,
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setSignatureViewer(null)}
        >
          {/* Header */}
          <div 
            style={{
              padding: '16px 24px',
              backgroundColor: 'rgba(30, 30, 30, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}>
                📄
              </div>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#fff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}>
                  {signatureViewer.fileName}
                </h3>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginTop: '2px',
                }}>
                  Image Document
                </div>
              </div>
            </div>
            <button
              onClick={() => setSignatureViewer(null)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
          </div>

          {/* Content Area */}
          <div 
            style={{
              flex: 1,
              padding: '20px',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              backgroundColor: '#1a1a1a',
              padding: '20px',
            }}>
              <img
                src={signatureViewer.data}
                alt={signatureViewer.fileName}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 200px)',
                  display: 'block',
                  margin: '0 auto',
                  borderRadius: '8px',
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div 
            style={{
              padding: '16px 24px',
              backgroundColor: 'rgba(30, 30, 30, 0.95)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              backdropFilter: 'blur(10px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSignatureViewer(null)}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Edit Invoice Dialog */}
      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
      {showPageSizeDialog && (
        <PageSizeDialog
          defaultSize="A4"
          onConfirm={(size) => {
            setShowPageSizeDialog(false);
            handleSaveToPDF(size);
          }}
          onCancel={() => setShowPageSizeDialog(false)}
        />
      )}

      {showCreateInvoiceDialog && (
        <CreateInvoiceDialog
          invoices={invoices}
          onClose={() => setShowCreateInvoiceDialog(false)}
          onCreate={async (data: { soNos?: string[]; sjNos?: string[]; manualData?: any }) => {
            if (data.soNos && data.soNos.length > 0) {
              // Create invoice dari SO yang dipilih
              await handleCreateManualInvoice(data.manualData, data.soNos);
            } else if (data.sjNos && data.sjNos.length > 0) {
              // Create invoice dari DN yang dipilih (gunakan manualData dari DN)
              if (data.manualData) {
                await handleCreateManualInvoice(data.manualData, undefined, data.sjNos);
              } else {
                // Fallback: create invoice untuk setiap DN yang dipilih (old method)
                for (const sjNo of data.sjNos) {
                  const notif = invoiceNotifications.find((n: any) => n.sjNo === sjNo);
                  const item = notif || { sjNo };
                  await handleCreateInvoice(item);
                }
              }
            } else if (data.manualData) {
              // Create manual invoice
              await handleCreateManualInvoice(data.manualData);
            }
            // Reload data untuk update list SO dan notifikasi
            await loadData();
            setShowCreateInvoiceDialog(false);
          }}
        />
      )}

      {editingInvoice && (
        <EditInvoiceDialog
          invoice={editingInvoice}
          customers={customers}
          products={products}
          salesOrders={salesOrders}
          onClose={() => setEditingInvoice(null)}
          onSave={async (updatedData) => {
            const updated = invoices.map(inv =>
              inv.id === editingInvoice.id ? { ...inv, ...updatedData } : inv
            );
            await storageService.set('invoices', updated);
            setInvoices(updated);
            setEditingInvoice(null);
            showAlert('✅ Invoice updated', 'Success');
            await loadData();
          }}
        />
      )}

      {/* Update Invoice (Upload Bukti Transfer) Dialog */}
      {updatingInvoice && (
        <UpdateInvoiceDialog
          invoice={updatingInvoice}
          onClose={() => setUpdatingInvoice(null)}
          showAlert={showAlert}
          onSave={async (paymentProof: string, paymentProofName: string) => {
            const updated = invoices.map(inv =>
              inv.id === updatingInvoice.id
                ? {
                    ...inv,
                    status: 'CLOSE' as const,
                    paymentProof: paymentProof,
                    paymentProofName: paymentProofName,
                    paidAt: new Date().toISOString(),
                  }
                : inv
            );
            await storageService.set('invoices', updated);
            setInvoices(updated);
            
            // Create payment record untuk AR tracking
            try {
              const invoiceTotal = updatingInvoice.bom?.total || 0;
              const existingPayments = await storageService.get<any[]>('payments') || [];
              
              // Cek apakah payment record sudah ada
              const existingPayment = existingPayments.find((p: any) => 
                p.invoiceNo === updatingInvoice.invoiceNo && p.type === 'Receipt'
              );
              
              if (!existingPayment) {
                // Create payment record
                const paymentNo = `RCP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(existingPayments.length + 1).padStart(4, '0')}`;
                const newPayment = {
                  id: Date.now().toString(),
                  paymentNo: paymentNo,
                  paymentDate: new Date().toISOString().split('T')[0],
                  type: 'Receipt',
                  invoiceNo: updatingInvoice.invoiceNo,
                  customer: updatingInvoice.customer,
                  customerName: updatingInvoice.customer,
                  amount: invoiceTotal,
                  paymentMethod: 'Bank Transfer',
                  reference: updatingInvoice.invoiceNo,
                  notes: `Payment for Invoice ${updatingInvoice.invoiceNo}`,
                  created: new Date().toISOString(),
                };
                
                await storageService.set('payments', [...existingPayments, newPayment]);
              }
            } catch (error: any) {
              console.error('Error creating payment record:', error);
            }
            
            // Auto-create journal entries untuk payment (Cash + AR)
            try {
              const journalEntries = await storageService.get<any[]>('journalEntries') || [];
              const accounts = await storageService.get<any[]>('accounts') || [];
              const invoiceTotal = updatingInvoice.bom?.total || 0;
              const entryDate = new Date().toISOString().split('T')[0];
              
              const cashAccount = accounts.find((a: any) => a.code === '1000') || { code: '1000', name: 'Cash' };
              const arAccount = accounts.find((a: any) => a.code === '1100') || { code: '1100', name: 'Accounts Receivable' };
              
              // Gunakan reference yang berbeda untuk payment (PAYMENT-{invoiceNo})
              const paymentReference = `PAYMENT-${updatingInvoice.invoiceNo}`;
              
              // Create journal entries: Debit Cash, Credit AR
              // Pastikan kedua entries dibuat bersamaan untuk balance
              const hasPaymentEntry = journalEntries.some((entry: any) =>
                entry.reference === paymentReference &&
                (entry.account === '1000' || entry.account === '1100')
              );

              if (!hasPaymentEntry) {
                const entriesToAdd = [
                  {
                    entryDate,
                    reference: paymentReference,
                    account: '1000',
                    accountName: cashAccount.name,
                    debit: invoiceTotal,
                    credit: 0,
                    description: `Payment received for Invoice ${updatingInvoice.invoiceNo} - ${updatingInvoice.customer}`,
                  },
                  {
                    entryDate,
                    reference: paymentReference,
                    account: '1100',
                    accountName: arAccount.name,
                    debit: 0,
                    credit: invoiceTotal,
                    description: `Payment received for Invoice ${updatingInvoice.invoiceNo} - ${updatingInvoice.customer}`,
                  },
                ];

                const baseLength = journalEntries.length;
                const entriesWithNo = entriesToAdd.map((entry, idx) => ({
                  ...entry,
                  id: `${Date.now()}-${idx + 1}`,
                  no: baseLength + idx + 1,
                }));
                await storageService.set('journalEntries', [...journalEntries, ...entriesWithNo]);
              }
            } catch (error: any) {
              console.error('Error creating journal entries for payment:', error);
            }
            
            // Auto-close SO dan SPK saat invoice dibayar
            if (updatingInvoice.soNo) {
              const salesOrders = await storageService.get<any[]>('salesOrders') || [];
              const updatedSOs = salesOrders.map(so =>
                so.soNo === updatingInvoice.soNo && so.status === 'OPEN'
                  ? { ...so, status: 'CLOSE' as const }
                  : so
              );
              await storageService.set('salesOrders', updatedSOs);
              
              // Auto-close SPK yang terkait dengan SO ini
              const spkList = await storageService.get<any[]>('spk') || [];
              const updatedSPKs = spkList.map((spk: any) =>
                spk.soNo === updatingInvoice.soNo && (spk.status === 'OPEN' || spk.status === 'DRAFT')
                  ? { ...spk, status: 'CLOSE' as const }
                  : spk
              );
              await storageService.set('spk', updatedSPKs);
              
              const closedSPKCount = updatedSPKs.filter((s: any) => 
                s.soNo === updatingInvoice.soNo && s.status === 'CLOSE'
              ).length;
              
              setUpdatingInvoice(null);
              showAlert(`✅ Bukti transfer uploaded\n\n✅ Invoice ${updatingInvoice.invoiceNo} status updated to CLOSE\n✅ SO ${updatingInvoice.soNo} automatically closed\n✅ ${closedSPKCount} SPK(s) automatically closed`, 'Success');
            } else {
              setUpdatingInvoice(null);
              showAlert(`✅ Bukti transfer uploaded\n\n✅ Invoice ${updatingInvoice.invoiceNo} status updated to CLOSE`, 'Success');
            }
            
            await loadData();
          }}
        />
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            backgroundColor:
              toast.variant === 'success'
                ? 'rgba(46, 125, 50, 0.95)'
                : toast.variant === 'error'
                ? 'rgba(211, 47, 47, 0.95)'
                : 'rgba(66, 66, 66, 0.95)',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 12000,
            minWidth: '240px',
            fontSize: '14px',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

// Edit Invoice Dialog Component
const EditInvoiceDialog = ({ 
  invoice, 
  products, 
  onClose, 
  onSave 
}: { 
  invoice: any; 
  customers: any[]; 
  products: any[]; 
  salesOrders: any[]; 
  onClose: () => void; 
  onSave: (data: any) => Promise<void> 
}) => {
  const [lines, setLines] = useState<any[]>(invoice.lines || []);
  const [qtyInputValues, setQtyInputValues] = useState<{ [key: number]: string }>({});
  const [priceInputValues, setPriceInputValues] = useState<{ [key: number]: string }>({});
  
  // Initialize BOM dengan menghitung discountPercent dan taxPercent dari nilai yang ada
  const initialBom = invoice.bom || {};
  // Ensure invoice.lines is always an array
  const invoiceLinesArray = Array.isArray(invoice.lines) ? invoice.lines : [];
  const initialSubtotal = invoiceLinesArray.reduce((sum: number, line: any) => 
    sum + (Number(line.qty || 0) * Number(line.price || 0)), 0
  );
  const initialDiscount = initialBom.discount || 0;
  const initialTax = initialBom.tax || 0;
  const initialDiscountPercent = initialSubtotal > 0 ? (initialDiscount / initialSubtotal) * 100 : 0;
  const initialTaxPercent = initialSubtotal > 0 ? (initialTax / initialSubtotal) * 100 : 0;
  
  const [bom, setBom] = useState<any>({
    ...initialBom,
    subtotal: initialSubtotal,
    discount: initialDiscount,
    discountPercent: initialDiscountPercent,
    tax: initialTax,
    taxPercent: initialTaxPercent,
    biayaLain: initialBom.biayaLain || 0,
    tanggalJt: initialBom.tanggalJt || '',
    dpPo: initialBom.dpPo || 0,
    tunai: initialBom.tunai || 0,
    kredit: initialBom.kredit || 0,
    kDebet: initialBom.kDebet || 0,
    kKredit: initialBom.kKredit || 0,
    kembaliKeKasir: initialBom.kembaliKeKasir || 0,
  });
  const [paymentTerms, setPaymentTerms] = useState(invoice.paymentTerms || 'TOP');
  const [topDays, setTopDays] = useState(invoice.topDays || 30);
  const [notes, setNotes] = useState(invoice.notes || '');
  const [templateType, setTemplateType] = useState(invoice.templateType || 'template1');

  // Helper function to calculate due date based on payment terms
  const calculateDueDate = (terms: string, days: number): string => {
    const today = new Date();
    if (terms === 'TOP' && days > 0) {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + days);
      return dueDate.toISOString();
    } else if (terms === 'COD' || terms === 'CBD') {
      // COD/CBD: same day as invoice
      return today.toISOString();
    }
    return '';
  };

  // Auto-update tanggal jatuh tempo when payment terms or topDays change (only on mount or when changed)
  useEffect(() => {
    const newDueDate = calculateDueDate(paymentTerms, topDays);
    if (newDueDate) {
      // Only update if different from current value
      const currentDate = bom.tanggalJt ? new Date(bom.tanggalJt).toISOString().split('T')[0] : '';
      const newDate = newDueDate.split('T')[0];
      if (currentDate !== newDate) {
        handleBomChange('tanggalJt', newDueDate);
      }
    }
  }, [paymentTerms, topDays]);

  // Helper function untuk remove leading zero dari input angka
  const removeLeadingZero = (value: string): string => {
    if (!value) return value;
    // Jika hanya "0", "0.", atau "0," biarkan
    if (value === '0' || value === '0.' || value === '0,') {
      return value;
    }
    // Hapus semua leading zero kecuali untuk "0." atau "0,"
    if (value.startsWith('0') && value.length > 1) {
      // Jika dimulai dengan "0." atau "0," biarkan
      if (value.startsWith('0.') || value.startsWith('0,')) {
        return value;
      }
      // Hapus semua leading zero
      const cleaned = value.replace(/^0+/, '');
      return cleaned || '0';
    }
    return value;
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate price if qty or price changed
    if (field === 'qty' || field === 'price') {
      updated[index].subtotal = Number(updated[index].qty || 0) * Number(updated[index].price || 0);
    }
    
    setLines(updated);
    recalculateTotals(updated, bom);
  };

  const handleAddLine = () => {
    setLines([...lines, { itemSku: '', qty: 0, price: 0, subtotal: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    const updated = lines.filter((_, i) => i !== index);
    setLines(updated);
    recalculateTotals(updated, bom);
  };

  const recalculateTotals = (currentLines: any[], currentBom: any) => {
    const subtotal = currentLines.reduce((sum, line) => sum + (Number(line.qty || 0) * Number(line.price || 0)), 0);
    const discount = currentBom.discount || 0;
    const tax = currentBom.tax || 0;
    const biayaLain = currentBom.biayaLain || 0;
    const total = subtotal - discount + tax + biayaLain;
    
    setBom({
      ...currentBom,
      subtotal,
      total,
    });
  };

  const handleBomChange = (field: string, value: any) => {
    const updated = { ...bom, [field]: value };
    setBom(updated);
    recalculateTotals(lines, updated);
  };

  const handleSave = () => {
    onSave({
      lines,
      bom,
      paymentTerms,
      topDays,
      notes,
      templateType,
    });
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1000px', maxHeight: '90vh', overflow: 'auto' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Edit Invoice - {invoice.invoiceNo}</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Invoice Lines</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>SKU</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const product = products.find((p: any) => 
                    p.sku === line.itemSku || p.kode === line.itemSku || p.id === line.itemSku
                  );
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={line.itemSku || ''}
                          onChange={(e) => handleLineChange(idx, 'itemSku', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                          }}
                          placeholder="SKU"
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {product?.nama || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={qtyInputValues[idx] !== undefined ? qtyInputValues[idx] : (line.qty !== undefined && line.qty !== null && line.qty !== 0 ? String(line.qty) : '')}
                          onFocus={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentQty = line.qty;
                            if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                              setQtyInputValues(prev => ({ ...prev, [idx]: '' }));
                              input.value = '';
                            } else {
                              input.select();
                            }
                          }}
                          onMouseDown={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentQty = line.qty;
                            if (currentQty === 0 || currentQty === null || currentQty === undefined || String(currentQty) === '0') {
                              setQtyInputValues(prev => ({ ...prev, [idx]: '' }));
                              input.value = '';
                            }
                          }}
                          onChange={(e) => {
                            let val = e.target.value;
                            val = val.replace(/[^\d.,]/g, '');
                            const cleaned = removeLeadingZero(val);
                            setQtyInputValues(prev => ({ ...prev, [idx]: cleaned }));
                            handleLineChange(idx, 'qty', cleaned === '' ? 0 : Number(cleaned) || 0);
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                              handleLineChange(idx, 'qty', 0);
                              setQtyInputValues(prev => {
                                const newVal = { ...prev };
                                delete newVal[idx];
                                return newVal;
                              });
                            } else {
                              handleLineChange(idx, 'qty', Number(val));
                              setQtyInputValues(prev => {
                                const newVal = { ...prev };
                                delete newVal[idx];
                                return newVal;
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentVal = input.value;
                            if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                              e.preventDefault();
                              const newVal = e.key;
                              setQtyInputValues(prev => ({ ...prev, [idx]: newVal }));
                              input.value = newVal;
                              handleLineChange(idx, 'qty', Number(newVal));
                            }
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={priceInputValues[idx] !== undefined ? priceInputValues[idx] : (line.price !== undefined && line.price !== null && line.price !== 0 ? String(line.price) : '')}
                          onFocus={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentPrice = line.price;
                            if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                              setPriceInputValues(prev => ({ ...prev, [idx]: '' }));
                              input.value = '';
                            } else {
                              input.select();
                            }
                          }}
                          onMouseDown={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentPrice = line.price;
                            if (currentPrice === 0 || currentPrice === null || currentPrice === undefined || String(currentPrice) === '0') {
                              setPriceInputValues(prev => ({ ...prev, [idx]: '' }));
                              input.value = '';
                            }
                          }}
                          onChange={(e) => {
                            let val = e.target.value;
                            val = val.replace(/[^\d.,]/g, '');
                            const cleaned = removeLeadingZero(val);
                            setPriceInputValues(prev => ({ ...prev, [idx]: cleaned }));
                            handleLineChange(idx, 'price', cleaned === '' ? 0 : Number(cleaned) || 0);
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                              handleLineChange(idx, 'price', 0);
                              setPriceInputValues(prev => {
                                const newVal = { ...prev };
                                delete newVal[idx];
                                return newVal;
                              });
                            } else {
                              handleLineChange(idx, 'price', Number(val));
                              setPriceInputValues(prev => {
                                const newVal = { ...prev };
                                delete newVal[idx];
                                return newVal;
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            const input = e.target as HTMLInputElement;
                            const currentVal = input.value;
                            if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                              e.preventDefault();
                              const newVal = e.key;
                              setPriceInputValues(prev => ({ ...prev, [idx]: newVal }));
                              input.value = newVal;
                              handleLineChange(idx, 'price', Number(newVal));
                            }
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {Number(line.qty || 0) * Number(line.price || 0)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <Button 
                          variant="danger" 
                          onClick={() => handleRemoveLine(idx)}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          Del
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Button variant="secondary" onClick={handleAddLine} style={{ fontSize: '12px', padding: '6px 12px' }}>
              + Add Line
            </Button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>BOM & Calculation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Discount (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bom.discountPercent === 0 || !bom.discountPercent ? '' : bom.discountPercent}
                  onChange={(e) => {
                    const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                    const discount = (bom.subtotal || 0) * (percent / 100);
                    handleBomChange('discountPercent', percent);
                    handleBomChange('discount', discount);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Discount (Rp)
                </label>
                <input
                  type="number"
                  value={bom.discount === 0 || !bom.discount ? '' : bom.discount}
                  onChange={(e) => {
                    const discount = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                    const percent = (bom.subtotal || 0) > 0 ? (discount / (bom.subtotal || 1)) * 100 : 0;
                    handleBomChange('discount', discount);
                    handleBomChange('discountPercent', percent);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tax (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bom.taxPercent === 0 || !bom.taxPercent ? '' : bom.taxPercent}
                  onChange={(e) => {
                    const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                    const tax = (bom.subtotal || 0) * (percent / 100);
                    handleBomChange('taxPercent', percent);
                    handleBomChange('tax', tax);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tax (Rp)
                </label>
                <input
                  type="number"
                  value={bom.tax === 0 || !bom.tax ? '' : bom.tax}
                  onChange={(e) => {
                    const tax = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                    const percent = (bom.subtotal || 0) > 0 ? (tax / (bom.subtotal || 1)) * 100 : 0;
                    handleBomChange('tax', tax);
                    handleBomChange('taxPercent', percent);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Biaya Lain
                </label>
                <input
                  type="number"
                  value={bom.biayaLain === 0 || !bom.biayaLain ? '' : bom.biayaLain}
                  onChange={(e) => handleBomChange('biayaLain', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => {
                    const newTerms = e.target.value;
                    setPaymentTerms(newTerms);
                    let newDays = topDays;
                    if (newTerms === 'COD' || newTerms === 'CBD') {
                      newDays = 0;
                      setTopDays(0);
                    }
                    // Auto-update tanggal jatuh tempo
                    const newDueDate = calculateDueDate(newTerms, newDays);
                    if (newDueDate) {
                      handleBomChange('tanggalJt', newDueDate);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="TOP">TOP</option>
                  <option value="COD">COD</option>
                  <option value="CBD">CBD</option>
                </select>
              </div>
              {paymentTerms === 'TOP' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    TOP Days
                  </label>
                  <input
                    type="number"
                    value={topDays === 0 ? '' : topDays}
                    onChange={(e) => {
                      const newDays = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                      setTopDays(newDays);
                      // Auto-update tanggal jatuh tempo
                      const newDueDate = calculateDueDate('TOP', newDays);
                      if (newDueDate) {
                        handleBomChange('tanggalJt', newDueDate);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tanggal Jatuh Tempo
                </label>
                <input
                  type="date"
                  value={bom.tanggalJt ? new Date(bom.tanggalJt).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleBomChange('tanggalJt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  DP PO
                </label>
                <input
                  type="number"
                  value={bom.dpPo === 0 || !bom.dpPo ? '' : bom.dpPo}
                  onChange={(e) => handleBomChange('dpPo', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Tunai
                </label>
                <input
                  type="number"
                  value={bom.tunai === 0 || !bom.tunai ? '' : bom.tunai}
                  onChange={(e) => handleBomChange('tunai', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Kredit
                </label>
                <input
                  type="number"
                  value={bom.kredit === 0 || !bom.kredit ? '' : bom.kredit}
                  onChange={(e) => handleBomChange('kredit', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  K.Debet
                </label>
                <input
                  type="number"
                  value={bom.kDebet === 0 || !bom.kDebet ? '' : bom.kDebet}
                  onChange={(e) => handleBomChange('kDebet', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  K.Kredit
                </label>
                <input
                  type="number"
                  value={bom.kKredit === 0 || !bom.kKredit ? '' : bom.kKredit}
                  onChange={(e) => handleBomChange('kKredit', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Kembali
                </label>
                <input
                  type="number"
                  value={bom.kembaliKeKasir === 0 || !bom.kembaliKeKasir ? '' : bom.kembaliKeKasir}
                  onChange={(e) => handleBomChange('kembaliKeKasir', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Subtotal:</span>
                <strong>{bom.subtotal?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Discount ({bom.discountPercent?.toFixed(2) || 0}%):</span>
                <strong>{bom.discount?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tax ({bom.taxPercent?.toFixed(2) || 0}%):</span>
                <strong>{bom.tax?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Biaya Lain:</span>
                <strong>{bom.biayaLain?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tanggal Jatuh Tempo:</span>
                <strong>{bom.tanggalJt ? new Date(bom.tanggalJt).toLocaleDateString('id-ID') : '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)', marginBottom: '8px' }}>
                <span><strong>Total:</strong></span>
                <strong>{bom.total?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>DP PO:</span>
                <strong>{bom.dpPo?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tunai:</span>
                <strong>{bom.tunai?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Kredit:</span>
                <strong>{bom.kredit?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>K.Debet:</span>
                <strong>{bom.kDebet?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>K.Kredit:</span>
                <strong>{bom.kKredit?.toLocaleString('id-ID') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Kembali:</span>
                <strong>{bom.kembaliKeKasir?.toLocaleString('id-ID') || 0}</strong>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              📄 Pilih Template Invoice
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setTemplateType('template1')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: `2px solid ${templateType === 'template1' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  backgroundColor: templateType === 'template1' ? 'var(--primary-color)' : 'var(--bg-primary)',
                  color: templateType === 'template1' ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: templateType === 'template1' ? '600' : '400',
                  transition: 'all 0.2s',
                }}
              >
                Template 1 (Default)
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('template2')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: `2px solid ${templateType === 'template2' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  backgroundColor: templateType === 'template2' ? 'var(--primary-color)' : 'var(--bg-primary)',
                  color: templateType === 'template2' ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: templateType === 'template2' ? '600' : '400',
                  transition: 'all 0.2s',
                }}
              >
                Template 2 (Baru) ✨
              </button>
            </div>
          </div>

          {/* Notes/Keterangan Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Keterangan / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Masukkan keterangan atau catatan untuk invoice ini (bisa sepanjang apapun, bahkan sampai 100 lembar)..."
              rows={10}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '200px',
                maxHeight: 'none',
                overflowY: 'auto',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>Save Changes</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Update Invoice (Upload Bukti Transfer) Dialog Component
const UpdateInvoiceDialog = ({ 
  invoice, 
  onClose, 
  onSave,
  showAlert: parentShowAlert
}: { 
  invoice: any; 
  onClose: () => void; 
  onSave: (paymentProof: string, paymentProofName: string) => Promise<void>;
  showAlert: (message: string, title?: string) => void;
}) => {
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentFile(file);
    }
  };

  const handleSave = async () => {
    if (!paymentFile) {
      parentShowAlert('⚠️ Please upload bukti transfer customer', 'Warning');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await onSave(base64, paymentFile.name);
      };
      reader.readAsDataURL(paymentFile);
    } catch (error: any) {
      parentShowAlert(`Error uploading file: ${error.message}`, 'Error');
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Upload Bukti Transfer - {invoice.invoiceNo}</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Invoice No:</strong> {invoice.invoiceNo}
            </div>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Customer:</strong> {invoice.customer}
            </div>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              <strong>Total:</strong> Rp {invoice.bom?.total?.toLocaleString('id-ID') || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              ⚠️ Setelah upload bukti transfer, status invoice akan otomatis menjadi CLOSE
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              Upload Bukti Transfer Customer *
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
            {paymentFile && (
              <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>
                Selected: {paymentFile.name}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>
              Upload & Close Invoice
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Create Invoice Dialog Component untuk Packaging
const CreateInvoiceDialog = ({
  invoices,
  onClose,
  onCreate
}: {
  invoices: any[];
  onClose: () => void;
  onCreate: (data: { soNos?: string[]; sjNos?: string[]; manualData?: any }) => Promise<void>;
}) => {
  const [salesOrderList, setSalesOrderList] = useState<any[]>([]);
  const [deliveryNoteList, setDeliveryNoteList] = useState<any[]>([]);
  const [selectedSOs, setSelectedSOs] = useState<string[]>([]);
  const [selectedSJs, setSelectedSJs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'so' | 'sj' | 'manual'>('manual');
  
  // Auto-populated data dari SO yang dipilih
  const [autoCustomer, setAutoCustomer] = useState('');
  const [autoCustomerAddress, setAutoCustomerAddress] = useState('');
  const [autoCustomerNpwp, setAutoCustomerNpwp] = useState('');
  const [autoItems, setAutoItems] = useState<Array<{ sku: string; product: string; qty: number; price: number; unit?: string }>>([]);
  const [autoNotes, setAutoNotes] = useState('');
  
  // Auto-populated data dari DN yang dipilih
  const [autoDNCustomer, setAutoDNCustomer] = useState('');
  const [autoDNCustomerAddress, setAutoDNCustomerAddress] = useState('');
  const [autoDNCustomerNpwp, setAutoDNCustomerNpwp] = useState('');
  const [autoDNItems, setAutoDNItems] = useState<Array<{ sku: string; product: string; qty: number; price: number; unit?: string; soNo?: string }>>([]);
  const [autoDNNotes, setAutoDNNotes] = useState('');
  
  // Manual input fields
  const [manualCustomer, setManualCustomer] = useState('');
  const [manualCustomerAddress, setManualCustomerAddress] = useState('');
  const [manualCustomerNpwp, setManualCustomerNpwp] = useState('');
  const [manualItems, setManualItems] = useState<Array<{ sku: string; product: string; qty: number; price: number }>>([{ sku: '', product: '', qty: 1, price: 0 }]);
  const [manualNotes, setManualNotes] = useState('');
  
  // Calculation fields (untuk semua mode)
  const [calculation, setCalculation] = useState({
    subtotal: 0,
    discount: 0,
    discountPercent: 0,
    tax: 0,
    taxPercent: 0,
    biayaLain: 0,
    total: 0,
    tanggalJt: '',
    dpPo: 0,
    tunai: 0,
    kredit: 0,
    kDebet: 0,
    kKredit: 0,
    kembaliKeKasir: 0,
  });
  
  // Payment terms
  const [paymentTerms, setPaymentTerms] = useState('TOP');
  const [topDays, setTopDays] = useState(30);
  const [templateType, setTemplateType] = useState('template1');
  const [productCodeDisplay, setProductCodeDisplay] = useState<'padCode' | 'productId'>('padCode');
  
  // Helper function to calculate due date based on payment terms
  const calculateDueDate = (terms: string, days: number): string => {
    const today = new Date();
    if (terms === 'TOP' && days > 0) {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + days);
      return dueDate.toISOString();
    } else if (terms === 'COD' || terms === 'CBD') {
      // COD/CBD: same day as invoice
      return today.toISOString();
    }
    return '';
  };
  
  // Auto-update tanggal jatuh tempo when payment terms or topDays change
  useEffect(() => {
    const newDueDate = calculateDueDate(paymentTerms, topDays);
    if (newDueDate) {
      handleCalculationChange('tanggalJt', newDueDate);
    }
  }, [paymentTerms, topDays]);
  
  // Customers list untuk dropdown
  const [customersList, setCustomersList] = useState<any[]>([]);
  
  // Use ref to track invoices snapshot when dialog opens to prevent re-render
  const invoicesSnapshotRef = useRef<any[]>([]);
  const initializedRef = useRef(false);

  // Reset refs when dialog closes
  const handleClose = () => {
    initializedRef.current = false;
    invoicesSnapshotRef.current = [];
    onClose();
  };

  useEffect(() => {
    // Only load data once when dialog opens, don't reload when invoices change (prevents input reset)
    if (initializedRef.current) {
      return; // Skip if already initialized
    }

    const loadData = async () => {
      try {
        // Snapshot invoices at dialog open time
        invoicesSnapshotRef.current = [...invoices]; // Create a copy
        
        const [soData, sjData, custData] = await Promise.all([
          storageService.get<any[]>('salesOrders') || [],
          storageService.get<any[]>('delivery') || [],
          storageService.get<any[]>('customers') || [],
        ]);
        
        // Filter: hanya yang belum di-delete dan belum ada invoice (gunakan snapshot)
        const activeSOs = (soData || []).filter((soItem: any) => {
          if (soItem?.deleted === true || soItem?.deleted === 'true' || soItem?.deletedAt) {
            return false;
          }
          // Filter: belum ada invoice untuk SO ini (gunakan snapshot)
          const hasInvoice = invoicesSnapshotRef.current.some((inv: any) => inv.soNo === soItem.soNo);
          return !hasInvoice;
        });
        
        const activeSJ = (sjData || []).filter((sj: any) => {
          if (sj?.deleted === true || sj?.deleted === 'true' || sj?.deletedAt) {
            return false;
          }
          const hasInvoice = invoicesSnapshotRef.current.some((inv: any) => inv.sjNo === sj.sjNo);
          return !hasInvoice;
        });
        
        setSalesOrderList(activeSOs);
        setDeliveryNoteList(activeSJ);
        setCustomersList(custData || []);
        initializedRef.current = true; // Mark as initialized
      } catch (error: any) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []); // Empty dependency - only run once when dialog opens
  
  // Auto-populate data ketika SO dipilih
  useEffect(() => {
    if (selectedSOs.length > 0 && mode === 'so') {
      const loadSOData = async () => {
        const soData = await storageService.get<any[]>('salesOrders') || [];
        const selectedSOItems = soData.filter((soItem: any) => selectedSOs.includes(soItem.soNo));
        
        if (selectedSOItems.length > 0) {
          // Ambil customer dari SO pertama
          const firstSO = selectedSOItems[0];
          setAutoCustomer(firstSO.customer || '');
          
          // Load customer details (load fresh setiap kali, tidak depend on customersList state)
          const custData = await storageService.get<any[]>('customers') || [];
          const customer = custData.find((c: any) => c.nama === firstSO.customer);
          if (customer) {
            setAutoCustomerAddress(customer.alamat || '');
            setAutoCustomerNpwp(customer.npwp || '');
          }
          
          // Gabungkan semua items dari semua SO yang dipilih
          const allItems: Array<{ sku: string; product: string; qty: number; price: number; unit?: string }> = [];
          let totalAmount = 0;
          
          selectedSOItems.forEach((soItem: any) => {
            const items = soItem.items || [];
            const totalQty = items.reduce((sum: number, itm: any) => sum + (Number(itm.qty) || 0), 0);
            
            items.forEach((item: any) => {
              const qty = Number(item.qty || 0);
              const price = Number(item.price || item.harga || 0);
              totalAmount += qty * price;
              
              allItems.push({
                sku: item.productId || item.productKode || '',
                product: item.productName || item.product || '',
                qty: qty,
                price: price,
                unit: item.unit || 'PCS',
              });
            });
          });
          
          setAutoItems(allItems);
          
          // Calculate initial calculation
          const subtotal = allItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
          setCalculation({
            subtotal,
            discount: 0,
            discountPercent: 0,
            tax: 0,
            taxPercent: 0,
            biayaLain: 0,
            total: subtotal,
            tanggalJt: '',
            dpPo: 0,
            tunai: 0,
            kredit: 0,
            kDebet: 0,
            kKredit: 0,
            kembaliKeKasir: 0,
          });
          
          // Gabungkan notes dari semua SO
          const notes = selectedSOItems.map((soItem: any) => {
            const soInfo = `SO: ${soItem.soNo}${soItem.notes ? ` - ${soItem.notes}` : ''}`;
            return soInfo;
          }).join('\n');
          setAutoNotes(notes);
        }
      };
      loadSOData();
    } else {
      // Reset ketika tidak ada SO yang dipilih
      setAutoCustomer('');
      setAutoItems([]);
      setAutoNotes('');
    }
  }, [selectedSOs, mode]); // Removed customersList from dependency to prevent re-render
  
  // Auto-populate data ketika DN dipilih
  useEffect(() => {
    if (selectedSJs.length > 0 && mode === 'sj') {
      const loadDNData = async () => {
        const dnData = await storageService.get<any[]>('delivery') || [];
        const selectedDNItems = dnData.filter((dnItem: any) => selectedSJs.includes(dnItem.sjNo));
        
        if (selectedDNItems.length > 0) {
          // Ambil customer dari DN pertama
          const firstDN = selectedDNItems[0];
          setAutoDNCustomer(firstDN.customer || '');
          
          // Load customer details (load fresh setiap kali)
          const custData = await storageService.get<any[]>('customers') || [];
          const customer = custData.find((c: any) => c.nama === firstDN.customer);
          if (customer) {
            setAutoDNCustomerAddress(customer.alamat || '');
            setAutoDNCustomerNpwp(customer.npwp || '');
          }
          
          // Gabungkan semua items dari semua DN yang dipilih (hanya items yang ada di DN)
          const allItems: Array<{ sku: string; product: string; qty: number; price: number; unit?: string; soNo?: string }> = [];
          
          // Load SO data untuk mengambil harga
          const soData = await storageService.get<any[]>('salesOrders') || [];
          // Load master products untuk fallback harga
          const productsData = await storageService.get<any[]>('products') || [];
          
          for (const dnItem of selectedDNItems) {
            // Ambil SO yang terkait dengan DN ini
            const relatedSO = soData.find((so: any) => so.soNo === dnItem.soNo);
            const soNo = dnItem.soNo || '';
            
            // Ambil items dari DN (bukan dari SO)
            const items = dnItem.items || [];
            
            for (const item of items) {
              const qty = Number(item.qty || item.qtyDelivered || 0);
              
              // Cari harga dari SO item yang sesuai
              let price = 0;
              const dnProductName = (item.productName || item.product || '').trim();
              const dnProductId = (item.productId || item.productKode || item.productCode || item.itemSku || '').toString().trim();
              
              if (relatedSO && relatedSO.items && Array.isArray(relatedSO.items)) {
                // Cari SO item dengan matching yang lebih fleksibel
                const soItem = relatedSO.items.find((soItem: any) => {
                  const soProductName = (soItem.productName || '').trim();
                  const soProductId = (soItem.productId || soItem.productKode || '').toString().trim();
                  
                  // Match berdasarkan nama product (case-insensitive)
                  if (dnProductName && soProductName && 
                      dnProductName.toLowerCase() === soProductName.toLowerCase()) {
                    return true;
                  }
                  
                  // Match berdasarkan productId/productKode
                  if (dnProductId && soProductId && dnProductId === soProductId) {
                    return true;
                  }
                  
                  // Match jika salah satu kosong tapi yang lain sama (partial match)
                  if (dnProductName && soProductName) {
                    if (dnProductName.toLowerCase().includes(soProductName.toLowerCase()) ||
                        soProductName.toLowerCase().includes(dnProductName.toLowerCase())) {
                      return true;
                    }
                  }
                  
                  return false;
                });
                
                if (soItem) {
                  price = Number(soItem.price || soItem.harga || 0);
                }
              }
              
              // Jika masih 0, coba ambil dari DN item
              if (price === 0) {
                price = Number(item.price || item.unitPrice || item.harga || 0);
              }
              
              // Jika masih 0, coba cari dari master products
              if (price === 0 && dnProductName) {
                const product = productsData.find((p: any) => {
                  const pName = (p.nama || '').trim().toLowerCase();
                  const pId = (p.product_id || p.kode || '').toString().trim();
                  return pName === dnProductName.toLowerCase() || pId === dnProductId;
                });
                if (product) {
                  price = Number(product.hargaSales || product.hargaFg || product.harga || 0);
                }
              }
              
              allItems.push({
                sku: item.productId || item.productKode || item.itemSku || '',
                product: item.productName || item.product || '',
                qty: qty,
                price: price,
                unit: item.unit || 'PCS',
                soNo: soNo,
              });
            }
          }
          
          setAutoDNItems(allItems);
          
          // Calculate initial calculation
          const subtotal = allItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
          setCalculation({
            subtotal,
            discount: 0,
            discountPercent: 0,
            tax: 0,
            taxPercent: 0,
            biayaLain: 0,
            total: subtotal,
            tanggalJt: '',
            dpPo: 0,
            tunai: 0,
            kredit: 0,
            kDebet: 0,
            kKredit: 0,
            kembaliKeKasir: 0,
          });
          
          // Gabungkan notes dari semua DN
          const notes = selectedDNItems.map((dnItem: any) => {
            const dnInfo = `DN: ${dnItem.sjNo}${dnItem.notes ? ` - ${dnItem.notes}` : ''}`;
            return dnInfo;
          }).join('\n');
          setAutoDNNotes(notes);
        }
      };
      loadDNData();
    } else if (mode === 'sj') {
      // Reset ketika tidak ada DN yang dipilih
      setAutoDNCustomer('');
      setAutoDNCustomerAddress('');
      setAutoDNCustomerNpwp('');
      setAutoDNItems([]);
      setAutoDNNotes('');
    }
  }, [selectedSJs, mode]); // Removed customersList from dependency to prevent re-render

  const handleSOToggle = (soNo: string) => {
    setSelectedSOs(prev => 
      prev.includes(soNo) 
        ? prev.filter(s => s !== soNo)
        : [...prev, soNo]
    );
  };

  const handleSJToggle = (sjNo: string) => {
    setSelectedSJs(prev => 
      prev.includes(sjNo) 
        ? prev.filter(s => s !== sjNo)
        : [...prev, sjNo]
    );
  };

  const handleAddManualItem = () => {
    setManualItems([...manualItems, { sku: '', product: '', qty: 1, price: 0 }]);
  };

  const handleRemoveManualItem = (index: number) => {
    setManualItems(manualItems.filter((_, i) => i !== index));
  };

  const handleManualItemChange = (index: number, field: string, value: any) => {
    const updated = [...manualItems];
    updated[index] = { ...updated[index], [field]: value };
    setManualItems(updated);
    recalculateCalculation(updated);
  };
  
  const recalculateCalculation = (items: Array<{ sku: string; product: string; qty: number; price: number }>) => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);
    const discount = calculation.discount || 0;
    const tax = calculation.tax || 0;
    const biayaLain = calculation.biayaLain || 0;
    const total = subtotal - discount + tax + biayaLain;
    
    setCalculation({
      ...calculation,
      subtotal,
      total,
    });
  };
  
  const handleCalculationChange = (field: string, value: any) => {
    const updated = { ...calculation, [field]: value };
    
    // Recalculate totals
    const subtotal = updated.subtotal || 0;
    const discount = updated.discount || 0;
    const tax = updated.tax || 0;
    const biayaLain = updated.biayaLain || 0;
    const total = subtotal - discount + tax + biayaLain;
    
    // Recalculate percentages
    const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
    const taxPercent = subtotal > 0 ? (tax / subtotal) * 100 : 0;
    
    setCalculation({
      ...updated,
      total,
      discountPercent,
      taxPercent,
    });
  };
  
  const handleCustomerSelect = (customerName: string) => {
    setManualCustomer(customerName);
    const customerData = customersList.find((c: any) => c.nama === customerName);
    if (customerData) {
      setManualCustomerAddress(customerData.alamat || '');
      setManualCustomerNpwp(customerData.npwp || '');
    }
  };

  const handleCreate = async () => {
    if (mode === 'so') {
      if (selectedSOs.length === 0) {
        alert('Please select at least one Sales Order');
        return;
      }
      if (!autoCustomer || autoItems.length === 0) {
        alert('Please wait for data to load from selected Sales Orders');
        return;
      }
      await onCreate({ 
        soNos: selectedSOs,
        manualData: {
          customer: autoCustomer,
          customerAddress: autoCustomerAddress,
          customerNpwp: autoCustomerNpwp,
          items: autoItems,
          notes: autoNotes,
          bom: calculation,
          paymentTerms,
          topDays,
          templateType,
          productCodeDisplay: productCodeDisplay,
        }
      });
    } else if (mode === 'sj') {
      if (selectedSJs.length === 0) {
        alert('Please select at least one Delivery Note');
        return;
      }
      // Gunakan data auto-populated dari DN
      if (!autoDNCustomer || autoDNItems.length === 0) {
        alert('Please wait for data to load from selected Delivery Notes');
        return;
      }
      await onCreate({ 
        sjNos: selectedSJs,
        manualData: {
          customer: autoDNCustomer,
          customerAddress: autoDNCustomerAddress,
          customerNpwp: autoDNCustomerNpwp,
          items: autoDNItems,
          notes: autoDNNotes,
          bom: calculation,
          paymentTerms,
          topDays,
          templateType,
          productCodeDisplay: productCodeDisplay,
        }
      });
    } else {
      if (!manualCustomer || manualItems.length === 0 || manualItems.some(item => !item.product)) {
        alert('Please fill in customer and at least one item with product name');
        return;
      }
      await onCreate({ 
        manualData: {
          customer: manualCustomer,
          customerAddress: manualCustomerAddress,
          customerNpwp: manualCustomerNpwp,
          items: manualItems,
          notes: manualNotes,
          bom: calculation,
          paymentTerms,
          topDays,
          templateType,
          productCodeDisplay: productCodeDisplay,
        }
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          padding: '16px',
          maxWidth: '1200px',
          width: '95%',
          maxHeight: '95vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>Create Invoice</h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <button
            onClick={() => setMode('so')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: mode === 'so' ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: mode === 'so' ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: mode === 'so' ? '600' : '400',
            }}
          >
            From Sales Order
          </button>
          <button
            onClick={() => setMode('sj')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: mode === 'sj' ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: mode === 'sj' ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: mode === 'sj' ? '600' : '400',
            }}
          >
            From Delivery Note
          </button>
          <button
            onClick={() => setMode('manual')}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: mode === 'manual' ? 'var(--accent-color)' : 'var(--bg-secondary)',
              color: mode === 'manual' ? '#fff' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: mode === 'manual' ? '600' : '400',
            }}
          >
            Manual Input
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : mode === 'so' ? (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '12px' }}>
                Select Sales Order(s) * (You can select multiple)
              </label>
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                border: '1px solid var(--border-color)', 
                borderRadius: '4px',
                padding: '8px',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                {salesOrderList.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No Sales Order available
                  </div>
                ) : (
                  salesOrderList.map((soItem: any) => (
                    <div 
                      key={soItem.soNo}
                      style={{
                        padding: '10px',
                        marginBottom: '8px',
                        borderRadius: '4px',
                        backgroundColor: selectedSOs.includes(soItem.soNo) ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                        border: selectedSOs.includes(soItem.soNo) ? '1px solid var(--accent-color)' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSOToggle(soItem.soNo)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedSOs.includes(soItem.soNo)}
                          onChange={() => handleSOToggle(soItem.soNo)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{soItem.soNo}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Customer: {soItem.customer || 'N/A'} | Status: {soItem.status || '-'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Items: {(soItem.items || []).length} item(s) | Qty: {(soItem.items || []).reduce((sum: number, itm: any) => sum + (itm.qty || 0), 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedSOs.length > 0 && autoItems.length > 0 && (
              <div style={{ 
                marginBottom: '10px', 
                padding: '8px', 
                backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)', fontSize: '11px' }}>
                  📋 Auto-populated Data:
                </div>
                <div style={{ marginBottom: '2px', fontSize: '11px' }}><strong>Customer:</strong> {autoCustomer || '-'}</div>
                <div style={{ marginBottom: '4px', fontSize: '11px' }}><strong>Items:</strong> {autoItems.length} item(s)</div>
                <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '10px' }}>
                  {autoItems.map((item, idx) => (
                    <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      {item.product} - Qty: {item.qty} {item.unit || 'PCS'} - Price: Rp {item.price.toLocaleString('id-ID')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calculation Fields for SO Mode */}
            {selectedSOs.length > 0 && autoItems.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Calculation</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.discountPercent === 0 ? '' : calculation.discountPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const discount = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('discountPercent', percent);
                        handleCalculationChange('discount', discount);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.discount === 0 ? '' : calculation.discount}
                      onChange={(e) => {
                        const discount = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (discount / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('discount', discount);
                        handleCalculationChange('discountPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.taxPercent === 0 ? '' : calculation.taxPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const tax = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('taxPercent', percent);
                        handleCalculationChange('tax', tax);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.tax === 0 ? '' : calculation.tax}
                      onChange={(e) => {
                        const tax = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (tax / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('tax', tax);
                        handleCalculationChange('taxPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Biaya Lain (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.biayaLain === 0 ? '' : calculation.biayaLain}
                      onChange={(e) => handleCalculationChange('biayaLain', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Subtotal:</span>
                    <strong>Rp {calculation.subtotal?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Discount ({calculation.discountPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.discount?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Tax ({calculation.taxPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.tax?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Biaya Lain:</span>
                    <strong>Rp {calculation.biayaLain?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                    <span><strong>Total:</strong></span>
                    <strong>Rp {calculation.total?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Terms */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => {
                    const newPaymentTerms = e.target.value;
                    setPaymentTerms(newPaymentTerms);
                    let newDays = topDays;
                    if (newPaymentTerms === 'COD' || newPaymentTerms === 'CBD') {
                      newDays = 0;
                      setTopDays(0);
                    } else if (newPaymentTerms === 'TOP' && topDays === 0) {
                      newDays = 30;
                      setTopDays(30);
                    }
                    // Auto-update tanggal jatuh tempo
                    const newDueDate = calculateDueDate(newPaymentTerms, newDays);
                    if (newDueDate) {
                      handleCalculationChange('tanggalJt', newDueDate);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="TOP">TOP</option>
                  <option value="COD">COD</option>
                  <option value="CBD">CBD</option>
                </select>
              </div>
              {paymentTerms === 'TOP' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>TOP Days</label>
                  <input
                    type="number"
                    value={topDays}
                    onChange={(e) => {
                      const newDays = Number(e.target.value) || 30;
                      setTopDays(newDays);
                      // Auto-update tanggal jatuh tempo
                      const newDueDate = calculateDueDate('TOP', newDays);
                      if (newDueDate) {
                        handleCalculationChange('tanggalJt', newDueDate);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}
            </div>
          </>
        ) : mode === 'sj' ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Select Delivery Note(s) * (You can select multiple)
              </label>
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                border: '1px solid var(--border-color)', 
                borderRadius: '4px',
                padding: '8px',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                {deliveryNoteList.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No Delivery Note available
                  </div>
                ) : (
                  deliveryNoteList.map((sj: any) => (
                    <div 
                      key={sj.sjNo}
                      style={{
                        padding: '10px',
                        marginBottom: '8px',
                        borderRadius: '4px',
                        backgroundColor: selectedSJs.includes(sj.sjNo) ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                        border: selectedSJs.includes(sj.sjNo) ? '1px solid var(--accent-color)' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSJToggle(sj.sjNo)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedSJs.includes(sj.sjNo)}
                          onChange={() => handleSJToggle(sj.sjNo)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{sj.sjNo}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            SO: {sj.soNo || 'N/A'} | Customer: {sj.customer || 'N/A'} | Status: {sj.status || '-'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {selectedSJs.length > 0 && autoDNItems.length > 0 && (
              <div style={{ 
                marginBottom: '10px', 
                padding: '8px', 
                backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)', fontSize: '11px' }}>
                  📋 Auto-populated Data from Delivery Note:
                </div>
                <div style={{ marginBottom: '2px', fontSize: '11px' }}><strong>Customer:</strong> {autoDNCustomer || '-'}</div>
                <div style={{ marginBottom: '2px', fontSize: '11px' }}><strong>Address:</strong> {autoDNCustomerAddress || '-'}</div>
                <div style={{ marginBottom: '4px', fontSize: '11px' }}><strong>NPWP:</strong> {autoDNCustomerNpwp || '-'}</div>
                <div style={{ marginBottom: '4px', fontSize: '11px' }}><strong>Items:</strong> {autoDNItems.length} item(s)</div>
                <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '10px' }}>
                  {autoDNItems.map((item, idx) => {
                    const totalItem = item.qty * item.price;
                    return (
                      <div key={idx} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        {item.product} {item.soNo && <span style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>(SO: {item.soNo})</span>} - Qty: {item.qty} {item.unit || 'PCS'} - Price: Rp {item.price.toLocaleString('id-ID')} - Total: Rp {totalItem.toLocaleString('id-ID')}
                      </div>
                    );
                  })}
                </div>
                {autoDNItems.length > 0 && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: '600' }}>
                    <strong>Subtotal:</strong> Rp {autoDNItems.reduce((sum, item) => sum + (item.qty * item.price), 0).toLocaleString('id-ID')}
                  </div>
                )}
                {autoDNNotes && (
                  <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                    <strong>Notes:</strong> {autoDNNotes}
                  </div>
                )}
              </div>
            )}

            {/* Calculation Fields for DN Mode */}
            {selectedSJs.length > 0 && autoDNItems.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Calculation</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.discountPercent === 0 ? '' : calculation.discountPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const discount = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('discountPercent', percent);
                        handleCalculationChange('discount', discount);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Discount (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.discount === 0 ? '' : calculation.discount}
                      onChange={(e) => {
                        const discount = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (discount / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('discount', discount);
                        handleCalculationChange('discountPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculation.taxPercent === 0 ? '' : calculation.taxPercent}
                      onChange={(e) => {
                        const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const tax = (calculation.subtotal || 0) * (percent / 100);
                        handleCalculationChange('taxPercent', percent);
                        handleCalculationChange('tax', tax);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Tax (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.tax === 0 ? '' : calculation.tax}
                      onChange={(e) => {
                        const tax = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                        const percent = (calculation.subtotal || 0) > 0 ? (tax / (calculation.subtotal || 1)) * 100 : 0;
                        handleCalculationChange('tax', tax);
                        handleCalculationChange('taxPercent', percent);
                      }}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>
                      Biaya Lain (Rp)
                    </label>
                    <input
                      type="number"
                      value={calculation.biayaLain === 0 ? '' : calculation.biayaLain}
                      onChange={(e) => handleCalculationChange('biayaLain', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Subtotal:</span>
                    <strong>Rp {calculation.subtotal?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Discount ({calculation.discountPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.discount?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Tax ({calculation.taxPercent?.toFixed(2) || 0}%):</span>
                    <strong>Rp {calculation.tax?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Biaya Lain:</span>
                    <strong>Rp {calculation.biayaLain?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                    <span><strong>Total:</strong></span>
                    <strong>Rp {calculation.total?.toLocaleString('id-ID') || 0}</strong>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Manual Input Mode */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Customer *</label>
              <input
                type="text"
                list="customer-list-manual"
                value={manualCustomer}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                placeholder="Select or type customer name"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              <datalist id="customer-list-manual">
                {customersList.map((c: any) => (
                  <option key={c.id} value={c.nama}>{c.nama}</option>
                ))}
              </datalist>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Customer Address</label>
              <input
                type="text"
                value={manualCustomerAddress}
                onChange={(e) => setManualCustomerAddress(e.target.value)}
                placeholder="Customer address"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Customer NPWP</label>
              <input
                type="text"
                value={manualCustomerNpwp}
                onChange={(e) => setManualCustomerNpwp(e.target.value)}
                placeholder="Customer NPWP"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Items *</label>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>SKU</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Product</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Qty</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Price</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Total</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            value={item.sku}
                            onChange={(e) => handleManualItemChange(idx, 'sku', e.target.value)}
                            placeholder="SKU"
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="text"
                            value={item.product}
                            onChange={(e) => handleManualItemChange(idx, 'product', e.target.value)}
                            placeholder="Product name"
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="number"
                            value={item.qty === 0 ? '' : item.qty}
                            onChange={(e) => handleManualItemChange(idx, 'qty', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                            placeholder="Qty"
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="number"
                            value={item.price === 0 ? '' : item.price}
                            onChange={(e) => handleManualItemChange(idx, 'price', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                            placeholder="Price"
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px', fontSize: '12px' }}>
                          Rp {(item.qty * item.price).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveManualItem(idx)}
                            style={{
                              padding: '4px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: '#f44336',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={handleAddManualItem}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: 'none',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Calculation Fields for Manual Mode */}
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>Calculation</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>Discount (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calculation.discountPercent === 0 ? '' : calculation.discountPercent}
                    onChange={(e) => {
                      const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                      const discount = (calculation.subtotal || 0) * (percent / 100);
                      handleCalculationChange('discountPercent', percent);
                      handleCalculationChange('discount', discount);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>Discount (Rp)</label>
                  <input
                    type="number"
                    value={calculation.discount === 0 ? '' : calculation.discount}
                    onChange={(e) => {
                      const discount = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                      const percent = (calculation.subtotal || 0) > 0 ? (discount / (calculation.subtotal || 1)) * 100 : 0;
                      handleCalculationChange('discount', discount);
                      handleCalculationChange('discountPercent', percent);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>Tax (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calculation.taxPercent === 0 ? '' : calculation.taxPercent}
                    onChange={(e) => {
                      const percent = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                      const tax = (calculation.subtotal || 0) * (percent / 100);
                      handleCalculationChange('taxPercent', percent);
                      handleCalculationChange('tax', tax);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>Tax (Rp)</label>
                  <input
                    type="number"
                    value={calculation.tax === 0 ? '' : calculation.tax}
                    onChange={(e) => {
                      const tax = e.target.value === '' ? 0 : Number(e.target.value) || 0;
                      const percent = (calculation.subtotal || 0) > 0 ? (tax / (calculation.subtotal || 1)) * 100 : 0;
                      handleCalculationChange('tax', tax);
                      handleCalculationChange('taxPercent', percent);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '500' }}>Biaya Lain (Rp)</label>
                  <input
                    type="number"
                    value={calculation.biayaLain === 0 ? '' : calculation.biayaLain}
                    onChange={(e) => handleCalculationChange('biayaLain', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Subtotal:</span>
                  <strong>Rp {calculation.subtotal?.toLocaleString('id-ID') || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Discount ({calculation.discountPercent?.toFixed(2) || 0}%):</span>
                  <strong>Rp {calculation.discount?.toLocaleString('id-ID') || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Tax ({calculation.taxPercent?.toFixed(2) || 0}%):</span>
                  <strong>Rp {calculation.tax?.toLocaleString('id-ID') || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Biaya Lain:</span>
                  <strong>Rp {calculation.biayaLain?.toLocaleString('id-ID') || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                  <span><strong>Total:</strong></span>
                  <strong>Rp {calculation.total?.toLocaleString('id-ID') || 0}</strong>
                </div>
              </div>
            </div>

            {/* Template Selection for Manual */}
            <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                📄 Pilih Template Invoice
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setTemplateType('template1')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${templateType === 'template1' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: templateType === 'template1' ? 'var(--primary-color)' : 'var(--bg-primary)',
                    color: templateType === 'template1' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: templateType === 'template1' ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  Template 1 (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('template2')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${templateType === 'template2' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: templateType === 'template2' ? 'var(--primary-color)' : 'var(--bg-primary)',
                    color: templateType === 'template2' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: templateType === 'template2' ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  Template 2 (Baru) ✨
                </button>
              </div>
            </div>

            {/* Product Code Display Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Product Code Display (Template Invoice)
              </label>
              <select
                value={productCodeDisplay}
                onChange={(e) => setProductCodeDisplay(e.target.value as 'padCode' | 'productId')}
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
                <option value="padCode">Pad Code (default, fallback ke Product ID jika tidak ada)</option>
                <option value="productId">Product ID / SKU ID</option>
              </select>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Pilihan ini menentukan kode yang ditampilkan di kolom "Kode Item" pada template Invoice
              </div>
            </div>

            {/* Notes/Keterangan Field for Manual */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Keterangan / Notes</label>
              <textarea
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Masukkan keterangan atau catatan untuk invoice ini (bisa sepanjang apapun, bahkan sampai 100 lembar)..."
                rows={10}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '200px',
                  maxHeight: 'none',
                  overflowY: 'auto',
                }}
              />
            </div>

            {/* Payment Terms for Manual */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => {
                    const newPaymentTerms = e.target.value;
                    setPaymentTerms(newPaymentTerms);
                    if (newPaymentTerms === 'COD' || newPaymentTerms === 'CBD') {
                      setTopDays(0);
                    } else if (newPaymentTerms === 'TOP' && topDays === 0) {
                      setTopDays(30);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="TOP">TOP</option>
                  <option value="COD">COD</option>
                  <option value="CBD">CBD</option>
                </select>
              </div>
              {paymentTerms === 'TOP' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>TOP Days</label>
                  <input
                    type="number"
                    value={topDays === 0 ? '' : topDays}
                    onChange={(e) => setTopDays(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Additional Fields for Manual Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  value={calculation.tanggalJt ? new Date(calculation.tanggalJt).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleCalculationChange('tanggalJt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>DP PO</label>
                <input
                  type="number"
                  value={calculation.dpPo === 0 || !calculation.dpPo ? '' : calculation.dpPo}
                  onChange={(e) => handleCalculationChange('dpPo', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Tunai</label>
                <input
                  type="number"
                  value={calculation.tunai === 0 || !calculation.tunai ? '' : calculation.tunai}
                  onChange={(e) => handleCalculationChange('tunai', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Kredit</label>
                <input
                  type="number"
                  value={calculation.kredit === 0 || !calculation.kredit ? '' : calculation.kredit}
                  onChange={(e) => handleCalculationChange('kredit', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>K.Debet</label>
                <input
                  type="number"
                  value={calculation.kDebet === 0 || !calculation.kDebet ? '' : calculation.kDebet}
                  onChange={(e) => handleCalculationChange('kDebet', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>K.Kredit</label>
                <input
                  type="number"
                  value={calculation.kKredit === 0 || !calculation.kKredit ? '' : calculation.kKredit}
                  onChange={(e) => handleCalculationChange('kKredit', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500 }}>Kembali</label>
                <input
                  type="number"
                  value={calculation.kembaliKeKasir === 0 || !calculation.kembaliKeKasir ? '' : calculation.kembaliKeKasir}
                  onChange={(e) => handleCalculationChange('kembaliKeKasir', e.target.value === '' ? 0 : Number(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleCreate}
            disabled={
              mode === 'so' 
                ? selectedSOs.length === 0 || !autoCustomer || autoItems.length === 0
                : mode === 'sj'
                ? selectedSJs.length === 0 || !autoDNCustomer || autoDNItems.length === 0
                : !manualCustomer || manualItems.length === 0 || manualItems.some(item => !item.product)
            }
          >
            Create Invoice
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Accounting;
