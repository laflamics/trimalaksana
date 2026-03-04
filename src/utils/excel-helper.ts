import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

/**
 * Helper function untuk styling Excel yang bagus
 */

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  format?: 'currency' | 'date' | 'number' | 'text';
}

/**
 * Set column widths untuk worksheet
 */
export function setColumnWidths(ws: XLSX.WorkSheet, columns: ExcelColumn[]) {
  if (!ws['!cols']) ws['!cols'] = [];
  
  columns.forEach((col, idx) => {
    if (ws['!cols']) {
      ws['!cols'][idx] = {
        wch: col.width || 15, // Default width 15
        wpx: (col.width || 15) * 7, // Approximate pixel width
      };
    }
  });
}

/**
 * Format currency untuk Excel
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * Format date untuk Excel
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Create Excel worksheet dengan styling yang bagus (borders + alternating colors) menggunakan ExcelJS
 */
export async function createStyledWorksheetExcelJS(
  data: any[],
  columns: ExcelColumn[],
  sheetName: string = 'Sheet1',
  groupByKey?: string // Key untuk grouping dan alternating colors
): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  // Add header row
  const headerRow = worksheet.addRow(columns.map(col => col.header));
  
  // Style header
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }, // Dark blue
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' }, // White
    };
    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  
  // Set column widths
  columns.forEach((col, idx) => {
    worksheet.columns[idx].width = col.width || 15;
  });
  
  // Add data rows with alternating colors
  let currentGroup: any = null;
  let groupColorIndex = 0;
  
  data.forEach((row) => {
    // Check if we need to switch color group
    if (groupByKey) {
      const groupValue = row[groupByKey];
      if (groupValue !== currentGroup) {
        currentGroup = groupValue;
        groupColorIndex = (groupColorIndex + 1) % 2;
      }
    }
    
    const rowData = columns.map(col => {
      let value = row[col.key];
      
      if (col.format === 'date' && value) {
        return formatDate(value);
      } else if (col.format === 'number' && value !== null && value !== undefined) {
        return Number(value) || 0;
      } else {
        return value || '';
      }
    });
    
    const excelRow = worksheet.addRow(rowData);
    
    // Apply styling to data row
    const bgColor = groupColorIndex === 0 ? 'FFFFFFFF' : 'FFE8E8E8'; // White or light gray
    
    excelRow.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];
      
      // Set fill color
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      
      // Set borders
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
      
      // Set alignment
      cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
      
      // Set number format
      if (col && col.format === 'currency') {
        cell.numFmt = '#,##0';
      } else if (col && col.format === 'date') {
        cell.numFmt = 'dd/mm/yyyy';
      }
    });
  });
  
  return worksheet;
}

/**
 * Create Excel worksheet dengan styling yang bagus (borders + alternating colors)
 */
