import * as XLSX from 'xlsx';

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
    const colLetter = XLSX.utils.encode_col(idx);
    ws['!cols'][idx] = {
      wch: col.width || 15, // Default width 15
      wpx: (col.width || 15) * 7, // Approximate pixel width
    };
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
 * Create Excel worksheet dengan styling yang bagus
 */
export function createStyledWorksheet(
  data: any[],
  columns: ExcelColumn[],
  sheetName: string = 'Sheet1'
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
  
  // Set number format untuk currency columns
  if (data.length > 0) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    columns.forEach((col, colIdx) => {
      if (col.format === 'currency') {
        // Format semua rows kecuali header
        for (let rowIdx = 1; rowIdx <= range.e.r; rowIdx++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
          if (ws[cellAddress]) {
            // Set number format untuk currency (IDR)
            ws[cellAddress].z = '#,##0';
          }
        }
      }
    });
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

