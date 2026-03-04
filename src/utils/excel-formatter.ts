/**
 * Excel Formatter Utility - Professional IPOS Style
 * Handle formatting, styling, dan export Excel dengan rapi dan profesional
 */

import * as XLSX from 'xlsx';
import { ReportTemplate } from '@/services/report-template-engine';

// Professional color palette
const COLORS = {
  primary: '1F4E78',      // Dark blue
  secondary: '4472C4',    // Medium blue
  accent: '70AD47',       // Green
  headerBg: '1F4E78',     // Dark blue for header
  headerText: 'FFFFFF',   // White text
  alternateRow: 'D9E1F2', // Light blue
  totalBg: 'B4C7E7',      // Medium light blue
  totalText: '000000',    // Black text
  border: '000000',       // Black borders
  lightBorder: 'D0CECE',  // Light gray borders
};

export const excelFormatter = {
  /**
   * Format worksheet dengan header profesional, styling, dan totals
   */
  formatWorksheet: (ws: XLSX.WorkSheet, template: ReportTemplate): XLSX.WorkSheet => {
    // Set column widths
    if (template.formatting?.columnWidths) {
      ws['!cols'] = template.formatting.columnWidths.map(w => ({ wch: w }));
    } else {
      ws['!cols'] = template.headers.map(() => ({ wch: 18 }));
    }

    // Set row heights
    ws['!rows'] = [];

    // Row 1: Company Header (merged cells)
    ws['!rows'][0] = { hpt: 25 };
    XLSX.utils.sheet_add_aoa(ws, [['PT. TRIMA LAKSANA']], { origin: 'A1' });
    const companyCell = ws['A1'];
    if (companyCell) {
      companyCell.font = { bold: true, size: 16, color: { rgb: COLORS.headerText } };
      companyCell.fill = { fgColor: { rgb: COLORS.primary }, patternType: 'solid' };
      companyCell.alignment = { horizontal: 'center', vertical: 'center' };
    }

    // Row 2: Report Title
    ws['!rows'][1] = { hpt: 22 };
    XLSX.utils.sheet_add_aoa(ws, [[template.title]], { origin: 'A2' });
    const titleCell = ws['A2'];
    if (titleCell) {
      titleCell.font = { bold: true, size: 14, color: { rgb: COLORS.primary } };
      titleCell.alignment = { horizontal: 'left', vertical: 'center' };
    }

    // Row 3: Subtitle/Description
    if (template.subtitle) {
      ws['!rows'][2] = { hpt: 18 };
      XLSX.utils.sheet_add_aoa(ws, [[template.subtitle]], { origin: 'A3' });
      const subtitleCell = ws['A3'];
      if (subtitleCell) {
        subtitleCell.font = { size: 11, color: { rgb: '666666' }, italic: true };
        subtitleCell.alignment = { horizontal: 'left', vertical: 'center' };
      }
    }

    // Row 4: Empty row for spacing
    ws['!rows'][3] = { hpt: 8 };

    // Row 5: Header row
    const headerRow = 5;
    ws['!rows'][headerRow - 1] = { hpt: 20 };
    XLSX.utils.sheet_add_aoa(ws, [template.headers], { origin: `A${headerRow}` });

    // Format header row with professional styling
    template.headers.forEach((_header: string, colIdx: number) => {
      const cellRef = XLSX.utils.encode_col(colIdx) + headerRow;
      const cell = ws[cellRef];
      if (cell) {
        cell.fill = {
          fgColor: { rgb: COLORS.headerBg },
          patternType: 'solid',
        };
        cell.font = {
          bold: true,
          color: { rgb: COLORS.headerText },
          size: 11,
        };
        cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        cell.border = {
          top: { style: 'medium', color: { rgb: COLORS.border } },
          bottom: { style: 'medium', color: { rgb: COLORS.border } },
          left: { style: 'thin', color: { rgb: COLORS.border } },
          right: { style: 'thin', color: { rgb: COLORS.border } },
        };
      }
    });

    // Add data rows (starting from row 6)
    const dataStartRow = headerRow + 1;
    
    // First, add all data using sheet_add_aoa to create cells
    const dataArray = template.data.map((rowData: any) =>
      template.headers.map((header: string) => rowData[header])
    );
    if (dataArray.length > 0) {
      XLSX.utils.sheet_add_aoa(ws, dataArray, { origin: `A${dataStartRow}` });
    }
    
    // Then format the cells with professional styling
    template.data.forEach((rowData: any, rowIdx: number) => {
      const row = dataStartRow + rowIdx;
      if (!ws['!rows']) ws['!rows'] = [];
      ws['!rows'][row - 1] = { hpt: 18 };
      
      template.headers.forEach((header: string, colIdx: number) => {
        const cellRef = XLSX.utils.encode_col(colIdx) + row;
        const cell = ws[cellRef];
        if (cell) {
          // Alternate row colors for better readability
          if (rowIdx % 2 === 0) {
            cell.fill = {
              fgColor: { rgb: COLORS.alternateRow },
              patternType: 'solid',
            };
          }

          // Format numbers with proper number formats
          const value = rowData[header];
          if (typeof value === 'number') {
            if (header.toLowerCase().includes('harga') || 
                header.toLowerCase().includes('total') || 
                header.toLowerCase().includes('nilai') ||
                header.toLowerCase().includes('subtotal') ||
                header.toLowerCase().includes('pajak') ||
                header.toLowerCase().includes('amount') ||
                header.toLowerCase().includes('price')) {
              cell.numFmt = '#,##0.00';
            } else if (header.toLowerCase().includes('qty') || 
                       header.toLowerCase().includes('stok') ||
                       header.toLowerCase().includes('quantity') ||
                       header.toLowerCase().includes('jumlah')) {
              cell.numFmt = '0';
            }
          }

          // Alignment based on data type
          if (typeof value === 'number') {
            cell.alignment = { horizontal: 'right', vertical: 'center' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'center' };
          }

          // Professional borders
          cell.border = {
            top: { style: 'thin', color: { rgb: COLORS.lightBorder } },
            bottom: { style: 'thin', color: { rgb: COLORS.lightBorder } },
            left: { style: 'thin', color: { rgb: COLORS.lightBorder } },
            right: { style: 'thin', color: { rgb: COLORS.lightBorder } },
          };
        }
      });
    });

    // Add totals section with professional styling
    if (template.totals && Object.keys(template.totals).length > 0) {
      const totalStartRow = dataStartRow + template.data.length + 1;
      ws['!rows'][totalStartRow - 1] = { hpt: 8 }; // Empty row
      
      let totalRowIdx = 0;

      Object.entries(template.totals).forEach(([label, value]) => {
        const row = totalStartRow + 1 + totalRowIdx;
        if (!ws['!rows']) ws['!rows'] = [];
        ws['!rows'][row - 1] = { hpt: 20 };
        
        // Add label and value to cells
        ws[`A${row}`] = { v: label };
        ws[`B${row}`] = { v: value };
        
        const labelCell = ws[`A${row}`];
        const valueCell = ws[`B${row}`];

        if (labelCell) {
          labelCell.font = { bold: true, size: 11, color: { rgb: COLORS.totalText } };
          labelCell.fill = {
            fgColor: { rgb: COLORS.totalBg },
            patternType: 'solid',
          };
          labelCell.alignment = { horizontal: 'right', vertical: 'center' };
          labelCell.border = {
            top: { style: 'medium', color: { rgb: COLORS.border } },
            bottom: { style: 'medium', color: { rgb: COLORS.border } },
            left: { style: 'medium', color: { rgb: COLORS.border } },
            right: { style: 'thin', color: { rgb: COLORS.border } },
          };
        }

        if (valueCell) {
          valueCell.font = { bold: true, size: 11, color: { rgb: COLORS.totalText } };
          valueCell.fill = {
            fgColor: { rgb: COLORS.totalBg },
            patternType: 'solid',
          };
          valueCell.alignment = { horizontal: 'right', vertical: 'center' };
          valueCell.numFmt = typeof value === 'number' ? '#,##0.00' : '@';
          valueCell.border = {
            top: { style: 'medium', color: { rgb: COLORS.border } },
            bottom: { style: 'medium', color: { rgb: COLORS.border } },
            left: { style: 'thin', color: { rgb: COLORS.border } },
            right: { style: 'medium', color: { rgb: COLORS.border } },
          };
        }

        totalRowIdx++;
      });
    }

    // Add footer with timestamp
    const footerRow = dataStartRow + template.data.length + (Object.keys(template.totals || {}).length * 2) + 3;
    ws['!rows'][footerRow - 1] = { hpt: 16 };
    const timestamp = new Date().toLocaleString('id-ID');
    XLSX.utils.sheet_add_aoa(ws, [[`Dicetak: ${timestamp}`]], { origin: `A${footerRow}` });
    const footerCell = ws[`A${footerRow}`];
    if (footerCell) {
      footerCell.font = { size: 9, color: { rgb: '999999' }, italic: true };
      footerCell.alignment = { horizontal: 'right', vertical: 'center' };
    }

    // Freeze panes (freeze header row)
    if (template.formatting?.freezePane !== false) {
      ws['!freeze'] = { xSplit: 0, ySplit: 5 };
    }

    return ws;
  },

  /**
   * Export report ke Excel dengan metadata dan professional styling
   */
  exportReport: function(template: ReportTemplate, filename: string): void {
    try {
      const self = this;
      // Create workbook
      const wb = (XLSX.utils.book_new as any)() as any;

      // Create worksheet
      const ws = (XLSX.utils.aoa_to_sheet as any)([]) as XLSX.WorkSheet;

      // Format worksheet dengan professional styling
      self.formatWorksheet(ws, template);

      // Set print options untuk professional printing
      ws['!print'] = {
        orientation: 'portrait',
        paperSize: 9, // A4
        fitToPage: true,
        fitToHeight: 0,
        fitToWidth: 1,
        scale: 100,
        margins: {
          left: 0.5,
          right: 0.5,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3,
        },
      };

      // Append to workbook
      (XLSX.utils.book_append_sheet as any)(wb, ws, 'Report');

      // Set workbook properties
      wb.Props = {
        Title: template.title,
        Subject: template.subtitle || 'Business Report',
        Author: 'PT. Trima Laksana',
        Manager: 'System',
        Company: 'PT. Trima Laksana',
        Category: 'Report',
        Keywords: 'Report, Business',
        Comments: `Generated on ${new Date().toLocaleString('id-ID')}`,
        LastAuthor: 'System',
        CreatedDate: new Date(),
      };

      // Export file
      if (wb) {
        (XLSX.writeFile as any)(wb, filename);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  },

  /**
   * Export multiple sheets (untuk laporan kompleks dengan multiple tabs)
   */
  exportMultiSheet: function(
    sheets: Array<{ name: string; template: ReportTemplate }>,
    filename: string
  ): void {
    try {
      const wb = (XLSX.utils.book_new as any)();
      const self = this;

      sheets.forEach(({ name, template: tmpl }) => {
        const ws = (XLSX.utils.aoa_to_sheet as any)([]) as XLSX.WorkSheet;
        self.formatWorksheet(ws, tmpl);
        (XLSX.utils.book_append_sheet as any)(wb, ws, name.substring(0, 31)); // Excel sheet name limit
      });

      // Set workbook properties
      wb.Props = {
        Title: 'Multi-Sheet Report',
        Subject: 'Business Report',
        Author: 'PT. Trima Laksana',
        Manager: 'System',
        Company: 'PT. Trima Laksana',
        Category: 'Report',
        Keywords: 'Report, Business, Multi-Sheet',
        Comments: `Generated on ${new Date().toLocaleString('id-ID')}`,
        LastAuthor: 'System',
        CreatedDate: new Date(),
      };

      (XLSX.writeFile as any)(wb, filename);
    } catch (error) {
      console.error('Error exporting multi-sheet report:', error);
      throw error;
    }
  },

  /**
   * Export dengan summary sheet (untuk laporan dengan ringkasan)
   */
  exportWithSummary: function(
    summaryTemplate: ReportTemplate,
    detailSheets: Array<{ name: string; template: ReportTemplate }>,
    filename: string
  ): void {
    try {
      const wb = (XLSX.utils.book_new as any)();
      const self = this;

      // Add summary sheet first
      const summaryWs = (XLSX.utils.aoa_to_sheet as any)([]) as XLSX.WorkSheet;
      self.formatWorksheet(summaryWs, summaryTemplate);
      (XLSX.utils.book_append_sheet as any)(wb, summaryWs, 'Ringkasan');

      // Add detail sheets
      detailSheets.forEach(({ name, template: tmpl }) => {
        const ws = (XLSX.utils.aoa_to_sheet as any)([]) as XLSX.WorkSheet;
        self.formatWorksheet(ws, tmpl);
        (XLSX.utils.book_append_sheet as any)(wb, ws, name.substring(0, 31));
      });

      // Set workbook properties
      wb.Props = {
        Title: 'Report with Summary',
        Subject: 'Business Report',
        Author: 'PT. Trima Laksana',
        Manager: 'System',
        Company: 'PT. Trima Laksana',
        Category: 'Report',
        Keywords: 'Report, Business, Summary',
        Comments: `Generated on ${new Date().toLocaleString('id-ID')}`,
        LastAuthor: 'System',
        CreatedDate: new Date(),
      };

      (XLSX.writeFile as any)(wb, filename);
    } catch (error) {
      console.error('Error exporting report with summary:', error);
      throw error;
    }
  },

  /**
   * Format currency untuk display di Excel
   */
  formatCurrency: (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },

  /**
   * Format currency untuk Excel cell (tanpa simbol)
   */
  formatCurrencyValue: (value: number): number => {
    return Math.round(value);
  },

  /**
   * Format date untuk display
   */
  formatDate: (date: string | Date): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  },

  /**
   * Format date untuk Excel (ISO format)
   */
  formatDateISO: (date: string | Date): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  },

  /**
   * Format percentage
   */
  formatPercentage: (value: number, decimals: number = 2): string => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  /**
   * Format number dengan thousand separator
   */
  formatNumber: (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  /**
   * Generate filename dengan timestamp dan date range
   */
  generateFilename: (reportName: string, startDate?: string, endDate?: string): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    const cleanName = reportName
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 50); // Limit filename length

    if (startDate && endDate) {
      const start = startDate.replace(/-/g, '');
      const end = endDate.replace(/-/g, '');
      return `${cleanName}_${start}_${end}.xlsx`;
    }

    return `${cleanName}_${timestamp}.xlsx`;
  },

  /**
   * Create summary row dengan styling
   */
  createSummaryRow: (label: string, value: number | string, isBold: boolean = true) => {
    return {
      label,
      value,
      isBold,
      isSummary: true,
    };
  },

  /**
   * Validate data sebelum export
   */
  validateData: (data: any[], headers: string[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data || data.length === 0) {
      errors.push('Data tidak boleh kosong');
    }

    if (!headers || headers.length === 0) {
      errors.push('Headers tidak boleh kosong');
    }

    // Check if all data rows have required headers
    data.forEach((row, idx) => {
      headers.forEach(header => {
        if (!(header in row)) {
          errors.push(`Row ${idx + 1}: Missing header "${header}"`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Export data dengan auto-detect column types dan formatting
   */
  exportAutoFormat: function(
    data: any[],
    headers: string[],
    title: string,
    filename: string,
    options?: {
      subtitle?: string;
      totals?: Record<string, number | string>;
      columnWidths?: number[];
      freezePane?: boolean;
    }
  ): void {
    try {
      // Validate data
      const validation = this.validateData(data, headers);
      if (!validation.valid) {
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }

      // Create template
      const template: ReportTemplate = {
        title,
        subtitle: options?.subtitle,
        headers,
        data,
        totals: options?.totals || {},
        formatting: {
          columnWidths: options?.columnWidths || headers.map(() => 18),
          headerBgColor: COLORS.headerBg,
          headerTextColor: COLORS.headerText,
          alternateRowColor: true,
          freezePane: options?.freezePane !== false,
        },
      };

      // Export
      this.exportReport(template, filename);
    } catch (error) {
      console.error('Error in exportAutoFormat:', error);
      throw error;
    }
  },

  /**
   * Export dengan custom styling per column
   */
  exportWithColumnStyles: function(
    template: ReportTemplate,
    columnStyles: Record<string, { align?: 'left' | 'center' | 'right'; format?: string; width?: number }>,
    filename: string
  ): void {
    try {
      const wb = (XLSX.utils.book_new as any)();
      const ws = (XLSX.utils.aoa_to_sheet as any)([]) as XLSX.WorkSheet;

      // Apply custom column styles
      const enhancedTemplate = { ...template };
      
      // Update column widths based on columnStyles
      enhancedTemplate.formatting = {
        ...enhancedTemplate.formatting,
        columnWidths: template.headers.map((header) => {
          const style = columnStyles[header];
          return style?.width || 18;
        }),
      };

      this.formatWorksheet(ws, enhancedTemplate);

      // Apply custom formatting per column
      template.headers.forEach((header, colIdx) => {
        const style = columnStyles[header];
        if (style) {
          const headerRow = 5;
          const dataStartRow = headerRow + 1;

          // Apply to header
          const headerCell = ws[XLSX.utils.encode_col(colIdx) + headerRow];
          if (headerCell && style.align) {
            headerCell.alignment = { ...headerCell.alignment, horizontal: style.align };
          }

          // Apply to data rows
          template.data.forEach((_, rowIdx) => {
            const row = dataStartRow + rowIdx;
            const cellRef = XLSX.utils.encode_col(colIdx) + row;
            const cell = ws[cellRef];
            if (cell) {
              if (style.align) {
                cell.alignment = { ...cell.alignment, horizontal: style.align };
              }
              if (style.format) {
                cell.numFmt = style.format;
              }
            }
          });
        }
      });

      (XLSX.utils.book_append_sheet as any)(wb, ws, 'Report');
      (XLSX.writeFile as any)(wb, filename);
    } catch (error) {
      console.error('Error exporting with column styles:', error);
      throw error;
    }
  },

  /**
   * Export dengan conditional formatting (highlight cells berdasarkan value)
   */
  exportWithConditionalFormatting: function(
    template: ReportTemplate,
    conditions: Array<{
      column: string;
      condition: (value: any) => boolean;
      fillColor: string;
      textColor?: string;
    }>,
    filename: string
  ): void {
    try {
      const wb = (XLSX.utils.book_new as any)();
      const ws = (XLSX.utils.aoa_to_sheet as any)([]) as XLSX.WorkSheet;

      this.formatWorksheet(ws, template);

      // Apply conditional formatting
      const headerRow = 5;
      const dataStartRow = headerRow + 1;

      template.data.forEach((rowData: any, rowIdx: number) => {
        const row = dataStartRow + rowIdx;

        template.headers.forEach((header: string, colIdx: number) => {
          const cellRef = XLSX.utils.encode_col(colIdx) + row;
          const cell = ws[cellRef];
          const value = rowData[header];

          if (cell) {
            // Check all conditions
            conditions.forEach(cond => {
              if (cond.column === header && cond.condition(value)) {
                cell.fill = {
                  fgColor: { rgb: cond.fillColor },
                  patternType: 'solid',
                };
                if (cond.textColor) {
                  cell.font = { ...cell.font, color: { rgb: cond.textColor } };
                }
              }
            });
          }
        });
      });

      (XLSX.utils.book_append_sheet as any)(wb, ws, 'Report');
      (XLSX.writeFile as any)(wb, filename);
    } catch (error) {
      console.error('Error exporting with conditional formatting:', error);
      throw error;
    }
  },

  /**
   * Export dengan grouping/subtotals
   */
  exportWithGrouping: function(
    template: ReportTemplate,
    groupByColumn: string,
    subtotalColumns: string[],
    filename: string
  ): void {
    try {
      // Group data
      const groupedData: Record<string, any[]> = {};
      template.data.forEach(row => {
        const groupKey = row[groupByColumn];
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = [];
        }
        groupedData[groupKey].push(row);
      });

      // Create grouped template
      const groupedRows: any[] = [];

      Object.entries(groupedData).forEach(([groupKey, rows]) => {
        // Add group header
        groupedRows.push({
          ...Object.fromEntries(template.headers.map(h => [h, h === groupByColumn ? `GROUP: ${groupKey}` : ''])),
          _isGroupHeader: true,
        });

        // Add group data
        groupedRows.push(...rows);

        // Add group subtotal
        const subtotal: any = { [groupByColumn]: `Subtotal ${groupKey}` };
        subtotalColumns.forEach(col => {
          const sum = rows.reduce((acc, row) => {
            const val = Number(row[col]) || 0;
            return acc + val;
          }, 0);
          subtotal[col] = sum;
        });
        groupedRows.push({ ...subtotal, _isSubtotal: true });
      });

      const groupedTemplate: ReportTemplate = {
        ...template,
        data: groupedRows,
      };

      this.exportReport(groupedTemplate, filename);
    } catch (error) {
      console.error('Error exporting with grouping:', error);
      throw error;
    }
  },

  /**
   * Export dengan pivot table style (summary by multiple dimensions)
   */
  exportPivotStyle: function(
    data: any[],
    rowDimension: string,
    columnDimension: string,
    valueColumn: string,
    aggregateFunction: 'sum' | 'count' | 'avg' | 'min' | 'max',
    title: string,
    filename: string
  ): void {
    try {
      // Create pivot table
      const pivot: Record<string, Record<string, number>> = {};
      const rowValues = new Set<string>();
      const colValues = new Set<string>();

      data.forEach(row => {
        const rowKey = row[rowDimension];
        const colKey = row[columnDimension];
        const value = Number(row[valueColumn]) || 0;

        rowValues.add(rowKey);
        colValues.add(colKey);

        if (!pivot[rowKey]) {
          pivot[rowKey] = {};
        }

        if (!pivot[rowKey][colKey]) {
          pivot[rowKey][colKey] = 0;
        }

        // Apply aggregation
        switch (aggregateFunction) {
          case 'sum':
            pivot[rowKey][colKey] += value;
            break;
          case 'count':
            pivot[rowKey][colKey]++;
            break;
          case 'avg':
            pivot[rowKey][colKey] = (pivot[rowKey][colKey] + value) / 2;
            break;
          case 'min':
            pivot[rowKey][colKey] = Math.min(pivot[rowKey][colKey], value);
            break;
          case 'max':
            pivot[rowKey][colKey] = Math.max(pivot[rowKey][colKey], value);
            break;
        }
      });

      // Convert to template format
      const headers = [rowDimension, ...Array.from(colValues)];
      const templateData = Array.from(rowValues).map(rowKey => {
        const row: any = { [rowDimension]: rowKey };
        Array.from(colValues).forEach(colKey => {
          row[colKey] = pivot[rowKey]?.[colKey] || 0;
        });
        return row;
      });

      const template: ReportTemplate = {
        title,
        headers,
        data: templateData,
        totals: {},
        formatting: {
          columnWidths: headers.map(() => 18),
          headerBgColor: COLORS.headerBg,
          headerTextColor: COLORS.headerText,
          alternateRowColor: true,
          freezePane: true,
        },
      };

      this.exportReport(template, filename);
    } catch (error) {
      console.error('Error exporting pivot style:', error);
      throw error;
    }
  },
};
