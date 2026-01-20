import { useState, useEffect, useMemo } from 'react';
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, PieChart, Pie, Cell, Legend } from 'recharts';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import * as XLSX from 'xlsx';
 import '../../../styles/common.css';
import '../../../styles/compact.css';

interface JournalEntry {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
  entryDate: string;
}

interface Account {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

const FinancialReports = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [reportType, setReportType] = useState<'balance' | 'pl' | 'cashflow' | 'inventory'>('balance');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

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

  useEffect(() => {
    loadData();
  }, []);

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

  const loadData = async () => {
    try {
      const [ent, acc, inv] = await Promise.all([
        storageService.get<JournalEntry[]>('journalEntries') || [],
        storageService.get<Account[]>('accounts') || [],
        storageService.get<any[]>('inventory') || [],
      ]);
      
      // Ensure entries is always an array
      const entriesArray = Array.isArray(ent) ? ent : [];
      setEntries(entriesArray);
      
      // Ensure accounts is always an array
      const accountsArray = Array.isArray(acc) ? acc : [];
      if (accountsArray.length === 0) {
        await loadAccounts();
      } else {
        setAccounts(accountsArray);
      }
      
      // Load inventory data dan deduplicate berdasarkan codeItem
      const inventoryArray = Array.isArray(inv) ? inv : [];
      const uniqueInventory = deduplicateInventory(inventoryArray);
      setInventory(uniqueInventory);
    } catch (error) {
      showAlert('Error loading financial data. Please refresh the page.', 'Error');
    }
  };

  const loadAccounts = async () => {
    const data = await storageService.get<Account[]>('accounts') || [];
    
    if (!data || data.length === 0) {
      // Load default accounts jika data kosong
      const defaultAccounts: Account[] = [
        { code: '1000', name: 'Cash', type: 'Asset' },
        { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
        { code: '1200', name: 'Inventory', type: 'Asset' },
        { code: '1300', name: 'Fixed Assets', type: 'Asset' },
        { code: '2000', name: 'Accounts Payable', type: 'Liability' },
        { code: '2100', name: 'Accrued Expenses', type: 'Liability' },
        { code: '3000', name: 'Equity', type: 'Equity' },
        { code: '3100', name: 'Retained Earnings', type: 'Equity' },
        { code: '4000', name: 'Sales Revenue', type: 'Revenue' },
        { code: '4100', name: 'Other Income', type: 'Revenue' },
        { code: '5000', name: 'Cost of Goods Sold', type: 'Expense' },
        { code: '6000', name: 'Operating Expenses', type: 'Expense' },
        { code: '6100', name: 'Administrative Expenses', type: 'Expense' },
        { code: '6200', name: 'Financial Expenses', type: 'Expense' },
      ];
      await storageService.set('accounts', defaultAccounts);
      setAccounts(defaultAccounts);
    } else {
      setAccounts(data);
    }
  };

  const calculateAccountBalances = () => {
    const balances: Record<string, { debit: number; credit: number; balance: number }> = {};
    
    // Untuk Balance Sheet, gunakan semua entries sampai akhir periode (cumulative)
    // Ensure entries is always an array
    const entriesArray = Array.isArray(entries) ? entries : [];
    const filteredEntries = entriesArray.filter((e: any) => {
      if (!dateTo) return true; // Jika tidak ada dateTo, ambil semua
      const entryDate = new Date(e.entryDate);
      const to = new Date(dateTo);
      return entryDate <= to; // Semua entries sampai akhir periode
    });
    
    // Ensure filteredEntries is always an array
    const filteredEntriesArray = Array.isArray(filteredEntries) ? filteredEntries : [];
    
    filteredEntriesArray.forEach(entry => {
      const accountCode = entry.account || '';
      
      // Map simple account codes (from journal entries) to COA format
      // Journal entries use: "1000", "1100", "2000", "4000", etc.
      // COA uses: "1-1110", "1-1210", "2-1100", "4-0000", etc.
      let mappedAccountCode = accountCode;
      
      // Ensure accounts is always an array
      const accountsArray = Array.isArray(accounts) ? accounts : [];
      
      // Check if account code exists in COA
      const accountExists = accountsArray.some(acc => acc.code === accountCode);
      
      if (!accountExists && accountsArray.length > 0) {
        // Try to find matching account by mapping simple codes to COA format
        const mappingRules: Record<string, string[]> = {
          '1000': ['1-1110', '1-1120', '1-1121', '1-1130'], // Cash -> KAS/BANK accounts
          '1100': ['1-1210', '1-1200'], // AR -> PIUTANG accounts
          '2000': ['2-1101', '2-1100'], // AP -> HUTANG accounts
          '4000': ['4-0000'], // Revenue -> PENDAPATAN
          '5000': ['5-0000'], // COGS -> HPP
        };
        
        const possibleCodes = mappingRules[accountCode] || [];
        const foundAccount = accountsArray.find(acc => possibleCodes.includes(acc.code));
        
        if (foundAccount) {
          mappedAccountCode = foundAccount.code;
        } else {
          // Try to find by first digit match (e.g., "1" -> "1-xxxx")
          const firstDigit = accountCode.charAt(0);
          const matchingAccount = accountsArray.find(acc => acc.code.startsWith(firstDigit + '-'));
          if (matchingAccount) {
            mappedAccountCode = matchingAccount.code;
          }
        }
      }
      
      if (!balances[mappedAccountCode]) {
        balances[mappedAccountCode] = { debit: 0, credit: 0, balance: 0 };
      }
      balances[mappedAccountCode].debit += entry.debit || 0;
      balances[mappedAccountCode].credit += entry.credit || 0;
    });
    
    // Ensure accounts is always an array
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    
    accountsArray.forEach(acc => {
      if (!balances[acc.code]) {
        balances[acc.code] = { debit: 0, credit: 0, balance: 0 };
      }
      
      if (acc.type === 'Asset' || acc.type === 'Expense') {
        balances[acc.code].balance = balances[acc.code].debit - balances[acc.code].credit;
      } else {
        // Liability, Equity, Revenue
        balances[acc.code].balance = balances[acc.code].credit - balances[acc.code].debit;
      }
    });
    
    return balances;
  };

  const balanceSheet = useMemo(() => {
    const balances = calculateAccountBalances();
    
    // Ensure accounts is always an array
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    
    // Calculate Profit/Loss untuk Retained Earnings
    const revenue = accountsArray
      .filter(a => a.type === 'Revenue')
      .reduce((sum, acc) => sum + (balances[acc.code]?.balance || 0), 0);
    
    const expenses = accountsArray
      .filter(a => a.type === 'Expense')
      .reduce((sum, acc) => sum + (balances[acc.code]?.balance || 0), 0);
    
    const netProfit = revenue - expenses;
    
    const assets = accountsArray
      .filter(a => a.type === 'Asset')
      .map(acc => ({
        code: acc.code,
        name: acc.name,
        balance: balances[acc.code]?.balance || 0,
      }));
    
    const liabilities = accountsArray
      .filter(a => a.type === 'Liability')
      .map(acc => ({
        code: acc.code,
        name: acc.name,
        balance: balances[acc.code]?.balance || 0,
      }));
    
    const equity = accountsArray
      .filter(a => a.type === 'Equity')
      .map(acc => {
        // Untuk Retained Earnings (3100), tambahkan net profit
        let balance = balances[acc.code]?.balance || 0;
        if (acc.code === '3100') {
          balance = balance + netProfit; // Retained Earnings = initial + net profit
        }
        return {
          code: acc.code,
          name: acc.name,
          balance: balance,
        };
      });
    
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);
    
    // Pastikan Total Assets = Total Liabilities + Equity
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    
    return { 
      assets, 
      liabilities, 
      equity, 
      totalAssets, 
      totalLiabilities, 
      totalEquity,
      totalLiabilitiesAndEquity,
      netProfit,
    };
  }, [entries, accounts, dateFrom, dateTo]);

