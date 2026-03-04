import { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService, StorageKeys } from '../../services/storage';
import * as XLSX from 'xlsx';
import '../../styles/common.css';
import '../../styles/compact.css';

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

interface BusinessUnitData {
  name: string;
  entries: JournalEntry[];
  accounts: Account[];
  balanceSheet: {
    assets: Array<{ code: string; name: string; balance: number }>;
    liabilities: Array<{ code: string; name: string; balance: number }>;
    equity: Array<{ code: string; name: string; balance: number }>;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
  };
  profitLoss: {
    revenue: Array<{ code: string; name: string; balance: number }>;
    expenses: Array<{ code: string; name: string; balance: number }>;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
  };
  cashFlow: {
    operating: {
      netIncome: number;
      depreciation: number;
      accountsReceivable: number;
      inventory: number;
      accountsPayable: number;
    };
    investing: {
      fixedAssets: number;
    };
    financing: {
      equity: number;
      retainedEarnings: number;
    };
    operatingCash: number;
    investingCash: number;
    financingCash: number;
    netCashFlow: number;
    beginningCash: number;
    endingCash: number;
  };
}

const AllBusinessFinancialReports = () => {
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
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitData[]>([]);

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo]);

  const loadData = async () => {
    // Load data dari semua unit bisnis
    const [packagingEntriesRaw, packagingAccountsRaw, gtEntriesRaw, gtAccountsRaw, trackingEntriesRaw, trackingAccountsRaw] = await Promise.all([
      storageService.get<JournalEntry[]>('journalEntries') || [],
      storageService.get<Account[]>('accounts') || [],
      storageService.get<JournalEntry[]>(StorageKeys.GENERAL_TRADING.JOURNAL_ENTRIES) || [],
      storageService.get<Account[]>(StorageKeys.GENERAL_TRADING.ACCOUNTS) || [],
      storageService.get<JournalEntry[]>('trucking_journalEntries') || [],
      storageService.get<Account[]>('trucking_accounts') || [],
    ]);

    // Ensure all are arrays
    const packagingEntries = Array.isArray(packagingEntriesRaw) ? packagingEntriesRaw : [];
    const packagingAccounts = Array.isArray(packagingAccountsRaw) ? packagingAccountsRaw : [];
    const gtEntries = Array.isArray(gtEntriesRaw) ? gtEntriesRaw : [];
    const gtAccounts = Array.isArray(gtAccountsRaw) ? gtAccountsRaw : [];
    const trackingEntries = Array.isArray(trackingEntriesRaw) ? trackingEntriesRaw : [];
    const trackingAccounts = Array.isArray(trackingAccountsRaw) ? trackingAccountsRaw : [];

    const units: BusinessUnitData[] = [];

    // Packaging
    if ((packagingEntries.length > 0) || (packagingAccounts.length > 0)) {
      units.push(calculateBusinessUnitData('Packaging', packagingEntries, packagingAccounts));
    }

    // General Trading
    if ((gtEntries.length > 0) || (gtAccounts.length > 0)) {
      units.push(calculateBusinessUnitData('General Trading', gtEntries, gtAccounts));
    }

    // Tracking
    if ((trackingEntries.length > 0) || (trackingAccounts.length > 0)) {
      units.push(calculateBusinessUnitData('Tracking', trackingEntries, trackingAccounts));
    }

    setBusinessUnits(units);
  };

  const calculateBusinessUnitData = (name: string, entries: JournalEntry[], accounts: Account[]): BusinessUnitData => {
    // Ensure entries and accounts are always arrays
    const entriesArray = Array.isArray(entries) ? entries : [];
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    
    // Filter entries by date range
    const filteredEntries = entriesArray.filter((e: any) => {
      if (!dateTo) return true;
      const entryDate = new Date(e.entryDate);
      const to = new Date(dateTo);
      return entryDate <= to;
    });

    // Calculate account balances
    const balances: Record<string, { debit: number; credit: number; balance: number }> = {};
    
    // Ensure filteredEntries is always an array
    const filteredEntriesArray = Array.isArray(filteredEntries) ? filteredEntries : [];
    filteredEntriesArray.forEach(entry => {
      if (!balances[entry.account]) {
        balances[entry.account] = { debit: 0, credit: 0, balance: 0 };
      }
      balances[entry.account].debit += entry.debit || 0;
      balances[entry.account].credit += entry.credit || 0;
    });

    accounts.forEach(acc => {
      if (!balances[acc.code]) {
        balances[acc.code] = { debit: 0, credit: 0, balance: 0 };
      }
      if (acc.type === 'Asset' || acc.type === 'Expense') {
        balances[acc.code].balance = balances[acc.code].debit - balances[acc.code].credit;
      } else {
        balances[acc.code].balance = balances[acc.code].credit - balances[acc.code].debit;
      }
    });

    // Calculate Profit/Loss untuk Retained Earnings
    const revenue = accounts
      .filter(a => a.type === 'Revenue')
      .reduce((sum, acc) => sum + (balances[acc.code]?.balance || 0), 0);
    
    const expenses = accounts
      .filter(a => a.type === 'Expense')
      .reduce((sum, acc) => sum + (balances[acc.code]?.balance || 0), 0);
    
    const netProfit = revenue - expenses;

    // Balance Sheet
    const assets = accounts
      .filter(a => a.type === 'Asset')
      .map(acc => ({
        code: acc.code,
        name: acc.name,
        balance: balances[acc.code]?.balance || 0,
      }))
      .filter(a => a.balance !== 0); // Filter out zero balances

    const liabilities = accounts
      .filter(a => a.type === 'Liability')
      .map(acc => ({
        code: acc.code,
        name: acc.name,
        balance: balances[acc.code]?.balance || 0,
      }))
      .filter(l => l.balance !== 0);

    const equity = accounts
      .filter(a => a.type === 'Equity')
      .map(acc => {
        let balance = balances[acc.code]?.balance || 0;
        if (acc.code === '3100' || acc.code === '3-2000') {
          balance = balance + netProfit;
        }
        return {
          code: acc.code,
          name: acc.name,
          balance: balance,
        };
      })
      .filter(e => e.balance !== 0);

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    // Profit & Loss
    const revenueAccounts = accounts
      .filter(a => a.type === 'Revenue')
      .map(acc => ({
        code: acc.code,
        name: acc.name,
        balance: balances[acc.code]?.balance || 0,
      }))
      .filter(r => r.balance !== 0);

    const expenseAccounts = accounts
      .filter(a => a.type === 'Expense')
      .map(acc => ({
        code: acc.code,
        name: acc.name,
        balance: balances[acc.code]?.balance || 0,
      }))
      .filter(e => e.balance !== 0);

    const totalRevenue = revenueAccounts.reduce((sum, r) => sum + r.balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, e) => sum + e.balance, 0);
    const netProfitPL = totalRevenue - totalExpenses;

    // Cash Flow (simplified)
    const accountsReceivable = balances['1100']?.balance || balances['1-1210']?.balance || 0;
    const inventory = balances['1200']?.balance || balances['1-2000']?.balance || 0;
    const accountsPayable = balances['2000']?.balance || balances['2-1100']?.balance || 0;
    const fixedAssets = balances['1300']?.balance || balances['1-5000']?.balance || 0;

    const operatingCash = netProfitPL + (accountsPayable || 0) - (accountsReceivable || 0) - (inventory || 0);
    const investingCash = -(fixedAssets || 0);
    const financingCash = 0; // Simplified
    const netCashFlow = operatingCash + investingCash + financingCash;
    const beginningCash = 0; // Simplified
    const endingCash = beginningCash + netCashFlow;

    return {
      name,
      entries: filteredEntries,
      accounts,
      balanceSheet: {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity,
      },
      profitLoss: {
        revenue: revenueAccounts,
        expenses: expenseAccounts,
        totalRevenue,
        totalExpenses,
        netProfit: netProfitPL,
      },
      cashFlow: {
        operating: {
          netIncome: netProfitPL,
          depreciation: 0,
          accountsReceivable: -accountsReceivable,
          inventory: -inventory,
          accountsPayable: accountsPayable,
        },
        investing: {
          fixedAssets: -fixedAssets,
        },
        financing: {
          equity: 0,
          retainedEarnings: 0,
        },
        operatingCash,
        investingCash,
        financingCash,
        netCashFlow,
        beginningCash,
        endingCash,
      },
    };
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      businessUnits.forEach((unit) => {
        if (reportType === 'balance') {
          const wsData = [
            [`${unit.name} - Balance Sheet`],
            [`Period: ${dateFrom} to ${dateTo}`],
            [],
            ['ASSETS'],
            ['Code', 'Name', 'Balance'],
            ...unit.balanceSheet.assets.map(a => [a.code, a.name, a.balance]),
            [],
            ['LIABILITIES'],
            ['Code', 'Name', 'Balance'],
            ...unit.balanceSheet.liabilities.map(l => [l.code, l.name, l.balance]),
            [],
            ['EQUITY'],
            ['Code', 'Name', 'Balance'],
            ...unit.balanceSheet.equity.map(e => [e.code, e.name, e.balance]),
            [],
            ['TOTALS'],
            ['Total Assets', unit.balanceSheet.totalAssets],
            ['Total Liabilities', unit.balanceSheet.totalLiabilities],
            ['Total Equity', unit.balanceSheet.totalEquity],
            ['Total Liabilities & Equity', unit.balanceSheet.totalLiabilitiesAndEquity],
          ];
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          XLSX.utils.book_append_sheet(wb, ws, `${unit.name} - BS`);
        } else if (reportType === 'pl') {
          const wsData = [
            [`${unit.name} - Profit & Loss Statement`],
            [`Period: ${dateFrom} to ${dateTo}`],
            [],
            ['REVENUE'],
            ['Code', 'Name', 'Balance'],
            ...unit.profitLoss.revenue.map(r => [r.code, r.name, r.balance]),
            [],
            ['EXPENSES'],
            ['Code', 'Name', 'Balance'],
            ...unit.profitLoss.expenses.map(e => [e.code, e.name, e.balance]),
            [],
            ['TOTALS'],
            ['Total Revenue', unit.profitLoss.totalRevenue],
            ['Total Expenses', unit.profitLoss.totalExpenses],
            ['Net Profit', unit.profitLoss.netProfit],
          ];
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          XLSX.utils.book_append_sheet(wb, ws, `${unit.name} - P&L`);
        } else if (reportType === 'cashflow') {
          const wsData = [
            [`${unit.name} - Cash Flow Statement`],
            [`Period: ${dateFrom} to ${dateTo}`],
            [],
            ['OPERATING ACTIVITIES'],
            ['Net Income', unit.cashFlow.operating.netIncome],
            ['Accounts Receivable', unit.cashFlow.operating.accountsReceivable],
            ['Inventory', unit.cashFlow.operating.inventory],
            ['Accounts Payable', unit.cashFlow.operating.accountsPayable],
            ['Operating Cash Flow', unit.cashFlow.operatingCash],
            [],
            ['INVESTING ACTIVITIES'],
            ['Fixed Assets', unit.cashFlow.investing.fixedAssets],
            ['Investing Cash Flow', unit.cashFlow.investingCash],
            [],
            ['FINANCING ACTIVITIES'],
            ['Financing Cash Flow', unit.cashFlow.financingCash],
            [],
            ['Net Cash Flow', unit.cashFlow.netCashFlow],
            ['Beginning Cash', unit.cashFlow.beginningCash],
            ['Ending Cash', unit.cashFlow.endingCash],
          ];
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          XLSX.utils.book_append_sheet(wb, ws, `${unit.name} - CF`);
        }
      });

      const fileName = `All_Business_Financial_Reports_${dateFrom}_${dateTo}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>All Business Units - Financial Reports</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
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
            <Button onClick={loadData}>🔄 Refresh</Button>
            <Button onClick={handlePrint}>🖨️ Print</Button>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          </div>
        </div>

        {businessUnits.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No financial data available for any business unit.
          </div>
        )}

        {businessUnits.map((unit, unitIndex) => (
          <div key={unit.name} style={{ marginBottom: '40px', pageBreakAfter: unitIndex < businessUnits.length - 1 ? 'always' : 'auto' }}>
            <Card style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                textAlign: 'center', 
                marginBottom: '20px', 
                paddingBottom: '10px',
                borderBottom: '2px solid var(--border-color)',
                fontSize: '20px',
                fontWeight: 'bold',
                color: 'var(--accent-color)'
              }}>
                {unit.name}
              </h3>

              {reportType === 'balance' && (
                <div style={{ padding: '20px' }}>
                  <h4 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '16px' }}>
                    Balance Sheet<br />
                    <span style={{ fontSize: '12px', fontWeight: 'normal' }}>
                      Period: {new Date(dateFrom).toLocaleDateString('id-ID')} to {new Date(dateTo).toLocaleDateString('id-ID')}
                    </span>
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                    <div>
                      <h4 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>ASSETS</h4>
                      {unit.balanceSheet.assets.length > 0 ? (
                        <>
                          {unit.balanceSheet.assets.map(asset => (
                            <div key={asset.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                              <span>{asset.code} - {asset.name}</span>
                              <span style={{ fontWeight: 'bold' }}>Rp {asset.balance.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No assets</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '18px' }}>
                        <span>Total Assets</span>
                        <span>Rp {unit.balanceSheet.totalAssets.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>LIABILITIES</h4>
                      {unit.balanceSheet.liabilities.length > 0 ? (
                        <>
                          {unit.balanceSheet.liabilities.map(liability => (
                            <div key={liability.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                              <span>{liability.code} - {liability.name}</span>
                              <span style={{ fontWeight: 'bold' }}>Rp {liability.balance.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No liabilities</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '18px' }}>
                        <span>Total Liabilities</span>
                        <span>Rp {unit.balanceSheet.totalLiabilities.toLocaleString('id-ID')}</span>
                      </div>
                      
                      <h4 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginTop: '30px', marginBottom: '15px' }}>EQUITY</h4>
                      {unit.balanceSheet.equity.length > 0 ? (
                        <>
                          {unit.balanceSheet.equity.map(equity => (
                            <div key={equity.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                              <span>{equity.code} - {equity.name}</span>
                              <span style={{ fontWeight: 'bold' }}>Rp {equity.balance.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No equity</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '18px' }}>
                        <span>Total Equity</span>
                        <span>Rp {unit.balanceSheet.totalEquity.toLocaleString('id-ID')}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', marginTop: '20px', borderTop: '3px solid var(--accent-color)', fontWeight: 'bold', fontSize: '20px' }}>
                        <span>Total Liabilities & Equity</span>
                        <span>Rp {unit.balanceSheet.totalLiabilitiesAndEquity.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {reportType === 'pl' && (
                <div style={{ padding: '20px' }}>
                  <h4 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '16px' }}>
                    Profit & Loss Statement<br />
                    <span style={{ fontSize: '12px', fontWeight: 'normal' }}>
                      Period: {new Date(dateFrom).toLocaleDateString('id-ID')} to {new Date(dateTo).toLocaleDateString('id-ID')}
                    </span>
                  </h4>
                  
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h4 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>REVENUE</h4>
                    {unit.profitLoss.revenue.length > 0 ? (
                      <>
                        {unit.profitLoss.revenue.map(rev => (
                          <div key={rev.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span>{rev.code} - {rev.name}</span>
                            <span style={{ fontWeight: 'bold' }}>Rp {rev.balance.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No revenue</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '18px' }}>
                      <span>Total Revenue</span>
                      <span>Rp {unit.profitLoss.totalRevenue.toLocaleString('id-ID')}</span>
                    </div>
                    
                    <h4 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginTop: '30px', marginBottom: '15px' }}>EXPENSES</h4>
                    {unit.profitLoss.expenses.length > 0 ? (
                      <>
                        {unit.profitLoss.expenses.map(exp => (
                          <div key={exp.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span>{exp.code} - {exp.name}</span>
                            <span style={{ fontWeight: 'bold' }}>Rp {exp.balance.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No expenses</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '18px' }}>
                      <span>Total Expenses</span>
                      <span>Rp {unit.profitLoss.totalExpenses.toLocaleString('id-ID')}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', marginTop: '20px', borderTop: '3px solid var(--accent-color)', fontWeight: 'bold', fontSize: '20px', color: unit.profitLoss.netProfit >= 0 ? 'green' : 'red' }}>
                      <span>Net Profit / Loss</span>
                      <span>Rp {unit.profitLoss.netProfit.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              )}

              {reportType === 'cashflow' && (
                <div style={{ padding: '20px' }}>
                  <h4 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '16px' }}>
                    Cash Flow Statement<br />
                    <span style={{ fontSize: '12px', fontWeight: 'normal' }}>
                      Period: {new Date(dateFrom).toLocaleDateString('id-ID')} to {new Date(dateTo).toLocaleDateString('id-ID')}
                    </span>
                  </h4>
                  
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h4 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>OPERATING ACTIVITIES</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span>Net Income</span>
                      <span style={{ fontWeight: 'bold' }}>Rp {unit.cashFlow.operating.netIncome.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span>Accounts Receivable</span>
                      <span>Rp {unit.cashFlow.operating.accountsReceivable.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span>Inventory</span>
                      <span>Rp {unit.cashFlow.operating.inventory.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span>Accounts Payable</span>
                      <span>Rp {unit.cashFlow.operating.accountsPayable.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '18px' }}>
                      <span>Operating Cash Flow</span>
                      <span>Rp {unit.cashFlow.operatingCash.toLocaleString('id-ID')}</span>
                    </div>
                    
                    <h4 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginTop: '30px', marginBottom: '15px' }}>INVESTING ACTIVITIES</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span>Fixed Assets</span>
                      <span>Rp {unit.cashFlow.investing.fixedAssets.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '18px' }}>
                      <span>Investing Cash Flow</span>
                      <span>Rp {unit.cashFlow.investingCash.toLocaleString('id-ID')}</span>
                    </div>
                    
                    <h4 style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginTop: '30px', marginBottom: '15px' }}>FINANCING ACTIVITIES</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '18px' }}>
                      <span>Financing Cash Flow</span>
                      <span>Rp {unit.cashFlow.financingCash.toLocaleString('id-ID')}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', marginTop: '20px', borderTop: '3px solid var(--accent-color)', fontWeight: 'bold', fontSize: '20px' }}>
                      <span>Net Cash Flow</span>
                      <span>Rp {unit.cashFlow.netCashFlow.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span>Beginning Cash</span>
                      <span>Rp {unit.cashFlow.beginningCash.toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', marginTop: '10px', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '18px' }}>
                      <span>Ending Cash</span>
                      <span>Rp {unit.cashFlow.endingCash.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        ))}
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

export default AllBusinessFinancialReports;

