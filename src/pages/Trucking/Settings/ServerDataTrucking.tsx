import { useState, useEffect } from 'react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { storageService, StorageKeys } from '../../../services/storage';
import '../../../styles/common.css';
import '../../../styles/compact.css';

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

const ServerDataTrucking = () => {
  const [storageItems, setStorageItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [keyData, setKeyData] = useState<any[]>([]);
  const [keyLoading, setKeyLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingJson, setEditingJson] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });

  // Trucking-specific storage keys
  const TRUCKING_KEYS = [
    { key: StorageKeys.TRUCKING.VEHICLES, label: 'Vehicles' },
    { key: StorageKeys.TRUCKING.DRIVERS, label: 'Drivers' },
    { key: StorageKeys.TRUCKING.ROUTES, label: 'Routes' },
    { key: StorageKeys.TRUCKING.DELIVERY_ORDERS, label: 'Delivery Orders' },
    { key: StorageKeys.TRUCKING.SURAT_JALAN, label: 'Surat Jalan (Delivery Notes)' },
    { key: StorageKeys.TRUCKING.UNIT_SCHEDULES, label: 'Unit Schedules' },
    { key: StorageKeys.TRUCKING.PETTY_CASH_REQUESTS, label: 'Petty Cash Requests' },
    { key: StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS, label: 'Surat Jalan Notifications' },
    { key: StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS, label: 'Petty Cash Notifications' },
    { key: StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS, label: 'Invoice Notifications' },
  ];

  // Load list of storage keys
  const loadStorageList = async () => {
    setLoading(true);
    try {
      const items: StorageItem[] = [];

      for (const { key, label } of TRUCKING_KEYS) {
        try {
          const data = await storageService.get<any[]>(key);
          let count = 0;
          
          if (data) {
            if (Array.isArray(data)) {
              count = data.length;
            } else if (typeof data === 'object' && 'value' in data && Array.isArray((data as any).value)) {
              count = (data as any).value.length;
            }
          }
          
          if (count > 0) {
            items.push({
              key: label,
              count,
              updatedAt: new Date().toISOString(),
            });
            console.log(`[ServerDataTrucking] ✅ Found ${label}: ${count} items`);
          }
        } catch (error) {
          // Skip keys that don't exist
        }
      }

      setStorageItems(items);
      console.log('[ServerDataTrucking] ✅ Loaded storage list:', items.length, 'keys with data');
    } catch (error: any) {
      showAlert(`Error loading storage list: ${error.message}`, 'Error');
      console.error('[ServerDataTrucking] Error loading storage list:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data for specific key
  const loadKeyData = async (label: string) => {
    setKeyLoading(true);
    setSelectedItems(new Set());
    try {
      const keyObj = TRUCKING_KEYS.find(k => k.label === label);
      if (!keyObj) {
        showAlert('Key not found', 'Error');
        return;
      }

      const data = await storageService.get<any[]>(keyObj.key);
      let arrayData: any[] = [];
      
      if (data) {
        if (Array.isArray(data)) {
          arrayData = data;
        } else if (typeof data === 'object' && 'value' in data && Array.isArray((data as any).value)) {
          arrayData = (data as any).value;
        }
      }
      
      setKeyData(arrayData);
      setSelectedKey(label);
      console.log('[ServerDataTrucking] ✅ Loaded data for key:', label, '- Items:', arrayData.length);
    } catch (error: any) {
      showAlert(`Error loading data for ${label}: ${error.message}`, 'Error');
      console.error('[ServerDataTrucking] Error loading key data:', error);
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
          const keyObj = TRUCKING_KEYS.find(k => k.label === selectedKey);
          if (!keyObj) {
            showAlert('Key not found', 'Error');
            return;
          }

          const selectedIds = Array.from(selectedItems);
          
          // Filter out selected items
          const filteredData = keyData.filter((item: any) => {
            const itemId = item.id || JSON.stringify(item);
            return !selectedIds.includes(itemId);
          });

          // Save filtered data back to storage
          await storageService.set(keyObj.key, filteredData);

          showAlert(`Successfully deleted ${selectedItems.size} item(s)`, 'Success');
          setKeyData(filteredData);
          setSelectedItems(new Set());
          
          // Reload storage list to update counts
          loadStorageList();
        } catch (error: any) {
          showAlert(`Error deleting items: ${error.message}`, 'Error');
          console.error('[ServerDataTrucking] Error deleting items:', error);
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
          const keyObj = TRUCKING_KEYS.find(k => k.label === selectedKey);
          if (!keyObj) {
            showAlert('Key not found', 'Error');
            return;
          }

          // Delete by setting empty array
          await storageService.set(keyObj.key, []);

          showAlert(`Successfully deleted key "${selectedKey}"`, 'Success');
          setSelectedKey(null);
          setKeyData([]);
          setSelectedItems(new Set());
          
          // Reload storage list
          loadStorageList();
        } catch (error: any) {
          showAlert(`Error deleting key: ${error.message}`, 'Error');
          console.error('[ServerDataTrucking] Error deleting key:', error);
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
          const keyObj = TRUCKING_KEYS.find(k => k.label === selectedKey);
          if (!keyObj) {
            showAlert('Key not found', 'Error');
            return;
          }

          // Clear by setting empty array
          await storageService.set(keyObj.key, []);

          showAlert(`Successfully cleared key "${selectedKey}"`, 'Success');
          setKeyData([]);
          setSelectedItems(new Set());
          
          // Reload storage list
          loadStorageList();
        } catch (error: any) {
          showAlert(`Error clearing key: ${error.message}`, 'Error');
          console.error('[ServerDataTrucking] Error clearing key:', error);
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

  // Open edit modal
  const handleEditItem = (index: number, item: any) => {
    setEditingIndex(index);
    setEditingJson(JSON.stringify(item, null, 2));
    setEditError(null);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditingIndex(null);
    setEditingJson('');
    setEditError(null);
  };

  // Save edited JSON
  const handleSaveEdit = async () => {
    if (editingIndex === null || !selectedKey) {
      showAlert('Invalid state', 'Error');
      return;
    }

    try {
      // Validate JSON
      const parsedJson = JSON.parse(editingJson);
      
      // Update the item in keyData
      const updatedData = [...keyData];
      updatedData[editingIndex] = parsedJson;

      // Get the storage key
      const keyObj = TRUCKING_KEYS.find(k => k.label === selectedKey);
      if (!keyObj) {
        showAlert('Key not found', 'Error');
        return;
      }

      // Save to storage
      await storageService.set(keyObj.key, updatedData);

      // Update UI
      setKeyData(updatedData);
      closeEditModal();
      showAlert('Item updated successfully', 'Success');
      
      // Reload storage list to update counts
      loadStorageList();
    } catch (error: any) {
      setEditError(error.message || 'Invalid JSON');
      console.error('[ServerDataTrucking] Error saving edit:', error);
    }
  };

  useEffect(() => {
    loadStorageList();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <h1 style={{ color: 'var(--text-primary)' }}>Trucking - Server Data Management</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          View and manage Trucking data stored on the server
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
                        <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', width: '50px', color: 'var(--text-primary)' }}>
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
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold', flex: 1, color: 'var(--text-primary)' }}>Data</th>
                        <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', width: '100px', color: 'var(--text-primary)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keyData.map((item: any, index: number) => {
                        const itemId = item.id || JSON.stringify(item);
                        return (
                          <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', display: 'table-row' }}>
                            <td style={{ padding: '10px', width: '50px', textAlign: 'center', verticalAlign: 'top' }}>
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
                            <td style={{ padding: '10px', flex: 1 }}>
                              <pre style={{ fontSize: '11px', maxHeight: '150px', overflow: 'auto', margin: 0, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px' }}>
                                {JSON.stringify(item, null, 2)}
                              </pre>
                            </td>
                            <td style={{ padding: '10px', width: '100px', textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <Button
                                variant="secondary"
                                onClick={() => handleEditItem(index, item)}
                                style={{ fontSize: '11px', padding: '6px 10px', width: '100%' }}
                              >
                                ✏️ Edit
                              </Button>
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

      {/* Edit Modal */}
      {editingIndex !== null && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              border: '2px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '16px' }}>
                ✏️ Edit Item #{editingIndex}
              </h3>
              <button
                onClick={closeEditModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                ✕
              </button>
            </div>
            
            {editError && (
              <div style={{ 
                padding: '12px', 
                marginBottom: '15px', 
                backgroundColor: '#fee', 
                color: '#c33', 
                borderRadius: '4px',
                fontSize: '13px',
                border: '1px solid #fcc',
              }}>
                ❌ <strong>JSON Error:</strong> {editError}
              </div>
            )}

            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
              JSON Content:
            </label>

            <textarea
              value={editingJson}
              onChange={(e) => {
                setEditingJson(e.target.value);
                setEditError(null);
              }}
              style={{
                flex: 1,
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '12px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                marginBottom: '15px',
                resize: 'none',
                minHeight: '300px',
              }}
              spellCheck="false"
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={closeEditModal}
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                💾 Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerDataTrucking;
