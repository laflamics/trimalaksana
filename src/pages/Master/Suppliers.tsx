import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService, StorageKeys } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { deletePackagingItem, reloadPackagingData } from '../../utils/packaging-delete-helper';
import { useLanguage } from '../../hooks/useLanguage';
import { useDialog } from '../../hooks/useDialog';
import { useToast } from '../../hooks/useToast';
import BlobService from '../../services/blob-service';
import * as XLSX from 'xlsx';
import '../../styles/common.css';
import '../../styles/toast.css';
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
  documents?: string[]; // Array of document URLs/fileIds
}

const Suppliers = () => {
  const { t } = useLanguage();
  const { showToast, ToastContainer } = useToast();
  const { showAlert, showConfirm, closeDialog, DialogComponent } = useDialog();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
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
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [viewingDocuments, setViewingDocuments] = useState<{ name: string; docs: string[] } | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const dataRaw = await storageService.get<Supplier[]>('suppliers') || [];
    
    // Filter out deleted items menggunakan helper function
    const data = filterActiveItems(dataRaw);
    
    // CRITICAL: Remove duplicates by kode before setting state
    const seen = new Set<string>();
    const uniqueData: Supplier[] = [];
    
    data.forEach(supplier => {
      if (supplier && supplier.kode) {
        const key = supplier.kode.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueData.push(supplier);
        }
      }
    });
    
    const numberedData = uniqueData.map((s, idx) => ({ ...s, no: idx + 1 }));
    
    setSuppliers(numberedData);
    
    // Save cleaned data back to storage if duplicates were removed
    if (uniqueData.length < data.length) {
      await storageService.set(StorageKeys.PACKAGING.SUPPLIERS, numberedData);
    }
  };

  const handleSave = async () => {
    try {
      // Validasi: Kode wajib diisi
      if (!formData.kode || formData.kode.trim() === '') {
        showToast('Kode wajib diisi!', 'error');
        return;
      }
      
      // Validasi: Kode harus unique (kecuali saat edit item yang sama)
      const existingSupplier = suppliers.find(s => 
        s.kode === formData.kode && 
        (!editingItem || s.id !== editingItem.id)
      );
      if (existingSupplier) {
        showToast(`Kode "${formData.kode}" sudah digunakan oleh supplier lain!`, 'error');
        return;
      }
      
      if (editingItem) {
        const updated = suppliers.map(s =>
          s.id === editingItem.id
            ? { ...formData, id: editingItem.id, no: editingItem.no } as Supplier
            : s
        );
        await storageService.set(StorageKeys.PACKAGING.SUPPLIERS, updated);
        setSuppliers(updated.map((s, idx) => ({ ...s, no: idx + 1 })));
        showToast(`Supplier "${formData.nama}" berhasil diperbarui`, 'success');
      } else {
        const newSupplier: Supplier = {
          id: Date.now().toString(),
          no: suppliers.length + 1,
          ...formData,
          kode: formData.kode.trim(), // Pastikan kode di-trim
        } as Supplier;
        const updated = [...suppliers, newSupplier];
        await storageService.set(StorageKeys.PACKAGING.SUPPLIERS, updated);
        setSuppliers(updated.map((s, idx) => ({ ...s, no: idx + 1 })));
        showToast(`Supplier "${formData.nama}" berhasil ditambahkan`, 'success');
      }
      resetFormState();
    } catch (error: any) {
      showToast(`Error saving supplier: ${error.message}`, 'error');
    }
  };

  const resetFormState = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({ kode: '', nama: '', kontak: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '', documents: [] });
  };

  const handleDocumentUpload = async (file: File) => {
    try {
      // Validate file
      const validation = BlobService.validateFile(file, 50, ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
      if (!validation.valid) {
        showToast(validation.error || 'Invalid file', 'error');
        return;
      }

      // Upload to MinIO/Vercel Blob
      const result = await BlobService.uploadFile(file, 'packaging');
      
      // Store document URL in formData
      const currentDocs = formData.documents || [];
      setFormData({ 
        ...formData, 
        documents: [...currentDocs, result.fileId] 
      });
      
      showToast(`Document "${file.name}" uploaded successfully`, 'success');
    } catch (error: any) {
      showToast(`Error uploading document: ${error.message}`, 'error');
    }
  };

  const handleEdit = (item: Supplier) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Supplier) => {
    try {
      // Validate item.id exists
      if (!item.id) {
        showToast(`Error: Supplier "${item.nama}" tidak memiliki ID`, 'error');
        return;
      }
      
      showConfirm(
        `Hapus Supplier: ${item.nama}?

⚠️ Data akan dihapus dengan aman (tombstone pattern) untuk mencegah auto-sync mengembalikan data.

Tindakan ini tidak bisa dibatalkan.`,
        async () => {
          try {
            // 🚀 FIX: Pakai packaging delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deletePackagingItem('suppliers', item.id, 'id');
            
            if (deleteResult.success) {
              // Reload data dengan helper (handle race condition) - sama seperti SalesOrders
              await reloadPackagingData('suppliers', setSuppliers);
              
              // Re-number suppliers setelah reload
              const currentSuppliers = await storageService.get<Supplier[]>('suppliers') || [];
              const activeSuppliers = filterActiveItems(currentSuppliers);
              setSuppliers(activeSuppliers.map((s, idx) => ({ ...s, no: idx + 1 })));
              
              showToast(`Supplier "${item.nama}" berhasil dihapus`, 'success');
            } else {
              showToast(`Error deleting supplier: ${deleteResult.error || 'Unknown error'}`, 'error');
            }
          } catch (error: any) {
            showToast(`Error deleting supplier: ${error.message}`, 'error');
          }
        },
        () => {
          // Delete cancelled
        },
        'Konfirmasi Hapus'
      );
    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
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
      showToast(`Template downloaded`, 'success');
    } catch (error: any) {
      showToast(`Error downloading template: ${error.message}`, 'error');
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
        `📋 Format Excel untuk Import Suppliers\n\nPastikan file Excel Anda memiliki header berikut:\n\n${exampleHeaders.join(' | ')}\n\nContoh data:\n${exampleData.map((row, idx) => `${idx + 1}. ${exampleHeaders.map(h => String(row[h as keyof typeof row] || '')).join(' | ')}`).join('\n')}\n\n⚠️ Catatan:\n- Header harus ada di baris pertama\n- Kode dan Nama wajib diisi\n- Header bisa menggunakan variasi: Kode/Code, Nama/Name, Kontak/Contact, dll`,
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
          showToast('Excel file is empty or has no data', 'error');
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
          showToast('No valid data found in Excel file', 'error');
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
          await storageService.set(StorageKeys.PACKAGING.SUPPLIERS, renumbered);
          setSuppliers(renumbered);

          if (errors.length > 0) {
            showToast(`Imported ${newSuppliers.length} suppliers with ${errors.length} errors`, 'warning');
          } else {
            showToast(`Successfully imported ${newSuppliers.length} suppliers`, 'success');
          }
        };

        showConfirm(
          `Import ${newSuppliers.length} suppliers from Excel?${errors.length > 0 ? `\n\n${errors.length} errors occurred.` : ''}`,
          importSuppliers,
          undefined,
          'Confirm Import'
        );
      } catch (error: any) {
        showToast(`Error importing Excel: ${error.message}`, 'error');
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
      showToast(`Exported ${dataToExport.length} suppliers`, 'success');
    } catch (error: any) {
      showToast(`Error exporting to Excel: ${error.message}`, 'error');
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  // Dynamic columns based on filled data (memoized to recalculate when suppliers change)
  const columns = useMemo(() => {
    if (suppliers.length === 0) {
      // Default columns if no data
      return [
        { key: 'no', header: t('common.number') || 'No' },
        { key: 'kode', header: t('master.supplierCode') || 'Kode (ID)' },
        { key: 'nama', header: t('master.supplierName') || 'Nama (Company Name)' },
        { key: 'alamat', header: t('common.address') || 'Alamat (Address)' },
        { key: 'kategori', header: t('master.category') || 'Kategori' },
        {
          key: 'actions',
          header: t('common.actions') || 'Actions',
        render: () => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => showAlert('No data to edit', 'Information')}>{t('common.edit') || 'Edit'}</Button>
            <Button variant="danger" onClick={() => showAlert('No data to delete', 'Information')}>{t('common.delete') || 'Delete'}</Button>
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
      { key: 'kontak' as keyof Supplier, header: t('master.contactPerson') || 'Kontak (PIC Name)', fillPercent: getFillPercentage('kontak') },
      { key: 'npwp' as keyof Supplier, header: t('settings.npwp') || 'NPWP', fillPercent: getFillPercentage('npwp') },
      { key: 'email' as keyof Supplier, header: t('common.email') || 'Email', fillPercent: getFillPercentage('email') },
      { key: 'telepon' as keyof Supplier, header: t('common.phone') || 'Telepon (Phone)', fillPercent: getFillPercentage('telepon') },
    ];

    // Filter: only show columns with >= 50% filled
    // Sort: highest fill percentage first
    const visibleOptionalColumns = optionalColumns
      .filter(col => col.fillPercent >= 50)
      .sort((a, b) => b.fillPercent - a.fillPercent)
      .map(col => ({ key: col.key, header: col.header }));

    // Build final columns: base columns + sorted optional columns + remaining columns
    const baseColumns = [
      { key: 'no', header: t('common.number') || 'No', width: '50px' },
      { key: 'kode', header: t('master.supplierCode') || 'Kode (ID)' },
      { key: 'nama', header: t('master.supplierName') || 'Nama (Company Name)' },
    ];

    // Add optional columns (sorted by fill percentage, highest first)
    baseColumns.push(...visibleOptionalColumns);

    // Add remaining columns
    baseColumns.push(
      { key: 'alamat', header: t('common.address') || 'Alamat (Address)' },
      { key: 'kategori', header: t('master.category') || 'Kategori' },
      {
        key: 'actions',
        header: t('common.actions') || 'Actions',
        render: (item: Supplier) => (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {item.documents && item.documents.length > 0 && (
              <Button 
                variant="secondary" 
                onClick={() => {
                  setViewingDocuments({ name: item.nama, docs: item.documents! });
                  setShowDocumentViewer(true);
                }}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                📄 ({item.documents.length})
              </Button>
            )}
            <Button variant="secondary" onClick={() => handleEdit(item)}>{t('common.edit') || 'Edit'}</Button>
            <Button variant="danger" onClick={() => handleDelete(item)}>{t('common.delete') || 'Delete'}</Button>
          </div>
        ),
      } as any
    );

    return baseColumns;
  }, [suppliers, t]);

  return (
    <div className="master-compact">
      <ToastContainer />
      <DialogComponent />
      
      {/* Document Viewer Modal */}
      {showDocumentViewer && viewingDocuments && (
        <div className="dialog-overlay" onClick={() => setShowDocumentViewer(false)} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001, borderRadius: '10px', background: 'var(--bg-primary)' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px 18px', borderRadius: '10px 10px 0 0', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>📄 Documents - {viewingDocuments.name}</h2>
              <button onClick={() => setShowDocumentViewer(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ padding: '16px' }}>
              {viewingDocuments.docs.map((docId, idx) => {
                const url = BlobService.getDownloadUrl(docId, 'packaging');
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                const isPdf = /\.pdf$/i.test(url);
                
                return (
                  <div key={idx} style={{ marginBottom: '20px', border: '1px solid var(--border)', padding: '12px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                        {isImage ? '📷' : isPdf ? '📄' : '📎'} Document {idx + 1}
                      </h3>
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none', fontSize: '12px', fontWeight: '500' }}>
                        Open in new tab ↗
                      </a>
                    </div>
                    
                    {isImage && (
                      <img src={url} alt={`Document ${idx + 1}`} style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    )}
                    
                    {isPdf && (
                      <iframe src={url} style={{ width: '100%', height: '500px', borderRadius: '4px', border: 'none' }} />
                    )}
                    
                    {!isImage && !isPdf && (
                      <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '12px' }}>
                          File type not supported for preview. <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>Download file</a>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
              <Button onClick={() => setShowDocumentViewer(false)} variant="secondary">Close</Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="page-header">
        <h1>Master Pemasok</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
          <Button variant="primary" onClick={handleImportExcel}>📤 Import Excel</Button>
          <Button onClick={() => {
            setFormData({ kode: '', nama: '', kontak: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '', documents: [] });
            setEditingItem(null);
            setShowForm(true);
          }}>
            + Tambah Pemasok
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="dialog-overlay" onClick={() => resetFormState()} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', width: '90%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001, borderRadius: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px 18px', borderRadius: '10px 10px 0 0', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                {editingItem ? '✏️ Edit Pemasok' : '➕ Tambah Pemasok'}
              </h2>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '0 0 10px 10px' }}>
              {/* Contact Information Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>👤 Contact</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input label="Kode *" value={formData.kode || ''} onChange={(v) => setFormData({ ...formData, kode: v })} placeholder="SUP-001" />
                  <Input label="PIC Name" value={formData.kontak || ''} onChange={(v) => setFormData({ ...formData, kontak: v })} placeholder="John Doe" />
                  <Input label="Company Name" value={formData.nama || ''} onChange={(v) => setFormData({ ...formData, nama: v })} placeholder="PT Example" />
                  <Input label="PIC Title" value={formData.kategori || ''} onChange={(v) => setFormData({ ...formData, kategori: v })} placeholder="Manager" />
                </div>
              </div>

              {/* Communication Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>📞 Communication</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input label="Phone" value={formData.telepon || ''} onChange={(v) => setFormData({ ...formData, telepon: v })} placeholder="021-12345678" />
                  <Input label="Email" type="email" value={formData.email || ''} onChange={(v) => setFormData({ ...formData, email: v })} placeholder="email@example.com" />
                </div>
              </div>

              {/* Address & Tax Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>📍 Address & Tax</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <Input label="Address" value={formData.alamat || ''} onChange={(v) => setFormData({ ...formData, alamat: v })} placeholder="Jl. Example No. 123" />
                  <Input label="NPWP" value={formData.npwp || ''} onChange={(v) => setFormData({ ...formData, npwp: v })} placeholder="01.234.567.8-901.000" />
                </div>
              </div>

              {/* Documents Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>📄 Documents</h3>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                    NIB, KTP, NPWP, Others
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        for (let i = 0; i < files.length; i++) {
                          handleDocumentUpload(files[i]);
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                    id="supplier-documents-input"
                  />
                  <label htmlFor="supplier-documents-input" style={{ display: 'inline-block', padding: '6px 12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '12px', transition: 'transform 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
                    📤 Upload Documents
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button onClick={resetFormState} variant="secondary">
                  Batal
                </Button>
                <Button onClick={handleSave} variant="primary">
                  {editingItem ? 'Update Pemasok' : 'Simpan Pemasok'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
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
        <Table columns={columns} data={paginatedSuppliers} pageSize={10000} showPagination={false} emptyMessage={searchQuery ? "Tidak ada pemasok yang cocok dengan pencarian" : "Tidak ada data pemasok"} />
        
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
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
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
            <Button 
              variant="secondary" 
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
            <div style={{ marginLeft: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Page {currentPage} of {totalPages}
            </div>
            </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Suppliers;
