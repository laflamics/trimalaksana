import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useBusinessActivityReport } from '../../hooks/useBusinessActivityReport';
import BusinessActivityReportDetail from './BusinessActivityReportDetail';
import DateRangeFilter from '../../components/DateRangeFilter';
import './BusinessActivityReport.css';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  customer: string;
  soNo: string;
}

const BusinessActivityReport: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    customer: '',
    soNo: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const itemsPerPage = 50; // Increased to 50 for better performance with pagination

  const { items, loading, error, totalCount } = useBusinessActivityReport(filters);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Compute pagination BEFORE any conditional returns
  const paginatedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return items.slice(startIdx, endIdx);
  }, [items, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => Math.ceil(items.length / itemsPerPage), [items.length, itemsPerPage]);

  // Use useCallback to prevent unnecessary re-renders
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleDateChange = useCallback((from: string, to: string) => {
    setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to }));
  }, []);

  const handleViewDetail = useCallback((item: any) => {
    setSelectedItem(item);
    setShowDetail(true);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Helper functions untuk stage status
  const getStageStatus = (stage: string, data: any): string => {
    switch (stage) {
      case 'SO':
        return data.soStatus || 'PENDING';
      case 'PPIC':
        return data.spkStatus || 'PENDING';
      case 'Purchasing':
        return data.poStatus || data.prStatus || 'SKIPPED';
      case 'Production':
        return data.productionStatus || 'PENDING';
      case 'QC':
        return data.qcStatus || 'PENDING';
      case 'Delivery':
        return data.deliveryStatus || 'PENDING';
      default:
        return 'PENDING';
    }
  };

  const getStageColor = (status: string): string => {
    if (status === 'SKIPPED') return '#999';
    if (status === 'CLOSE' || status === 'PASS' || status === 'DELIVERED') return '#4CAF50';
    if (status === 'FAIL') return '#f44336';
    return '#2196F3';
  };

  const getStageIcon = (status: string): string => {
    if (status === 'SKIPPED') return '⊘';
    if (status === 'CLOSE' || status === 'PASS' || status === 'DELIVERED') return '✓';
    if (status === 'FAIL') return '✗';
    if (status === 'PENDING') return '○';
    return '⧖';
  };

  const calculateProgress = (item: any): number => {
    const stages = ['SO', 'PPIC', 'Purchasing', 'Production', 'QC', 'Delivery'];
    let completed = 0;
    
    stages.forEach(stage => {
      const status = getStageStatus(stage, item);
      if (status === 'CLOSE' || status === 'PASS' || status === 'DELIVERED') {
        completed++;
      }
    });
    
    return Math.round((completed / stages.length) * 100);
  };

  if (error) return <div className="bar-error">Error: {error}</div>;

  return (
    <div className="bar-container">
      <h1>Business Activity Report - Packaging</h1>

      {/* Filters */}
      <div className="bar-filters">
        <div style={{ flex: 1, minWidth: '400px' }}>
          <DateRangeFilter
            onDateChange={handleDateChange}
            defaultFrom={filters.dateFrom}
            defaultTo={filters.dateTo}
          />
        </div>

        <div className="filter-group">
          <label>Customer:</label>
          <input
            type="text"
            placeholder="Filter by customer..."
            value={filters.customer}
            onChange={(e) => handleFilterChange('customer', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>SO Number:</label>
          <input
            type="text"
            placeholder="Filter by SO..."
            value={filters.soNo}
            onChange={(e) => handleFilterChange('soNo', e.target.value)}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bar-loading">
          <p>Loading data...</p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
            Processing {totalCount} records
          </p>
        </div>
      )}

      {/* Results Info */}
      {!loading && (
        <div className="bar-info">
          <p>
            Showing {paginatedItems.length} of {items.length} items
            {totalCount > items.length && ` (${totalCount} total in database)`}
          </p>
        </div>
      )}

      {/* Timeline Items */}
      {!loading && (
        <div className="bar-timeline">
          {items.length === 0 ? (
            <div className="bar-empty">
              <p>No data available</p>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                Make sure you have created Sales Orders and SPKs in the system.
              </p>
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="bar-empty">No items match your filters</div>
          ) : (
            paginatedItems.map((item: any, idx: number) => (
              <div key={`${item.soNo}-${item.spkNo}-${idx}`} className="bar-item">
                <div className="bar-header">
                  <div className="bar-info-left">
                    <h3>{item.soNo}</h3>
                    <p className="bar-customer">{item.customer}</p>
                    <p className="bar-spk">SPK: {item.spkNo}</p>
                    <p className="bar-product">{item.product}</p>
                    <p className="bar-qty">Qty: {item.qty} {item.unit}</p>
                  </div>
                  <button
                    className="bar-detail-btn"
                    onClick={() => handleViewDetail(item)}
                  >
                    View Details
                  </button>
                </div>

                {/* Timeline Stages */}
                <div className="bar-stages">
                  {['SO', 'PPIC', 'Purchasing', 'Production', 'QC', 'Delivery'].map((stage, stageIdx) => {
                    const status = getStageStatus(stage, item);
                    const color = getStageColor(status);
                    const icon = getStageIcon(status);
                    const isSkipped = status === 'SKIPPED';

                    return (
                      <div key={stage} className="bar-stage">
                        <div
                          className={`bar-stage-dot ${isSkipped ? 'skipped' : ''}`}
                          style={{ backgroundColor: color }}
                          title={`${stage}: ${status}`}
                        >
                          <span className="bar-stage-icon">{icon}</span>
                        </div>
                        <div className="bar-stage-label">
                          <p className="bar-stage-name">{stage}</p>
                          <p className="bar-stage-status">{status}</p>
                        </div>
                        {stageIdx < 5 && <div className="bar-stage-connector" style={{ backgroundColor: color }} />}
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="bar-progress-section">
                  <div className="bar-progress-header">
                    <span>Overall Progress</span>
                    <span className="bar-progress-percent">{calculateProgress(item)}%</span>
                  </div>
                  <div className="bar-progress-bar">
                    <div 
                      className="bar-progress-fill"
                      style={{ width: `${calculateProgress(item)}%` }}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="bar-dates">
                  <span>Created: {new Date(item.createdDate).toLocaleDateString()}</span>
                  {item.deliveryDate && (
                    <span>Delivered: {new Date(item.deliveryDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="bar-pagination">
          <button
            disabled={currentPage === 1}
            onClick={handlePreviousPage}
          >
            ← Previous
          </button>
          <span>
            Page {currentPage} of {totalPages} ({items.length} items)
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={handleNextPage}
          >
            Next →
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <BusinessActivityReportDetail
          item={selectedItem}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
};

export default BusinessActivityReport;
