/**
 * Custom Hook - Report Generation
 * Handle report generation dengan loading state dan error handling
 */

import { useState, useCallback } from 'react';
import { reportService } from '@/services/report-service';

export type ReportType = 
  | 'gt-sales'
  | 'gt-purchase'
  | 'gt-invoices'
  | 'packaging-production'
  | 'packaging-qc'
  | 'trucking-delivery'
  | 'trucking-invoices'
  | 'master-products'
  | 'master-customers'
  | 'inventory-stock'
  | 'ar-report'
  | 'ap-report';

interface UseReportGenerationState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export function useReportGeneration() {
  const [state, setState] = useState<UseReportGenerationState>({
    isLoading: false,
    error: null,
    success: false,
  });

  const generateReport = useCallback(
    async (reportType: ReportType, startDate?: string, endDate?: string) => {
      setState({ isLoading: true, error: null, success: false });

      try {
        switch (reportType) {
          // GENERAL TRADING
          case 'gt-sales':
            if (!startDate || !endDate) throw new Error('Date range required');
            await reportService.generateGTSalesReport(startDate, endDate);
            break;

          case 'gt-purchase':
            if (!startDate || !endDate) throw new Error('Date range required');
            await reportService.generateGTPurchaseReport(startDate, endDate);
            break;

          case 'gt-invoices':
            if (!startDate || !endDate) throw new Error('Date range required');
            await reportService.generateGTInvoicesReport(startDate, endDate);
            break;

          // PACKAGING
          case 'packaging-production':
            await reportService.generatePackagingProductionReport();
            break;

          case 'packaging-qc':
            await reportService.generatePackagingQCReport();
            break;

          // TRUCKING
          case 'trucking-delivery':
            if (!startDate || !endDate) throw new Error('Date range required');
            await reportService.generateTruckingDeliveryReport(startDate, endDate);
            break;

          case 'trucking-invoices':
            if (!startDate || !endDate) throw new Error('Date range required');
            await reportService.generateTruckingInvoicesReport(startDate, endDate);
            break;

          // MASTER DATA
          case 'master-products':
            await reportService.generateMasterProductsReport();
            break;

          case 'master-customers':
            await reportService.generateMasterCustomersReport();
            break;

          // INVENTORY
          case 'inventory-stock':
            await reportService.generateInventoryStockReport();
            break;

          // FINANCE
          case 'ar-report':
            await reportService.generateARReport();
            break;

          case 'ap-report':
            await reportService.generateAPReport();
            break;

          default:
            throw new Error(`Unknown report type: ${reportType}`);
        }

        setState({ isLoading: false, error: null, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState({ isLoading: false, error: errorMessage, success: false });
        throw error;
      }
    },
    []
  );

  const resetState = useCallback(() => {
    setState({ isLoading: false, error: null, success: false });
  }, []);

  return {
    ...state,
    generateReport,
    resetState,
  };
}
