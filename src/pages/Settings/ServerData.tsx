import { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { storageService } from '../../services/storage';
import '../../styles/common.css';
import '../../styles/compact.css';

interface StorageItem {
  key: string;
  count: number;
  updatedAt: string;
}

interface DialogState {
  show: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
}

const ServerData = () => {
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [keyData, setKeyData] = useState<any[]>([]);
  const [keyLoading, setKeyLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });

  // Load list of storage keys
  const loadStorageList = async () => {
    setLoading(true);
    try {
      // Get all known keys and check which ones have data
      const knownKeys = [
        'products', 'customers', 'suppliers', 'materials', 'bom', 'staff',
        'spk', 'schedule', 'production', 'qc', 'productionResults', 'ptp',
        'purchaseRequests', 'purchaseOrders', 'grn', 'grnPackaging', 'inventory',
        'salesOrders', 'delivery',
        'productionNotifications', 'deliveryNotifications', 'invoiceNotifications', 'financeNotifications',
        'payments', 'journalEntries', 'accounts', 'invoices', 'expenses', 'operationalExpenses', 'taxRecords',
        'audit', 'outbox', 'companySettings',
      ];

      const items: StorageItem[] = [];

      for (const key of knownKeys) {
        try {
          const data = await storageService.get<any[]>(key);
          if (data && Array.isArray(data) && data.length > 0) {
            items.push({
              key,
              count: data.length,
              updatedAt: new Date().toISOString(),
            });
            console.log(`[ServerData] ✅ Found ${key}: ${data.length} items`);
          }
        } catch (error) {
          // Skip keys that don't exist
        }
      }

      setStorageItems(items);
      console.log('[ServerData] ✅ Loaded storage list:', items.length, 'keys with data');
    } catch (error: any) {
      showAlert(`Error loading storage list: ${error.message}`, 'Error');
      console.error('[ServerData] Error loading storage list:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data for specific key
  const loadKeyData = async (key: string) => {
    setKeyLoading(true);
    setSelectedItems(new Set());
    try {
      const data = await storageService.get<any[]>(key);
      if (data && Array.isArray(data)) {
        setKeyData(data);
        setSelectedKey(key);
        console.log('[ServerData] ✅ Loaded data for key:', key, '- Items:', data.length);
      } else {
        setKeyData([]);
        setSelectedKey(key);
        console.log('[ServerData] ⚠️ No data for key:', key);
      }
    } catch (error: any) {
      showAlert(`Error loading data for ${key}: ${error.message}`, 'Error');
      console.error('[ServerData] Error loading key data:', error);
    } finally {
      setKeyLoading(false);
    }
  };

  // Delete selected items
  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) {
      showAlert('Please select at least one item to delete', 'No Selection');
      return;
    }

    if (!selectedKey) {
      showAlert('No key selected', 'Error');
      return;
    }

    showConfirm(
      `Delete ${selectedItems.size} item(s) from "${selectedKey}"?\n\nThis action cannot be undone.`,
      async () => {
        setDeleteLoading(true);
        try {
          const selectedIds = Array.from(selectedItems);
          
          // Filter out selected items
          const filteredData = keyData.filter((item: any) => {
            const itemId = item.id || JSON.stringify(item);
            return !selectedIds.includes(itemId);
          });

          // Save filtered data back to storage
          await storageService.set(selectedKey, filteredData);

          showAlert(`Successfully deleted ${selectedItems.size} item(s)`, 'Success');
          setKeyData(filteredData);
          setSelectedItems(new Set());
          
          // Reload storage list to update counts
          loadStorageList();
        } catch (error: any) {
          showAlert(`Error deleting items: ${error.message}`, 'Error');
          console.error('[ServerData] Error deleting items:', error);
        } finally {
          setDeleteLoading(false);
        }
      }
    );
  };

  // Delete entire key
  const handleDeleteKey = async () => {
    if (!selectedKey) {
      showAlert('No key selected', 'Error');
      return;
    }

    showConfirm(
      `Delete entire key "${selectedKey}" and all its data?\n\nThis action cannot be undone.`,
      async () => {
        setDeleteLoading(true);
        try {
          // Delete by setting empty array
          await storageService.set(selectedKey, []);

          showAlert(`Successfully deleted key "${selectedKey}"`, 'Success');
          setSelectedKey(null);
          setKeyData([]);
          setSelectedItems(new Set());
          
          // Reload storage list
          loadStorageList();
        } catch (error: any) {
          showAlert(`Error deleting key: ${error.message}`, 'Error');
          console.error('[ServerData] Error deleting key:', error);
        } finally {
          setDeleteLoading(false);
        }
      }
    );
  };

  // Clear all data in key
  const handleClearKey = async () => {
    if (!selectedKey) {
      showAlert('No key selected', 'Error');
      return;
    }

    showConfirm(
      `Clear all data in key "${selectedKey}"?\n\nThis action cannot be undone.`,
      async () => {
        setDeleteLoading(true);
        try {
          // Clear by setting empty array
          await storageService.set(selectedKey, []);

          showAlert(`Successfully cleared key "${selectedKey}"`, 'Success');
          setKeyData([]);
          setSelectedItems(new Set());
          
          // Reload storage list
          loadStorageList();
        } catch (error: any) {
          showAlert(`Error clearing key: ${error.message}`, 'Error');
          console.error('[ServerData] Error clearing key:', error);
        } finally {
          setDeleteLoading(false);
        }
      }
    );
  };

  const showAlert = (message: string, title: string = 'Information') => {
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title: string = 'Confirmation') => {
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
    });
  };

  const closeDialog = () => {
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
    });
  };

  useEffect(() => {
    loadStorageList();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <h1 style={{ color: 'var(--text-primary)' }}>Packaging - Server Data Management</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          View and manage Packaging data stored on the server
        </p>

        {/* Storage Keys List */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Storage Keys</h2>
            <Button
              variant="secondary"
              onClick={loadStorageList}
              disabled={loading}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {storageItems.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-primary)' }}>Storage Key</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-primary)' }}>Items</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-primary)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {storageItems.map((item) => (
                    <tr
                      key={item.key}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: selectedKey === item.key ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      }}
                    >
                      <td style={{ padding: '10px', color: 'var(--text-primary)' }}>
                        <strong>{item.key}</strong>
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-primary)' }}>{item.count}</td>
                      <td style={{ padding: '10px' }}>
                        <Button
                          variant="primary"
                          onClick={() => loadKeyData(item.key)}
                          disabled={keyLoading}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No storage keys found</p>
          )}
        </div>

        {/* Key Data */}
        {selectedKey && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>
                Data in "{selectedKey}" ({keyData.length} items)
              </h2>
              <Button
                variant="secondary"
                onClick={() => loadKeyData(selectedKey)}
                disabled={keyLoading}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {keyLoading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>

            {keyData.length > 0 ? (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
                  <Button
                    variant="danger"
                    onClick={handleDeleteSelected}
                    disabled={deleteLoading || selectedItems.size === 0}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Delete Selected ({selectedItems.size})
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleClearKey}
                    disabled={deleteLoading}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Clear All
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteKey}
                    disabled={deleteLoading}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Delete Key
                  </Button>
                </div>

                <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', width: '50px', color: 'var(--text-primary)' }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.size > 0 && selectedItems.size === keyData.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const allIds = new Set(keyData.map((item: any) => item.id || JSON.stringify(item)));
                                setSelectedItems(allIds);
                              } else {
                                setSelectedItems(new Set());
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-primary)' }}>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keyData.map((item: any, index: number) => {
                        const itemId = item.id || JSON.stringify(item);
                        return (
                          <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                            <td style={{ padding: '10px', width: '50px' }}>
                              <input
                                type="checkbox"
                                checked={selectedItems.has(itemId)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedItems);
                                  if (e.target.checked) {
                                    newSet.add(itemId);
                                  } else {
                                    newSet.delete(itemId);
                                  }
                                  setSelectedItems(newSet);
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '10px' }}>
                              <pre style={{ fontSize: '11px', maxHeight: '150px', overflow: 'auto', margin: 0, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px' }}>
                                {JSON.stringify(item, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No data in this key</p>
            )}
          </div>
        )}
      </Card>

      {/* Dialog */}
      {dialogState.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '400px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>{dialogState.title}</h3>
            <p style={{ margin: '0 0 20px 0', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{dialogState.message}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {dialogState.type === 'confirm' && (
                <Button
                  variant="secondary"
                  onClick={closeDialog}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Cancel
                </Button>
              )}
              <Button
                variant={dialogState.type === 'confirm' ? 'primary' : 'secondary'}
                onClick={() => {
                  if (dialogState.onConfirm) {
                    dialogState.onConfirm();
                  }
                  closeDialog();
                }}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {dialogState.type === 'confirm' ? 'Confirm' : 'OK'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerData;
