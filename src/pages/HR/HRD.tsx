import { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService } from '../../services/storage';
import { fingerprintService, AttendanceRecord, FingerprintConfig } from '../../services/fingerprint';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import '../../styles/common.css';
import '../../styles/compact.css';

interface Staff {
  id: string;
  no: number;
  nip: string;
  namaLengkap: string;
  departemen: string;
  section: string;
  jabatan: string;
  tanggalLahir: string;
  alamat: string;
  alamatKtp: string;
  noHp: string;
  noKtp: string;
  noPaspor: string;
  noSimA: string;
  noSimC: string;
  noBpjstek: string;
  noBpjskes: string;
  noNpwp: string;
  noRekening: string;
  namaBank: string;
  gajiPokok: number;
  premiHadir: number;
  tunjTransport: number;
  tunjMakan: number;
}

const HRD = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'staff' | 'settings'>('dashboard');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
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

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Fingerprint device settings
  const [fingerprintIp, setFingerprintIp] = useState('');
  const [fingerprintPort, setFingerprintPort] = useState(80);
  const [fingerprintProtocol, setFingerprintProtocol] = useState<'http' | 'https'>('http');
  const [fingerprintApiPath, setFingerprintApiPath] = useState('/api');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'failed'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
    loadStaff();
    loadFingerprintConfig();
    loadAttendance();
  }, []);

  // Load attendance when tab changes
  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance();
    }
  }, [activeTab]);

  // Cleanup auto-sync on unmount
  useEffect(() => {
    return () => {
      if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
      }
    };
  }, [autoSyncInterval]);

  const loadStaff = async () => {
    const data = await storageService.get<Staff[]>('staff') || [];
    setStaff(data.map((s, idx) => ({ ...s, no: idx + 1 })));
  };

  const loadFingerprintConfig = async () => {
    const config = await fingerprintService.loadConfig();
    if (config) {
      setFingerprintIp(config.ip);
      setFingerprintPort(config.port);
      setFingerprintProtocol(config.protocol || 'http');
      setFingerprintApiPath(config.apiPath || '/api');
    }
  };

  const loadAttendance = async () => {
    const data = await storageService.get<AttendanceRecord[]>('attendance') || [];
    // Load staff untuk enrich data
    const staffData = await storageService.get<Staff[]>('staff') || [];
    // Enrich with staff names
    const enriched = data.map(att => {
      const staffMember = staffData.find(s => s.nip === att.nip || s.id === att.staffId || s.nip === att.staffId);
      return {
        ...att,
        staffName: att.staffName || staffMember?.namaLengkap || att.staffId,
        nip: att.nip || staffMember?.nip || att.staffId || '',
      };
    });
    // Sort by date descending
    enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAttendance(enriched);
  };

  const handleCheckFingerprintConnection = async () => {
    setConnectionStatus('checking');
    try {
      const config: FingerprintConfig = {
        ip: fingerprintIp,
        port: fingerprintPort,
        protocol: fingerprintProtocol,
        apiPath: fingerprintApiPath,
      };
      const connected = await fingerprintService.checkConnection(config);
      setConnectionStatus(connected ? 'connected' : 'failed');
      if (connected) {
        showAlert('✅ Koneksi ke device fingerprint berhasil!', 'Success');
      } else {
        showAlert('❌ Gagal koneksi ke device fingerprint. Pastikan IP dan port benar.', 'Error');
      }
    } catch (error: any) {
      setConnectionStatus('failed');
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  const handleSaveFingerprintConfig = async () => {
    try {
      const config: FingerprintConfig = {
        ip: fingerprintIp,
        port: fingerprintPort,
        protocol: fingerprintProtocol,
        apiPath: fingerprintApiPath,
      };
      await fingerprintService.saveConfig(config);
      showAlert('✅ Konfigurasi device fingerprint berhasil disimpan!', 'Success');
    } catch (error: any) {
      showAlert(`Error menyimpan konfigurasi: ${error.message}`, 'Error');
    }
  };

  const handleFetchAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const result = await fingerprintService.syncAttendanceToLocal();
      await loadAttendance();
      setLastSyncTime(new Date().toLocaleString('id-ID'));
      showAlert(`✅ Berhasil sync ${result.synced} data attendance${result.errors.length > 0 ? `\n⚠️ ${result.errors.length} error` : ''}`, 'Success');
    } catch (error: any) {
      showAlert(`Error fetch attendance: ${error.message}`, 'Error');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (autoSyncEnabled) {
      // Stop auto-sync
      if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        setAutoSyncInterval(null);
      }
      setAutoSyncEnabled(false);
    } else {
      // Start auto-sync (every 5 minutes)
      const interval = setInterval(async () => {
        try {
          await fingerprintService.syncAttendanceToLocal();
          await loadAttendance();
          setLastSyncTime(new Date().toLocaleString('id-ID'));
        } catch (error) {
          console.error('Auto-sync error:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      setAutoSyncInterval(interval);
      setAutoSyncEnabled(true);
      
      // Do initial sync
      await handleFetchAttendance();
    }
  };

  // Helper function to check if a value is considered empty
  const isEmptyValue = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (value === '') return true;
    if (value === 0) return true;
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      return trimmed === '' || 
             trimmed === '-' || 
             trimmed === 'none' || 
             trimmed === 'null' ||
             trimmed === '0000-00-00' ||
             trimmed === 'n/a' ||
             trimmed === 'na';
    }
    return false;
  };

  // Helper function to check if column should be hidden (>50% empty)
  const shouldHideColumn = (key: string, data: Staff[]): boolean => {
    if (data.length === 0) return false;
    if (key === 'actions') return false; // Never hide actions column
    
    const emptyCount = data.filter(item => {
      const value = item[key as keyof Staff];
      return isEmptyValue(value);
    }).length;
    
    const emptyPercentage = (emptyCount / data.length) * 100;
    return emptyPercentage > 50;
  };

  const handleEditStaff = (item: Staff) => {
    setEditingStaff(item);
    showAlert(`Edit staff: ${item.namaLengkap} - Form to be implemented`, 'Information');
    // TODO: Open edit form dialog
  };

  const handleDeleteStaff = async (item: Staff) => {
    showConfirm(
      `Are you sure you want to delete staff "${item.namaLengkap}"? This action cannot be undone.`,
      async () => {
        try {
          const updated = staff.filter(s => s.id !== item.id);
          await storageService.set('staff', updated);
          setStaff(updated.map((s, idx) => ({ ...s, no: idx + 1 })));
          showAlert(`Staff "${item.namaLengkap}" deleted successfully`, 'Success');
        } catch (error: any) {
          showAlert(`Error deleting staff: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleEditAttendance = (item: any) => {
    showAlert(`Edit attendance for ${item.staffName} on ${item.date} - Form to be implemented`, 'Information');
    // TODO: Open edit attendance form
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'staff', label: 'Staff' },
    { id: 'settings', label: 'Settings' },
  ];

  const attendanceColumns = [
    { key: 'date', header: 'Tanggal' },
    { key: 'nip', header: 'NIP' },
    { key: 'staffName', header: 'Nama Staff' },
    { key: 'checkIn', header: 'Check In' },
    { key: 'checkOut', header: 'Check Out' },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: any) => {
        const statusColors: Record<string, string> = {
          present: '#4caf50',
          absent: '#f44336',
          late: '#ff9800',
          early: '#2196f3',
        };
        const statusLabels: Record<string, string> = {
          present: 'Hadir',
          absent: 'Tidak Hadir',
          late: 'Terlambat',
          early: 'Pulang Cepat',
        };
        const status = item.status || 'present';
        return (
          <span style={{ 
            color: statusColors[status] || '#666',
            fontWeight: '500',
          }}>
            {statusLabels[status] || status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => handleEditAttendance(item)}>Edit</Button>
        </div>
      ),
    },
  ];

  const staffColumns = [
    { key: 'nip', header: 'NIP' },
    { key: 'namaLengkap', header: 'NAMA LENGKAP' },
    { key: 'departemen', header: 'DEPARTEMEN' },
    { key: 'section', header: 'SECTION' },
    { key: 'jabatan', header: 'JABATAN' },
    { key: 'tanggalLahir', header: 'TANGGAL LAHIR' },
    { key: 'alamat', header: 'ALAMAT' },
    { key: 'alamatKtp', header: 'ALAMAT KTP' },
    { key: 'noHp', header: 'NO.HP' },
    { key: 'noKtp', header: 'NO.KTP' },
    { key: 'noPaspor', header: 'NO.PASPOR' },
    { key: 'noSimA', header: 'NO.SIM A' },
    { key: 'noSimC', header: 'NO.SIM C' },
    { key: 'noBpjstek', header: 'NO.BPJSTEK' },
    { key: 'noBpjskes', header: 'NO.BPJSKES' },
    { key: 'noNpwp', header: 'NO.NPWP' },
    { key: 'noRekening', header: 'NO.REKENING' },
    { key: 'namaBank', header: 'NAMA BANK' },
    {
      key: 'gajiPokok',
      header: 'GAJI POKOK',
      render: (item: any) => `Rp ${(item.gajiPokok || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'premiHadir',
      header: 'PREMI HADIR',
      render: (item: any) => `Rp ${(item.premiHadir || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'tunjTransport',
      header: 'TUNJ.TRANSPORT',
      render: (item: any) => `Rp ${(item.tunjTransport || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'tunjMakan',
      header: 'TUNJ.MAKAN',
      render: (item: any) => `Rp ${(item.tunjMakan || 0).toLocaleString('id-ID')}`,
    },
    {
      key: 'actions',
      header: 'Actions',
        render: (item: Staff) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => handleEditStaff(item)}>Edit</Button>
            <Button variant="danger" onClick={() => handleDeleteStaff(item)}>Delete</Button>
          </div>
        ),
    },
  ];

  const handleExportExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();
      
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
      
      // Sheet 1: Staff Data - Detail lengkap
      if (staff.length > 0) {
        const staffDataExport = staff.map((s: Staff) => ({
          nip: s.nip || '',
          namaLengkap: s.namaLengkap || '',
          departemen: s.departemen || '',
          section: s.section || '',
          jabatan: s.jabatan || '',
          tanggalLahir: s.tanggalLahir || '',
          alamat: s.alamat || '',
          alamatKtp: s.alamatKtp || '',
          noHp: s.noHp || '',
          noKtp: s.noKtp || '',
          noPaspor: s.noPaspor || '',
          noSimA: s.noSimA || '',
          noSimC: s.noSimC || '',
          noBpjstek: s.noBpjstek || '',
          noBpjskes: s.noBpjskes || '',
          noNpwp: s.noNpwp || '',
          noRekening: s.noRekening || '',
          namaBank: s.namaBank || '',
          gajiPokok: s.gajiPokok || 0,
          premiHadir: s.premiHadir || 0,
          tunjTransport: s.tunjTransport || 0,
          tunjMakan: s.tunjMakan || 0,
          totalSalary: (s.gajiPokok || 0) + (s.premiHadir || 0) + (s.tunjTransport || 0) + (s.tunjMakan || 0),
        }));

        const staffColumns: ExcelColumn[] = [
          { key: 'nip', header: 'NIP', width: 15 },
          { key: 'namaLengkap', header: 'Nama Lengkap', width: 30 },
          { key: 'departemen', header: 'Departemen', width: 20 },
          { key: 'section', header: 'Section', width: 20 },
          { key: 'jabatan', header: 'Jabatan', width: 20 },
          { key: 'tanggalLahir', header: 'Tanggal Lahir', width: 18, format: 'date' },
          { key: 'alamat', header: 'Alamat', width: 40 },
          { key: 'alamatKtp', header: 'Alamat KTP', width: 40 },
          { key: 'noHp', header: 'No. HP', width: 15 },
          { key: 'noKtp', header: 'No. KTP', width: 20 },
          { key: 'noPaspor', header: 'No. Paspor', width: 20 },
          { key: 'noSimA', header: 'No. SIM A', width: 15 },
          { key: 'noSimC', header: 'No. SIM C', width: 15 },
          { key: 'noBpjstek', header: 'No. BPJSTEK', width: 20 },
          { key: 'noBpjskes', header: 'No. BPJSKES', width: 20 },
          { key: 'noNpwp', header: 'No. NPWP', width: 20 },
          { key: 'noRekening', header: 'No. Rekening', width: 20 },
          { key: 'namaBank', header: 'Nama Bank', width: 20 },
          { key: 'gajiPokok', header: 'Gaji Pokok', width: 18, format: 'currency' },
          { key: 'premiHadir', header: 'Premi Hadir', width: 18, format: 'currency' },
          { key: 'tunjTransport', header: 'Tunj. Transport', width: 18, format: 'currency' },
          { key: 'tunjMakan', header: 'Tunj. Makan', width: 18, format: 'currency' },
          { key: 'totalSalary', header: 'Total Salary', width: 18, format: 'currency' },
        ];

        const wsStaff = createStyledWorksheet(staffDataExport, staffColumns, 'Sheet 1 - Staff');
        setColumnWidths(wsStaff, staffColumns);
        const totalGajiPokok = staffDataExport.reduce((sum, s) => sum + (s.gajiPokok || 0), 0);
        const totalPremiHadir = staffDataExport.reduce((sum, s) => sum + (s.premiHadir || 0), 0);
        const totalTunjTransport = staffDataExport.reduce((sum, s) => sum + (s.tunjTransport || 0), 0);
        const totalTunjMakan = staffDataExport.reduce((sum, s) => sum + (s.tunjMakan || 0), 0);
        const totalSalary = staffDataExport.reduce((sum, s) => sum + (s.totalSalary || 0), 0);
        addSummaryRow(wsStaff, staffColumns, {
          nip: 'TOTAL',
          gajiPokok: totalGajiPokok,
          premiHadir: totalPremiHadir,
          tunjTransport: totalTunjTransport,
          tunjMakan: totalTunjMakan,
          totalSalary: totalSalary,
        });
        XLSX.utils.book_append_sheet(wb, wsStaff, 'Sheet 1 - Staff');
      }

      // Sheet 2: Attendance Data (jika ada)
      try {
        const attendanceData = await storageService.get<any[]>('attendance') || [];
        if (attendanceData.length > 0) {
          const attendanceDataExport = attendanceData.map((att: any) => ({
            date: att.date || '',
            staffId: att.staffId || att.staff_id || '',
            staffName: att.staffName || att.staff_name || '',
            nip: att.nip || '',
            checkIn: att.checkIn || att.check_in || '',
            checkOut: att.checkOut || att.check_out || '',
            status: att.status || '',
            notes: att.notes || '',
          }));

          const attendanceColumns: ExcelColumn[] = [
            { key: 'date', header: 'Date', width: 18, format: 'date' },
            { key: 'staffId', header: 'Staff ID', width: 15 },
            { key: 'nip', header: 'NIP', width: 15 },
            { key: 'staffName', header: 'Staff Name', width: 30 },
            { key: 'checkIn', header: 'Check In', width: 15 },
            { key: 'checkOut', header: 'Check Out', width: 15 },
            { key: 'status', header: 'Status', width: 15 },
            { key: 'notes', header: 'Notes', width: 40 },
          ];
          const wsAttendance = createStyledWorksheet(attendanceDataExport, attendanceColumns, 'Sheet 2 - Attendance');
          setColumnWidths(wsAttendance, attendanceColumns);
          addSummaryRow(wsAttendance, attendanceColumns, {
            date: `TOTAL (${attendanceDataExport.length} records)`,
          });
          XLSX.utils.book_append_sheet(wb, wsAttendance, 'Sheet 2 - Attendance');
        }
      } catch (err) {
        // Attendance data mungkin belum ada, skip
      }

      // Sheet 3: Staff Summary by Department
      if (staff.length > 0) {
        const deptSummary: Record<string, any> = {};
        staff.forEach((s: Staff) => {
          const dept = s.departemen || 'Unknown';
          if (!deptSummary[dept]) {
            deptSummary[dept] = {
              departemen: dept,
              staffCount: 0,
              totalGajiPokok: 0,
              totalPremiHadir: 0,
              totalTunjTransport: 0,
              totalTunjMakan: 0,
              totalSalary: 0,
            };
          }
          deptSummary[dept].staffCount++;
          deptSummary[dept].totalGajiPokok += s.gajiPokok || 0;
          deptSummary[dept].totalPremiHadir += s.premiHadir || 0;
          deptSummary[dept].totalTunjTransport += s.tunjTransport || 0;
          deptSummary[dept].totalTunjMakan += s.tunjMakan || 0;
          deptSummary[dept].totalSalary += (s.gajiPokok || 0) + (s.premiHadir || 0) + (s.tunjTransport || 0) + (s.tunjMakan || 0);
        });

        const deptSummaryData = Object.values(deptSummary);
        const deptColumns: ExcelColumn[] = [
          { key: 'departemen', header: 'Departemen', width: 30 },
          { key: 'staffCount', header: 'Staff Count', width: 15, format: 'number' },
          { key: 'totalGajiPokok', header: 'Total Gaji Pokok', width: 20, format: 'currency' },
          { key: 'totalPremiHadir', header: 'Total Premi Hadir', width: 20, format: 'currency' },
          { key: 'totalTunjTransport', header: 'Total Tunj. Transport', width: 20, format: 'currency' },
          { key: 'totalTunjMakan', header: 'Total Tunj. Makan', width: 20, format: 'currency' },
          { key: 'totalSalary', header: 'Total Salary', width: 20, format: 'currency' },
        ];
        const wsDept = createStyledWorksheet(deptSummaryData, deptColumns, 'Sheet 3 - Dept Summary');
        setColumnWidths(wsDept, deptColumns);
        const grandTotalGaji = deptSummaryData.reduce((sum: number, d: any) => sum + (d.totalGajiPokok || 0), 0);
        const grandTotalSalary = deptSummaryData.reduce((sum: number, d: any) => sum + (d.totalSalary || 0), 0);
        addSummaryRow(wsDept, deptColumns, {
          departemen: 'GRAND TOTAL',
          staffCount: staff.length,
          totalGajiPokok: grandTotalGaji,
          totalSalary: grandTotalSalary,
        });
        XLSX.utils.book_append_sheet(wb, wsDept, 'Sheet 3 - Dept Summary');
      }

      if (wb.SheetNames.length === 0) {
        showAlert('No data available to export', 'Information');
        return;
      }

      const fileName = `HRD_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported complete HRD data (${staff.length} staff) to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>HRD - Human Resources Development</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
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
          {activeTab === 'dashboard' && (
            <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
              Dashboard statistics
            </div>
          )}
          {activeTab === 'attendance' && (
            <div>
              <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button 
                  variant="primary" 
                  onClick={handleFetchAttendance}
                  disabled={loadingAttendance}
                >
                  {loadingAttendance ? '⏳ Fetching...' : '🔄 Fetch dari Device'}
                </Button>
                <Button 
                  variant={autoSyncEnabled ? 'danger' : 'secondary'}
                  onClick={handleToggleAutoSync}
                >
                  {autoSyncEnabled ? '⏸️ Stop Auto-Sync' : '▶️ Start Auto-Sync'}
                </Button>
                {lastSyncTime && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Last sync: {lastSyncTime}
                  </span>
                )}
              </div>
              <Table 
                columns={attendanceColumns} 
                data={attendance} 
                emptyMessage="Belum ada data attendance. Klik 'Fetch dari Device' untuk mengambil data dari device fingerprint." 
              />
            </div>
          )}
          {activeTab === 'staff' && (
            <Table 
              columns={staffColumns.filter(col => !shouldHideColumn(col.key, staff))} 
              data={staff} 
              emptyMessage="No staff data" 
            />
          )}
          {activeTab === 'settings' && (
            <div className="module-compact" style={{ padding: '20px' }}>
              <Card title="Konfigurasi Device Fingerprint">
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                    Masukkan IP address dan port device fingerprint untuk koneksi otomatis.
                  </p>
                </div>
                
                <Input
                  label="IP Address Device"
                  value={fingerprintIp}
                  onChange={setFingerprintIp}
                  placeholder="192.168.1.100"
                />
                
                <Input
                  label="Port"
                  type="number"
                  value={String(fingerprintPort)}
                  onChange={(v) => setFingerprintPort(Number(v))}
                  placeholder="80"
                />
                
                <div className="settings-group" style={{ marginTop: '16px' }}>
                  <label className="settings-label">Protocol</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="http"
                        checked={fingerprintProtocol === 'http'}
                        onChange={(e) => setFingerprintProtocol(e.target.value as 'http' | 'https')}
                      />
                      <span>HTTP</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="https"
                        checked={fingerprintProtocol === 'https'}
                        onChange={(e) => setFingerprintProtocol(e.target.value as 'http' | 'https')}
                      />
                      <span>HTTPS</span>
                    </label>
                  </div>
                </div>
                
                <Input
                  label="API Path"
                  value={fingerprintApiPath}
                  onChange={setFingerprintApiPath}
                  placeholder="/api"
                />
                
                <div className="settings-actions" style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                  <Button onClick={handleCheckFingerprintConnection} variant="secondary">
                    Test Koneksi
                  </Button>
                  <Button onClick={handleSaveFingerprintConfig} variant="primary">
                    Simpan Konfigurasi
                  </Button>
                </div>
                
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`connection-status status-${connectionStatus}`}>
                    {connectionStatus === 'checking' && '⏳ Checking...'}
                    {connectionStatus === 'connected' && '✅ Connected'}
                    {connectionStatus === 'failed' && '❌ Connection Failed'}
                    {connectionStatus === 'idle' && '● Not tested'}
                  </span>
                </div>
                
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>💡 Tips:</div>
                  <div style={{ marginBottom: '4px' }}>• Pastikan device fingerprint terhubung ke jaringan yang sama</div>
                  <div style={{ marginBottom: '4px' }}>• IP address biasanya bisa dilihat di menu Settings device fingerprint</div>
                  <div style={{ marginBottom: '4px' }}>• Port default biasanya 80 (HTTP) atau 443 (HTTPS)</div>
                  <div style={{ marginBottom: '4px' }}>• API Path biasanya /api atau /attendance/api tergantung device</div>
                </div>
              </Card>
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

export default HRD;
