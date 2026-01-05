import { useState } from 'react';
import Button from './Button';
import '../styles/common.css';

export type PageSize = 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger';

interface PageSizeDialogProps {
  defaultSize?: PageSize;
  onConfirm: (size: PageSize) => void;
  onCancel: () => void;
}

const pageSizeOptions: { value: PageSize; label: string; description: string }[] = [
  { value: 'A4', label: 'A4', description: '210 × 297 mm (Default)' },
  { value: 'A5', label: 'A5', description: '148 × 210 mm' },
  { value: 'Letter', label: 'Letter', description: '8.5 × 11 inch' },
  { value: 'Legal', label: 'Legal', description: '8.5 × 14 inch' },
  { value: 'Tabloid', label: 'Tabloid', description: '11 × 17 inch' },
  { value: 'Ledger', label: 'Ledger', description: '17 × 11 inch' },
];

export const PageSizeDialog = ({ defaultSize = 'A4', onConfirm, onCancel }: PageSizeDialogProps) => {
  const [selectedSize, setSelectedSize] = useState<PageSize>(defaultSize);

  return (
    <div 
      className="dialog-overlay" 
      onClick={onCancel}
      style={{ zIndex: 10000 }}
    >
      <div 
        className="dialog-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '500px', 
          width: '90%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Modern gradient background effect */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #2196f3, #64b5f6)',
            zIndex: 1,
          }}
        />
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            marginBottom: '20px' 
          }}>
            <div 
              className="dialog-icon info"
              style={{
                position: 'relative',
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
              }}
            >
              📄
            </div>
            <h3 className="dialog-title" style={{ margin: 0, flex: 1 }}>
              Pilih Ukuran Kertas
            </h3>
          </div>
          
          <div className="dialog-message" style={{ marginBottom: '24px' }}>
            Pilih ukuran kertas untuk PDF yang akan disimpan:
          </div>

          {/* Page Size Options */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px',
            marginBottom: '24px'
          }}>
            {pageSizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedSize(option.value)}
                style={{
                  padding: '16px',
                  border: `2px solid ${selectedSize === option.value ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  backgroundColor: selectedSize === option.value ? 'var(--primary-color)' : 'var(--bg-secondary)',
                  color: selectedSize === option.value ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  boxShadow: selectedSize === option.value ? '0 4px 12px rgba(33, 150, 243, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (selectedSize !== option.value) {
                    e.currentTarget.style.borderColor = 'var(--primary-color)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSize !== option.value) {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }
                }}
              >
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px',
                  marginBottom: '4px'
                }}>
                  {option.label}
                </div>
                <div style={{ 
                  fontSize: '12px',
                  opacity: 0.8
                }}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>
          
          <div className="dialog-actions" style={{ marginTop: '24px' }}>
            <Button 
              variant="secondary" 
              onClick={onCancel}
              style={{
                minWidth: '100px',
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => onConfirm(selectedSize)}
              style={{
                minWidth: '100px',
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
              }}
            >
              Save PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
