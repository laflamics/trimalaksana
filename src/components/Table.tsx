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
}: TableProps<T>) {
  // Ensure columns and data are always arrays
  const columnsArray = Array.isArray(columns) ? columns : [];
  const dataArray = Array.isArray(data) ? data : [];
  
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
          {dataArray.length === 0 ? (
            <tr>
              <td colSpan={columnsArray.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            dataArray.map((item, idx) => {
              const rowStyle = getRowStyle ? getRowStyle(item) : undefined;
              const footerBackground = rowStyle?.backgroundColor || 'transparent';
              return (
                <React.Fragment key={item.id || idx}>
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
    </div>
  );
}

export default Table;

