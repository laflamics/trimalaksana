import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import { openPrintWindow } from '../utils/actions';
import './ScheduleTable.css';

interface ScheduleData {
  id: string;
  spkNo: string;
  soNo: string;
  customer: string;
  poCustomer: string; // SO No atau PTP requestNo
  code: string;
  item: string;
  quantity: number;
  unit: string;
  scheduleDate: string; // docs.scheduleDate - untuk TGL PRODUKSI
  scheduleStartDate?: string; // docs.scheduleStartDate - untuk dot hijau
  scheduleEndDate?: string; // docs.scheduleEndDate - untuk End production dan dot kuning
  scheduleDeliveryDate?: string; // dari Delivery Note - untuk SCHEDULE DELIVERY
  status: 'DRAFT' | 'OPEN' | 'CLOSE';
  target: number;
  progress: number;
  remaining: number;
  keterangan?: string;
}

interface ScheduleTableProps {
  data: ScheduleData[];
  onScheduleClick: (item: ScheduleData) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  hideSearchInput?: boolean;
}

const ScheduleTable = ({ data, onScheduleClick, searchQuery: controlledSearch, onSearchChange, hideSearchInput = false }: ScheduleTableProps) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [filter, setFilter] = useState<'this-month' | 'last-month' | 'next-month' | 'custom'>('this-month');
  const [internalSearch, setInternalSearch] = useState('');
  const [infoDialog, setInfoDialog] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const isControlledSearch = typeof controlledSearch === 'string' && typeof onSearchChange === 'function';
  const effectiveSearchQuery = isControlledSearch ? controlledSearch! : internalSearch;
  const handleSearchChange = (value: string) => {
    if (isControlledSearch) {
      onSearchChange!(value);
    } else {
      setInternalSearch(value);
    }
  };

  const openInfoDialog = (message: string) => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setInfoDialog(message);
  };

  const closeInfoDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setInfoDialog(null);
  };

  // Helper function untuk format tanggal menjadi dd/MM/yyyy
  const formatDateSimple = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return '-';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getWeeks = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const weeks: number[][] = [];
    let currentWeek: number[] = [];

    // Fill first week
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(0);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(0);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  // Generate row color dari SO No atau PTP requestNo (solid, high contrast)
  const getRowColor = (soNo: string) => {
    const theme = document.documentElement.getAttribute('data-theme');
    const rowColors = theme === 'light' ? ['#fafafa', '#f0f0f0'] : ['#1b1b1b', '#2f2f2f'];
    if (!soNo) return rowColors[0];
    let hash = 0;
    for (let i = 0; i < soNo.length; i++) {
      hash = soNo.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % rowColors.length;
    return rowColors[index];
  };

  const getDeliveryDot = (item: ScheduleData) => {
    const color = item.status === 'CLOSE' ? '#ff4d4f' : '#4caf50';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: color,
            boxShadow: item.status === 'CLOSE'
              ? '0 0 0 1px rgba(255, 77, 79, 0.4)'
              : '0 0 0 1px rgba(76, 175, 80, 0.4)',
          }}
        />
        <span>{formatDateSimple(item.scheduleDeliveryDate)}</span>
      </span>
    );
  };

  const getDayColor = (item: ScheduleData, day: number) => {
    const currentYear = selectedMonth.getFullYear();
    const currentMonth = selectedMonth.getMonth();

    // Jika status CLOSE, tampilkan merah semua dari startDate sampai endDate
    if (item.status === 'CLOSE') {
      // Jika ada startDate dan endDate, tampilkan merah di semua hari dalam range
      if (item.scheduleStartDate && item.scheduleEndDate) {
        try {
          const startDate = new Date(item.scheduleStartDate);
          const endDate = new Date(item.scheduleEndDate);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
          
          const checkDate = new Date(currentYear, currentMonth, day);
          const checkDateTimestamp = checkDate.getTime();
          const startTimestamp = startDate.getTime();
          const endTimestamp = endDate.getTime();
          
          // Cek apakah day berada di antara startDate dan endDate
          if (checkDateTimestamp >= startTimestamp && checkDateTimestamp <= endTimestamp) {
            // Pastikan day dalam bulan yang sedang dilihat
            if (checkDate.getMonth() === currentMonth && checkDate.getFullYear() === currentYear) {
              return 'red';
            }
          }
        } catch {
          return null;
        }
      }
      // Jika hanya ada startDate, tampilkan merah dari startDate sampai akhir bulan
      else if (item.scheduleStartDate) {
        try {
          const startDate = new Date(item.scheduleStartDate);
          if (isNaN(startDate.getTime())) return null;
          
          if (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) {
            if (day >= startDate.getDate()) {
              return 'red';
            }
          }
        } catch {
          return null;
        }
      }
      // Fallback: jika hanya ada scheduleDate, tampilkan merah di scheduleDate
      else if (item.scheduleDate) {
        try {
          const scheduleDate = new Date(item.scheduleDate);
          if (isNaN(scheduleDate.getTime())) return null;
          
          if (scheduleDate.getMonth() === currentMonth && scheduleDate.getFullYear() === currentYear) {
            if (day === scheduleDate.getDate()) {
              return 'red';
            }
          }
        } catch {
          return null;
        }
      }
      return null;
    }

    // Jika ada startDate dan endDate, tampilkan dot dari startDate sampai endDate
    if (item.scheduleStartDate && item.scheduleEndDate) {
      try {
        const startDate = new Date(item.scheduleStartDate);
        const endDate = new Date(item.scheduleEndDate);
        
        // Normalize dates ke start of day untuk comparison yang akurat
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // Pastikan tanggal valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
        
        const checkDate = new Date(currentYear, currentMonth, day);
        checkDate.setHours(12, 0, 0, 0); // Set ke tengah hari untuk comparison
        
        // Cek apakah checkDate berada di antara startDate dan endDate
        if (checkDate >= startDate && checkDate <= endDate) {
          // Cek apakah checkDate di bulan yang sedang ditampilkan
          if (checkDate.getMonth() === currentMonth && checkDate.getFullYear() === currentYear) {
            const startDay = startDate.getDate();
            const endDay = endDate.getDate();
            const startMonth = startDate.getMonth();
            const endMonth = endDate.getMonth();
            const startYear = startDate.getFullYear();
            const endYear = endDate.getFullYear();
            
            // Jika startDate dan endDate di bulan yang sama dengan checkDate
            if (startMonth === currentMonth && startYear === currentYear &&
                endMonth === currentMonth && endYear === currentYear) {
              if (day === startDay && day === endDay) {
                // Jika startDate = endDate (1 hari), tampilkan hijau
                return 'green';
              } else if (day === startDay) {
                return 'green'; // Start date - hijau
              } else if (day === endDay) {
                return 'yellow'; // End date - kuning
              } else if (day > startDay && day < endDay) {
                return 'green'; // Di antara - hijau
              }
            }
            // Jika hanya startDate di bulan ini
            else if (startMonth === currentMonth && startYear === currentYear) {
              if (day === startDay) {
                return 'green';
              } else if (day > startDay) {
                return 'green'; // Hijau sampai akhir bulan
              }
            }
            // Jika hanya endDate di bulan ini
            else if (endMonth === currentMonth && endYear === currentYear) {
              if (day === endDay) {
                return 'yellow';
              } else if (day < endDay) {
                return 'green'; // Hijau dari awal bulan
              }
            }
            // Jika startDate dan endDate di bulan lain, tapi checkDate di antara keduanya
            else if (checkDate >= startDate && checkDate <= endDate) {
              return 'green';
            }
          }
        }
      } catch {
        return null;
      }
    }
    
    // Jika hanya ada startDate, tampilkan hijau dari startDate sampai akhir bulan
    if (item.scheduleStartDate && !item.scheduleEndDate) {
      try {
        const startDate = new Date(item.scheduleStartDate);
        if (isNaN(startDate.getTime())) return null;
        
        if (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) {
          if (day >= startDate.getDate()) {
            return day === startDate.getDate() ? 'green' : 'green';
          }
        }
      } catch {
        return null;
      }
    }

    // Jika hanya ada endDate, tampilkan kuning di endDate
    if (item.scheduleEndDate && !item.scheduleStartDate) {
      try {
        const endDate = new Date(item.scheduleEndDate);
        if (isNaN(endDate.getTime())) return null;
        
        if (endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear) {
          if (day === endDate.getDate()) {
            return 'yellow';
          }
        }
      } catch {
        return null;
      }
    }

    // Fallback: jika hanya ada scheduleDate, tampilkan hijau di scheduleDate
    if (item.scheduleDate && !item.scheduleStartDate && !item.scheduleEndDate) {
      try {
        const scheduleDate = new Date(item.scheduleDate);
        if (isNaN(scheduleDate.getTime())) return null;
        
        if (scheduleDate.getMonth() === currentMonth && scheduleDate.getFullYear() === currentYear) {
          if (day === scheduleDate.getDate()) {
            return 'green';
          }
        }
      } catch {
        return null;
      }
    }

    return null;
  };

  const daysInMonth = getDaysInMonth(selectedMonth);
  const weeks = getWeeks(selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter);
    const now = new Date();
    switch (newFilter) {
      case 'this-month':
        setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
        break;
      case 'last-month':
        setSelectedMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        break;
      case 'next-month':
        setSelectedMonth(new Date(now.getFullYear(), now.getMonth() + 1, 1));
        break;
      case 'custom':
        // Custom month picker bisa ditambahkan
        break;
    }
  };

  // Filter data berdasarkan search query dan bulan terpilih
  // Ensure data is always an array
  const dataArray = Array.isArray(data) ? data : [];
  const filteredData = dataArray.filter((item) => {
    // Filter berdasarkan bulan terpilih - cek scheduleStartDate atau scheduleDate
    const scheduleDate = item.scheduleStartDate || item.scheduleDate;
    if (!scheduleDate) return false;
    try {
      const itemDate = new Date(scheduleDate);
      if (isNaN(itemDate.getTime())) return false;
      
      const monthMatch = itemDate.getMonth() === selectedMonth.getMonth() && 
                         itemDate.getFullYear() === selectedMonth.getFullYear();
      
      if (!monthMatch) return false;
    } catch {
      return false;
    }
    
    // Filter berdasarkan search query
    if (!effectiveSearchQuery) return true;
    
    const query = effectiveSearchQuery.toLowerCase();
    return (
      (item.spkNo || '').toLowerCase().includes(query) ||
      (item.soNo || '').toLowerCase().includes(query) ||
      (item.customer || '').toLowerCase().includes(query) ||
      (item.poCustomer || '').toLowerCase().includes(query) ||
      (item.code || '').toLowerCase().includes(query) ||
      (item.item || '').toLowerCase().includes(query) ||
      (item.keterangan || '').toLowerCase().includes(query)
    );
  });

  // Helper function untuk cek apakah item schedule ada di week tertentu
  const isItemInWeek = (item: ScheduleData, week: number[], selectedMonth: Date) => {
    const scheduleStartDate = item.scheduleStartDate || item.scheduleDate;
    const scheduleEndDate = item.scheduleEndDate;
    
    if (!scheduleStartDate) return false;
    
    try {
      const startDate = new Date(scheduleStartDate);
      if (isNaN(startDate.getTime())) return false;
      
      const endDate = scheduleEndDate ? new Date(scheduleEndDate) : startDate;
      if (isNaN(endDate.getTime())) return false;
      
      // Cek apakah tanggal item ada di week ini
      const weekDays = week.filter(day => day > 0);
      if (weekDays.length === 0) return false;
      
      const firstDayOfWeek = weekDays[0];
      const lastDayOfWeek = weekDays[weekDays.length - 1];
      
      // Convert week days ke actual dates (set time to start/end of day untuk accurate comparison)
      const firstDateOfWeek = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), firstDayOfWeek);
      firstDateOfWeek.setHours(0, 0, 0, 0);
      const lastDateOfWeek = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), lastDayOfWeek);
      lastDateOfWeek.setHours(23, 59, 59, 999);
      
      // Normalize dates untuk comparison
      const startDateNormalized = new Date(startDate);
      startDateNormalized.setHours(0, 0, 0, 0);
      const endDateNormalized = new Date(endDate);
      endDateNormalized.setHours(23, 59, 59, 999);
      
      // Cek apakah schedule range overlap dengan week range
      // Schedule muncul di week jika:
      // 1. StartDate ada di week ini, ATAU
      // 2. EndDate ada di week ini, ATAU  
      // 3. Schedule range mencakup seluruh week (startDate <= firstDay && endDate >= lastDay)
      const scheduleInWeek = (
        (startDateNormalized >= firstDateOfWeek && startDateNormalized <= lastDateOfWeek) ||
        (endDateNormalized >= firstDateOfWeek && endDateNormalized <= lastDateOfWeek) ||
        (startDateNormalized <= firstDateOfWeek && endDateNormalized >= lastDateOfWeek)
      );
      
      return scheduleInWeek;
    } catch {
      return false;
    }
  };

  // Handle View Schedule
  const generateScheduleHtml = (scheduleData: ScheduleData[]) => {
    const monthName = selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const formatDate = (dateStr?: string) => formatDateSimple(dateStr);

    let htmlContent = `
      <html>
        <head>
          <title>Schedule - ${monthName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .schedule-item { margin-bottom: 20px; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>SCHEDULE PRODUKSI - ${monthName.toUpperCase()}</h1>
    `;

    scheduleData.forEach((item, idx) => {
      htmlContent += `
        <div class="schedule-item">
          <h3>Schedule ${idx + 1}</h3>
          <table>
            <tr><th style="width: 200px;">SPK NO</th><td>${item.spkNo || '-'}</td></tr>
            <tr><th>SO No</th><td>${item.soNo || '-'}</td></tr>
            <tr><th>Customer</th><td>${item.customer || '-'}</td></tr>
            <tr><th>PO Customer</th><td>${item.poCustomer || '-'}</td></tr>
            <tr><th>Code</th><td>${item.code || '-'}</td></tr>
            <tr><th>Item</th><td>${item.item || '-'}</td></tr>
            <tr><th>Quantity</th><td>${item.quantity || 0} ${item.unit || ''}</td></tr>
            <tr><th>TGL PRODUKSI</th><td>${formatDate(item.scheduleDate)}</td></tr>
            <tr><th>Schedule Mulai Produksi</th><td>${formatDate(item.scheduleStartDate)}</td></tr>
            <tr><th>End Production</th><td>${formatDate(item.scheduleEndDate)}</td></tr>
            <tr><th>Schedule Delivery</th><td>${item.scheduleDeliveryDate || '-'}</td></tr>
            <tr><th>Status</th><td>${item.status || 'DRAFT'}</td></tr>
            <tr><th>Target</th><td>${item.target || 0}</td></tr>
            <tr><th>Progress</th><td>${item.progress || 0}</td></tr>
            <tr><th>Remaining</th><td>${item.remaining || 0}</td></tr>
            <tr><th>Note</th><td>${item.keterangan || '-'}</td></tr>
          </table>
        </div>
      `;
    });

    htmlContent += `
        </body>
      </html>
    `;
    return htmlContent;
  };

  const sanitizeScheduleData = (scheduleData: ScheduleData[]) => {
    // Ensure scheduleData is always an array
    const scheduleDataArray = Array.isArray(scheduleData) ? scheduleData : [];
    return scheduleDataArray.filter((item) => (item.status || '').toUpperCase() !== 'CLOSE');
  };

  const handleViewSchedule = (scheduleData: ScheduleData[]) => {
    const exportData = sanitizeScheduleData(scheduleData);
    if (exportData.length === 0) {
      openInfoDialog('Tidak ada data schedule (status belum CLOSE) untuk ditampilkan.');
      return;
    }
    const htmlContent = generateScheduleHtml(exportData);
    setPreviewHtml(htmlContent);
  };

  // Handle Save to PDF
  const handleSaveToPDF = async (scheduleData: ScheduleData[]) => {
    const exportData = sanitizeScheduleData(scheduleData);
    if (exportData.length === 0) {
      openInfoDialog('Tidak ada data schedule (status belum CLOSE) untuk disimpan.');
      return;
    }
    const htmlContent = generateScheduleHtml(exportData);
    
    // Use Electron API to save PDF file
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.savePdf) {
      try {
        const monthName = selectedMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        const fileName = `Schedule_${monthName.replace(/\s+/g, '_')}.pdf`;
        await electronAPI.savePdf(htmlContent, fileName);
        openInfoDialog('PDF berhasil disimpan!');
      } catch (error: any) {
        console.error('Error saving PDF:', error);
        openInfoDialog(`Gagal menyimpan PDF: ${error.message || 'Unknown error'}`);
      }
    } else {
      // Fallback untuk browser: gunakan print window
      openPrintWindow(htmlContent, { autoPrint: false });
    }
  };

  return (
    <div className="schedule-container">
      <div className="schedule-filters">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          {!hideSearchInput && (
            <div style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
              <Input
                label="Search"
                value={effectiveSearchQuery}
                onChange={handleSearchChange}
                placeholder="Search by SPK No, SO No, Customer, Item, Code..."
              />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {filteredData.length > 0 && (
            <>
              <Button
                variant="secondary"
                onClick={() => handleViewSchedule(filteredData)}
                style={{ fontSize: '12px', padding: '6px 12px', minHeight: '33px' }}
              >
                👁️ View
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSaveToPDF(filteredData)}
                style={{ fontSize: '12px', padding: '6px 12px', minHeight: '33px' }}
              >
                💾 Save to PDF
              </Button>
            </>
          )}
          <button
            className={`filter-btn ${filter === 'last-month' ? 'active' : ''}`}
            onClick={() => handleFilterChange('last-month')}
            style={{ padding: '6px 12px', fontSize: '12px', minHeight: '33px' }}
          >
            Bulan Lalu
          </button>
          <button
            className={`filter-btn ${filter === 'this-month' ? 'active' : ''}`}
            onClick={() => handleFilterChange('this-month')}
            style={{ padding: '6px 12px', fontSize: '12px', minHeight: '33px' }}
          >
            Bulan Ini
          </button>
          <button
            className={`filter-btn ${filter === 'next-month' ? 'active' : ''}`}
            onClick={() => handleFilterChange('next-month')}
            style={{ padding: '6px 12px', fontSize: '12px', minHeight: '33px' }}
          >
            Bulan Depan
          </button>
          <button
            className={`filter-btn ${filter === 'custom' ? 'active' : ''}`}
            onClick={() => handleFilterChange('custom')}
            style={{ padding: '6px 12px', fontSize: '12px', minHeight: '33px' }}
          >
            Custom Month
          </button>
          {filter === 'custom' && (
            <input
              type="month"
              value={`${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-');
                setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
              }}
              style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }}
            />
          )}
        </div>
      </div>

      <div className="schedule-table-wrapper">
        <table className="schedule-table">
          <thead>
            <tr className="header-row">
              <th style={{ width: '120px', minWidth: '120px' }}>SCHEDULE DELIVERY</th>
              <th style={{ width: '120px', minWidth: '120px' }}>TGL PRODUKSI</th>
              <th style={{ width: '50px', minWidth: '50px' }}>NO</th>
              <th style={{ width: '120px', minWidth: '120px' }}>End production</th>
              <th style={{ width: '150px', minWidth: '150px' }}>CUSTOMER</th>
              <th style={{ width: '120px', minWidth: '120px' }}>PO customer</th>
              <th style={{ width: '100px', minWidth: '100px' }}>SPK NO</th>
              <th style={{ width: '120px', minWidth: '120px' }}>CODE</th>
              <th style={{ width: '250px', minWidth: '250px' }}>ITEM</th>
              <th style={{ width: '80px', minWidth: '80px' }}>Quantity</th>
              <th style={{ width: '60px', minWidth: '60px' }}>Unit</th>
              <th style={{ width: '100px', minWidth: '100px' }}>PLAN/ACTUAL</th>
              {days.map((day) => (
                <th key={day} className="day-header" style={{ width: '40px', minWidth: '40px' }}>Day {day}</th>
              ))}
              <th style={{ width: '150px', minWidth: '150px' }}>NOTE</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={10 + 1 + 1 + days.length + 1} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {effectiveSearchQuery ? 'No schedule data found matching your search.' : 'No schedule data for selected month.'}
                </td>
              </tr>
            ) : (
              (() => {
                // Track items yang sudah di-render untuk avoid duplikasi di multiple weeks
                const renderedItemIds = new Set<string>();
                const weekItemsMap = new Map<number, ScheduleData[]>();
                
                // Pre-process: assign setiap item ke week yang sesuai
                weeks.forEach((week, weekIdx) => {
                  const weekData = filteredData.filter((item) => {
                    // Skip jika item sudah di-render di week sebelumnya
                    if (renderedItemIds.has(item.id)) {
                      return false;
                    }
                    return isItemInWeek(item, week, selectedMonth);
                  });
                  
                  // Jika item overlap dengan multiple weeks, hanya assign ke week pertama yang match
                  // (week dengan start date terdekat dengan schedule start date)
                  weekData.forEach((item) => {
                    if (!renderedItemIds.has(item.id)) {
                      const scheduleStart = item.scheduleStartDate || item.scheduleDate;
                      if (scheduleStart) {
                        try {
                          const itemStartDate = new Date(scheduleStart);
                          const weekDays = week.filter(day => day > 0);
                          if (weekDays.length > 0) {
                            const firstDayOfWeek = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), weekDays[0]);
                            const lastDayOfWeek = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), weekDays[weekDays.length - 1]);
                            
                            // Cek apakah start date item ada di week ini
                            if (itemStartDate >= firstDayOfWeek && itemStartDate <= lastDayOfWeek) {
                              // Item start date ada di week ini, assign ke week ini
                              if (!weekItemsMap.has(weekIdx)) {
                                weekItemsMap.set(weekIdx, []);
                              }
                              weekItemsMap.get(weekIdx)!.push(item);
                              renderedItemIds.add(item.id);
                            }
                          }
                        } catch {
                          // Jika error parsing date, assign ke week pertama yang match
                          if (!weekItemsMap.has(weekIdx)) {
                            weekItemsMap.set(weekIdx, []);
                          }
                          weekItemsMap.get(weekIdx)!.push(item);
                          renderedItemIds.add(item.id);
                        }
                      } else {
                        // Jika tidak ada start date, assign ke week pertama yang match
                        if (!weekItemsMap.has(weekIdx)) {
                          weekItemsMap.set(weekIdx, []);
                        }
                        weekItemsMap.get(weekIdx)!.push(item);
                        renderedItemIds.add(item.id);
                      }
                    }
                  });
                });
                
                // Filter weeks yang punya data (hide week kosong)
                const weeksWithData: Array<{ week: number[], weekIdx: number }> = [];
                weeks.forEach((week, weekIdx) => {
                  const weekData = weekItemsMap.get(weekIdx) || [];
                  if (weekData.length > 0) {
                    weeksWithData.push({ week, weekIdx });
                  }
                });
                
                // Map week index untuk tracking week number yang benar
                let weekNumber = 1;
                
                return weeksWithData.map(({ week, weekIdx }) => {
                  const weekData = weekItemsMap.get(weekIdx) || [];
                  
                  return (
                    <React.Fragment key={weekIdx}>
                      <tr className="week-label">
                        <td colSpan={10 + 1 + 1 + days.length + 1} className="week-label-cell">
                          WEEK {weekNumber++}
                        </td>
                      </tr>
                      {weekData.map((item, idx) => {
                          const rowColor = getRowColor(item.soNo || item.poCustomer);
                          return (
                            <React.Fragment key={item.id}>
                              {/* PLAN Row */}
                              <tr 
                                className="schedule-row plan-row" 
                                onClick={() => onScheduleClick(item)}
                                style={{ backgroundColor: rowColor }}
                              >
                                <td>{getDeliveryDot(item)}</td>
                                <td>{formatDateSimple(item.scheduleStartDate || item.scheduleDate)}</td>
                                <td>{idx + 1}</td>
                                <td>{formatDateSimple(item.scheduleEndDate)}</td>
                                <td>{item.customer}</td>
                                <td>{item.poCustomer}</td>
                                <td>{item.spkNo}</td>
                                <td>{item.code}</td>
                                <td>{item.item}</td>
                                <td>{item.quantity}</td>
                                <td>{item.unit}</td>
                                <td>PLAN</td>
                                {days.map((day) => {
                                  const color = getDayColor(item, day);
                                  return (
                                    <td key={day} className="day-cell">
                                      {color && <span className={`day-dot dot-${color}`} />}
                                    </td>
                                  );
                                })}
                                <td>{item.keterangan || '-'}</td>
                              </tr>
                              {/* ACTUAL Row */}
                              <tr 
                                className="schedule-row actual-row"
                                style={{ backgroundColor: rowColor, opacity: 0.7 }}
                              >
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>ACTUAL</td>
                                {days.map((day) => (
                                  <td key={day} className="day-cell">
                                    {/* Actual production tracking */}
                                  </td>
                                ))}
                                <td>-</td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                });
              })()
            )}
            {/* PTP Unschedule Group */}
            <tr className="week-label">
              <td colSpan={10 + 1 + 1 + days.length + 1} className="week-label-cell unschedule-label">
                PTP (Permintaan Tanpa PO) - Belum Di-Schedule
              </td>
            </tr>
            {/* PTP items akan muncul di sini */}
          </tbody>
        </table>
      </div>

      {infoDialog && (
        <div className="dialog-overlay" onClick={closeInfoDialog} style={{ zIndex: 1200 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '90%', textAlign: 'left' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Information</h3>
            <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{infoDialog}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <Button variant="primary" onClick={closeInfoDialog}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}

      {previewHtml && (
        <div className="dialog-overlay" onClick={() => setPreviewHtml(null)} style={{ zIndex: 1200 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Preview Schedule</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setPreviewHtml(null)}>
                  Close
                </Button>
                <Button variant="primary" onClick={() => openPrintWindow(previewHtml)}>
                  Print
                </Button>
              </div>
            </div>
            <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
              <iframe
                title="Schedule Preview"
                srcDoc={previewHtml}
                style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleTable;

