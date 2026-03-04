import { useState, useEffect, useRef, useCallback } from 'react';
import Button from './Button';

interface DateRangeFilterProps {
  onDateChange: (from: string, to: string) => void;
  defaultFrom?: string;
  defaultTo?: string;
}

const DateRangeFilter = ({ onDateChange, defaultFrom = '', defaultTo = '' }: DateRangeFilterProps) => {
  const [filterMode, setFilterMode] = useState<'lastMonth' | 'thisMonth' | 'custom'>('thisMonth');
  const [customFrom, setCustomFrom] = useState(defaultFrom);
  const [customTo, setCustomTo] = useState(defaultTo);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const onDateChangeRef = useRef(onDateChange);

  // Keep ref updated without triggering effects
  useEffect(() => {
    onDateChangeRef.current = onDateChange;
  }, [onDateChange]);

  // Calculate date ranges
  const getLastMonthRange = useCallback(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    return {
      from: lastMonth.toISOString().split('T')[0],
      to: lastMonthEnd.toISOString().split('T')[0],
    };
  }, []);

  const getThisMonthRange = useCallback(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    // Use end of month as the end date
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      from: monthStart.toISOString().split('T')[0],
      to: monthEnd.toISOString().split('T')[0],
    };
  }, []);

  // Apply filter based on mode with debounce for custom dates
  // IMPORTANT: Do NOT include onDateChange in dependency array to prevent loops
  useEffect(() => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      if (filterMode === 'lastMonth') {
        const range = getLastMonthRange();
        onDateChangeRef.current(range.from, range.to);
      } else if (filterMode === 'thisMonth') {
        const range = getThisMonthRange();
        onDateChangeRef.current(range.from, range.to);
      } else if (filterMode === 'custom' && customFrom && customTo) {
        onDateChangeRef.current(customFrom, customTo);
      }
    }, 300); // Debounce 300ms

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filterMode, customFrom, customTo, getLastMonthRange, getThisMonthRange]);

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      padding: '8px',
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: '6px',
      flexWrap: 'wrap',
    }}>
      {/* Filter Mode Buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <Button
          variant={filterMode === 'lastMonth' ? 'primary' : 'secondary'}
          onClick={() => setFilterMode('lastMonth')}
          style={{
            fontSize: '11px',
            padding: '6px 10px',
            minHeight: '28px',
          }}
        >
          📅 Last Month
        </Button>
        <Button
          variant={filterMode === 'thisMonth' ? 'primary' : 'secondary'}
          onClick={() => setFilterMode('thisMonth')}
          style={{
            fontSize: '11px',
            padding: '6px 10px',
            minHeight: '28px',
          }}
        >
          📆 This Month
        </Button>
        <Button
          variant={filterMode === 'custom' ? 'primary' : 'secondary'}
          onClick={() => setFilterMode('custom')}
          style={{
            fontSize: '11px',
            padding: '6px 10px',
            minHeight: '28px',
          }}
        >
          🔧 Custom
        </Button>
      </div>

      {/* Custom Date Inputs */}
      {filterMode === 'custom' && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '9px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '2px',
            }}>
              From
            </label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '9px',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: '2px',
            }}>
              To
            </label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </div>
        </div>
      )}

      {/* Display current range */}
      {filterMode !== 'custom' && (
        <div style={{
          fontSize: '10px',
          color: 'var(--text-secondary)',
          marginLeft: 'auto',
          padding: '0 8px',
        }}>
          {filterMode === 'lastMonth' && `${getLastMonthRange().from} to ${getLastMonthRange().to}`}
          {filterMode === 'thisMonth' && `${getThisMonthRange().from} to ${getThisMonthRange().to}`}
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
