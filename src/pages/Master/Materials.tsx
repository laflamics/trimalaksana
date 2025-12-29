import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService } from '../../services/storage';
import * as XLSX from 'xlsx';
import '../../styles/common.css';
import './Master.css';

interface Material {
  id: string;
  no: number;
  kode: string;
  nama: string;
  satuan: string;
  stockAman: number;
  stockMinimum: number;
  kategori: string;
  supplier: string;
  lastUpdate: string;
  userUpdate: string;
  ipAddress?: string;
  harga?: number;
  priceMtr?: number;
}

interface Supplier {
  id: string;
  kode: string;
  nama: string;
}

const Materials = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Material | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [supplierInputValue, setSupplierInputValue] = useState('');
  const [stockAmanInputValue, setStockAmanInputValue] = useState('');
  const [stockMinimumInputValue, setStockMinimumInputValue] = useState('');
  const [priceInputValue, setPriceInputValue] = useState('');

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
  
  // Format date function - format: dd/mm/yyyy hh:mm:ss
  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return '-';
    }
  };
  
  const [formData, setFormData] = useState<Partial<Material>>({
    kode: '',
    nama: '',
    satuan: '',
    stockAman: 0,
    stockMinimum: 0,
    kategori: '',
    supplier: '',
    priceMtr: 0,
  });

  useEffect(() => {
    loadMaterials();
    loadSuppliers();
  }, []);

  const loadMaterials = async () => {
    const data = await storageService.get<Material[]>('materials') || [];
    setMaterials(data.map((m, idx) => ({ ...m, no: idx + 1 })));
  };

  const loadSuppliers = async () => {
    const data = await storageService.get<Supplier[]>('suppliers') || [];
    setSuppliers(data);
  };

  // Helper function untuk remove leading zero dari input angka
  const removeLeadingZero = (value: string): string => {
    if (!value) return value;
    // Jika hanya "0", "0.", atau "0," biarkan
    if (value === '0' || value === '0.' || value === '0,') {
      return value;
    }
    // Hapus semua leading zero kecuali untuk "0." atau "0,"
    if (value.startsWith('0') && value.length > 1) {
      // Jika dimulai dengan "0." atau "0," biarkan
      if (value.startsWith('0.') || value.startsWith('0,')) {
        return value;
      }
      // Hapus semua leading zero
      const cleaned = value.replace(/^0+/, '');
      return cleaned || '0';
    }
    return value;
  };

  const getSupplierInputDisplayValue = () => {
    if (supplierInputValue !== undefined && supplierInputValue !== '') {
      return supplierInputValue;
    }
    if (formData.supplier) {
      const supplier = suppliers.find(s => s.nama === formData.supplier);
      if (supplier) {
        return `${supplier.kode} - ${supplier.nama}`;
      }
      return formData.supplier;
    }
    return '';
  };

  const handleSupplierInputChange = (text: string) => {
    setSupplierInputValue(text);
    if (!text) {
      setFormData({ ...formData, supplier: '' });
      return;
    }
    const normalized = text.toLowerCase();
    const matchedSupplier = suppliers.find(s => {
      const label = `${s.kode || ''}${s.kode ? ' - ' : ''}${s.nama || ''}`.toLowerCase();
      const code = (s.kode || '').toLowerCase();
      const name = (s.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedSupplier) {
      setFormData({ ...formData, supplier: matchedSupplier.nama });
    } else {
      setFormData({ ...formData, supplier: text });
    }
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        const updated = materials.map(m =>
          m.id === editingItem.id
            ? { ...formData, id: editingItem.id, no: editingItem.no, lastUpdate: new Date().toISOString(), userUpdate: 'System', ipAddress: '127.0.0.1' } as Material
            : m
        );
        await storageService.set('materials', updated);
        setMaterials(updated.map((m, idx) => ({ ...m, no: idx + 1 })));
      } else {
        const newMaterial: Material = {
          id: Date.now().toString(),
          no: materials.length + 1,
          lastUpdate: new Date().toISOString(),
          userUpdate: 'System',
          ipAddress: '127.0.0.1',
          ...formData,
        } as Material;
        const updated = [...materials, newMaterial];
        await storageService.set('materials', updated);
        setMaterials(updated.map((m, idx) => ({ ...m, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
      setSupplierInputValue('');
      setStockAmanInputValue('');
      setStockMinimumInputValue('');
      setPriceInputValue('');
      setFormData({ kode: '', nama: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', supplier: '', priceMtr: 0 });
    } catch (error: any) {
      showAlert(`Error saving material: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: Material) => {
    setEditingItem(item);
    const supplier = suppliers.find(s => s.nama === item.supplier);
    if (supplier) {
      setSupplierInputValue(`${supplier.kode} - ${supplier.nama}`);
    } else {
      setSupplierInputValue(item.supplier || '');
    }
    setStockAmanInputValue('');
    setStockMinimumInputValue('');
    setPriceInputValue('');
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Material) => {
    showConfirm(
      `Are you sure you want to delete material "${item.nama}"? This action cannot be undone.`,
      async () => {
        try {
          const updated = materials.filter(m => m.id !== item.id);
          await storageService.set('materials', updated);
          setMaterials(updated.map((m, idx) => ({ ...m, no: idx + 1 })));
        } catch (error: any) {
          showAlert(`Error deleting material: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Delete'
    );
  };

  // Download Template Excel
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { 'Kode': 'MTR-001', 'Nama': 'Material Example 1', 'Satuan': 'KG', 'Kategori': 'Material', 'Supplier': 'Supplier A', 'Stock Aman': '100', 'Stock Minimum': '50', 'Price MTR': '25000' },
        { 'Kode': 'MTR-002', 'Nama': 'Material Example 2', 'Satuan': 'PCS', 'Kategori': 'Material', 'Supplier': 'Supplier B', 'Stock Aman': '200', 'Stock Minimum': '100', 'Price MTR': '35000' },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const fileName = `Materials_Template.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Template downloaded! Silakan isi data sesuai format dan import kembali.`, 'Success');
    } catch (error: any) {
      showAlert(`Error downloading template: ${error.message}`, 'Error');
    }
  };

  const handleImportExcel = () => {
    // Show preview dialog dengan contoh header sebelum browse file
    const exampleHeaders = ['Kode', 'Nama', 'Satuan', 'Kategori', 'Supplier', 'Stock Aman', 'Stock Minimum', 'Price MTR'];
    const exampleData = [
      { 'Kode': 'MTR-001', 'Nama': 'Material Example 1', 'Satuan': 'KG', 'Kategori': 'Material', 'Supplier': 'Supplier A', 'Stock Aman': '100', 'Stock Minimum': '50', 'Price MTR': '25000' },
      { 'Kode': 'MTR-002', 'Nama': 'Material Example 2', 'Satuan': 'PCS', 'Kategori': 'Material', 'Supplier': 'Supplier B', 'Stock Aman': '200', 'Stock Minimum': '100', 'Price MTR': '35000' },
    ];
    
    const showPreviewDialog = () => {
      showConfirm(
        `📋 Format Excel untuk Import Materials\n\nPastikan file Excel Anda memiliki header berikut:\n\n${exampleHeaders.join(' | ')}\n\nContoh data:\n${exampleData.map((row, idx) => `${idx + 1}. ${exampleHeaders.map(h => String(row[h as keyof typeof row] || '')).join(' | ')}`).join('\n')}\n\n⚠️ Catatan:\n- Header harus ada di baris pertama\n- Kode dan Nama wajib diisi\n- Header bisa menggunakan variasi: Kode/Code/SKU, Nama/Name, Satuan/Unit/UOM, dll\n\nKlik "Download Template" untuk mendapatkan file Excel template, atau "Lanjutkan" untuk memilih file Excel yang sudah Anda siapkan.`,
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

        const newMaterials: Material[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          try {
            const kode = mapColumn(row, ['Kode', 'KODE', 'Code', 'CODE', 'SKU', 'sku', 'Material Code', 'material_code']);
            const nama = mapColumn(row, ['Nama', 'NAMA', 'Name', 'NAME', 'Material Name', 'material_name']);
            const satuan = mapColumn(row, ['Satuan', 'SATUAN', 'Unit', 'UNIT', 'UOM', 'uom']);
            const kategori = mapColumn(row, ['Kategori', 'KATEGORI', 'Category', 'CATEGORY']);
            const supplier = mapColumn(row, ['Supplier', 'SUPPLIER', 'Supplier Name', 'supplier_name']);
            const stockAmanStr = mapColumn(row, ['Stock Aman', 'STOCK AMAN', 'Safe Stock', 'safe_stock']);
            const stockMinimumStr = mapColumn(row, ['Stock Minimum', 'STOCK MINIMUM', 'Min Stock', 'min_stock']);
            const priceMtrStr = mapColumn(row, ['Price MTR', 'PRICE MTR', 'Price', 'PRICE', 'Material Price', 'material_price']);

            if (!kode && !nama) return;

            if (!kode || !nama) {
              errors.push(`Row ${index + 2}: Kode and Nama are required`);
              return;
            }

            const existingIndex = materials.findIndex(m => m.kode.toLowerCase() === kode.toLowerCase());
            const stockAman = parseFloat(stockAmanStr) || 0;
            const stockMinimum = parseFloat(stockMinimumStr) || 0;
            const priceMtr = parseFloat(priceMtrStr) || 0;

            if (existingIndex >= 0) {
              const existing = materials[existingIndex];
              newMaterials.push({
                ...existing,
                kode,
                nama,
                satuan: satuan || existing.satuan || 'PCS',
                kategori: kategori || existing.kategori || '',
                supplier: supplier || existing.supplier || '',
                stockAman,
                stockMinimum,
                priceMtr,
                lastUpdate: new Date().toISOString(),
                userUpdate: 'System',
                ipAddress: '127.0.0.1',
              });
            } else {
              newMaterials.push({
                id: Date.now().toString() + index,
                no: materials.length + newMaterials.length + 1,
                kode,
                nama,
                satuan: satuan || 'PCS',
                kategori: kategori || '',
                supplier: supplier || '',
                stockAman,
                stockMinimum,
                priceMtr,
                lastUpdate: new Date().toISOString(),
                userUpdate: 'System',
                ipAddress: '127.0.0.1',
              } as Material);
            }
          } catch (error: any) {
            errors.push(`Row ${index + 2}: ${error.message}`);
          }
        });

        if (newMaterials.length === 0) {
          showAlert('No valid data found in Excel file', 'Error');
          return;
        }

        const importMaterials = async () => {
          const updatedMaterials = [...materials];
          newMaterials.forEach(newMaterial => {
            const existingIndex = updatedMaterials.findIndex(m => m.kode.toLowerCase() === newMaterial.kode.toLowerCase());
            if (existingIndex >= 0) {
              updatedMaterials[existingIndex] = newMaterial;
            } else {
              updatedMaterials.push(newMaterial);
            }
          });

          const renumbered = updatedMaterials.map((m, idx) => ({ ...m, no: idx + 1 }));
          await storageService.set('materials', renumbered);
          setMaterials(renumbered);

          if (errors.length > 0) {
            showAlert(`Imported ${newMaterials.length} materials, but ${errors.length} errors occurred.\n\nFirst few errors:\n${errors.slice(0, 5).join('\n')}`, 'Import Completed');
          } else {
            showAlert(`✅ Successfully imported ${newMaterials.length} materials`, 'Success');
          }
        };

        showConfirm(
          `Import ${newMaterials.length} materials from Excel?${errors.length > 0 ? `\n\n${errors.length} errors occurred.` : ''}`,
          importMaterials,
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
      const dataToExport = filteredMaterials.map((material) => ({
        'No': material.no,
        'Kode': material.kode,
        'Nama': material.nama,
        'Satuan': material.satuan,
        'Kategori': material.kategori,
        'Supplier': material.supplier || '',
        'Stock Aman': material.stockAman || 0,
        'Stock Minimum': material.stockMinimum || 0,
        'Price MTR': material.priceMtr || 0,
        'Last Update': material.lastUpdate ? new Date(material.lastUpdate).toLocaleString('id-ID') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Materials');
      
      const fileName = `Materials_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} materials to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const filteredMaterials = useMemo(() => {
    // Ensure materials is always an array
    const materialsArray = Array.isArray(materials) ? materials : [];
    return materialsArray.filter(material => {
      if (!material) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (material.kode || '').toLowerCase().includes(query) ||
        (material.nama || '').toLowerCase().includes(query) ||
        (material.kategori || '').toLowerCase().includes(query) ||
        (material.supplier || '').toLowerCase().includes(query) ||
        (material.satuan || '').toLowerCase().includes(query)
      );
    });
  }, [materials, searchQuery]);

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMaterials = filteredMaterials.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const columns = [
    { 
      key: 'no', 
      header: 'No',
      render: (item: Material) => {
        const index = paginatedMaterials.findIndex(m => m.id === item.id);
        return index >= 0 ? startIndex + index + 1 : '';
      },
    },
    { key: 'kode', header: 'Kode (SKU/ID)' },
    { key: 'nama', header: 'Nama' },
    { key: 'satuan', header: 'Satuan (Unit)' },
    { key: 'kategori', header: 'Kategori' },
    { key: 'supplier', header: 'Supplier' },
    { 
      key: 'lastUpdate', 
      header: 'Last Update',
      render: (item: Material) => formatDateTime(item.lastUpdate)
    },
    { key: 'userUpdate', header: 'User Update' },
    { 
      key: 'priceMtr', 
      header: 'Price Satuan',
      render: (item: Material) => {
        const harga = item.priceMtr || item.harga || 0;
        return harga > 0 ? new Intl.NumberFormat('id-ID', { 
          style: 'currency', 
          currency: 'IDR',
          minimumFractionDigits: 0 
        }).format(harga) : '-';
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: Material) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => handleEdit(item)}>Edit</Button>
          <Button variant="danger" onClick={() => handleDelete(item)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="master-compact">
      <div className="page-header">
        <h1>Master Materials</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
          <Button variant="primary" onClick={handleImportExcel}>📤 Import Excel</Button>
          <Button onClick={() => { 
            if (showForm) {
              setSupplierInputValue('');
              setStockAmanInputValue('');
              setStockMinimumInputValue('');
              setPriceInputValue('');
              setFormData({ kode: '', nama: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', supplier: '', priceMtr: 0 });
              setEditingItem(null);
            }
            setShowForm(!showForm);
          }}>
            {showForm ? 'Cancel' : '+ Add Material'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? "Edit Material" : "Add New Material"} className="mb-4">
          <Input
            label="Kode (SKU/ID)"
            value={formData.kode || ''}
            onChange={(v) => setFormData({ ...formData, kode: v })}
          />
          <Input
            label="Nama"
            value={formData.nama || ''}
            onChange={(v) => setFormData({ ...formData, nama: v })}
          />
          <Input
            label="Satuan (Unit)"
            value={formData.satuan || ''}
            onChange={(v) => setFormData({ ...formData, satuan: v })}
          />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Stock Aman
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={stockAmanInputValue !== undefined && stockAmanInputValue !== '' ? stockAmanInputValue : (formData.stockAman !== undefined && formData.stockAman !== null && formData.stockAman !== 0 ? String(formData.stockAman) : '')}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.stockAman;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setStockAmanInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.stockAman;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setStockAmanInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setStockAmanInputValue(cleaned);
                setFormData({ ...formData, stockAman: cleaned === '' ? 0 : Number(cleaned) || 0 });
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({ ...formData, stockAman: 0 });
                  setStockAmanInputValue('');
                } else {
                  setFormData({ ...formData, stockAman: Number(val) });
                  setStockAmanInputValue('');
                }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setStockAmanInputValue(newVal);
                  input.value = newVal;
                  setFormData({ ...formData, stockAman: Number(newVal) });
                }
              }}
              placeholder="0"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Stock Minimum
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={stockMinimumInputValue !== undefined && stockMinimumInputValue !== '' ? stockMinimumInputValue : (formData.stockMinimum !== undefined && formData.stockMinimum !== null && formData.stockMinimum !== 0 ? String(formData.stockMinimum) : '')}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.stockMinimum;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setStockMinimumInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.stockMinimum;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setStockMinimumInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setStockMinimumInputValue(cleaned);
                setFormData({ ...formData, stockMinimum: cleaned === '' ? 0 : Number(cleaned) || 0 });
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({ ...formData, stockMinimum: 0 });
                  setStockMinimumInputValue('');
                } else {
                  setFormData({ ...formData, stockMinimum: Number(val) });
                  setStockMinimumInputValue('');
                }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setStockMinimumInputValue(newVal);
                  input.value = newVal;
                  setFormData({ ...formData, stockMinimum: Number(newVal) });
                }
              }}
              placeholder="0"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
          </div>
          <Input
            label="Kategori"
            value={formData.kategori || ''}
            onChange={(v) => setFormData({ ...formData, kategori: v })}
          />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Supplier
            </label>
            <input
              type="text"
              list={`supplier-list-${editingItem?.id || 'new'}`}
              value={getSupplierInputDisplayValue()}
              onChange={(e) => {
                handleSupplierInputChange(e.target.value);
              }}
              onBlur={(e) => {
                const value = e.target.value;
                const matchedSupplier = suppliers.find(s => {
                  const label = `${s.kode || ''}${s.kode ? ' - ' : ''}${s.nama || ''}`;
                  return label === value;
                });
                if (matchedSupplier) {
                  setFormData({ ...formData, supplier: matchedSupplier.nama });
                }
              }}
              placeholder="-- Pilih Supplier --"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
            <datalist id={`supplier-list-${editingItem?.id || 'new'}`}>
              {suppliers.map(s => (
                <option key={s.id} value={`${s.kode} - ${s.nama}`}>
                  {s.kode} - {s.nama}
                </option>
              ))}
            </datalist>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Price Satuan
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={priceInputValue !== undefined && priceInputValue !== '' ? priceInputValue : (formData.priceMtr || formData.harga ? String(formData.priceMtr || formData.harga || 0) : '')}
              onFocus={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.priceMtr || formData.harga || 0;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setPriceInputValue('');
                  input.value = '';
                } else {
                  input.select();
                }
              }}
              onMouseDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = formData.priceMtr || formData.harga || 0;
                if (currentVal === 0 || currentVal === null || currentVal === undefined || String(currentVal) === '0') {
                  setPriceInputValue('');
                  input.value = '';
                }
              }}
              onChange={(e) => {
                let val = e.target.value;
                val = val.replace(/[^\d.,]/g, '');
                const cleaned = removeLeadingZero(val);
                setPriceInputValue(cleaned);
                setFormData({ ...formData, priceMtr: cleaned === '' ? 0 : Number(cleaned) || 0 });
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
                  setFormData({ ...formData, priceMtr: 0 });
                  setPriceInputValue('');
                } else {
                  setFormData({ ...formData, priceMtr: Number(val) });
                  setPriceInputValue('');
                }
              }}
              onKeyDown={(e) => {
                const input = e.target as HTMLInputElement;
                const currentVal = input.value;
                if ((currentVal === '' || currentVal === '0') && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  const newVal = e.key;
                  setPriceInputValue(newVal);
                  input.value = newVal;
                  setFormData({ ...formData, priceMtr: Number(newVal) });
                }
              }}
              placeholder="0"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setSupplierInputValue(''); setStockAmanInputValue(''); setStockMinimumInputValue(''); setPriceInputValue(''); setFormData({ kode: '', nama: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', supplier: '', priceMtr: 0 }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Material' : 'Save Material'}
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
            placeholder="Search by Kode, Nama, Kategori, Supplier, Satuan..."
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
        <Table columns={columns} data={paginatedMaterials} emptyMessage={searchQuery ? "No materials found matching your search" : "No materials data"} />
        
        {/* Pagination Controls */}
        {(totalPages > 1 || filteredMaterials.length > 0) && (
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
              Showing {startIndex + 1}-{Math.min(endIndex, filteredMaterials.length)} of {filteredMaterials.length} materials
              {searchQuery && ` (filtered from ${materials.length} total)`}
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
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
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

export default Materials;