export function createStyledWorksheet(
  data: any[],
  columns: ExcelColumn[],
  sheetName: string = 'Sheet1',
  groupByKey?: string // Key untuk grouping dan alternating colors
): XLSX.WorkSheet {
  // Prepare data dengan format yang benar
  const formattedData = data.map(row => {
    const formattedRow: any = {};
    columns.forEach(col => {
      let value = row[col.key];
      
      // Format berdasarkan type
      if (col.format === 'currency' && typeof value === 'number') {
        formattedRow[col.header] = value; // Keep as number for Excel
      } else if (col.format === 'date' && value) {
        formattedRow[col.header] = formatDate(value);
      } else if (col.format === 'number' && value !== null && value !== undefined) {
        formattedRow[col.header] = Number(value) || 0;
      } else {
        formattedRow[col.header] = value || '';
      }
    });
    return formattedRow;
  });

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(formattedData);
  
  // Set column widths
  setColumnWidths(ws, columns);
  
  // Add borders and alternating colors
  if (data.length > 0 && ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Define colors for alternating rows (light gray and white)
    const color1 = 'FFFFFF'; // White
    const color2 = 'E8E8E8'; // Light gray
    
    // Track current group for alternating colors
    let currentGroup: any = null;
    let groupColorIndex = 0;
    
    // Apply borders and colors to all cells
    for (let rowIdx = 0; rowIdx <= range.e.r; rowIdx++) {
      // Determine if this is header row
      const isHeader = rowIdx === 0;
      
      // Check if we need to switch color group
      if (groupByKey && rowIdx > 0) {
        const groupKeyColIdx = columns.findIndex(col => col.key === groupByKey);
        if (groupKeyColIdx >= 0) {
          const groupCell = XLSX.utils.encode_cell({ r: rowIdx, c: groupKeyColIdx });
          const groupValue = ws[groupCell]?.v;
          
          if (groupValue !== currentGroup) {
            currentGroup = groupValue;
            groupColorIndex = (groupColorIndex + 1) % 2; // Toggle between 0 and 1
          }
        }
      }
      
      for (let colIdx = 0; colIdx <= range.e.c; colIdx++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        
        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 's', v: '' };
        }
        
        // Initialize style object if it doesn't exist
        if (!ws[cellAddress].s) {
          ws[cellAddress].s = {};
        }
        
        // Set borders
        ws[cellAddress].s.border = {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        };
        
        // Set background color and font
        if (isHeader) {
          // Header: dark background with white text
          ws[cellAddress].s.fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: '366092' } };
          ws[cellAddress].s.font = { bold: true, color: { rgb: 'FFFFFF' } };
          ws[cellAddress].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        } else {
          // Data rows: alternating colors
          const bgColor = groupColorIndex === 0 ? color1 : color2;
          ws[cellAddress].s.fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: bgColor } };
          ws[cellAddress].s.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
        }
        
        // Set number format untuk currency columns
        const col = columns[colIdx];
        if (col && col.format === 'currency' && !isHeader) {
          ws[cellAddress].z = '#,##0';
        }
      }
    }
  }
  
  return ws;
}

/**
 * Add summary row ke worksheet
 */
export function addSummaryRow(
  ws: XLSX.WorkSheet,
  summaryData: Record<string, any>,
  columns: ExcelColumn[]
) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const summaryRowIdx = range.e.r + 2; // 2 rows setelah data terakhir
  
  // Add empty row
  const emptyRowIdx = range.e.r + 1;
  columns.forEach((_, colIdx) => {
    const cellAddress = XLSX.utils.encode_cell({ r: emptyRowIdx, c: colIdx });
    ws[cellAddress] = { t: 's', v: '' };
  });
  
  // Add summary row
  columns.forEach((col, colIdx) => {
    const cellAddress = XLSX.utils.encode_cell({ r: summaryRowIdx, c: colIdx });
    const value = summaryData[col.key];
    
    if (value !== null && value !== undefined) {
      if (col.format === 'currency' && typeof value === 'number') {
        ws[cellAddress] = { t: 'n', v: value, z: '#,##0' };
      } else if (typeof value === 'number') {
        ws[cellAddress] = { t: 'n', v: value };
      } else {
        ws[cellAddress] = { t: 's', v: String(value) };
      }
    } else {
      ws[cellAddress] = { t: 's', v: '' };
    }
  });
  
  // Update range
  const newRange = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: summaryRowIdx, c: range.e.c },
  });
  ws['!ref'] = newRange;
}

/**
 * Export ke Excel dengan styling yang bagus
 */
export function exportToExcel(
  data: any[],
  columns: ExcelColumn[],
  fileName: string,
  sheetName: string = 'Data',
  summaryData?: Record<string, any>
) {
  try {
    const wb = XLSX.utils.book_new();
    const ws = createStyledWorksheet(data, columns, sheetName);
    
    // Add summary jika ada
    if (summaryData) {
      addSummaryRow(ws, summaryData, columns);
    }
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

