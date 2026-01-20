import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { deletePackagingItem, reloadPackagingData } from '../../utils/packaging-delete-helper';
import * as XLSX from 'xlsx';
import '../../styles/common.css';
import './Master.css';

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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: null,
    title: '',
    message: '',
  });

  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: null,
      title: '',
      message: '',
    });
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    console.log('[Suppliers] Loading suppliers...');
    const dataRaw = await storageService.get<Supplier[]>('suppliers') || [];
    console.log('[Suppliers] Raw data length:', dataRaw.length);
    
    // Filter out deleted items menggunakan helper function
    const data = filterActiveItems(dataRaw);
    console.log('[Suppliers] Filtered data length:', data.length);
    
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
          console.log('[Suppliers] Removed duplicate:', supplier.kode, '-', supplier.nama);
        }
      }
    });
    
    console.log('[Suppliers] Unique data length:', uniqueData.length);
    
    const numberedData = uniqueData.map((s, idx) => ({ ...s, no: idx + 1 }));
    console.log('[Suppliers] Final data length:', numberedData.length);
    
    setSuppliers(numberedData);
    
    // Save cleaned data back to storage if duplicates were removed
    if (uniqueData.length < data.length) {
      console.log('[Suppliers] Saving cleaned data to storage...');
      await storageService.set('suppliers', numberedData);
    }
  };

  const handleSave = async () => {
    try {
      // Validasi: Kode wajib diisi
      if (!formData.kode || formData.kode.trim() === '') {
        showAlert('Validation Error', 'Kode wajib diisi!');
        return;
      }
      
      // Validasi: Kode harus unique (kecuali saat edit item yang sama)
      const existingSupplier = suppliers.find(s => 
        s.kode === formData.kode && 
        (!editingItem || s.id !== editingItem.id)
      );
      if (existingSupplier) {
        showAlert('Validation Error', `Kode "${formData.kode}" sudah digunakan oleh supplier lain!`);
        return;
      }
      
      if (editingItem) {
        const updated = suppliers.map(s =>
          s.id === editingItem.id
            ? { ...formData, id: editingItem.id, no: editingItem.no } as Supplier
            : s
        );
        await storageService.set('suppliers', updated);
        setSuppliers(updated.map((s, idx) => ({ ...s, no: idx + 1 })));
      } else {
        const newSupplier: Supplier = {
          id: Date.now().toString(),
          no: suppliers.length + 1,
          ...formData,
          kode: formData.kode.trim(), // Pastikan kode di-trim
        } as Supplier;
        const updated = [...suppliers, newSupplier];
        await storageService.set('suppliers', updated);
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
      console.log('[Suppliers] handleDelete called for:', item.nama, item.id);
      
      // Validate item.id exists
      if (!item.id) {
        console.error('[Suppliers] Item missing ID:', item);
        showAlert(`❌ Error: Supplier "${item.nama}" tidak memiliki ID. Tidak bisa dihapus.`, 'Error');
        return;
      }
      
      showConfirm(
        `Hapus Supplier: ${item.nama}?\n\n⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.\n\nTindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            console.log('[Suppliers] Delete confirmed for:', item.nama, item.id);
            
            // 🚀 FIX: Pakai packaging delete helper untuk konsistensi dan sync yang benar
            console.log('[Suppliers] Calling deletePackagingItem...');
            const deleteResult = await deletePackagingItem('suppliers', item.id, 'id');
            console.log('[Suppliers] Delete result:', deleteResult);
            
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition) - sama seperti SalesOrders
              console.log('[Suppliers] Reloading data...');
              await reloadPackagingData('suppliers', setSuppliers);
              
              // Re-number suppliers setelah reload
              const currentSuppliers = await storageService.get<Supplier[]>('suppliers') || [];
              const activeSuppliers = filterActiveItems(currentSuppliers);
              setSuppliers(activeSuppliers.map((s, idx) => ({ ...s, no: idx + 1 })));
              
              showAlert(`✅ Supplier "${item.nama}" berhasil dihapus dengan aman.\n\n🛡️ Data dilindungi dari auto-sync restoration.`, 'Success');
            } else {
              console.error('[Suppliers] Delete failed:', deleteResult.error);
              showAlert(`❌ Error deleting supplier "${item.nama}": ${deleteResult.error || 'Unknown error'}`, 'Error');
            }
          } catch (error: any) {
            console.error('[Suppliers] Error in delete:', error);
            showAlert(`❌ Error deleting supplier: ${error.message}`, 'Error');
          }
        },
        () => {
          console.log('[Suppliers] Delete cancelled');
        },
        'Safe Delete Confirmation'
      );
    } catch (error: any) {
      console.error('[Suppliers] Error in handleDelete:', error);
      showAlert(`❌ Error: ${error.message}`, 'Error');
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
          showAlert('Excel file is empty or has no data', 'Error');
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
          showAlert('No valid data found in Excel file', 'Error');
          return;
        }

        const importSuppliers = async () => {
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
          await storageService.set('suppliers', renumbered);
          setSuppliers(renumbered);

          if (errors.length > 0) {
            showAlert(`Imported ${newSuppliers.length} suppliers, but ${errors.length} errors occurred.\n\nFirst few errors:\n${errors.slice(0, 5).join('\n')}`, 'Import Completed');
          } else {
            showAlert(`✅ Successfully imported ${newSuppliers.length} suppliers`, 'Success');
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
    // Ensure suppliers is always an array
    const suppliersArray = Array.isArray(suppliers) ? suppliers : [];
    let filtered = suppliersArray.filter(supplier => {
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
        (supplier.kategori || '').toLowerCase().includes(query)
      );
    });
    
    // Sort berdasarkan kode ID secara natural (SPL-0001, SPL-0002, CTM-068, dst)
    const sorted = filtered.sort((a, b) => {
      const kodeA = a.kode || '';
      const kodeB = b.kode || '';
      
      // Natural sort untuk kode dengan format PREFIX-NUMBER
      // Contoh: SPL-0001, SPL-0002, CTM-068, dll
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
      
      // Sort by prefix first, then by number
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

  // Dynamic columns based on filled data (memoized to recalculate when suppliers change)
  const columns = useMemo(() => {
    if (suppliers.length === 0) {
      // Default columns if no data
      return [
        { key: 'no', header: 'No' },
        { key: 'kode', header: 'Kode (ID)' },
        { key: 'nama', header: 'Nama (Company Name)' },
        { key: 'alamat', header: 'Alamat (Address)' },
        { key: 'kategori', header: 'Kategori' },
        {
          key: 'actions',
          header: 'Actions',
        render: () => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => showAlert('No data to edit', 'Information')}>Edit</Button>
            <Button variant="danger" onClick={() => showAlert('No data to delete', 'Information')}>Delete</Button>
          </div>
        ),
        },
      ];
    }

    // Calculate fill percentage for each column
    const getFillPercentage = (key: keyof Supplier): number => {
      const filledCount = suppliers.filter(s => {
        const value = s[key];
        return value && value.toString().trim() !== '' && value.toString().trim() !== '-';
      }).length;
      return (filledCount / suppliers.length) * 100;
    };

    // Define optional columns with their fill percentages
    const optionalColumns = [
      { key: 'kontak' as keyof Supplier, header: 'Kontak (PIC Name)', fillPercent: getFillPercentage('kontak') },
      { key: 'npwp' as keyof Supplier, header: 'NPWP', fillPercent: getFillPercentage('npwp') },
      { key: 'email' as keyof Supplier, header: 'Email', fillPercent: getFillPercentage('email') },
      { key: 'telepon' as keyof Supplier, header: 'Telepon (Phone)', fillPercent: getFillPercentage('telepon') },
    ];

    // Filter: only show columns with >= 50% filled
    // Sort: highest fill percentage first
    const visibleOptionalColumns = optionalColumns
      .filter(col => col.fillPercent >= 50)
      .sort((a, b) => b.fillPercent - a.fillPercent)
      .map(col => ({ key: col.key, header: col.header }));

    // Build final columns: base columns + sorted optional columns + remaining columns
    const baseColumns = [
      { key: 'no', header: 'No' },
      { key: 'kode', header: 'Kode (ID)' },
      { key: 'nama', header: 'Nama (Company Name)' },
    ];

    // Add optional columns (sorted by fill percentage, highest first)
    baseColumns.push(...visibleOptionalColumns);

    // Add remaining columns
    baseColumns.push(
      { key: 'alamat', header: 'Alamat (Address)' },
      { key: 'kategori', header: 'Kategori' },
      {
        key: 'actions',
        header: 'Actions',
        render: (item: Supplier) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => handleEdit(item)}>Edit</Button>
            <Button variant="danger" onClick={() => handleDelete(item)}>Delete</Button>
          </div>
        ),
      } as any
    );

    return baseColumns;
  }, [suppliers]);

  return (
    <div className="master-compact">
      <div className="page-header">
        <h1>Master Suppliers</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
          <Button variant="primary" onClick={handleImportExcel}>📤 Import Excel</Button>
          <Button onClick={() => {
            setFormData({ kode: '', nama: '', kontak: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '' });
            setEditingItem(null);
            setShowForm(true);
          }}>
            + Add Supplier
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="dialog-overlay" onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ kode: '', nama: '', kontak: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '' }); }} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001 }}>
            <Card title={editingItem ? "Edit Supplier" : "Add New Supplier"} className="dialog-card">
          <Input
            label="Kode *"
            value={formData.kode || ''}
            onChange={(v) => setFormData({ ...formData, kode: v })}
            placeholder="Masukkan kode supplier (contoh: SUP-001)"
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
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ kode: '', nama: '', kontak: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '' }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </div>
        </Card>
          </div>
        </div>
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
        <Table columns={columns} data={filteredSuppliers} emptyMessage={searchQuery ? "No suppliers found matching your search" : "No suppliers data"} />
      </Card>

      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>{dialogState.title}</h2>
                <Button variant="secondary" onClick={closeDialog} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <p style={{ marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{dialogState.message}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {dialogState.type === 'confirm' && dialogState.title && dialogState.title.includes('Format Excel') && (
                  <Button variant="secondary" onClick={() => {
                    handleDownloadTemplate();
                    closeDialog();
                  }} style={{ marginRight: 'auto' }}>
                    📥 Download Template
                  </Button>
                )}
                {dialogState.type === 'confirm' && (
                  <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (dialogState.onConfirm) dialogState.onConfirm();
                    closeDialog();
                  }}
                >
                  {dialogState.type === 'confirm' ? 'Confirm' : 'OK'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
