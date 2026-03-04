import React from 'react';
import './Table.css';

export interface Column<T> {
  key: keyof T | string;
  header: string | React.ReactNode;
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
  pageSize = 10,
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
              <th key={String(col.key)}>{col.header}</th>
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
                      <td
                        key={String(col.key)}
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
      
      {/* Pagination Controls */}
      {showPagination && dataArray.length > pageSize && (
        <div className="table-pagination">
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages} ({dataArray.length} items)
          </div>
          
          <button 
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default Table;

