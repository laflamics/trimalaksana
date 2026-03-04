import React from 'react';
import './DynamicTable.css';

interface DynamicTableProps {
  data: any[];
  title?: string;
  pageSize?: number;
  hideRowNumber?: boolean;
  reportId?: string;
}

export default function DynamicTable({ data, title, pageSize = 20, hideRowNumber = false, reportId }: DynamicTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);

  if (!data || data.length === 0) {
    return (
      <div className="dynamic-table-empty">
        <p>Tidak ada data</p>
      </div>
    );
  }

  // Get headers dari object keys
  const headers = Object.keys(data[0]);
  
  // Check if data already has NO column
  const hasNoColumn = headers.some(h => h.toLowerCase() === 'no' || h === '#');
  
  // Show row number ONLY for AR, AP, Profit categories AND if data doesn't already have NO column
  const showRowNumber = !hasNoColumn && reportId && (reportId.startsWith('ar-') || reportId.startsWith('ap-') || reportId.startsWith('profit-'));
  
  // Pagination
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayData = data.slice(startIndex, endIndex);

  // Reset to page 1 when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // Format value untuk display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
    if (typeof value === 'number') {
      return value.toLocaleString('id-ID');
    }
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Truncate long text
  const truncateText = (text: string, maxLength: number = 50): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="dynamic-table-container">
      <div className="dynamic-table-wrapper">
        <table className="dynamic-table">
          <thead>
            <tr>
              {showRowNumber && <th className="dynamic-table-no">#</th>}
              {headers.map((header) => (
                <th key={header} className="dynamic-table-header">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, rowIndex) => (
              <tr key={rowIndex} className="dynamic-table-row">
                {showRowNumber && <td className="dynamic-table-no">{startIndex + rowIndex + 1}</td>}
                {headers.map((header) => (
                  <td key={`${rowIndex}-${header}`} className="dynamic-table-cell">
                    <span title={String(row[header])}>
                      {truncateText(formatValue(row[header]))}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {data.length > pageSize && (
        <div className="dynamic-table-pagination">
          <button 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="pagination-btn"
            title="First page"
          >
            ⏮
          </button>
          
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
            title="Previous page"
          >
            ◀
          </button>
          
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          
          <button 
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title="Next page"
          >
            ▶
          </button>

          <button 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title="Last page"
          >
            ⏭
          </button>

          <div className="pagination-summary">
            ({data.length} total)
          </div>
        </div>
      )}
    </div>
  );
}