  const profitLoss = useMemo(() => {
    const balances = calculateAccountBalances();
    
    // Ensure accounts is always an array
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    
    const revenue = accountsArray
      .filter(a => a.type === 'Revenue')
      .map(acc => ({
        code: acc.code,
        name: acc.name,
        balance: balances[acc.code]?.balance || 0,
      }));
    
    const expenses = accountsArray
      .filter(a => a.type === 'Expense')
      .map(acc => ({
        code: acc.code,
        name: acc.name,
        balance: balances[acc.code]?.balance || 0,
      }));
    
    const totalRevenue = revenue.reduce((sum, r) => sum + r.balance, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
    const netProfit = totalRevenue - totalExpenses;
    
    return { revenue, expenses, totalRevenue, totalExpenses, netProfit };
  }, [entries, accounts, dateFrom, dateTo]);

  const cashFlow = useMemo(() => {
    const balances = calculateAccountBalances();
    
    // Operating Activities
    const operating = {
      netProfit: profitLoss.netProfit,
      depreciation: 0,
      accountsReceivable: -(balances['1100']?.balance || 0),
      inventory: -(balances['1200']?.balance || 0),
      accountsPayable: balances['2000']?.balance || 0,
    };
    const operatingCash = operating.netProfit + operating.depreciation + 
      operating.accountsReceivable + operating.inventory + operating.accountsPayable;
    
    // Investing Activities
    const investing = {
      fixedAssets: -(balances['1300']?.balance || 0),
    };
    const investingCash = investing.fixedAssets;
    
    // Financing Activities
    const financing = {
      equity: balances['3000']?.balance || 0,
      retainedEarnings: balances['3100']?.balance || 0,
    };
    const financingCash = financing.equity + financing.retainedEarnings;
    
    const netCashFlow = operatingCash + investingCash + financingCash;
    const beginningCash = balances['1000']?.balance || 0;
    const endingCash = beginningCash + netCashFlow;
    
    return { operating, operatingCash, investing, investingCash, financing, financingCash, netCashFlow, beginningCash, endingCash };
  }, [entries, accounts, dateFrom, dateTo, profitLoss]);

  // Chart data untuk trend over time
  const chartData = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    
    // Ensure entries is always an array
    const entriesArray = Array.isArray(entries) ? entries : [];
    // Ensure accounts is always an array
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const months: string[] = [];
    const data: any[] = [];
    
    // Generate months between dateFrom and dateTo
    let currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const monthKey = currentDate.toLocaleDateString('en-US', { month: 'short' });
      months.push(monthKey);
      
      // Calculate cumulative balance up to this month
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      // entriesArray already declared above in useMemo scope
      const monthEntries = entriesArray.filter((e: any) => {
        const entryDate = new Date(e.entryDate);
        return entryDate <= monthEnd;
      });
      
      // Calculate balances for this month
      const monthBalances: Record<string, { debit: number; credit: number; balance: number }> = {};
      monthEntries.forEach((entry: any) => {
        const accountCode = entry.account || '';
        
        // Apply same mapping as in calculateAccountBalances
        let mappedAccountCode = accountCode;
        const accountExists = accountsArray.some(acc => acc.code === accountCode);
        
        if (!accountExists && accountsArray.length > 0) {
          const mappingRules: Record<string, string[]> = {
            '1000': ['1-1110', '1-1120', '1-1121', '1-1130'],
            '1100': ['1-1210', '1-1200'],
            '2000': ['2-1101', '2-1100'],
            '4000': ['4-0000'],
            '5000': ['5-0000'],
          };
          
          const possibleCodes = mappingRules[accountCode] || [];
          const foundAccount = accountsArray.find(acc => possibleCodes.includes(acc.code));
          
          if (foundAccount) {
            mappedAccountCode = foundAccount.code;
          } else {
            const firstDigit = accountCode.charAt(0);
            const matchingAccount = accountsArray.find(acc => acc.code.startsWith(firstDigit + '-'));
            if (matchingAccount) {
              mappedAccountCode = matchingAccount.code;
            }
          }
        }
        
        if (!monthBalances[mappedAccountCode]) {
          monthBalances[mappedAccountCode] = { debit: 0, credit: 0, balance: 0 };
        }
        monthBalances[mappedAccountCode].debit += entry.debit || 0;
        monthBalances[mappedAccountCode].credit += entry.credit || 0;
      });
      
      // accountsArray already declared above in useMemo scope
      accountsArray.forEach(acc => {
        if (!monthBalances[acc.code]) {
          monthBalances[acc.code] = { debit: 0, credit: 0, balance: 0 };
        }
        if (acc.type === 'Asset' || acc.type === 'Expense') {
          monthBalances[acc.code].balance = monthBalances[acc.code].debit - monthBalances[acc.code].credit;
        } else {
          monthBalances[acc.code].balance = monthBalances[acc.code].credit - monthBalances[acc.code].debit;
        }
      });
      
      // Get values for chart based on report type
      let value = 0;
      if (reportType === 'balance') {
        // Total Assets
        // accountsArray already declared above in useMemo scope
        value = accountsArray
          .filter(a => a.type === 'Asset')
          .reduce((sum, acc) => sum + (monthBalances[acc.code]?.balance || 0), 0);
      } else if (reportType === 'pl') {
        // Net Profit
        // accountsArray already declared above in useMemo scope
        const revenue = accountsArray
          .filter(a => a.type === 'Revenue')
          .reduce((sum, acc) => sum + (monthBalances[acc.code]?.balance || 0), 0);
        const expenses = accountsArray
          .filter(a => a.type === 'Expense')
          .reduce((sum, acc) => sum + (monthBalances[acc.code]?.balance || 0), 0);
        value = revenue - expenses;
      } else {
        // Cash Flow (Cash balance)
        value = monthBalances['1000']?.balance || 0;
      }
      
      // Ensure value is a valid number
      const chartValue = isNaN(value) ? 0 : value;
      data.push({
        month: monthKey,
        value: chartValue,
      });
      
      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    
    return data;
  }, [entries, accounts, dateFrom, dateTo, reportType]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    let content = '';
    
