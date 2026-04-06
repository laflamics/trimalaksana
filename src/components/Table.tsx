import React from 'react';
import Button from './Button';
import './Table.css';

export interface Column<T> {
  key: keyof T | string;
  header: string | React.ReactNode;
  width?: string;
  hidden?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  getRowStyle?: (item: T) => React.CSSProperties;
  renderRowFooter?: (item: T) => React.ReactNode;
  rowFooterColSpan?: number;
  rowFooterBeforeColSpan?: number; // Kolom kosong sebelum row footer content
  renderRowHeader?: (item: T, isFirstInGroup: boolean) => React.ReactNode; // NEW: Header row before each group
  rowHeaderColSpan?: number; // NEW: Colspan for header row
  groupByKey?: keyof T | string; // NEW: Key to group by
  pageSize?: number; // Items per page (default 10)
  showPagination?: boolean; // Show pagination controls (default true)
}

function Table<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
  getRowStyle,
  renderRowFooter,
  rowFooterColSpan,
  rowFooterBeforeColSpan,
  renderRowHeader,
  rowHeaderColSpan,
  groupByKey,
  pageSize = 15,
  showPagination = true,
}: TableProps<T>) {
  // Ensure columns and data are always arrays
  const columnsArray = Array.isArray(columns) ? columns : [];
  const dataArray = Array.isArray(data) ? data : [];
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = Math.ceil(dataArray.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = dataArray.slice(startIndex, endIndex);
  
  // Reset to page 1 when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dataArray.length]);
  
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columnsArray.map((col) => (
              !col.hidden && <th key={String(col.key)} style={{ width: col.width }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan={columnsArray.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            paginatedData.map((item, idx) => {
              const rowStyle = getRowStyle ? getRowStyle(item) : undefined;
              const footerBackground = rowStyle?.backgroundColor || 'transparent';
              
              // Check if this is the first item in a group
              const isFirstInGroup = !groupByKey || idx === 0 || 
                (paginatedData[idx - 1] && paginatedData[idx - 1][groupByKey as keyof T] !== item[groupByKey as keyof T]);
              
              return (
                <React.Fragment key={item.id || idx}>
                  {renderRowHeader && isFirstInGroup && (
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', fontWeight: 'bold' }}>
                      <td 
                        colSpan={rowHeaderColSpan || columnsArray.length}
                        style={{ 
                          padding: '8px 16px',
                          borderBottom: '2px solid var(--border-color)',
                          fontSize: '13px'
                        }}
                      >
                        {renderRowHeader(item, isFirstInGroup)}
                      </td>
                    </tr>
                  )}
                  <tr
                    onClick={() => onRowClick?.(item)}
                    className={onRowClick ? 'table-row-clickable' : ''}
                    style={rowStyle}
                  >
                    {columnsArray.map((col) => (
                      !col.hidden && <td
                        key={String(col.key)}
                        style={{ width: col.width }}
                      >
                        {col.render
                          ? col.render(item)
                          : String(item[col.key as keyof T] || '')}
                      </td>
                    ))}
                  </tr>
                  {renderRowFooter && (() => {
                    try {
                      return (
                        <tr style={{ backgroundColor: footerBackground }}>
                          {rowFooterBeforeColSpan && rowFooterBeforeColSpan > 0 && (
                            <td 
                              colSpan={rowFooterBeforeColSpan}
                              style={{ 
                                padding: '0 16px',
                                borderTop: 'none', 
                                borderBottom: 'none'
                              }}
                            />
                          )}
                          <td 
                            colSpan={rowFooterColSpan || (columnsArray.length - (rowFooterBeforeColSpan || 0))}
                            style={{ 
                              padding: '4px 16px 12px', 
                              borderTop: 'none', 
                              borderBottom: 'none',
                              textAlign: 'left'
                            }}
                          >
                            {renderRowFooter(item)}
                          </td>
                        </tr>
                      );
                    } catch (error) {
                      console.error('[Table] Error rendering row footer:', error);
                      return null;
                    }
                  })()}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
      
      {/* Pagination Controls - Advanced Design */}
      {showPagination && dataArray.length > pageSize && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '8px', 
          marginTop: '20px',
          padding: '16px',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Showing {startIndex + 1}-{Math.min(endIndex, dataArray.length)} of {dataArray.length} items
          </div>
          {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '8px'
          }}>
          <Button 
            variant="secondary" 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div style={{ 
            display: 'flex', 
            gap: '4px',
            alignItems: 'center'
          }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'primary' : 'secondary'}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{ minWidth: '40px', padding: '6px 12px' }}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button 
            variant="secondary" 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
          <div style={{ marginLeft: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Page {currentPage} of {totalPages}
          </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Table;

