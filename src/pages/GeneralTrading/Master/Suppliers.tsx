import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService, StorageKeys } from '../../../services/storage';
import { deleteGTItem, reloadGTData, filterActiveItems } from '../../../utils/gt-delete-helper';
import { useDialog } from '../../../hooks/useDialog';
import { useLanguage } from '../../../hooks/useLanguage';
import * as XLSX from 'xlsx';
import '../../../styles/common.css';

interface Supplier {
  id: string;
  no: number;
  kode: string;
  nama: string;
  kontak: string;
  npwp: string;
  email: string;
  telepon: string;
  alamat: string;
  kategori: string;
}

const Suppliers = () => {
  const { t } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, showConfirm, closeDialog, DialogComponent } = useDialog();

  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [formData, setFormData] = useState<Partial<Supplier>>({
    kode: '',
    nama: '',
    kontak: '',
    npwp: '',
    email: '',
    telepon: '',
    alamat: '',
    kategori: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    console.log('[GT Suppliers] Loading suppliers...');
    let dataRaw = await storageService.get<Supplier[]>(StorageKeys.GENERAL_TRADING.SUPPLIERS);
    console.log('[GT Suppliers] Raw data from storage:', dataRaw);
    
    // If undefined or empty, try force fetch from server
    if (!dataRaw || (Array.isArray(dataRaw) && dataRaw.length === 0)) {
      console.log('[GT Suppliers] No data in storage, trying force fetch from server...');
      try {
        const config = storageService.getConfig();
        console.log('[GT Suppliers] Storage config:', config);
        
        if (config.type === 'server' && config.serverUrl) {
          console.log('[GT Suppliers] Fetching from server:', config.serverUrl);
          const response = await fetch(`${config.serverUrl}/api/storage/${encodeURIComponent(StorageKeys.GENERAL_TRADING.SUPPLIERS)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('[GT Suppliers] Server response:', result);
            const serverData = result.data?.value || result.value || [];
            if (Array.isArray(serverData) && serverData.length > 0) {
              console.log(`[GT Suppliers] Force fetch successful: ${serverData.length} suppliers from server`);
              dataRaw = serverData;
              // Save to storage for next time
              await storageService.set(StorageKeys.GENERAL_TRADING.SUPPLIERS, serverData);
            }
          } else {
            console.error('[GT Suppliers] Server response not ok:', response.status);
          }
        } else {
          console.log('[GT Suppliers] Not in server mode or no serverUrl configured');
        }
      } catch (error) {
        console.error('[GT Suppliers] Force fetch failed:', error);
      }
    }
    
    // Ensure dataRaw is array
    if (!Array.isArray(dataRaw)) {
      dataRaw = [];
    }
    
    console.log('[GT Suppliers] Raw data length:', dataRaw.length);
    
    // Filter out deleted items menggunakan helper function
    const data = filterActiveItems(dataRaw);
    console.log('[GT Suppliers] Filtered data length:', data.length);
    
    // CRITICAL: Remove duplicates by kode before setting state
    const seen = new Set<string>();
    const uniqueData: Supplier[] = [];
    
    data.forEach(supplier => {
      if (supplier && supplier.kode) {
        const key = supplier.kode.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueData.push(supplier);
        } else {
          console.log('[GT Suppliers] Removed duplicate:', supplier.kode, '-', supplier.nama);
        }
      }
    });
    
    console.log('[GT Suppliers] Unique data length:', uniqueData.length);
    
    const numberedData = uniqueData.map((s, idx) => ({ ...s, no: idx + 1 }));
    console.log('[GT Suppliers] Final data length:', numberedData.length);
    
    setSuppliers(numberedData);
    
    // Save cleaned data back to storage if duplicates were removed
    if (uniqueData.length < data.length) {
      console.log('[GT Suppliers] Saving cleaned data to storage...');
      await storageService.set(StorageKeys.GENERAL_TRADING.SUPPLIERS, numberedData);
    }
  };

  // Auto generate kode supplier: SUP-001, SUP-002, dst
  const generateSupplierCode = (existingSuppliers: Supplier[]): string => {
    const prefix = 'SUP';
    const existingCodes = existingSuppliers
      .map(s => s.kode)
      .filter(k => k && k.startsWith(prefix))
      .map(k => {
        const match = k.match(/^SUP-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        const updated = suppliers.map(s =>
          s.id === editingItem.id
            ? { 
                ...formData, 
                id: editingItem.id, 
                no: editingItem.no,
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now()
              } as Supplier
            : s
        );
        await storageService.set(StorageKeys.GENERAL_TRADING.SUPPLIERS, updated);
        setSuppliers(updated.map((s, idx) => ({ ...s, no: idx + 1 })));
      } else {
        // Manual add: selalu auto generate kode (ignore kode yang diisi manual)
        const autoKode = generateSupplierCode(suppliers);
        
        const newSupplier: Supplier = {
          id: Date.now().toString(),
          no: suppliers.length + 1,
          lastUpdate: new Date().toISOString(),
          timestamp: Date.now(),
          _timestamp: Date.now(),
          ...formData,
          kode: autoKode,
        } as Supplier;
        const updated = [...suppliers, newSupplier];
        await storageService.set(StorageKeys.GENERAL_TRADING.SUPPLIERS, updated);
        setSuppliers(updated.map((s, idx) => ({ ...s, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({ kode: '', nama: '', kontak: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '' });
    } catch (error: any) {
      showAlert(`Error saving supplier: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: Supplier) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Supplier) => {
    try {
      console.log('[GT Suppliers] handleDelete called for:', item?.nama, item?.id);
      
      if (!item || !item.nama) {
        showAlert('Supplier tidak valid. Mohon coba lagi.', 'Error');
        return;
      }
      
      // Validate item.id exists
      if (!item.id) {
        console.error('[GT Suppliers] Supplier missing ID:', item);
        showAlert(`❌ Error: Supplier "${item.nama}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Supplier "${item.nama}"?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai GT delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deleteGTItem(StorageKeys.GENERAL_TRADING.SUPPLIERS, item.id, 'id');
            
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition)
              const activeSuppliers = await reloadGTData(StorageKeys.GENERAL_TRADING.SUPPLIERS, setSuppliers);
              // Re-number suppliers
              setSuppliers(activeSuppliers.map((s, idx) => ({ ...s, no: idx + 1 })));
              showAlert(`✅ Supplier "${item.nama}" berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
            } else {
              console.error('[GT Suppliers] Delete failed:', deleteResult.error);
              showAlert(`❌ Error deleting supplier "${item.nama}": ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            console.error('[GT Suppliers] Error deleting supplier:', error);
            showAlert(`❌ Error deleting supplier: ${error.message}`, 'Error');
          }
        },
        undefined,
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[GT Suppliers] Error in handleDelete:', error);
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { 'Kode': 'SUP-001', 'Nama': 'PT Supplier Example 1', 'Kontak': 'John Doe', 'NPWP': '01.234.567.8-901.000', 'Email': 'john@example.com', 'Telepon': '021-12345678', 'Alamat': 'Jl. Example No. 123', 'Kategori': 'Supplier' },
        { 'Kode': 'SUP-002', 'Nama': 'PT Supplier Example 2', 'Kontak': 'Jane Smith', 'NPWP': '02.345.678.9-012.000', 'Email': 'jane@example.com', 'Telepon': '021-87654321', 'Alamat': 'Jl. Example No. 456', 'Kategori': 'Supplier' },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const fileName = `Suppliers_Template.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Template downloaded! Silakan isi data sesuai format dan import kembali.`, 'Success');
    } catch (error: any) {
      showAlert(`Error downloading template: ${error.message}`, 'Error');
    }
  };

  const handleImportExcel = () => {
    // Show preview dialog dengan contoh header sebelum browse file
    const exampleHeaders = ['Kode', 'Nama', 'Kontak', 'NPWP', 'Email', 'Telepon', 'Alamat', 'Kategori'];
    const exampleData = [
      { 'Kode': 'SUP-001', 'Nama': 'PT Supplier Example 1', 'Kontak': 'John Doe', 'NPWP': '01.234.567.8-901.000', 'Email': 'john@example.com', 'Telepon': '021-12345678', 'Alamat': 'Jl. Example No. 123', 'Kategori': 'Supplier' },
      { 'Kode': 'SUP-002', 'Nama': 'PT Supplier Example 2', 'Kontak': 'Jane Smith', 'NPWP': '02.345.678.9-012.000', 'Email': 'jane@example.com', 'Telepon': '021-87654321', 'Alamat': 'Jl. Example No. 456', 'Kategori': 'Supplier' },
    ];
    
    const showPreviewDialog = () => {
      showConfirm(
        `📋 Format Excel untuk Import Suppliers\n\nPastikan file Excel Anda memiliki header berikut:\n\n${exampleHeaders.join(' | ')}\n\nContoh data:\n${exampleData.map((row, idx) => `${idx + 1}. ${exampleHeaders.map(h => String(row[h as keyof typeof row] || '')).join(' | ')}`).join('\n')}\n\n⚠️ Catatan:\n- Header harus ada di baris pertama\n- Kode dan Nama wajib diisi\n- Header bisa menggunakan variasi: Kode/Code, Nama/Name, Kontak/Contact, dll\n\nKlik "Download Template" untuk mendapatkan file Excel template, atau "Lanjutkan" untuk memilih file Excel yang sudah Anda siapkan.`,
        () => {
          closeDialog();
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx,.xls,.csv';
          input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          showAlert('Excel file is empty or has no data', 'Information');
          return;
        }

        const mapColumn = (row: any, possibleNames: string[]): string => {
          for (const name of possibleNames) {
            const keys = Object.keys(row);
            const found = keys.find(k => k.toLowerCase() === name.toLowerCase());
            if (found && row[found]) return String(row[found]).trim();
          }
          return '';
        };

        const newSuppliers: Supplier[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          try {
            const kode = mapColumn(row, ['Kode', 'KODE', 'Code', 'CODE', 'Supplier Code', 'supplier_code']);
            const nama = mapColumn(row, ['Nama', 'NAMA', 'Name', 'NAME', 'Supplier Name', 'supplier_name']);
            const kontak = mapColumn(row, ['Kontak', 'KONTAK', 'Contact', 'CONTACT', 'Contact Person', 'contact_person']);
            const npwp = mapColumn(row, ['NPWP', 'npwp', 'Tax ID', 'tax_id']);
            const email = mapColumn(row, ['Email', 'EMAIL', 'email']);
            const telepon = mapColumn(row, ['Telepon', 'TELEPON', 'Phone', 'PHONE', 'Telp', 'TELP']);
            const alamat = mapColumn(row, ['Alamat', 'ALAMAT', 'Address', 'ADDRESS']);
            const kategori = mapColumn(row, ['Kategori', 'KATEGORI', 'Category', 'CATEGORY']);

            if (!kode && !nama) return;

            if (!kode || !nama) {
              errors.push(`Row ${index + 2}: Kode and Nama are required`);
              return;
            }

            const existingIndex = suppliers.findIndex(s => s.kode.toLowerCase() === kode.toLowerCase());

            if (existingIndex >= 0) {
              const existing = suppliers[existingIndex];
              newSuppliers.push({
                ...existing,
                kode,
                nama,
                kontak: kontak || existing.kontak || '',
                npwp: npwp || existing.npwp || '',
                email: email || existing.email || '',
                telepon: telepon || existing.telepon || '',
                alamat: alamat || existing.alamat || '',
                kategori: kategori || existing.kategori || '',
              });
            } else {
              newSuppliers.push({
                id: Date.now().toString() + index,
                no: suppliers.length + newSuppliers.length + 1,
                kode,
                nama,
                kontak: kontak || '',
                npwp: npwp || '',
                email: email || '',
                telepon: telepon || '',
                alamat: alamat || '',
                kategori: kategori || '',
              } as Supplier);
            }
          } catch (error: any) {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
        });

        if (newSuppliers.length === 0) {
          showAlert('No valid data found in Excel file', 'Information');
          return;
        }

        const importSuppliers = async () => {
          try {
            const updatedSuppliers = [...suppliers];
            newSuppliers.forEach(newSupplier => {
              const existingIndex = updatedSuppliers.findIndex(s => s.kode.toLowerCase() === newSupplier.kode.toLowerCase());
              if (existingIndex >= 0) {
                updatedSuppliers[existingIndex] = newSupplier;
              } else {
                updatedSuppliers.push(newSupplier);
              }
            });

            const renumbered = updatedSuppliers.map((s, idx) => ({ ...s, no: idx + 1 }));
            await storageService.set(StorageKeys.GENERAL_TRADING.SUPPLIERS, renumbered);
            setSuppliers(renumbered);

            if (errors.length > 0) {
              showAlert(`Imported ${newSuppliers.length} suppliers, but ${errors.length} errors occurred.\n\nFirst few errors:\n${errors.slice(0, 5).join('\n')}`, 'Import Completed');
            } else {
              showAlert(`✅ Successfully imported ${newSuppliers.length} suppliers`, 'Success');
            }
          } catch (error: any) {
            showAlert(`Error importing suppliers: ${error.message}`, 'Error');
          }
        };

        showConfirm(
          `Import ${newSuppliers.length} suppliers from Excel?${errors.length > 0 ? `\n\n${errors.length} errors occurred.` : ''}`,
          importSuppliers,
          undefined,
          'Confirm Import'
        );
      } catch (error: any) {
        showAlert(`Error importing Excel: ${error.message}\n\nMake sure the file is a valid Excel file (.xlsx or .xls)`, 'Error');
      }
          };
          input.click();
        }
      );
    };
    
    showPreviewDialog();
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredSuppliers.map(supplier => ({
        'No': supplier.no,
        'Kode': supplier.kode,
        'Nama': supplier.nama,
        'Kontak': supplier.kontak || '',
        'NPWP': supplier.npwp || '',
        'Email': supplier.email || '',
        'Telepon': supplier.telepon || '',
        'Alamat': supplier.alamat || '',
        'Kategori': supplier.kategori || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
      
      const fileName = `Suppliers_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} suppliers to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const filteredSuppliers = useMemo(() => {
    // Ensure suppliers is always an array and filter deleted items
    const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
    const activeSuppliers = filterActiveItems(suppliersArray);
    
    // Filter by search query
    let filtered = activeSuppliers.filter(supplier => {
      if (!supplier) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (supplier.kode || '').toLowerCase().includes(query) ||
        (supplier.nama || '').toLowerCase().includes(query) ||
        (supplier.kontak || '').toLowerCase().includes(query) ||
        (supplier.email || '').toLowerCase().includes(query) ||
        (supplier.telepon || '').toLowerCase().includes(query) ||
        (supplier.alamat || '').toLowerCase().includes(query) ||
        (supplier.npwp || '').toLowerCase().includes(query) ||
        (supplier.kategori || '').toLowerCase().includes(query)
      );
    });
    
    // Sort by completeness (paling lengkap di atas), then by kode
    const sorted = filtered.sort((a, b) => {
      // Count filled fields untuk setiap supplier
      const countFields = (supplier: Supplier): number => {
        let count = 0;
        const fields = ['kode', 'nama', 'kontak', 'npwp', 'email', 'telepon', 'alamat', 'kategori'];
        fields.forEach(field => {
          const value = supplier[field as keyof Supplier];
          if (value && value !== '-' && String(value).trim() !== '') {
            count++;
          }
        });
        return count;
      };
      
      const completenessA = countFields(a);
      const completenessB = countFields(b);
      
      // Sort by completeness descending (paling lengkap di atas)
      if (completenessA !== completenessB) {
        return completenessB - completenessA;
      }
      
      // If same completeness, sort by kode naturally
      const kodeA = a.kode || '';
      const kodeB = b.kode || '';
      
      const parseKode = (kode: string) => {
        const match = kode.match(/^([A-Z]+)-?(\d+)$/i);
        if (match) {
          return {
            prefix: match[1].toUpperCase(),
            number: parseInt(match[2], 10)
          };
        }
        return { prefix: kode.toUpperCase(), number: 0 };
      };
      
      const parsedA = parseKode(kodeA);
      const parsedB = parseKode(kodeB);
      
      if (parsedA.prefix !== parsedB.prefix) {
        return parsedA.prefix.localeCompare(parsedB.prefix);
      }
      
      return parsedA.number - parsedB.number;
    });
    
    // CRITICAL: Re-number after sorting untuk memastikan No urut 1, 2, 3, dst
    return sorted.map((supplier, index) => ({
      ...supplier,
      no: index + 1
    }));
  }, [suppliers, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fixed columns - show all fields
  const columns = useMemo(() => {
      return [
      { key: 'no', header: 'No' },
      { key: 'kode', header: 'Kode' },
      { key: 'nama', header: 'Company Name' },
      { key: 'kontak', header: 'PIC Name' },
      { key: 'telepon', header: 'Phone' },
      { key: 'email', header: 'Email' },
      { key: 'alamat', header: 'Address' },
      { key: 'npwp', header: 'NPWP' },
      { key: 'kategori', header: 'Kategori' },
      {
        key: 'actions',
        header: 'Actions',
        render: (item: Supplier) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => handleEdit(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>
              Edit
            </Button>
            <Button variant="danger" onClick={() => handleDelete(item)} style={{ fontSize: '11px', padding: '4px 8px' }}>
              Delete
            </Button>
          </div>
        ),
      },
    ];
  }, [suppliers]);

  return (
    <div className="master-compact">
      <div className="page-header">
        <h1>Master Suppliers</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
          <Button variant="primary" onClick={handleImportExcel}>📤 Import Excel</Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Supplier'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? "Edit Supplier" : "Add New Supplier"} className="mb-4">
          <Input
            label="Kode (Auto-generated)"
            value={editingItem ? (formData.kode || '') : ''}
            onChange={(v) => {
              // Hanya bisa edit saat edit mode
              if (editingItem) {
                setFormData({ ...formData, kode: v });
              }
            }}
            placeholder={editingItem ? "Edit kode" : "Auto-generated saat save"}
            disabled={!editingItem} // Disabled saat create, bisa edit saat edit
          />
          <Input
            label="PIC Name"
            value={formData.kontak || ''}
            onChange={(v) => setFormData({ ...formData, kontak: v })}
          />
          <Input
            label="Company Name"
            value={formData.nama || ''}
            onChange={(v) => setFormData({ ...formData, nama: v })}
          />
          <Input
            label="PIC Title"
            value={formData.kategori || ''}
            onChange={(v) => setFormData({ ...formData, kategori: v })}
          />
          <Input
            label="Phone"
            value={formData.telepon || ''}
            onChange={(v) => setFormData({ ...formData, telepon: v })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(v) => setFormData({ ...formData, email: v })}
          />
          <Input
            label="Address"
            value={formData.alamat || ''}
            onChange={(v) => setFormData({ ...formData, alamat: v })}
          />
          <Input
            label="NPWP"
            value={formData.npwp || ''}
            onChange={(v) => setFormData({ ...formData, npwp: v })}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>
            Documents: NIB, KTP, NPWP, Others (upload functionality)
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ kode: '', nama: '', kontak: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '' }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Kode, Nama, Kontak, Email, Telepon, Alamat, Kategori..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <Table columns={columns} data={paginatedSuppliers} emptyMessage={searchQuery ? "No suppliers found matching your search" : "No suppliers data"} />
        
        {/* Pagination Controls */}
        {(totalPages > 1 || filteredSuppliers.length > 0) && (
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
              Showing {startIndex + 1}-{Math.min(endIndex, filteredSuppliers.length)} of {filteredSuppliers.length} suppliers
              {searchQuery && ` (filtered from ${suppliers.length} total)`}
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
            <div style={{ marginLeft: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Page {currentPage} of {totalPages}
            </div>
        </div>
      )}
          </div>
        )}
      </Card>
      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />

    </div>
  );
};

export default Suppliers;