    if (reportType === 'balance') {
      content = `Balance Sheet\nPeriod: ${dateFrom} to ${dateTo}\n\n`;
      content += 'ASSETS\n';
      balanceSheet.assets.filter(a => a.balance !== 0).forEach(a => {
        content += `${a.code} - ${a.name}: Rp ${a.balance.toLocaleString('id-ID')}\n`;
      });
      content += `\nTotal Assets: Rp ${balanceSheet.totalAssets.toLocaleString('id-ID')}\n\n`;
      content += 'LIABILITIES\n';
      balanceSheet.liabilities.filter(l => l.balance !== 0).forEach(l => {
        content += `${l.code} - ${l.name}: Rp ${l.balance.toLocaleString('id-ID')}\n`;
      });
      content += `\nTotal Liabilities: Rp ${balanceSheet.totalLiabilities.toLocaleString('id-ID')}\n\n`;
      content += 'EQUITY\n';
      balanceSheet.equity.filter(e => e.balance !== 0).forEach(e => {
        content += `${e.code} - ${e.name}: Rp ${e.balance.toLocaleString('id-ID')}\n`;
      });
      content += `\nTotal Equity: Rp ${balanceSheet.totalEquity.toLocaleString('id-ID')}\n\n`;
      content += `Total Liabilities & Equity: Rp ${balanceSheet.totalLiabilitiesAndEquity.toLocaleString('id-ID')}\n`;
    } else if (reportType === 'pl') {
      content = `Profit & Loss Statement\nPeriod: ${dateFrom} to ${dateTo}\n\n`;
      content += 'REVENUE\n';
      // Ensure profitLoss.revenue is always an array
      const revenueArray = Array.isArray(profitLoss.revenue) ? profitLoss.revenue : [];
      revenueArray.filter(r => r.balance !== 0).forEach(r => {
        content += `${r.code} - ${r.name}: Rp ${r.balance.toLocaleString('id-ID')}\n`;
      });
      content += `\nTotal Revenue: Rp ${profitLoss.totalRevenue.toLocaleString('id-ID')}\n\n`;
      content += 'EXPENSES\n';
      // Ensure profitLoss.expenses is always an array
      const expensesArray = Array.isArray(profitLoss.expenses) ? profitLoss.expenses : [];
      expensesArray.filter(e => e.balance !== 0).forEach(e => {
        content += `${e.code} - ${e.name}: Rp ${e.balance.toLocaleString('id-ID')}\n`;
      });
      content += `\nTotal Expenses: Rp ${profitLoss.totalExpenses.toLocaleString('id-ID')}\n\n`;
      content += `Net Profit: Rp ${profitLoss.netProfit.toLocaleString('id-ID')}\n`;
    } else if (reportType === 'inventory') {
      content = `Inventory Report\nAs of ${new Date().toLocaleDateString('id-ID')}\n\n`;
      
      const materialInventory = inventory.filter((inv: any) => {
        const kategori = (inv.kategori || inv.category || inv.type || '').toLowerCase().trim();
        if (!kategori) return false;
        const materialCategories = ['material', 'bahan', 'bahan baku', 'raw material', 'materials'];
        return materialCategories.some(cat => kategori.includes(cat));
      });
      
      const productInventory = inventory.filter((inv: any) => {
        const kategori = (inv.kategori || inv.category || inv.type || '').toLowerCase().trim();
        if (!kategori) return false;
        const productCategories = ['product', 'produk', 'finished goods', 'barang jadi'];
        return productCategories.some(cat => kategori.includes(cat));
      });
      
      content += 'MATERIAL INVENTORY\n';
      materialInventory.forEach((inv: any) => {
        const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
        const price = inv.price || inv.unitPrice || 0;
        const total = stock * price;
        const itemName = inv.description || inv.itemName || inv.name || inv.codeItem || 'Unknown';
        const itemCode = inv.codeItem || inv.kode || inv.itemCode || inv.id || '';
        content += `${itemCode} - ${itemName}: ${stock} x Rp ${price.toLocaleString('id-ID')} = Rp ${total.toLocaleString('id-ID')}\n`;
      });
      const materialTotal = materialInventory.reduce((sum: number, inv: any) => {
        const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
        const price = inv.price || inv.unitPrice || 0;
        return sum + (stock * price);
      }, 0);
      content += `\nTotal Material Inventory: Rp ${materialTotal.toLocaleString('id-ID')}\n\n`;
      
      content += 'PRODUCT INVENTORY\n';
      productInventory.forEach((inv: any) => {
        const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
        const price = inv.price || inv.unitPrice || 0;
        const total = stock * price;
        const itemName = inv.description || inv.itemName || inv.name || inv.codeItem || 'Unknown';
        const itemCode = inv.codeItem || inv.kode || inv.itemCode || inv.id || '';
        content += `${itemCode} - ${itemName}: ${stock} x Rp ${price.toLocaleString('id-ID')} = Rp ${total.toLocaleString('id-ID')}\n`;
      });
      const productTotal = productInventory.reduce((sum: number, inv: any) => {
        const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
        const price = inv.price || inv.unitPrice || 0;
        return sum + (stock * price);
      }, 0);
      content += `\nTotal Product Inventory: Rp ${productTotal.toLocaleString('id-ID')}\n\n`;
      
      const grandTotal = materialTotal + productTotal;
      content += `Total Inventory Value: Rp ${grandTotal.toLocaleString('id-ID')}\n`;
    } else {
      content = `Cash Flow Statement\nPeriod: ${dateFrom} to ${dateTo}\n\n`;
      content += 'OPERATING ACTIVITIES\n';
      content += `Net Profit: Rp ${cashFlow.operating.netProfit.toLocaleString('id-ID')}\n`;
      content += `Accounts Receivable: Rp ${cashFlow.operating.accountsReceivable.toLocaleString('id-ID')}\n`;
      content += `Inventory: Rp ${cashFlow.operating.inventory.toLocaleString('id-ID')}\n`;
      content += `Accounts Payable: Rp ${cashFlow.operating.accountsPayable.toLocaleString('id-ID')}\n`;
      content += `Operating Cash Flow: Rp ${cashFlow.operatingCash.toLocaleString('id-ID')}\n\n`;
      content += 'INVESTING ACTIVITIES\n';
      content += `Fixed Assets: Rp ${cashFlow.investing.fixedAssets.toLocaleString('id-ID')}\n`;
      content += `Investing Cash Flow: Rp ${cashFlow.investingCash.toLocaleString('id-ID')}\n\n`;
      content += 'FINANCING ACTIVITIES\n';
      content += `Equity: Rp ${cashFlow.financing.equity.toLocaleString('id-ID')}\n`;
      content += `Retained Earnings: Rp ${cashFlow.financing.retainedEarnings.toLocaleString('id-ID')}\n`;
      content += `Financing Cash Flow: Rp ${cashFlow.financingCash.toLocaleString('id-ID')}\n\n`;
      content += `Net Cash Flow: Rp ${cashFlow.netCashFlow.toLocaleString('id-ID')}\n`;
      content += `Ending Cash: Rp ${cashFlow.endingCash.toLocaleString('id-ID')}\n`;
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType === 'balance' ? 'BalanceSheet' : reportType === 'pl' ? 'ProfitLoss' : reportType === 'cashflow' ? 'CashFlow' : 'Inventory'}_${dateFrom}_${dateTo}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Helper function untuk set column widths
      const setWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
        if (!ws['!cols']) ws['!cols'] = [];
        widths.forEach((width, idx) => {
          if (ws['!cols']) {
            ws['!cols'][idx] = { wch: width, wpx: width * 7 };
          }
        });
      };
      
      // Sheet 1: Balance Sheet
      const balanceData = [
        ['ASSETS'],
        ['Code', 'Name', 'Balance'],
        ...(Array.isArray(balanceSheet?.assets) ? balanceSheet.assets : []).map((a: any) => [a.code, a.name, a.balance]),
          ['', 'Total Assets', balanceSheet?.totalAssets || 0],
          [],
          ['LIABILITIES'],
          ['Code', 'Name', 'Balance'],
          ...(Array.isArray(balanceSheet?.liabilities) ? balanceSheet.liabilities : []).map((l: any) => [l.code, l.name, l.balance]),
          ['', 'Total Liabilities', balanceSheet?.totalLiabilities || 0],
          [],
          ['EQUITY'],
          ['Code', 'Name', 'Balance'],
          ...(Array.isArray(balanceSheet?.equity) ? balanceSheet.equity : []).map((e: any) => [e.code, e.name, e.balance]),
          ['', 'Total Equity', balanceSheet?.totalEquity || 0],
          [],
          ['', 'Total Liabilities & Equity', balanceSheet?.totalLiabilitiesAndEquity || 0],
      ];
      const wsBalance = XLSX.utils.aoa_to_sheet(balanceData);
      setWidths(wsBalance, [20, 40, 20]);
      // Format currency untuk balance columns
      const balanceRange = XLSX.utils.decode_range(wsBalance['!ref'] || 'A1');
      for (let row = 2; row <= balanceRange.e.r; row++) {
        const cell = XLSX.utils.encode_cell({ r: row, c: 2 });
        if (wsBalance[cell] && typeof wsBalance[cell].v === 'number') {
          wsBalance[cell].z = '#,##0';
        }
      }
      XLSX.utils.book_append_sheet(wb, wsBalance, 'Sheet 1 - Balance Sheet');
      
      // Sheet 2: Profit & Loss
      const plData = [
        ['REVENUE'],
        ['Code', 'Name', 'Balance'],
        ...(Array.isArray(profitLoss?.revenue) ? profitLoss.revenue : []).map((r: any) => [r.code, r.name, r.balance]),
          ['', 'Total Revenue', profitLoss?.totalRevenue || 0],
          [],
          ['EXPENSES'],
          ['Code', 'Name', 'Balance'],
          ...(Array.isArray(profitLoss?.expenses) ? profitLoss.expenses : []).map((e: any) => [e.code, e.name, e.balance]),
          ['', 'Total Expenses', profitLoss?.totalExpenses || 0],
          [],
          ['', 'Net Profit', profitLoss?.netProfit || 0],
      ];
      const wsPL = XLSX.utils.aoa_to_sheet(plData);
      setWidths(wsPL, [20, 40, 20]);
      const plRange = XLSX.utils.decode_range(wsPL['!ref'] || 'A1');
      for (let row = 2; row <= plRange.e.r; row++) {
        const cell = XLSX.utils.encode_cell({ r: row, c: 2 });
        if (wsPL[cell] && typeof wsPL[cell].v === 'number') {
          wsPL[cell].z = '#,##0';
        }
      }
      XLSX.utils.book_append_sheet(wb, wsPL, 'Sheet 2 - Profit & Loss');
      
      // Sheet 3: Cash Flow
      const cfData = [
        ['OPERATING ACTIVITIES'],
        ['Item', 'Amount'],
          ['Net Profit', cashFlow?.operating?.netProfit || 0],
          ['Accounts Receivable', cashFlow?.operating?.accountsReceivable || 0],
          ['Inventory', cashFlow?.operating?.inventory || 0],
          ['Accounts Payable', cashFlow?.operating?.accountsPayable || 0],
          ['', 'Operating Cash Flow', cashFlow?.operatingCash || 0],
          [],
          ['INVESTING ACTIVITIES'],
          ['Item', 'Amount'],
          ['Fixed Assets', cashFlow?.investing?.fixedAssets || 0],
          ['', 'Investing Cash Flow', cashFlow?.investingCash || 0],
          [],
          ['FINANCING ACTIVITIES'],
          ['Item', 'Amount'],
          ['Equity', cashFlow?.financing?.equity || 0],
          ['Retained Earnings', cashFlow?.financing?.retainedEarnings || 0],
          ['', 'Financing Cash Flow', cashFlow?.financingCash || 0],
          [],
          ['', 'Net Cash Flow', cashFlow?.netCashFlow || 0],
          ['', 'Ending Cash', cashFlow?.endingCash || 0],
      ];
      const wsCF = XLSX.utils.aoa_to_sheet(cfData);
      setWidths(wsCF, [30, 20]);
      const cfRange = XLSX.utils.decode_range(wsCF['!ref'] || 'A1');
      for (let row = 2; row <= cfRange.e.r; row++) {
        const cell = XLSX.utils.encode_cell({ r: row, c: 1 });
        if (wsCF[cell] && typeof wsCF[cell].v === 'number') {
          wsCF[cell].z = '#,##0';
        }
      }
      XLSX.utils.book_append_sheet(wb, wsCF, 'Sheet 3 - Cash Flow');
      
      // Sheet 4: Summary Report
      const summaryData = [
        ['FINANCIAL SUMMARY'],
        ['Period', `${dateFrom} to ${dateTo}`],
        [],
        ['Balance Sheet Summary'],
        ['Total Assets', balanceSheet?.totalAssets || 0],
        ['Total Liabilities', balanceSheet?.totalLiabilities || 0],
        ['Total Equity', balanceSheet?.totalEquity || 0],
        ['Total Liabilities & Equity', balanceSheet?.totalLiabilitiesAndEquity || 0],
        [],
        ['Profit & Loss Summary'],
        ['Total Revenue', profitLoss?.totalRevenue || 0],
        ['Total Expenses', profitLoss?.totalExpenses || 0],
        ['Net Profit', profitLoss?.netProfit || 0],
        [],
        ['Cash Flow Summary'],
        ['Operating Cash Flow', cashFlow?.operatingCash || 0],
        ['Investing Cash Flow', cashFlow?.investingCash || 0],
        ['Financing Cash Flow', cashFlow?.financingCash || 0],
        ['Net Cash Flow', cashFlow?.netCashFlow || 0],
        ['Ending Cash', cashFlow?.endingCash || 0],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      setWidths(wsSummary, [30, 20]);
      const summaryRange = XLSX.utils.decode_range(wsSummary['!ref'] || 'A1');
      for (let row = 1; row <= summaryRange.e.r; row++) {
        const cell = XLSX.utils.encode_cell({ r: row, c: 1 });
        if (wsSummary[cell] && typeof wsSummary[cell].v === 'number') {
          wsSummary[cell].z = '#,##0';
        }
      }
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Sheet 4 - Summary');
      
      // Sheet 5: Inventory Report
      const materialInventory = inventory.filter((inv: any) => {
        const kategori = (inv.kategori || inv.category || inv.type || '').toLowerCase().trim();
        if (!kategori) return false;
        const materialCategories = ['material', 'bahan', 'bahan baku', 'raw material', 'materials'];
        return materialCategories.some(cat => kategori.includes(cat));
      });
      
      const productInventory = inventory.filter((inv: any) => {
        const kategori = (inv.kategori || inv.category || inv.type || '').toLowerCase().trim();
        if (!kategori) return false;
        const productCategories = ['product', 'produk', 'finished goods', 'barang jadi'];
        return productCategories.some(cat => kategori.includes(cat));
      });
      
      const inventoryData = [
        ['MATERIAL INVENTORY'],
        ['Code', 'Item Name', 'Quantity', 'Unit Price', 'Total Value'],
        ...materialInventory.map((inv: any) => {
          const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
          const price = inv.price || inv.unitPrice || 0;
          const total = stock * price;
          const itemName = inv.description || inv.itemName || inv.name || inv.codeItem || 'Unknown';
          const itemCode = inv.codeItem || inv.kode || inv.itemCode || inv.id || '';
          return [itemCode, itemName, stock, price, total];
        }),
        ['', '', '', 'Total Material', materialInventory.reduce((sum: number, inv: any) => {
          const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
          const price = inv.price || inv.unitPrice || 0;
          return sum + (stock * price);
        }, 0)],
        [],
        ['PRODUCT INVENTORY'],
        ['Code', 'Item Name', 'Quantity', 'Unit Price', 'Total Value'],
        ...productInventory.map((inv: any) => {
          const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
          const price = inv.price || inv.unitPrice || 0;
          const total = stock * price;
          const itemName = inv.description || inv.itemName || inv.name || inv.codeItem || 'Unknown';
          const itemCode = inv.codeItem || inv.kode || inv.itemCode || inv.id || '';
          return [itemCode, itemName, stock, price, total];
        }),
        ['', '', '', 'Total Product', productInventory.reduce((sum: number, inv: any) => {
          const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
          const price = inv.price || inv.unitPrice || 0;
          return sum + (stock * price);
        }, 0)],
        [],
        ['', '', '', 'Grand Total', inventory.reduce((sum: number, inv: any) => {
          const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
          const price = inv.price || inv.unitPrice || 0;
          return sum + (stock * price);
        }, 0)],
      ];
      const wsInventory = XLSX.utils.aoa_to_sheet(inventoryData);
      setWidths(wsInventory, [20, 40, 15, 20, 20]);
      const inventoryRange = XLSX.utils.decode_range(wsInventory['!ref'] || 'A1');
      for (let row = 2; row <= inventoryRange.e.r; row++) {
        const priceCell = XLSX.utils.encode_cell({ r: row, c: 3 });
        const totalCell = XLSX.utils.encode_cell({ r: row, c: 4 });
        if (wsInventory[priceCell] && typeof wsInventory[priceCell].v === 'number') {
          wsInventory[priceCell].z = '#,##0';
        }
        if (wsInventory[totalCell] && typeof wsInventory[totalCell].v === 'number') {
          wsInventory[totalCell].z = '#,##0';
        }
      }
      XLSX.utils.book_append_sheet(wb, wsInventory, 'Sheet 5 - Inventory');
      
      const fileName = `Financial_Reports_Complete_${dateFrom}_${dateTo}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete financial reports (Balance Sheet, P&L, Cash Flow, Summary, Inventory) to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>Financial Reports</h2>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value="balance">Balance Sheet</option>
              <option value="pl">Profit & Loss</option>
              <option value="cashflow">Cash Flow Statement</option>
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(value) => setDateFrom(value)}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(value) => setDateTo(value)}
            />
            <Button onClick={handlePrint} style={{ padding: '4px 12px', fontSize: '12px' }}>Print</Button>
            <Button onClick={handleExportExcel} style={{ padding: '4px 12px', fontSize: '12px' }}>📥 Export Excel</Button>
            <Button onClick={handleExport} style={{ padding: '4px 12px', fontSize: '12px' }}>Export Text</Button>
          </div>
        </div>

        {reportType === 'balance' && (
          <div style={{ padding: '8px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>
              Balance Sheet<br />
              <span style={{ fontSize: '10px', fontWeight: 'normal' }}>
                Period: {new Date(dateFrom).toLocaleDateString('id-ID')} to {new Date(dateTo).toLocaleDateString('id-ID')}
              </span>
            </h3>
            
            <div className="financial-reports-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Chart Card - Left */}
              {chartData.length > 0 && (
                <Card style={{ padding: '8px' }}>
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#0a0e27', 
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    marginBottom: '8px'
                  }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94a3b8"
                          style={{ fontSize: '10px' }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          style={{ fontSize: '10px' }}
                          tickFormatter={(value) => value.toLocaleString('id-ID')}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#f1f5f9',
                            fontSize: '11px'
                          }}
                          formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`, 'Total Assets']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#14b8a6" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorValue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Pie Chart - Assets Breakdown */}
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#0a0e27', 
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={balanceSheet.assets.filter(a => a.balance !== 0).map(a => ({ name: a.name, value: Math.abs(a.balance) }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => {
                            if (!name) return null;
                            // Shorten long names
                            const shortName = name.length > 12 ? name.substring(0, 12) + '...' : name;
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            return (
                              <text 
                                x={0} 
                                y={0} 
                                fill={isDark ? '#f1f5f9' : '#1e293b'} 
                                textAnchor="middle" 
                                dominantBaseline="central"
                                style={{ fontSize: '8px', fontWeight: '600' }}
                              >
                                {shortName}: {((percent || 0) * 100).toFixed(0)}%
                              </text>
                            );
                          }}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {balanceSheet.assets.filter(a => a.balance !== 0).map((_, index) => {
                            const colors = ['#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff',
                            border: `1px solid ${document.documentElement.getAttribute('data-theme') === 'dark' ? '#334155' : '#e2e8f0'}`,
                            borderRadius: '6px',
                            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#1e293b',
                            fontSize: '11px'
                          }}
                          formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
              
              {/* Data Card - Right */}
              <Card style={{ padding: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>ASSETS</h4>
                    {balanceSheet.assets.filter(asset => asset.balance !== 0).map((asset, index) => (
                      <div key={`asset-${asset.code}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                        <span>{asset.code} - {asset.name}</span>
                        <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {asset.balance.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                      <span>Total Assets</span>
                      <span>Rp {balanceSheet.totalAssets.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>LIABILITIES</h4>
                    {balanceSheet.liabilities.filter(liability => liability.balance !== 0).map((liability, index) => (
                      <div key={`liability-${liability.code}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                        <span>{liability.code} - {liability.name}</span>
                        <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {liability.balance.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                      <span>Total Liabilities</span>
                      <span>Rp {balanceSheet.totalLiabilities.toLocaleString('id-ID')}</span>
                    </div>
                    
                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '12px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>EQUITY</h4>
                    {balanceSheet.equity.filter(equity => equity.balance !== 0).map((equity, index) => (
                      <div key={`equity-${equity.code}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                        <span>{equity.code} - {equity.name}</span>
                        <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {equity.balance.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                      <span>Total Equity</span>
                      <span>Rp {balanceSheet.totalEquity.toLocaleString('id-ID')}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '8px', borderTop: '2px solid var(--accent-color)', fontWeight: 'bold', fontSize: '12px' }}>
                      <span>Total Liabilities & Equity</span>
                      <span>Rp {balanceSheet.totalLiabilitiesAndEquity.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {reportType === 'pl' && (
          <div style={{ padding: '8px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>
              Profit & Loss Statement<br />
              <span style={{ fontSize: '10px', fontWeight: 'normal' }}>
                Period: {new Date(dateFrom).toLocaleDateString('id-ID')} to {new Date(dateTo).toLocaleDateString('id-ID')}
              </span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Chart Card - Left */}
              {chartData.length > 0 && (
                <Card style={{ padding: '8px' }}>
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#0a0e27', 
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94a3b8"
                          style={{ fontSize: '10px' }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          style={{ fontSize: '10px' }}
                          tickFormatter={(value) => value.toLocaleString('id-ID')}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#f1f5f9',
                            fontSize: '11px'
                          }}
                          formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`, 'Net Profit']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#14b8a6" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorProfit)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Pie Chart - Revenue vs Expenses */}
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#0a0e27', 
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Revenue', value: Math.abs(profitLoss.totalRevenue) },
                            { name: 'Expenses', value: Math.abs(profitLoss.totalExpenses) }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => {
                            if (!name) return null;
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            return (
                              <text 
                                x={0} 
                                y={0} 
                                fill={isDark ? '#f1f5f9' : '#1e293b'} 
                                textAnchor="middle" 
                                dominantBaseline="central"
                                style={{ fontSize: '8px', fontWeight: '600' }}
                              >
                                {name}: {((percent || 0) * 100).toFixed(0)}%
                              </text>
                            );
                          }}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#14b8a6" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff',
                            border: `1px solid ${document.documentElement.getAttribute('data-theme') === 'dark' ? '#334155' : '#e2e8f0'}`,
                            borderRadius: '6px',
                            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#1e293b',
                            fontSize: '11px'
                          }}
                          formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`}
                        />
                        <Legend 
                          wrapperStyle={{ 
                            fontSize: '10px', 
                            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#1e293b'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
              
              {/* Data Card - Right */}
              <Card style={{ padding: '8px' }}>
                <div style={{ maxWidth: '100%' }}>
                  <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>REVENUE</h4>
                  {profitLoss.revenue.filter(rev => rev.balance !== 0).map((rev, index) => (
                    <div key={`revenue-${rev.code}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                      <span>{rev.code} - {rev.name}</span>
                      <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {rev.balance.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                    <span>Total Revenue</span>
                    <span>Rp {profitLoss.totalRevenue.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '12px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>EXPENSES</h4>
                  {profitLoss.expenses.filter(exp => exp.balance !== 0).map((exp, index) => (
                    <div key={`expense-${exp.code}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                      <span>{exp.code} - {exp.name}</span>
                      <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {exp.balance.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                    <span>Total Expenses</span>
                    <span>Rp {profitLoss.totalExpenses.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '8px', borderTop: '2px solid var(--accent-color)', fontWeight: 'bold', fontSize: '12px', color: profitLoss.netProfit >= 0 ? 'green' : 'red' }}>
                    <span>Net Profit / Loss</span>
                    <span>Rp {profitLoss.netProfit.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {reportType === 'cashflow' && (
          <div style={{ padding: '8px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>
              Cash Flow Statement<br />
              <span style={{ fontSize: '10px', fontWeight: 'normal' }}>
                Period: {new Date(dateFrom).toLocaleDateString('id-ID')} to {new Date(dateTo).toLocaleDateString('id-ID')}
              </span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Chart Card - Left */}
              {chartData.length > 0 && (
                <Card style={{ padding: '8px' }}>
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#0a0e27', 
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    marginBottom: '8px'
                  }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#94a3b8"
                          style={{ fontSize: '10px' }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          style={{ fontSize: '10px' }}
                          tickFormatter={(value) => value.toLocaleString('id-ID')}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#f1f5f9',
                            fontSize: '11px'
                          }}
                          formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`, 'Cash']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#14b8a6" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorCash)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Pie Chart - Cash Flow Breakdown */}
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#0a0e27', 
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                  }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Operating', value: Math.abs(cashFlow.operatingCash) },
                            { name: 'Investing', value: Math.abs(cashFlow.investingCash) },
                            { name: 'Financing', value: Math.abs(cashFlow.financingCash) }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => {
                            if (!name) return null;
                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                            return (
                              <text 
                                x={0} 
                                y={0} 
                                fill={isDark ? '#f1f5f9' : '#1e293b'} 
                                textAnchor="middle" 
                                dominantBaseline="central"
                                style={{ fontSize: '8px', fontWeight: '600' }}
                              >
                                {name}: {((percent || 0) * 100).toFixed(0)}%
                              </text>
                            );
                          }}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#14b8a6" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#8b5cf6" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff',
                            border: `1px solid ${document.documentElement.getAttribute('data-theme') === 'dark' ? '#334155' : '#e2e8f0'}`,
                            borderRadius: '6px',
                            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#1e293b',
                            fontSize: '11px'
                          }}
                          formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`}
                        />
                        <Legend 
                          wrapperStyle={{ 
                            fontSize: '10px', 
                            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#1e293b'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
              
              {/* Data Card - Right */}
              <Card style={{ padding: '8px' }}>
                <div style={{ maxWidth: '100%' }}>
                  <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>OPERATING ACTIVITIES</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                    <span>Net Profit</span>
                    <span style={{ fontSize: '9px' }}>Rp {cashFlow.operating.netProfit.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                    <span>Accounts Receivable</span>
                    <span style={{ fontSize: '9px' }}>Rp {cashFlow.operating.accountsReceivable.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                    <span>Inventory</span>
                    <span style={{ fontSize: '9px' }}>Rp {cashFlow.operating.inventory.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                    <span>Accounts Payable</span>
                    <span style={{ fontSize: '9px' }}>Rp {cashFlow.operating.accountsPayable.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                    <span>Net Cash from Operating Activities</span>
                    <span>Rp {cashFlow.operatingCash.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '12px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>INVESTING ACTIVITIES</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                    <span>Fixed Assets</span>
                    <span style={{ fontSize: '9px' }}>Rp {cashFlow.investing.fixedAssets.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                    <span>Net Cash from Investing Activities</span>
                    <span>Rp {cashFlow.investingCash.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '12px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>FINANCING ACTIVITIES</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                    <span>Equity</span>
                    <span style={{ fontSize: '9px' }}>Rp {cashFlow.financing.equity.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                    <span>Retained Earnings</span>
                    <span style={{ fontSize: '9px' }}>Rp {cashFlow.financing.retainedEarnings.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                    <span>Net Cash from Financing Activities</span>
                    <span>Rp {cashFlow.financingCash.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '8px', borderTop: '2px solid var(--accent-color)', fontWeight: 'bold', fontSize: '12px' }}>
                    <span>Net Increase/Decrease in Cash</span>
                    <span>Rp {cashFlow.netCashFlow.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                    <span>Ending Cash Balance</span>
                    <span>Rp {cashFlow.endingCash.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {reportType === 'inventory' && (
          <div style={{ padding: '8px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '12px', fontSize: '14px' }}>
              Inventory Report<br />
              <span style={{ fontSize: '10px', fontWeight: 'normal' }}>
                As of {new Date().toLocaleDateString('id-ID')}
              </span>
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Material Inventory */}
              <Card style={{ padding: '8px' }}>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>MATERIAL INVENTORY</h4>
                {(() => {
                  const materialInventory = inventory.filter((inv: any) => {
                    // Check kategori field (primary) - ini field yang digunakan di Inventory.tsx
                    const kategori = (inv.kategori || inv.category || inv.type || '').toLowerCase().trim();
                    if (!kategori) return false;
                    
                    // Material categories (dari Inventory.tsx logic)
                    const materialCategories = ['material', 'bahan', 'bahan baku', 'raw material', 'materials'];
                    return materialCategories.some(cat => kategori.includes(cat));
                  });
                  
                  const materialTotal = materialInventory.reduce((sum: number, inv: any) => {
                    // Use nextStock (calculated stock) instead of qty/quantity
                    const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
                    const price = inv.price || inv.unitPrice || 0;
                    return sum + (stock * price);
                  }, 0);
                  
                  return (
                    <>
                      {materialInventory.length > 0 ? (
                        <>
                          {materialInventory.map((inv: any, index: number) => {
                            // Use nextStock (calculated stock) instead of qty/quantity
                            const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
                            const price = inv.price || inv.unitPrice || 0;
                            const total = stock * price;
                            const itemName = inv.description || inv.itemName || inv.name || inv.codeItem || 'Unknown';
                            const itemCode = inv.codeItem || inv.kode || inv.itemCode || inv.id || '';
                            
                            return (
                              <div key={`material-${inv.id || index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                                <span title={itemName}>{itemCode} - {itemName.length > 30 ? itemName.substring(0, 30) + '...' : itemName}</span>
                                <span style={{ fontWeight: '600', fontSize: '9px' }}>
                                  {stock.toLocaleString('id-ID')} x Rp {price.toLocaleString('id-ID')} = Rp {total.toLocaleString('id-ID')}
                                </span>
                              </div>
                            );
                          })}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                            <span>Total Material Inventory</span>
                            <span>Rp {materialTotal.toLocaleString('id-ID')}</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          No material inventory data
                        </div>
                      )}
                    </>
                  );
                })()}
              </Card>
              
              {/* Product Inventory */}
              <Card style={{ padding: '8px' }}>
                <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>PRODUCT INVENTORY</h4>
                {(() => {
                  const productInventory = inventory.filter((inv: any) => {
                    // Check kategori field (primary) - ini field yang digunakan di Inventory.tsx
                    const kategori = (inv.kategori || inv.category || inv.type || '').toLowerCase().trim();
                    if (!kategori) return false;
                    
                    // Product categories (dari Inventory.tsx logic)
                    const productCategories = ['product', 'produk', 'finished goods', 'barang jadi'];
                    return productCategories.some(cat => kategori.includes(cat));
                  });
                  
                  const productTotal = productInventory.reduce((sum: number, inv: any) => {
                    // Use nextStock (calculated stock) instead of qty/quantity
                    const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
                    const price = inv.price || inv.unitPrice || 0;
                    return sum + (stock * price);
                  }, 0);
                  
                  return (
                    <>
                      {productInventory.length > 0 ? (
                        <>
                          {productInventory.map((inv: any, index: number) => {
                            // Use nextStock (calculated stock) instead of qty/quantity
                            const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
                            const price = inv.price || inv.unitPrice || 0;
                            const total = stock * price;
                            const itemName = inv.description || inv.itemName || inv.name || inv.codeItem || 'Unknown';
                            const itemCode = inv.codeItem || inv.kode || inv.itemCode || inv.id || '';
                            
                            return (
                              <div key={`product-${inv.id || index}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                                <span title={itemName}>{itemCode} - {itemName.length > 30 ? itemName.substring(0, 30) + '...' : itemName}</span>
                                <span style={{ fontWeight: '600', fontSize: '9px' }}>
                                  {stock.toLocaleString('id-ID')} x Rp {price.toLocaleString('id-ID')} = Rp {total.toLocaleString('id-ID')}
                                </span>
                              </div>
                            );
                          })}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                            <span>Total Product Inventory</span>
                            <span>Rp {productTotal.toLocaleString('id-ID')}</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          No product inventory data
                        </div>
                      )}
                    </>
                  );
                })()}
              </Card>
            </div>
            
            {/* Summary */}
            <Card style={{ padding: '8px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Total Inventory Items: {inventory.length}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Material: {inventory.filter((inv: any) => {
                      const kategori = (inv.kategori || inv.category || inv.type || '').toLowerCase().trim();
                      if (!kategori) return false;
                      const materialCategories = ['material', 'bahan', 'bahan baku', 'raw material', 'materials'];
                      return materialCategories.some(cat => kategori.includes(cat));
                    }).length} items | Product: {inventory.filter((inv: any) => {
                      const kategori = (inv.kategori || inv.category || inv.type || '').toLowerCase().trim();
                      if (!kategori) return false;
                      const productCategories = ['product', 'produk', 'finished goods', 'barang jadi'];
                      return productCategories.some(cat => kategori.includes(cat));
                    }).length} items
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Inventory Value</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    Rp {(() => {
                      const total = inventory.reduce((sum: number, inv: any) => {
                        // Use nextStock (calculated stock) instead of qty/quantity
                        const stock = inv.nextStock || inv.stock || inv.qty || inv.quantity || 0;
                        const price = inv.price || inv.unitPrice || 0;
                        return sum + (stock * price);
                      }, 0);
                      return total.toLocaleString('id-ID');
                    })()}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
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

export default FinancialReports;

