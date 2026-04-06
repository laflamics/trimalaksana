import { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { backupRestoreService, BackupData } from '../../services/backup-restore';
import '../../styles/common.css';

type BusinessUnit = 'packaging' | 'general-trading' | 'trucking';

const businessUnitLabels: Record<BusinessUnit, string> = {
  'packaging': '📦 Packaging',
  'general-trading': '🏪 General Trading',
  'trucking': '🚚 Trucking',
};

const businessUnitColors: Record<BusinessUnit, string> = {
  'packaging': '#4caf50',
  'general-trading': '#2196F3',
  'trucking': '#ff9800',
};

export default function BackupRestore() {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [selectedUnit, setSelectedUnit] = useState<BusinessUnit>('packaging');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupData | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<Record<string, number> | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ===== BACKUP TAB =====
  const handleBackup = async (unit: BusinessUnit) => {
    try {
      setLoading(true);
      setMessage(null);
      
      console.log(`[BackupRestore] Starting backup for ${unit}...`);
      const backup = await backupRestoreService.backupBusinessUnit(unit);
      
      console.log(`[BackupRestore] Backup created, downloading...`);
      backupRestoreService.downloadBackup(backup);
      
      showMessage('success', `✅ Backup ${businessUnitLabels[unit]} berhasil diunduh`);
    } catch (error) {
      console.error('[BackupRestore] Backup error:', error);
      showMessage('error', `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== RESTORE TAB =====
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setMessage(null);
      
      console.log('[BackupRestore] Parsing backup file...');
      const backup = await backupRestoreService.parseBackupFile(file);
      
      // Validate business unit matches selected unit
      if (backup.businessUnit !== selectedUnit) {
        throw new Error(
          `File backup adalah untuk ${businessUnitLabels[backup.businessUnit]}, ` +
          `tapi Anda memilih ${businessUnitLabels[selectedUnit]}. ` +
          `Silakan pilih business unit yang sesuai atau upload file yang benar.`
        );
      }
      
      console.log('[BackupRestore] Backup parsed successfully');
      setRestoreFile(file);
      setRestorePreview(backup);
      
      const summary = backupRestoreService.getBackupSummary(backup);
      setRestoreSummary(summary);
      
      showMessage('success', `✅ File backup berhasil dimuat: ${businessUnitLabels[backup.businessUnit]}`);
    } catch (error) {
      console.error('[BackupRestore] File parse error:', error);
      showMessage('error', `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRestoreFile(null);
      setRestorePreview(null);
      setRestoreSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restorePreview) {
      showMessage('error', '❌ Tidak ada backup file yang dimuat');
      return;
    }

    if (!selectedUnit) {
      showMessage('error', '❌ Pilih business unit terlebih dahulu');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ PERHATIAN!\n\nAnda akan mengembalikan SEMUA data ${businessUnitLabels[selectedUnit]} dari backup.\n\nData saat ini akan DITIMPA SEPENUHNYA.\n\nApakah Anda yakin?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage(null);
      
      console.log(`[BackupRestore] Starting restore for ${selectedUnit}...`);
      await backupRestoreService.restoreFromBackup(restorePreview);
      
      console.log('[BackupRestore] Restore completed successfully');
      showMessage('success', `✅ Data ${businessUnitLabels[selectedUnit]} berhasil dikembalikan`);
      
      // Reset form
      setTimeout(() => {
        setRestoreFile(null);
        setRestorePreview(null);
        setRestoreSummary(null);
        const fileInput = document.getElementById('restore-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }, 2000);
    } catch (error) {
      console.error('[BackupRestore] Restore error:', error);
      showMessage('error', `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('backup')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'backup' ? 'var(--primary-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'backup' ? '2px solid var(--primary-color)' : 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'backup' ? '600' : '400',
            transition: 'all 0.2s ease',
          }}
        >
          💾 Backup Data
        </button>
        <button
          onClick={() => setActiveTab('restore')}
          style={{
            padding: '12px 20px',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeTab === 'restore' ? 'var(--primary-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'restore' ? '2px solid var(--primary-color)' : 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'restore' ? '600' : '400',
            transition: 'all 0.2s ease',
          }}
        >
          ♻️ Restore Data
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: message.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            color: message.type === 'success' ? '#4caf50' : '#f44336',
            fontSize: '14px',
            border: `1px solid ${message.type === 'success' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* BACKUP TAB */}
      {activeTab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="💾 Backup Data" style={{ marginBottom: '0' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
              Pilih business unit yang ingin di-backup. Data akan diunduh sebagai file JSON.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {(Object.keys(businessUnitLabels) as BusinessUnit[]).map((unit) => (
                <div
                  key={unit}
                  style={{
                    padding: '16px',
                    border: `2px solid ${businessUnitColors[unit]}20`,
                    borderRadius: '8px',
                    backgroundColor: `${businessUnitColors[unit]}08`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: '600', color: businessUnitColors[unit] }}>
                    {businessUnitLabels[unit]}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0' }}>
                    Backup semua data termasuk master data, transaksi, dan logs.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => handleBackup(unit)}
                    disabled={loading}
                    style={{ width: '100%' }}
                  >
                    {loading ? '⏳ Processing...' : '📥 Download Backup'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card title="ℹ️ Informasi" style={{ marginBottom: '0' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>📦 Apa yang di-backup:</strong>
              </div>
              <ul style={{ margin: '0 0 12px 20px', paddingLeft: '0' }}>
                <li>Master data (Produk, Pelanggan, Supplier, dll)</li>
                <li>Semua transaksi (Sales Orders, PO, Delivery, Invoice, dll)</li>
                <li>Activity logs</li>
                <li>Konfigurasi dan pengaturan</li>
              </ul>
              <div style={{ marginBottom: '8px' }}>
                <strong>💾 Format file:</strong> JSON
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>📅 Nama file:</strong> backup-[business-unit]-[tanggal].json
              </div>
              <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: '4px', color: '#2196F3' }}>
                💡 Simpan backup file di tempat yang aman untuk disaster recovery.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* RESTORE TAB */}
      {activeTab === 'restore' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="♻️ Restore Data" style={{ marginBottom: '0' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
              Pilih business unit dan file backup untuk mengembalikan data. <strong>Perhatian: Data saat ini akan ditimpa sepenuhnya!</strong>
            </p>

            {/* Business Unit Selector */}
            <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Pilih Business Unit untuk Restore:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {(Object.keys(businessUnitLabels) as BusinessUnit[]).map((unit) => (
                  <button
                    key={unit}
                    onClick={() => {
                      setSelectedUnit(unit);
                      setRestoreFile(null);
                      setRestorePreview(null);
                      setRestoreSummary(null);
                      const fileInput = document.getElementById('restore-file-input') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                    style={{
                      padding: '12px 16px',
                      border: `2px solid ${selectedUnit === unit ? businessUnitColors[unit] : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      backgroundColor: selectedUnit === unit ? `${businessUnitColors[unit]}15` : 'var(--bg-primary)',
                      color: selectedUnit === unit ? businessUnitColors[unit] : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: selectedUnit === unit ? '600' : '400',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {businessUnitLabels[unit]}
                  </button>
                ))}
              </div>
              {selectedUnit && (
                <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: `${businessUnitColors[selectedUnit]}15`, borderRadius: '4px', color: businessUnitColors[selectedUnit], fontSize: '13px' }}>
                  ✓ Restore untuk: <strong>{businessUnitLabels[selectedUnit]}</strong>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  padding: '20px',
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-secondary)',
                  transition: 'all 0.2s ease',
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.05)';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const input = document.getElementById('restore-file-input') as HTMLInputElement;
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    input.files = dataTransfer.files;
                    handleFileSelect({ target: input } as any);
                  }
                }}
              >
                <input
                  id="restore-file-input"
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📂</div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  {restoreFile ? restoreFile.name : 'Pilih file backup atau drag & drop di sini'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Format: JSON (.json)
                </div>
              </label>
            </div>

            {/* Preview */}
            {restorePreview && (
              <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    📋 Preview Backup
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Business Unit:</div>
                      <div style={{ fontWeight: '600', color: businessUnitColors[restorePreview.businessUnit] }}>
                        {businessUnitLabels[restorePreview.businessUnit]}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Tanggal Backup:</div>
                      <div style={{ fontWeight: '600' }}>
                        {new Date(restorePreview.timestamp).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Versi:</div>
                      <div style={{ fontWeight: '600' }}>{restorePreview.version}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Total Items:</div>
                      <div style={{ fontWeight: '600' }}>
                        {restoreSummary ? Object.values(restoreSummary).reduce((a, b) => a + b, 0) : 0}
                      </div>
                    </div>
                  </div>
                </div>

                {restoreSummary && (
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                      Data yang akan di-restore:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                      {Object.entries(restoreSummary).map(([key, count]) => (
                        <div
                          key={key}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ color: 'var(--text-secondary)' }}>{key}</div>
                          <div style={{ fontWeight: '600', color: '#2196F3' }}>{count} items</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="danger"
                onClick={handleRestore}
                disabled={!restorePreview || loading}
                style={{ flex: 1 }}
              >
                {loading ? '⏳ Processing...' : '♻️ Restore Sekarang'}
              </Button>
              {restoreFile && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setRestoreFile(null);
                    setRestorePreview(null);
                    setRestoreSummary(null);
                    const fileInput = document.getElementById('restore-file-input') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                  disabled={loading}
                >
                  ✕ Batal
                </Button>
              )}
            </div>
          </Card>

          <Card title="⚠️ Peringatan" style={{ marginBottom: '0' }}>
            <div style={{ fontSize: '13px', color: '#f44336', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px', fontWeight: '600' }}>
                🚨 PERHATIAN PENTING:
              </div>
              <ul style={{ margin: '0 0 12px 20px', paddingLeft: '0' }}>
                <li>Restore akan menimpa SEMUA data saat ini</li>
                <li>Proses ini TIDAK DAPAT DIBATALKAN</li>
                <li>Pastikan Anda memiliki backup data saat ini sebelum melanjutkan</li>
                <li>Hanya admin yang dapat melakukan restore</li>
              </ul>
              <div style={{ padding: '8px 12px', backgroundColor: 'rgba(244, 67, 54, 0.1)', borderRadius: '4px', color: '#f44336' }}>
                💡 Rekomendasi: Backup data saat ini terlebih dahulu sebelum restore.
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
