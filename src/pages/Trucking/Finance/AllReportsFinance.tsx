import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { storageService, extractStorageValue, StorageKeys } from '../../../services/storage';
import { setupRealTimeSync, TRUCKING_SYNC_KEYS } from '../../../utils/real-time-sync-helper';
import * as XLSX from 'xlsx';
import '../../../styles/common.css';
import '../../../styles/compact.css';

const AllReportsFinance = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [taxRecords, setTaxRecords] = useState<any[]>([]);
  const [operationalExpenses, setOperationalExpenses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Custom Dialog state
  const [, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
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

  useEffect(() => {
    loadData();
    
    // Real-time listener untuk server updates
    const cleanup = setupRealTimeSync({
      keys: [TRUCKING_SYNC_KEYS.INVOICES, TRUCKING_SYNC_KEYS.PURCHASE_ORDERS, TRUCKING_SYNC_KEYS.PAYMENTS, TRUCKING_SYNC_KEYS.TAX_RECORDS, TRUCKING_SYNC_KEYS.OPERATIONAL_EXPENSES],
      onUpdate: loadData,
    });
    
    return cleanup;
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invsRaw, posRaw, paymentsRaw, taxRaw, opsRaw, invRaw] = await Promise.all([
        storageService.get<any[]>(StorageKeys.TRUCKING.INVOICES),
        storageService.get<any[]>(StorageKeys.TRUCKING.PURCHASE_ORDERS),
        storageService.get<any[]>(StorageKeys.TRUCKING.PAYMENTS),
        storageService.get<any[]>(StorageKeys.TRUCKING.TAX_RECORDS),
        storageService.get<any[]>(StorageKeys.TRUCKING.OPERATIONAL_EXPENSES),
        storageService.get<any[]>(StorageKeys.TRUCKING.EXPENSES),
      ]);
      
      const invs = extractStorageValue(invsRaw);
      const pos = extractStorageValue(posRaw);
      const pmts = extractStorageValue(paymentsRaw);
      const taxes = extractStorageValue(taxRaw);
      const ops = extractStorageValue(opsRaw);
      const inv = extractStorageValue(invRaw);
      
      setInvoices(invs || []);
      setPurchaseOrders(pos || []);
      setPayments(pmts || []);
      setTaxRecords(taxes || []);
      setOperationalExpenses(ops || []);
      setInventory(inv || []);
    } catch (error: any) {
      showAlert(`Error loading data: ${error.message}`, 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate AR Close (Dana Masuk)
  const arClose = useMemo(() => {
    return (Array.isArray(invoices) ? invoices : [])
      .filter(inv => {
        // Use paidDate if available (when payment was made), otherwise use created date
        const dateToCheck = inv.paidDate || inv.invoiceDate || inv.created || '';
        const dateOnly = dateToCheck.split('T')[0]; // Extract YYYY-MM-DD from ISO format
        return inv.status === 'CLOSE' && dateOnly >= startDate && dateOnly <= endDate;
      })
      .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  }, [invoices, startDate, endDate]);

  // Calculate AR Open (Outstanding Invoice)
  const arOpen = useMemo(() => {
    return (Array.isArray(invoices) ? invoices : [])
      .filter(inv => {
        const invDate = inv.invoiceDate || inv.created || '';
        const dateOnly = invDate.split('T')[0]; // Extract YYYY-MM-DD from ISO format
        return inv.status === 'OPEN' && dateOnly >= startDate && dateOnly <= endDate;
      })
      .reduce((sum, inv) => sum + (inv.bom?.total || inv.total || 0), 0);
  }, [invoices, startDate, endDate]);

  // Calculate AP Close (Dana Keluar - Paid Out)
  const apClose = useMemo(() => {
    const posArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    const paymentsArray = Array.isArray(payments) ? payments : [];
    
    // Create a map of payments by PO
    const paymentsByPO: Record<string, number> = {};
    paymentsArray.forEach((p: any) => {
      if (p.type === 'Payment') {
        const paymentDate = p.paymentDate || p.created || '';
        if (paymentDate >= startDate && paymentDate <= endDate) {
          const poNo = p.poNo || p.purchaseOrderNo || '';
          if (poNo) {
            paymentsByPO[poNo] = (paymentsByPO[poNo] || 0) + (p.amount || 0);
          }
        }
      }
    });
    
    // Sum paid amounts for CLOSE status POs
    return posArray
      .filter(po => po.status === 'CLOSE')
      .reduce((sum, po) => sum + (paymentsByPO[po.poNo] || 0), 0);
  }, [purchaseOrders, payments, startDate, endDate]);

  // Calculate AP Open (Dana Belum Keluar - Unpaid)
  const apOpen = useMemo(() => {
    const posArray = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    const paymentsArray = Array.isArray(payments) ? payments : [];
    
    // Create a map of payments by PO
    const paymentsByPO: Record<string, number> = {};
    paymentsArray.forEach((p: any) => {
      if (p.type === 'Payment') {
        const paymentDate = p.paymentDate || p.created || '';
        if (paymentDate >= startDate && paymentDate <= endDate) {
          const poNo = p.poNo || p.purchaseOrderNo || '';
          if (poNo) {
            paymentsByPO[poNo] = (paymentsByPO[poNo] || 0) + (p.amount || 0);
          }
        }
      }
    });
    
    // Sum balances for OPEN status POs
    return posArray
      .filter(po => po.status === 'OPEN')
      .reduce((sum, po) => {
        const balance = Math.max(0, (po.total || 0) - (paymentsByPO[po.poNo] || 0));
        return sum + balance;
      }, 0);
  }, [purchaseOrders, payments, startDate, endDate]);

  // Calculate Tax Paid
  const taxPaid = useMemo(() => {
    return (Array.isArray(taxRecords) ? taxRecords : [])
      .filter(r => {
        const taxDate = r.paidDate || r.taxDate || r.created || '';
        return (r.status === 'Paid' || r.status === 'paid') && taxDate >= startDate && taxDate <= endDate;
      })
      .reduce((sum, r) => sum + (r.taxAmount || 0), 0);
  }, [taxRecords, startDate, endDate]);

  // Calculate Tax Outstanding
  const taxOutstanding = useMemo(() => {
    return (Array.isArray(taxRecords) ? taxRecords : [])
      .filter(r => {
        const taxDate = r.taxDate || r.created || '';
        return (r.status === 'Open' || r.status === 'open') && taxDate >= startDate && taxDate <= endDate;
      })
      .reduce((sum, r) => sum + (r.taxAmount || 0), 0);
  }, [taxRecords, startDate, endDate]);

  // Calculate Operational Expenses (General + Petty Cash)
  const operationalExpensesTotal = useMemo(() => {
    return (Array.isArray(operationalExpenses) ? operationalExpenses : [])
      .filter(e => {
        const expenseDate = e.expenseDate || e.created || '';
        return expenseDate >= startDate && expenseDate <= endDate;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [operationalExpenses, startDate, endDate]);

  // Calculate Inventory Total Value (Products only - kategori: Product)
  const inventoryTotalValue = useMemo(() => {
    return (Array.isArray(inventory) ? inventory : [])
      .filter(item => (item.kategori || '').toLowerCase().includes('product'))
      .reduce((sum, item) => sum + ((item.nextStock || 0) * (item.price || 0)), 0);
  }, [inventory]);

  // Calculate Materials Total Value (Materials only - kategori: Material)
  const materialsTotalValue = useMemo(() => {
    return (Array.isArray(inventory) ? inventory : [])
      .filter(item => (item.kategori || '').toLowerCase().includes('material'))
      .reduce((sum, item) => sum + ((item.nextStock || 0) * (item.price || 0)), 0);
  }, [inventory]);

  // Calculate Margin Percentage
  // Revenue = AR Close (Dana Masuk - invoices paid)
  // Cost = AP Close (Dana Keluar - payments made) + Operational Expenses + Tax Paid
  const marginPercentage = useMemo(() => {
    const revenue = arClose;
    const cost = apClose + operationalExpensesTotal + taxPaid;
    
    if (revenue <= 0) return 0;
    const margin = ((revenue - cost) / revenue) * 100;
    return Math.max(0, margin); // Ensure non-negative
  }, [arClose, apClose, operationalExpensesTotal, taxPaid]);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Helper to set column widths
      const setWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
        if (!ws['!cols']) ws['!cols'] = [];
        widths.forEach((width, idx) => {
          if (ws['!cols']) {
            ws['!cols'][idx] = { wch: width, wpx: width * 7 };
          }
        });
      };

      // Sheet 1: Summary
      const summaryData = [
        ['FINANCIAL REPORTS SUMMARY'],
        ['Period', `${startDate} to ${endDate}`],
        [],
        ['Profit Margin', `${marginPercentage.toFixed(2)}%`],
        ['Revenue (Dana Masuk)', arClose],
        ['Cost (Dana Keluar + Expenses + Tax)', apClose + operationalExpensesTotal + taxPaid],
        [],
        ['Accounts Receivable'],
        ['Dana Masuk (AR Close)', arClose],
        ['Outstanding (AR Open)', arOpen],
        [],
        ['Accounts Payable'],
        ['Dana Keluar (AP Close)', apClose],
        ['Unpaid Supplier (AP Open)', apOpen],
        [],
        ['Tax Management'],
        ['Tax Paid', taxPaid],
        ['Tax Outstanding', taxOutstanding],
        [],
        ['Operational Expenses'],
        ['Total Expenses', operationalExpensesTotal],
        [],
        ['Inventory & Materials'],
        ['Inventory Value', inventoryTotalValue],
        ['Materials Value', materialsTotalValue],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      setWidths(wsSummary, [30, 20]);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // Sheet 2: Invoices Detail
      const invoicesDetail = [
        ['INVOICES DETAIL'],
        ['Period', `${startDate} to ${endDate}`],
        [],
        ['Invoice No', 'Customer', 'Status', 'Amount', 'Invoice Date', 'Paid Date'],
        ...(Array.isArray(invoices) ? invoices : []).map((inv: any) => [
          inv.invoiceNo || '',
          inv.customer || '',
          inv.status || '',
          inv.paidAmount || inv.total || 0,
          inv.invoiceDate || inv.created || '',
          inv.paidDate || '',
        ]),
      ];
      const wsInvoices = XLSX.utils.aoa_to_sheet(invoicesDetail);
      setWidths(wsInvoices, [15, 20, 12, 15, 15, 15]);
      XLSX.utils.book_append_sheet(wb, wsInvoices, 'Invoices');

      // Sheet 3: Purchase Orders Detail
      const posDetail = [
        ['PURCHASE ORDERS DETAIL'],
        ['Period', `${startDate} to ${endDate}`],
        [],
        ['PO No', 'Supplier', 'Status', 'Total', 'Created Date'],
        ...(Array.isArray(purchaseOrders) ? purchaseOrders : []).map((po: any) => [
          po.poNo || '',
          po.supplier || '',
          po.status || '',
          po.total || 0,
          po.created || '',
        ]),
      ];
      const wsPOs = XLSX.utils.aoa_to_sheet(posDetail);
      setWidths(wsPOs, [15, 20, 12, 15, 15]);
      XLSX.utils.book_append_sheet(wb, wsPOs, 'Purchase Orders');

      // Sheet 4: Payments Detail
      const paymentsDetail = [
        ['PAYMENTS DETAIL'],
        ['Period', `${startDate} to ${endDate}`],
        [],
        ['Payment No', 'Type', 'PO No', 'Amount', 'Payment Date'],
        ...(Array.isArray(payments) ? payments : []).map((p: any) => [
          p.paymentNo || '',
          p.type || '',
          p.poNo || p.purchaseOrderNo || '',
          p.amount || 0,
          p.paymentDate || p.created || '',
        ]),
      ];
      const wsPayments = XLSX.utils.aoa_to_sheet(paymentsDetail);
      setWidths(wsPayments, [15, 12, 15, 15, 15]);
      XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');

      // Sheet 5: Tax Records Detail
      const taxDetail = [
        ['TAX RECORDS DETAIL'],
        ['Period', `${startDate} to ${endDate}`],
        [],
        ['Tax Date', 'Reference', 'Tax Type', 'Base Amount', 'Tax Amount', 'Status'],
        ...(Array.isArray(taxRecords) ? taxRecords : []).map((t: any) => [
          t.taxDate || t.created || '',
          t.reference || '',
          t.taxType || '',
          t.baseAmount || 0,
          t.taxAmount || 0,
          t.status || '',
        ]),
      ];
      const wsTax = XLSX.utils.aoa_to_sheet(taxDetail);
      setWidths(wsTax, [15, 15, 15, 15, 15, 12]);
      XLSX.utils.book_append_sheet(wb, wsTax, 'Tax Records');

      // Sheet 6: Operational Expenses Detail
      const opsDetail = [
        ['OPERATIONAL EXPENSES DETAIL'],
        ['Period', `${startDate} to ${endDate}`],
        [],
        ['Expense No', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Expense Date'],
        ...(Array.isArray(operationalExpenses) ? operationalExpenses : []).map((e: any) => [
          e.expenseNo || '',
          e.type || '',
          e.category || '',
          e.description || '',
          e.amount || 0,
          e.paymentMethod || '',
          e.expenseDate || e.created || '',
        ]),
      ];
      const wsOps = XLSX.utils.aoa_to_sheet(opsDetail);
      setWidths(wsOps, [15, 12, 15, 25, 15, 15, 15]);
      XLSX.utils.book_append_sheet(wb, wsOps, 'Operational Expenses');

      // Sheet 7: Inventory Detail
      const inventoryDetail = [
        ['INVENTORY DETAIL'],
        [],
        ['Code Item', 'Description', 'Category', 'Stock', 'Unit Price', 'Total Value'],
        ...(Array.isArray(inventory) ? inventory : []).map((inv: any) => [
          inv.codeItem || '',
          inv.description || '',
          inv.kategori || '',
          inv.nextStock || 0,
          inv.price || 0,
          (inv.nextStock || 0) * (inv.price || 0),
        ]),
      ];
      const wsInventory = XLSX.utils.aoa_to_sheet(inventoryDetail);
      setWidths(wsInventory, [15, 25, 15, 12, 15, 15]);
      XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventory');

      // Write file
      const fileName = `Financial_Reports_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  return (
    <div className="module-compact">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Financial Reports</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Start
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
              End
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              const date = new Date();
              date.setMonth(date.getMonth() - 1);
              setStartDate(date.toISOString().split('T')[0]);
              setEndDate(new Date().toISOString().split('T')[0]);
            }}
            style={{ fontSize: '11px', padding: '6px 12px', marginTop: '20px' }}
          >
            30D
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const date = new Date();
              date.setFullYear(date.getFullYear() - 1);
              setStartDate(date.toISOString().split('T')[0]);
              setEndDate(new Date().toISOString().split('T')[0]);
            }}
            style={{ fontSize: '11px', padding: '6px 12px', marginTop: '20px' }}
          >
            1Y
          </Button>
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            style={{ fontSize: '11px', padding: '6px 12px', marginTop: '20px' }}
          >
            📥 Export Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div>⏳ Loading data...</div>
        </div>
      ) : (
        <>
          {/* Margin Percentage Card */}
          <Card style={{ marginBottom: '16px', backgroundColor: marginPercentage >= 20 ? '#e8f5e9' : marginPercentage >= 10 ? '#fff3e0' : '#ffebee', borderLeft: `4px solid ${marginPercentage >= 20 ? '#4CAF50' : marginPercentage >= 10 ? '#FF9800' : '#F44336'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>📊 Profit Margin</div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: marginPercentage >= 20 ? '#1b5e20' : marginPercentage >= 10 ? '#e65100' : '#b71c1c' }}>
                  {marginPercentage.toFixed(2)}%
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px' }}>Revenue</div>
                  <div style={{ fontWeight: '600', color: '#4CAF50' }}>Rp {arClose.toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px' }}>Cost</div>
                  <div style={{ fontWeight: '600', color: '#F44336' }}>Rp {(apClose + operationalExpensesTotal + taxPaid).toLocaleString('id-ID')}</div>
                </div>
              </div>
            </div>
          </Card>
          {/* Calculate global max for all bars */}
          {(() => {
            const generalExpenses = (Array.isArray(operationalExpenses) ? operationalExpenses : []).filter(e => e.type === 'General' && (e.expenseDate || e.created || '') >= startDate && (e.expenseDate || e.created || '') <= endDate).reduce((sum, e) => sum + (e.amount || 0), 0);
            const pettyCashExpenses = (Array.isArray(operationalExpenses) ? operationalExpenses : []).filter(e => e.type === 'PettyCash' && (e.expenseDate || e.created || '') >= startDate && (e.expenseDate || e.created || '') <= endDate).reduce((sum, e) => sum + (e.amount || 0), 0);
            const globalMax = Math.max(arClose, arOpen, apClose, apOpen, generalExpenses, pettyCashExpenses, taxPaid, taxOutstanding, 1);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Cash Flow Chart - Vertical Bar */}
                <Card>
                  <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '13px' }}>Cash Flow</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '120px', gap: '6px', padding: '0 2px' }}>
                    {[
                      { label: 'Dana Masuk', value: arClose, color: '#4CAF50' },
                      { label: 'Outstanding', value: arOpen, color: '#FF9800' },
                      { label: 'Dana Keluar', value: apClose, color: '#2196F3' },
                      { label: 'Unpaid Supplier', value: apOpen, color: '#F44336' },
                    ].map((item, idx) => {
                      const height = (item.value / globalMax) * 100;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div
                            style={{
                              width: '100%',
                              height: `${height}px`,
                              backgroundColor: item.color,
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s ease',
                              marginBottom: '2px',
                            }}
                            title={`Rp ${item.value.toLocaleString('id-ID')}`}
                          />
                          <div style={{ fontSize: '7px', fontWeight: '600', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '6px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1px' }}>
                            Rp {(item.value / 1000000).toFixed(1)}M
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Operational Expenses Chart - Vertical Bar */}
                <Card>
                  <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '13px' }}>Operational Costs</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '120px', gap: '6px', padding: '0 2px' }}>
                    {[
                      { label: 'General', value: generalExpenses, color: '#2196F3' },
                      { label: 'Petty Cash', value: pettyCashExpenses, color: '#FF9800' },
                    ].map((item, idx) => {
                      const height = (item.value / globalMax) * 100;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div
                            style={{
                              width: '100%',
                              height: `${height}px`,
                              backgroundColor: item.color,
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s ease',
                              marginBottom: '2px',
                            }}
                            title={`Rp ${item.value.toLocaleString('id-ID')}`}
                          />
                          <div style={{ fontSize: '7px', fontWeight: '600', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '6px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1px' }}>
                            Rp {(item.value / 1000000).toFixed(1)}M
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Tax Chart - Vertical Bar */}
                <Card>
                  <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '13px' }}>Tax Status</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '120px', gap: '6px', padding: '0 2px' }}>
                    {[
                      { label: 'Tax Paid', value: taxPaid, color: '#4CAF50' },
                      { label: 'Outstanding', value: taxOutstanding, color: '#FF9800' },
                    ].map((item, idx) => {
                      const height = (item.value / globalMax) * 100;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div
                            style={{
                              width: '100%',
                              height: `${height}px`,
                              backgroundColor: item.color,
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s ease',
                              marginBottom: '2px',
                            }}
                            title={`Rp ${item.value.toLocaleString('id-ID')}`}
                          />
                          <div style={{ fontSize: '7px', fontWeight: '600', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '6px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '1px' }}>
                            Rp {(item.value / 1000000).toFixed(1)}M
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* Cards Grid - Organized by Category */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Accounts Receivable</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <Card>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>💰 Dana Masuk</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4CAF50' }}>
                    Rp {arClose.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>AR Close</div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>📋 Outstanding</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#FF9800' }}>
                    Rp {arOpen.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>AR Open</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Accounts Payable */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Accounts Payable</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <Card>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>💸 Dana Keluar</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2196F3' }}>
                    Rp {apClose.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>AP Close</div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>⏳ Unpaid Supplier</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#F44336' }}>
                    Rp {apOpen.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>AP Open</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Tax */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Tax Management</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <Card>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>✅ Tax Paid</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4CAF50' }}>
                    Rp {taxPaid.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>Completed</div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>⏳ Outstanding</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#FF9800' }}>
                    Rp {taxOutstanding.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>Pending</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Operational Expenses */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Operational Expenses</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <Card>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>💼 Total Expenses</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#9C27B0' }}>
                    Rp {operationalExpensesTotal.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>General + Petty Cash</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Inventory & Materials */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Inventory & Materials</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <Card>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>📦 Inventory Value</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976D2' }}>
                    Rp {inventoryTotalValue.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>Total Stock Value</div>
                </div>
              </Card>

              <Card>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>🧱 Materials Value</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#F57C00' }}>
                    Rp {materialsTotalValue.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>Total Materials Value</div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AllReportsFinance;
