import { useState } from 'react';
import Button from './Button';
import Card from './Card';

// Import JSON data directly
import productsData from '../../public/import-output/products.json';
import salesOrdersData from '../../public/import-output/salesOrders.json';
import deliveryNotesData from '../../public/import-output/deliveryNotes.json';
import invoicesData from '../../public/import-output/invoices.json';

interface BulkImportDialogProps {
  show: boolean;
  onClose: () => void;
  onImport: (type: 'products' | 'salesOrders' | 'deliveryNotes' | 'invoices', data: any[]) => Promise<void>;
  loading?: boolean;
}

export default function BulkImportDialog({ show, onClose, onImport, loading = false }: BulkImportDialogProps) {
  const [selectedType, setSelectedType] = useState<'products' | 'salesOrders' | 'deliveryNotes' | 'invoices' | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  const importTypes = [
    { id: 'products', label: 'Products (409 items)', description: 'Import packaging products from CSV' },
    { id: 'salesOrders', label: 'Sales Orders (185 items)', description: 'Import SO from CSV' },
    { id: 'deliveryNotes', label: 'Delivery Notes (292 items)', description: 'Import SJ/DLV from CSV' },
    { id: 'invoices', label: 'Invoices (329 items)', description: 'Import invoices from CSV' },
  ];

  const handleImport = async () => {
    if (!selectedType) return;

    setImporting(true);
    setMessage('Loading data...');

    try {
      // Use embedded data
      const dataMap: Record<string, any[]> = {
        'products': productsData,
        'salesOrders': salesOrdersData,
        'deliveryNotes': deliveryNotesData,
        'invoices': invoicesData,
      };

      const data = dataMap[selectedType];
      if (!data) {
        throw new Error(`No data found for ${selectedType}`);
      }

      if (!Array.isArray(data)) {
        throw new Error(`Invalid data format: expected array, got ${typeof data}`);
      }

      setMessage(`Importing ${data.length} items...`);

      await onImport(selectedType, data);
      setMessage(`✓ Successfully imported ${data.length} items`);

      setTimeout(() => {
        onClose();
        setSelectedType(null);
        setMessage('');
      }, 2000);
    } catch (error: any) {
      console.error('Import error:', error);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Bulk Import from CSV</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', marginBottom: '16px', color: '#999' }}>
              Select data type to import from merged CSV file (import one at a time):
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {importTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedType(type.id as any)}
                  style={{
                    padding: '12px',
                    border: selectedType === type.id ? '2px solid #4CAF50' : '1px solid #444',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedType === type.id ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{type.label}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{type.description}</div>
                </div>
              ))}
            </div>
          </div>

          {message && (
            <div style={{
              padding: '12px',
              backgroundColor: message.startsWith('✓') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '13px',
              color: message.startsWith('✓') ? '#4CAF50' : '#f44336',
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose} disabled={importing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!selectedType || importing || loading}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
