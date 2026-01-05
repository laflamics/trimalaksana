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
  const [reportType, setReportType] = useState<'balance' | 'pl' | 'cashflow'>('balance');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
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

  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ent, acc] = await Promise.all([
      storageService.get<JournalEntry[]>('trucking_journalEntries') || [],
      storageService.get<Account[]>('trucking_accounts') || [],
    ]);
    
    // Filter out deleted items (tombstone pattern)
    const activeEntries = (ent || []).filter((e: any) => {
      return !(e?.deleted === true || e?.deleted === 'true' || e?.deletedAt);
    });
    const activeAccounts = (acc || []).filter((a: any) => {
      return !(a?.deleted === true || a?.deleted === 'true' || a?.deletedAt);
    });
    
    setEntries(activeEntries);
    if (!activeAccounts || activeAccounts.length === 0) {
      await loadAccounts();
    } else {
      setAccounts(activeAccounts);
    }
  };

  const loadAccounts = async () => {
    const dataRaw = await storageService.get<Account[]>('trucking_accounts') || [];
    // Filter out deleted items (tombstone pattern)
    const data = (dataRaw || []).filter((a: any) => {
      return !(a?.deleted === true || a?.deleted === 'true' || a?.deletedAt);
    });
    setAccounts(data);
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
      if (!balances[entry.account]) {
        balances[entry.account] = { debit: 0, credit: 0, balance: 0 };
      }
      balances[entry.account].debit += entry.debit || 0;
      balances[entry.account].credit += entry.credit || 0;
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
        if (!monthBalances[entry.account]) {
          monthBalances[entry.account] = { debit: 0, credit: 0, balance: 0 };
        }
        monthBalances[entry.account].debit += entry.debit || 0;
        monthBalances[entry.account].credit += entry.credit || 0;
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
      
      data.push({
        month: monthKey,
        value: Math.max(0, value), // Ensure non-negative for chart
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
    a.download = `${reportType === 'balance' ? 'BalanceSheet' : reportType === 'pl' ? 'ProfitLoss' : 'CashFlow'}_${dateFrom}_${dateTo}.txt`;
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
      
      const fileName = `Financial_Reports_Complete_${dateFrom}_${dateTo}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete financial reports (Balance Sheet, P&L, Cash Flow, Summary) to ${fileName}`, 'Success');
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
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
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
                            backgroundColor: '#1e293b', 
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#f1f5f9',
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
                    {balanceSheet.assets.filter(asset => asset.balance !== 0).map(asset => (
                      <div key={asset.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
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
                    {balanceSheet.liabilities.filter(liability => liability.balance !== 0).map(liability => (
                      <div key={liability.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                        <span>{liability.code} - {liability.name}</span>
                        <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {liability.balance.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                      <span>Total Liabilities</span>
                      <span>Rp {balanceSheet.totalLiabilities.toLocaleString('id-ID')}</span>
                    </div>
                    
                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '12px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>EQUITY</h4>
                    {balanceSheet.equity.filter(equity => equity.balance !== 0).map(equity => (
                      <div key={equity.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
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
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#14b8a6" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#f1f5f9',
                            fontSize: '11px'
                          }}
                          formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '10px', color: '#f1f5f9' }}
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
                  {profitLoss.revenue.filter(rev => rev.balance !== 0).map(rev => (
                    <div key={rev.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
                      <span>{rev.code} - {rev.name}</span>
                      <span style={{ fontWeight: '600', fontSize: '9px' }}>Rp {rev.balance.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '1px solid var(--border-color)', fontWeight: 'bold', fontSize: '11px' }}>
                    <span>Total Revenue</span>
                    <span>Rp {profitLoss.totalRevenue.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '12px', marginBottom: '6px', fontSize: '11px', fontWeight: '600' }}>EXPENSES</h4>
                  {profitLoss.expenses.filter(exp => exp.balance !== 0).map(exp => (
                    <div key={exp.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid var(--border-color)', fontSize: '10px' }}>
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
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
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
                            backgroundColor: '#1e293b', 
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#f1f5f9',
                            fontSize: '11px'
                          }}
                          formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '10px', color: '#f1f5f9' }}
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

