import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService } from '../../services/storage';
import { deletePackagingItem, reloadPackagingData } from '../../utils/packaging-delete-helper';
import '../../styles/common.css';

interface Account {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  balance: number;
}

const COA = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState<Partial<Account>>({
    code: '',
    name: '',
    type: 'Asset',
    balance: 0,
  });
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

  useEffect(() => {
    loadData();
  }, []);

  const showAlert = (title: string, message: string) => {
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
    });
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
  };

  const closeDialog = () => {
    setDialogState({
      show: false,
      type: null,
      title: '',
      message: '',
    });
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
  };

  const loadData = async () => {
    // Load journal entries dulu
    const entriesRaw = await storageService.get<any[]>('journalEntries') || [];
    // Ensure entries is always an array
    const entries = Array.isArray(entriesRaw) ? entriesRaw : [];
    setJournalEntries(entries);
    
    // Load accounts - pastikan selalu load dari storage
    let dataRaw = await storageService.get<Account[]>('accounts') || [];
    // Ensure data is always an array
    let data = Array.isArray(dataRaw) ? dataRaw : [];
    
    // Debug: log balance dari beberapa accounts untuk verify data ter-load
    if (data.length > 0) {
      const sampleAccount = data.find(a => a.code === '1-1110');
      console.log('[COA] Loaded accounts:', data.length);
      console.log('[COA] Sample account 1-1110 balance:', sampleAccount?.balance);
      const dataArray = Array.isArray(data) ? data : [];
      console.log('[COA] Accounts with balance > 0:', dataArray.filter(a => (a.balance || 0) > 0).length);
    }
    
    // Default accounts yang harus ada
    // AKTIVA (Assets)
    const defaultAccounts: Account[] = [
        // AKTIVA (Assets)  
    { code: '1-0000', name: 'AKTIVA', type: 'Asset', balance: 0 },
    { code: '1-1000', name: 'AKTIVA LANCAR', type: 'Asset', balance: 0 },
    { code: '1-1100', name: 'KAS & BANK', type: 'Asset', balance: 0 },
    { code: '1-1110', name: 'KAS PETTY CASH', type: 'Asset', balance: 0 },
    { code: '1-1111', name: 'KAS TOKO', type: 'Asset', balance: 0 },
    { code: '1-1112', name: 'KAS MUSANTOSO', type: 'Asset', balance: 0 },
    { code: '1-1120', name: 'BANK BCA', type: 'Asset', balance: 0 },
    { code: '1-1121', name: 'BANK MANDIRI', type: 'Asset', balance: 0 },
    { code: '1-1121A', name: 'BANK MANDIRI 2015 (CIKARANG)', type: 'Asset', balance: 0 },
    { code: '1-1121B', name: 'BANK MANDIRI 7273 (OUTWARD)', type: 'Asset', balance: 0 },
    { code: '1-1121C', name: 'BANK MANDIRI 7265 ( INWARD)', type: 'Asset', balance: 0 },
    { code: '1-1129', name: 'BANK BNI 1790095608', type: 'Asset', balance: 0 },
    { code: '1-1130', name: 'BANK BRI', type: 'Asset', balance: 0 },
    { code: '1-1131', name: 'BCA ALI AUDAH', type: 'Asset', balance: 0 },
    { code: '1-1140', name: 'KAS BIAYA PROMOSI', type: 'Asset', balance: 0 },
    { code: '1-1141', name: 'KAS DEPOSIT', type: 'Asset', balance: 0 },
    { code: '1-1200', name: 'PIUTANG', type: 'Asset', balance: 0 },
    { code: '1-1210', name: 'PIUTANG USAHA', type: 'Asset', balance: 0 },
    { code: '1-1211', name: 'PIUTANG KONSINYASI', type: 'Asset', balance: 0 },
    { code: '1-1212', name: 'PIUTANG PPN', type: 'Asset', balance: 0 },
    { code: '1-1213', name: 'PIUTANG REKA', type: 'Asset', balance: 0 },
    { code: '1-1214', name: 'PIUTANG TRIDAYA', type: 'Asset', balance: 0 },
    { code: '1-1215', name: 'PIUTANG LINTAS', type: 'Asset', balance: 0 },
    { code: '1-1216', name: 'PIUTANG PEMILIK', type: 'Asset', balance: 0 },
    { code: '1-1217', name: 'PIUTANG INDOPACK', type: 'Asset', balance: 0 },
    { code: '1-1218', name: 'PIUTANG KARYAWAN', type: 'Asset', balance: 0 },
    { code: '1-1219', name: 'PIUTANG OPRASIONAL', type: 'Asset', balance: 0 },
    { code: '1-1220', name: 'PIUTANG KARTU KREDIT', type: 'Asset', balance: 0 },
    { code: '1-1221', name: 'PIUTANG TRIMA', type: 'Asset', balance: 0 },
    { code: '1-1222', name: 'PIUTANG NARA/PAK ALI', type: 'Asset', balance: 0 },
    { code: '1-1223', name: 'PIUTANG BIG', type: 'Asset', balance: 0 },
    { code: '1-122X01', name: 'PIUTANG E-MONEY', type: 'Asset', balance: 0 },
    { code: '1-1300', name: 'PAJAK DIBAYAR DIMUKA', type: 'Asset', balance: 0 },
    { code: '1-1310', name: 'PPH PASAL 4 AYAT (2)', type: 'Asset', balance: 0 },
    { code: '1-1320', name: 'PPH PASAL 25', type: 'Asset', balance: 0 },
    { code: '1-1330', name: 'PPH PASAL 23', type: 'Asset', balance: 0 },
    { code: '1-1400', name: 'PAJAK PEMBELIAN', type: 'Asset', balance: 0 },
    { code: '1-1410', name: 'PPN MASUKAN', type: 'Asset', balance: 0 },
    { code: '1-1499X01', name: 'PPh 23 Dibayar Dimuka', type: 'Asset', balance: 0 },
    { code: '1-2000', name: 'PERSEDIAAN', type: 'Asset', balance: 0 },
    { code: '1-2010', name: 'PERSEDIAAN BARANG', type: 'Asset', balance: 0 },
    { code: '1-2030', name: 'PERSEDIIAN BARANG DIJUAL', type: 'Asset', balance: 0 },
    { code: '1-2035', name: 'CABANG A', type: 'Asset', balance: 0 },
    { code: '1-2040', name: 'CABANG B', type: 'Asset', balance: 0 },
    { code: '1-2390', name: 'POTONGAN BELI DAN BIAYA LAIN', type: 'Asset', balance: 0 },
    { code: '1-3000', name: 'PERAKITAN', type: 'Asset', balance: 0 },
    { code: '1-3010', name: 'PERSEDIAAN BARANG DALAM PROSES', type: 'Asset', balance: 0 },
    { code: '1-4000', name: 'KONSINYASI KELUAR', type: 'Asset', balance: 0 },
    { code: '1-4010', name: 'BARANG-BARANG KONSINYASI', type: 'Asset', balance: 0 },
    { code: '1-5000', name: 'AKTIVA TETAP', type: 'Asset', balance: 0 },
    { code: '1-5100', name: 'TANAH', type: 'Asset', balance: 0 },
    { code: '1-5200', name: 'BANGUNAN', type: 'Asset', balance: 0 },
    { code: '1-5201', name: 'AKUMULASI PENYUSUTAN BANGUNAN', type: 'Asset', balance: 0 },
    { code: '1-5300', name: 'KENDARAAN', type: 'Asset', balance: 0 },
    { code: '1-5301', name: 'AKUMULASI PENYUSUTAN KENDARAAN', type: 'Asset', balance: 0 },
    { code: '1-5400', name: 'PERALATAN', type: 'Asset', balance: 0 },
    { code: '1-5401', name: 'AKUMULASI PENYUSUTAN PERALATAN', type: 'Asset', balance: 0 },
    { code: '1-5500', name: 'ASSET DALAM PROSES PENGERJAAN', type: 'Asset', balance: 0 },
    { code: '1-9000', name: 'PEMBAYARAN DIMUKA', type: 'Asset', balance: 0 },
    { code: '1-9100', name: 'UANG MUKA PESANAN PEMBELIAN', type: 'Asset', balance: 0 },
    { code: '1-9101', name: 'DANA DEPOSIT DI SUPLIER', type: 'Asset', balance: 0 },
    { code: '1-9699X01', name: 'DANA DEPOSIT KONSINYASI MASUK DI SUPPLIER', type: 'Asset', balance: 0 },
    
    // KEWAJIBAN (Liabilities)
    { code: '2-0000', name: 'KEWAJIBAN', type: 'Liability', balance: 0 },
    { code: '2-1000', name: 'KEWAJIBAN LANCAR', type: 'Liability', balance: 0 },
    { code: '2-1100', name: 'HUTANG', type: 'Liability', balance: 0 },
    { code: '2-1101', name: 'HUTANG USAHA', type: 'Liability', balance: 0 },
    { code: '2-1102', name: 'HUTANG TRIDAYA', type: 'Liability', balance: 0 },
    { code: '2-1103', name: 'HUTANG REKA/ORIX', type: 'Liability', balance: 0 },
    { code: '2-1104', name: 'HUTANG LINTAS', type: 'Liability', balance: 0 },
    { code: '2-1105', name: 'HUTANG PEMILIK', type: 'Liability', balance: 0 },
    { code: '2-1106', name: 'HUTANG INDOPACK', type: 'Liability', balance: 0 },
    { code: '2-1107', name: 'HUTANG LEASING  KENDARAAN', type: 'Liability', balance: 0 },
    { code: '2-1108', name: 'HUTANG BRI', type: 'Liability', balance: 0 },
    { code: '2-1109', name: 'HUTANG TRIHAMAS', type: 'Liability', balance: 0 },
    { code: '2-1110', name: 'HUTANG BNI', type: 'Liability', balance: 0 },
    { code: '2-1130', name: 'HUTANG KARTU KREDIT', type: 'Liability', balance: 0 },
    { code: '2-1140', name: 'HUTANG KONSINYASI', type: 'Liability', balance: 0 },
    { code: '2-1200', name: 'HUTANG GAJI', type: 'Liability', balance: 0 },
    { code: '2-1201', name: 'HUTANG BPJS KES DITANGGUNG KANTOR', type: 'Liability', balance: 0 },
    { code: '2-1202', name: 'HUTANG BPJS KET DITANGGUNG KANTOR', type: 'Liability', balance: 0 },
    { code: '2-1203', name: 'HUTANG BPJS KES DITANGGUNG KARYAWAN', type: 'Liability', balance: 0 },
    { code: '2-1204', name: 'HUTANG BPJS KET DITANGGUNG KARYAWAN', type: 'Liability', balance: 0 },
    { code: '2-1300', name: 'HUTANG SALES', type: 'Liability', balance: 0 },
    { code: '2-1500', name: 'PROSES PERAKITAN', type: 'Liability', balance: 0 },
    { code: '2-1501', name: 'HUTANG GAJI PROSES PERAKITAN', type: 'Liability', balance: 0 },
    { code: '2-1510', name: 'HUTANG BIAYA OVERHEAD PROSES PERAKITAN', type: 'Liability', balance: 0 },
    { code: '2-2000', name: 'HUTANG NON OPERASIONAL', type: 'Liability', balance: 0 },
    { code: '2-2100X01', name: 'HUTANG TITIPAN ONGKIR', type: 'Liability', balance: 0 },
    { code: '2-3000', name: 'PENDAPATAN DITERIMA DIMUKA', type: 'Liability', balance: 0 },
    { code: '2-3100', name: 'UANG MUKA PESANAN PENJUALAN', type: 'Liability', balance: 0 },
    { code: '2-3101', name: 'DEPOSIT PELANGGAN', type: 'Liability', balance: 0 },
    { code: '2-3699X01', name: 'DEPOSIT PELANGGAN KONSINYASI KELUAR', type: 'Liability', balance: 0 },
    { code: '2-4000', name: 'HUTANG PAJAK', type: 'Liability', balance: 0 },
    { code: '2-4110', name: 'PPN KELUARAN', type: 'Liability', balance: 0 },
    { code: '2-4200', name: 'HUTANG PPH PASAL 21', type: 'Liability', balance: 0 },
    { code: '2-4300', name: 'HUTANG PPH PASAL 23', type: 'Liability', balance: 0 },
    { code: '2-499X01', name: 'PPN Barang Mewah', type: 'Liability', balance: 0 },
    { code: '2-6000', name: 'BARANG KONSINYASI MASUK', type: 'Liability', balance: 0 },
    { code: '2-6100', name: 'BARANG-BARANG KONSINYASI', type: 'Liability', balance: 0 },
    
    // MODAL (Equity)
    { code: '3-0000', name: 'MODAL', type: 'Equity', balance: 0 },
    { code: '3-1000', name: 'MODAL', type: 'Equity', balance: 0 },
    { code: '3-2000', name: 'LABA DITAHAN', type: 'Equity', balance: 0 },
    { code: '3-3000', name: 'LABA TAHUN BERJALAN', type: 'Equity', balance: 0 },
    { code: '3-8000', name: 'PRIVE', type: 'Equity', balance: 0 },
    { code: '3-9000', name: 'HISTORICAL BALANCING', type: 'Equity', balance: 0 },
    
    // PENDAPATAN (Revenue)
    { code: '4-0000', name: 'PENDAPATAN', type: 'Revenue', balance: 0 },
    { code: '4-1000', name: 'PENDAPATAN DAGANG', type: 'Revenue', balance: 0 },
    { code: '4-1100', name: 'PENDAPATAN JUAL', type: 'Revenue', balance: 0 },
    { code: '4-1101', name: 'PENDAPATAN KONSINYASI', type: 'Revenue', balance: 0 },
    { code: '4-1500', name: 'POTONGAN JUAL', type: 'Revenue', balance: 0 },
    { code: '4-1600', name: 'RETUR JUAL', type: 'Revenue', balance: 0 },
    { code: '4-1700', name: 'BIAYA', type: 'Revenue', balance: 0 },
    { code: '4-2000', name: 'PENDAPATAN JASA', type: 'Revenue', balance: 0 },
    
    // HPP (Cost of Goods Sold)
    { code: '5-0000', name: 'HPP', type: 'Expense', balance: 0 },
    { code: '5-1000', name: 'HPP', type: 'Expense', balance: 0 },
    { code: '5-1300', name: 'HARGA POKOK PENJUALAN', type: 'Expense', balance: 0 },
    { code: '5-199X01', name: 'POTONGAN PEMBELIAN', type: 'Expense', balance: 0 },
    { code: '5-2000', name: 'LAIN-LAIN', type: 'Expense', balance: 0 },
    { code: '5-2100', name: 'KERUGIAN PIUTANG', type: 'Expense', balance: 0 },
    { code: '5-2200', name: 'PENGATURAN STOK', type: 'Expense', balance: 0 },
    { code: '5-2201', name: 'ITEM MASUK', type: 'Expense', balance: 0 },
    { code: '5-2202', name: 'ITEM KELUAR', type: 'Expense', balance: 0 },
    
    // BIAYA (Expenses)
    { code: '6-0000', name: 'BIAYA', type: 'Expense', balance: 0 },
    { code: '6-1000', name: 'BIAYA UMUM', type: 'Expense', balance: 0 },
    { code: '6-1100', name: 'BIAYA LISTRIK/AIR/TELEPON', type: 'Expense', balance: 0 },
    { code: '6-1101', name: 'BIAYA SEWA', type: 'Expense', balance: 0 },
    { code: '6-1102', name: 'BIAYA ATK', type: 'Expense', balance: 0 },
    { code: '6-1103', name: 'BIAYA BUNGA PINJAMAN', type: 'Expense', balance: 0 },
    { code: '6-1104', name: 'BIAYA INTERNET', type: 'Expense', balance: 0 },
    { code: '6-1105', name: 'BIAYA PENGIRIMAN', type: 'Expense', balance: 0 },
    { code: '6-1106', name: 'BIAYA RT KANTOR', type: 'Expense', balance: 0 },
    { code: '6-1107', name: 'BIAYA TRANSPORT, TOL, PARKIR', type: 'Expense', balance: 0 },
    { code: '6-1108', name: 'BIAYA SERVICE KENDARAAN', type: 'Expense', balance: 0 },
    { code: '6-1109', name: 'BIAYA MATERAI', type: 'Expense', balance: 0 },
    { code: '6-1110', name: 'BIAYA PEMBELIAN SPARE PART', type: 'Expense', balance: 0 },
    { code: '6-1111', name: 'BIAYA PENGURUSAN SURAT', type: 'Expense', balance: 0 },
    { code: '6-1112', name: 'BIAYA TIP / SUMBANGAN', type: 'Expense', balance: 0 },
    { code: '6-1500', name: 'KERUGIAN PIUTANG', type: 'Expense', balance: 0 },
    { code: '6-2000', name: 'BIAYA PEMASARAN', type: 'Expense', balance: 0 },
    { code: '6-2001', name: 'BIAYA IKLAN', type: 'Expense', balance: 0 },
    { code: '6-2002', name: 'BIAYA ENTERTAINMENT', type: 'Expense', balance: 0 },
    { code: '6-2003', name: 'BIAYA BANK', type: 'Expense', balance: 0 },
    { code: '6-2004', name: 'BIAYA BUNGA PINJAMAN', type: 'Expense', balance: 0 },
    { code: '6-3000', name: 'BIAYA GAJI DAN UPAH', type: 'Expense', balance: 0 },
    { code: '6-3001', name: 'BIAYA GAJI PEGAWAI', type: 'Expense', balance: 0 },
    { code: '6-3002', name: 'BIAYA PPH 21 KARYAWAN', type: 'Expense', balance: 0 },
    { code: '6-3003', name: 'BIAYA BPJS KES DITANGGUNG KANTOR', type: 'Expense', balance: 0 },
    { code: '6-3004', name: 'BIAYA BPJS KET DITANGGUNG KANTOR', type: 'Expense', balance: 0 },
    { code: '6-3005', name: 'BIAYA KESEHATAN MANDIRI', type: 'Expense', balance: 0 },
    { code: '6-3010', name: 'BIAYA UPAH KERJA', type: 'Expense', balance: 0 },
    { code: '6-3020', name: 'BIAYA KOMISI PENJUALAN', type: 'Expense', balance: 0 },
    { code: '6-4000', name: 'BIAYA OPERASIONAL', type: 'Expense', balance: 0 },
    { code: '6-4001', name: 'BIAYA BELI BAHAN BAKU', type: 'Expense', balance: 0 },
    { code: '6-4002', name: 'BIAYA OVERHEAD', type: 'Expense', balance: 0 },
    { code: '6-5000', name: 'BIAYA PAJAK', type: 'Expense', balance: 0 },
    { code: '6-5001', name: 'BIAYA PPH 22', type: 'Expense', balance: 0 },
    { code: '6-5002', name: 'BIAYA PPH 23', type: 'Expense', balance: 0 },
    { code: '6-5003', name: 'BIAYA PPH 25', type: 'Expense', balance: 0 },
    { code: '6-5004', name: 'BIAYA PPH PASA 4 AYAT (2)', type: 'Expense', balance: 0 },
    { code: '6-5005', name: 'BIAYA PPN', type: 'Expense', balance: 0 },
    { code: '6-5006', name: 'BIAYA PPN IMPOR', type: 'Expense', balance: 0 },
    { code: '6-5007', name: 'BIAYA PPH 29', type: 'Expense', balance: 0 },
    { code: '6-6000', name: 'BIAYA PENYUSUTAN', type: 'Expense', balance: 0 },
    { code: '6-6001', name: 'BIAYA PENYUSUTAN', type: 'Expense', balance: 0 },
    { code: '6-9000', name: 'BIAYA NON INVENTORY', type: 'Expense', balance: 0 },
    { code: '6-9001', name: 'BIAYA BELANJA NON INVENTORY', type: 'Expense', balance: 0 },
    
    // PENDAPATAN LAIN (Other Revenue)
    { code: '7-0000', name: 'PENDAPATAN LAIN', type: 'Revenue', balance: 0 },
    { code: '7-1000', name: 'LABA SELISIH KURS', type: 'Revenue', balance: 0 },
    { code: '7-2000', name: 'PENDAPATAN JASA', type: 'Revenue', balance: 0 },
    { code: '7-3000', name: 'PENDAPTAN LAIN', type: 'Revenue', balance: 0 },
    { code: '7-4000', name: 'KERINGANAN HUTANG', type: 'Revenue', balance: 0 },
    { code: '7-5000', name: 'PENDAPATAN SEWA APARTEMEN', type: 'Revenue', balance: 0 },
    { code: '7-699X01', name: 'PENDAPATAN PEMBULATAN', type: 'Revenue', balance: 0 },
    { code: '7-699X02', name: 'PENDAPATAN DONASI', type: 'Revenue', balance: 0 },
    
    // BIAYA LAIN (Other Expenses)
    { code: '8-0000', name: 'BIAYA LAIN', type: 'Expense', balance: 0 },
    { code: '8-1000', name: 'BIAYA LAIN', type: 'Expense', balance: 0 },
    { code: '8-2000', name: 'RUGI SELISIH KURS', type: 'Expense', balance: 0 },
    ];
    
    // Merge default accounts dengan existing accounts
    // Jika default account belum ada (berdasarkan code), tambahkan
    // IMPORTANT: Preserve balance dari existing accounts (yang sudah di-update dari seed)
    // Ensure data is always an array
    const dataArray = Array.isArray(data) ? data : [];
    // Ensure defaultAccounts is always an array
    const defaultAccountsArray = Array.isArray(defaultAccounts) ? defaultAccounts : [];
    const existingCodes = new Set(dataArray.map(a => a.code));
    const missingDefaults = defaultAccountsArray.filter(def => !existingCodes.has(def.code));
    
    if (dataArray.length === 0) {
      // Jika data kosong, set semua default accounts
      await storageService.set('accounts', defaultAccountsArray);
      data = defaultAccountsArray;
    } else if (missingDefaults.length > 0) {
      // Tambahkan default accounts yang belum ada, preserve balance dari existing accounts
      const merged = [...dataArray]; // Start with existing data (preserve balances from seed)
      // Ensure missingDefaults is always an array
      const missingDefaultsArray = Array.isArray(missingDefaults) ? missingDefaults : [];
      if (Array.isArray(missingDefaultsArray) && missingDefaultsArray.length > 0) {
        for (let i = 0; i < missingDefaultsArray.length; i++) {
          const def = missingDefaultsArray[i];
          if (def) {
            // Tambahkan default account baru yang belum ada
            merged.push(def);
          }
        }
      }
      
      // Sort by code untuk konsistensi
      merged.sort((a, b) => a.code.localeCompare(b.code));
      
      await storageService.set('accounts', merged);
      data = merged;
    }
    
    // Ensure balance dari seed tidak ter-override
    // Data dari storage sudah punya balance yang benar dari seed
    // Ensure data is still an array after merge
    const finalDataArray = Array.isArray(data) ? data : [];
    console.log('[COA] Final accounts count:', finalDataArray.length);
    console.log('[COA] Accounts with balance > 0:', finalDataArray.filter(a => (a.balance || 0) > 0).length);
    
    setAccounts(finalDataArray);
  };

  const handleSave = async () => {
    try {
      if (!formData.code || !formData.name || !formData.type) {
        showAlert('Validation Error', 'Please fill all required fields');
        return;
      }

      // Ensure accounts is always an array
      const accountsArray = Array.isArray(accounts) ? accounts : [];
      
      // Cek apakah code sudah ada
      const existingAccount = accountsArray.find(a => a.code === formData.code);
      if (existingAccount && !editingAccount) {
        showAlert('Duplicate Account Code', `Account code ${formData.code} already exists`);
        return;
      }

      if (editingAccount) {
        const updated = accountsArray.map(a =>
          a.code === editingAccount.code
            ? { 
                ...formData, 
                balance: a.balance,
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now()
              } as Account
            : a
        );
        await storageService.set('accounts', updated);
        setAccounts(updated);
      } else {
        const newAccount: Account = {
          code: formData.code,
          name: formData.name,
          type: formData.type as Account['type'],
          balance: 0,
          lastUpdate: new Date().toISOString(),
          timestamp: Date.now(),
          _timestamp: Date.now(),
        };
        const updated = [...accounts, newAccount];
        await storageService.set('accounts', updated);
        setAccounts(updated);
      }

      setShowForm(false);
      setEditingAccount(null);
      setFormData({ code: '', name: '', type: 'Asset', balance: 0 });
      await loadData(); // Reload untuk update balances
    } catch (error: any) {
      showAlert('Error', `Error saving account: ${error.message}`);
    }
  };

  const handleEdit = (item: Account) => {
    setEditingAccount(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Account) => {
    showConfirm(
      'Delete Account',
      `Delete Account: ${item.code} - ${item.name}?`,
      async () => {
        try {
          // 🚀 FIX: Pakai packaging delete helper untuk konsistensi
          // Note: COA pakai 'code' sebagai ID field, bukan 'id'
          const deleteResult = await deletePackagingItem('accounts', item.code, 'code');
          if (deleteResult.success) {
            // Reload data dengan helper (handle race condition)
            await reloadPackagingData('accounts', setAccounts);
            await loadData(); // Reload untuk update balances
            showAlert(`Account ${item.code} - ${item.name} deleted successfully`, 'Success');
          } else {
            showAlert(`Error deleting account: ${deleteResult.error || 'Unknown error'}`, 'Error');
          }
        } catch (error: any) {
          showAlert('Error', `Error deleting account: ${error.message}`);
        }
      }
    );
  };

  // Calculate account balances from journal entries
  const accountBalances = useMemo(() => {
    try {
      const balances: Record<string, { debit: number; credit: number; balance: number }> = {};
      
      // Ensure journalEntries is always an array - use defensive approach
      let journalEntriesArray: any[] = [];
      if (journalEntries && Array.isArray(journalEntries)) {
        journalEntriesArray = journalEntries;
      }
      
      // Process journal entries
      if (Array.isArray(journalEntriesArray) && journalEntriesArray.length > 0) {
        for (let i = 0; i < journalEntriesArray.length; i++) {
          const entry = journalEntriesArray[i];
          if (entry && entry.account) {
            if (!balances[entry.account]) {
              balances[entry.account] = { debit: 0, credit: 0, balance: 0 };
            }
            balances[entry.account].debit += entry.debit || 0;
            balances[entry.account].credit += entry.credit || 0;
          }
        }
      }
      
      // Ensure accounts is always an array - use defensive approach
      let accountsArray: Account[] = [];
      if (accounts && Array.isArray(accounts)) {
        accountsArray = accounts;
      }
      
      // Process accounts
      if (Array.isArray(accountsArray) && accountsArray.length > 0) {
        for (let i = 0; i < accountsArray.length; i++) {
          const acc = accountsArray[i];
          if (acc && acc.code) {
            if (!balances[acc.code]) {
              balances[acc.code] = { debit: 0, credit: 0, balance: 0 };
            }
            
            // Untuk Revenue dan Equity, jika ada debit berarti ada error atau adjustment
            // Normalnya Revenue hanya punya credit (pemasukan)
            if (acc.type === 'Revenue' || acc.type === 'Equity') {
              // Jika ada debit untuk Revenue, kemungkinan ada duplicate entries atau error
              // Tapi tetap hitung balance dengan benar
              balances[acc.code].balance = balances[acc.code].credit - balances[acc.code].debit;
            } else if (acc.type === 'Asset' || acc.type === 'Expense') {
              balances[acc.code].balance = balances[acc.code].debit - balances[acc.code].credit;
            } else {
              // Liability
              balances[acc.code].balance = balances[acc.code].credit - balances[acc.code].debit;
            }
          }
        }
      }
      
      return balances;
    } catch (error) {
      console.error('Error in accountBalances useMemo:', error);
      return {};
    }
  }, [journalEntries, accounts]);

  const accountsWithBalances = useMemo(() => {
    try {
      // Ensure accounts is always an array - use defensive approach
      let accountsArray: Account[] = [];
      if (accounts && Array.isArray(accounts)) {
        accountsArray = accounts;
      }
      
      // Double check: ensure accountsArray is actually an array
      if (!Array.isArray(accountsArray)) {
        return [];
      }
      
      // Ensure accountBalances is an object (not null/undefined)
      if (!accountBalances || typeof accountBalances !== 'object') {
        const result: any[] = [];
        for (let i = 0; i < accountsArray.length; i++) {
          const acc = accountsArray[i];
          if (acc) {
            result.push({
              ...acc,
              totalDebit: 0,
              totalCredit: 0,
              balance: acc.balance || 0,
              initialBalance: acc.balance || 0,
            });
          }
        }
        return result;
      }
      
      const result: any[] = [];
      for (let i = 0; i < accountsArray.length; i++) {
        const acc = accountsArray[i];
        if (acc) {
          // Baca Debit dan Kredit dari COA_update.json (yang sudah disimpan di account data)
          const accAny = acc as any;
          // Coba berbagai kemungkinan field name
          let debetFromCOA = accAny.debet || accAny.debit || accAny.Debit || accAny.Debet || 0;
          let kreditFromCOA = accAny.kredit || accAny.credit || accAny.Kredit || accAny.Credit || 0;
          
          // Jika debet dan kredit belum ada, coba hitung dari balance yang sudah ada
          // (untuk data lama yang belum di-seed ulang)
          if (debetFromCOA === 0 && kreditFromCOA === 0 && acc.balance) {
            // Untuk Asset/Expense: balance positif = debit, balance negatif = credit
            // Untuk Liability/Equity/Revenue: balance positif = credit, balance negatif = debit
            if (acc.type === 'Asset' || acc.type === 'Expense') {
              if (acc.balance > 0) {
                debetFromCOA = acc.balance;
              } else {
                kreditFromCOA = Math.abs(acc.balance);
              }
            } else {
              if (acc.balance > 0) {
                kreditFromCOA = acc.balance;
              } else {
                debetFromCOA = Math.abs(acc.balance);
              }
            }
          }
          
          // Debit dan Kredit dari journal entries
          const journalDebit = accountBalances[acc.code]?.debit || 0;
          const journalCredit = accountBalances[acc.code]?.credit || 0;
          
          // Total Debit = Debit dari COA + Debit dari journal entries
          // Total Credit = Kredit dari COA + Kredit dari journal entries
          const totalDebit = Number(debetFromCOA) + Number(journalDebit);
          const totalCredit = Number(kreditFromCOA) + Number(journalCredit);
          
          // Balance = Total Debit - Total Credit
          const finalBalance = totalDebit - totalCredit;
          
          result.push({
            ...acc,
            totalDebit: totalDebit,
            totalCredit: totalCredit,
            balance: finalBalance,
          });
        }
      }
      return result;
    } catch (error) {
      console.error('Error in accountsWithBalances useMemo:', error);
      return [];
    }
  }, [accounts, accountBalances]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      // Ensure accountsWithBalances is always an array
      const accountsWithBalancesArray = Array.isArray(accountsWithBalances) ? accountsWithBalances : [];
      const dataToExport = accountsWithBalancesArray.map(acc => ({
        'Account Code': acc.code,
        'Account Name': acc.name,
        'Type': acc.type,
        'Total Debit': acc.totalDebit || 0,
        'Total Credit': acc.totalCredit || 0,
        'Balance': acc.balance || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Chart of Accounts');
      
      const fileName = `Chart_of_Accounts_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert('Success', `✅ Exported ${dataToExport.length} accounts to ${fileName}`);
    } catch (error: any) {
      showAlert('Error', `Error exporting to Excel: ${error.message}`);
    }
  };

  // Import from Excel
  const handleImportExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonDataRaw: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        // Ensure jsonData is always an array
        const jsonData = Array.isArray(jsonDataRaw) ? jsonDataRaw : [];

        if (jsonData.length === 0) {
          showAlert('Error', 'Excel file is empty or has no data');
          return;
        }

        const importAccounts = async () => {
          try {
            const newAccounts: Account[] = [];
            const errors: string[] = [];

            // Ensure jsonData is always an array
            const jsonDataArray = Array.isArray(jsonData) ? jsonData : [];
            if (Array.isArray(jsonDataArray) && jsonDataArray.length > 0) {
              for (let index = 0; index < jsonDataArray.length; index++) {
                const row = jsonDataArray[index];
                if (!row) continue;
                try {
                  const code = String(row['Account Code'] || row['account code'] || row['Code'] || '').trim();
                  const name = String(row['Account Name'] || row['account name'] || row['Name'] || '').trim();
                  const type = String(row['Type'] || row['type'] || 'Asset').trim() as Account['type'];

                  if (!code || !name || !type) {
                    errors.push(`Row ${index + 2}: Missing required fields (Code, Name, Type)`);
                    continue;
                  }

                  // Ensure accounts is always an array
                  const accountsArray = Array.isArray(accounts) ? accounts : [];
                  // Cek apakah code sudah ada
                  const existingAccount = accountsArray.find(a => a.code === code);
                  if (existingAccount) {
                    errors.push(`Row ${index + 2}: Account code ${code} already exists`);
                    continue;
                  }

                  // Validasi type
                  const validTypes: Account['type'][] = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
                  if (!validTypes.includes(type)) {
                    errors.push(`Row ${index + 2}: Invalid type ${type}`);
                    continue;
                  }

                  newAccounts.push({
                    code,
                    name,
                    type,
                    balance: 0,
                  });
                } catch (error: any) {
                  errors.push(`Row ${index + 2}: ${error.message}`);
                }
              }
            }

            if (newAccounts.length > 0) {
              // Ensure accounts is always an array
              const accountsArray = Array.isArray(accounts) ? accounts : [];
              const updated = [...accountsArray, ...newAccounts];
              await storageService.set('accounts', updated);
              setAccounts(updated);
              await loadData(); // Reload untuk update balances
              showAlert('Success', `✅ Imported ${newAccounts.length} accounts${errors.length > 0 ? `\n⚠️ ${errors.length} errors` : ''}`);
              if (errors.length > 0) {
                console.error('Import errors:', errors);
              }
            } else {
              showAlert('Warning', '⚠️ No valid accounts to import');
            }
          } catch (error: any) {
            showAlert('Error', `Error importing Excel: ${error.message}`);
          }
        };

        showConfirm('Confirm Import', `Import ${jsonData.length} accounts from Excel? This will add new accounts to COA.`, importAccounts);
      } catch (error: any) {
        showAlert('Error', `Error importing Excel: ${error.message}`);
      }
    };
    input.click();
  };

  const columns = [
    { key: 'code', header: 'Account Code' },
    { key: 'name', header: 'Account Name' },
    { key: 'type', header: 'Type' },
    { 
      key: 'totalDebit', 
      header: 'Total Debit', 
      render: (item: any) => {
        // Untuk Revenue dan Equity, sembunyikan debit jika tidak ada (hanya pemasukan)
        if ((item.type === 'Revenue' || item.type === 'Equity') && (item.totalDebit || 0) === 0) {
          return '-';
        }
        return `Rp ${(item.totalDebit || 0).toLocaleString('id-ID')}`;
      }
    },
    { key: 'totalCredit', header: 'Total Credit', render: (item: any) => `Rp ${(item.totalCredit || 0).toLocaleString('id-ID')}` },
    { key: 'balance', header: 'Balance', render: (item: any) => `Rp ${(item.balance || 0).toLocaleString('id-ID')}` },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Account) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => handleEdit(item)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(item)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Chart of Accounts</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <Button variant="secondary" onClick={handleImportExcel}>📤 Import Excel</Button>
            <Button variant="primary" onClick={() => {
              setEditingAccount(null);
              setFormData({ code: '', name: '', type: 'Asset', balance: 0 });
              setShowForm(true);
            }}>
              + New Account
            </Button>
          </div>
        </div>

        <Table columns={columns as any} data={Array.isArray(accountsWithBalances) ? accountsWithBalances : []} emptyMessage="No accounts found" />
      </Card>

      {/* Create/Edit Account Form */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => {
          setShowForm(false);
          setEditingAccount(null);
          setFormData({ code: '', name: '', type: 'Asset', balance: 0 });
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>{editingAccount ? 'Edit Account' : 'New Account'}</h2>
                <Button variant="secondary" onClick={() => {
                  setShowForm(false);
                  setEditingAccount(null);
                  setFormData({ code: '', name: '', type: 'Asset', balance: 0 });
                }}>✕</Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Account Code *
                  </label>
                  <Input
                    type="text"
                    value={formData.code || ''}
                    onChange={(value) => setFormData({ ...formData, code: value })}
                    placeholder="e.g., 1000"
                    disabled={!!editingAccount}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Account Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name || ''}
                    onChange={(value) => setFormData({ ...formData, name: value })}
                    placeholder="e.g., Cash"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                    Type *
                  </label>
                  <select
                    value={formData.type || 'Asset'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => {
                    setShowForm(false);
                    setEditingAccount(null);
                    setFormData({ code: '', name: '', type: 'Asset', balance: 0 });
                  }}>Cancel</Button>
                  <Button variant="primary" onClick={handleSave}>Save</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Custom Dialog untuk Alert/Confirm */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={dialogState.type === 'alert' ? closeDialog : undefined} style={{ zIndex: 10000 }}>
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
              {dialogState.type === 'confirm' && (
                <Button variant="secondary" onClick={() => {
                  if (dialogState.onCancel) dialogState.onCancel();
                  closeDialog();
                }}>
                  Cancel
                </Button>
              )}
              <Button variant="primary" onClick={() => {
                if (dialogState.onConfirm) dialogState.onConfirm();
                if (dialogState.type === 'alert') closeDialog();
              }}>
                {dialogState.type === 'alert' ? 'OK' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default COA;
