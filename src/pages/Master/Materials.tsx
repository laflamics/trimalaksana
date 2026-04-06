import { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService, StorageKeys } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { deletePackagingItem, reloadPackagingData } from '../../utils/packaging-delete-helper';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../hooks/useToast';
import * as XLSX from 'xlsx';
import '../../styles/common.css';
import '../../styles/toast.css';
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
  const { t } = useLanguage();
  const { showToast, ToastContainer } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Material | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [supplierInputValue, setSupplierInputValue] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const itemsPerPage = 15;

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

  // Debounce search - 300ms
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  useEffect(() => {
    loadMaterials();
    loadSuppliers();
  }, []);

  const loadMaterials = async () => {
    const dataRaw = await storageService.get<Material[]>('materials') || [];
    const data = filterActiveItems(dataRaw);
    const sorted = data.sort((a, b) => {
      const kodeA = (a.kode || '').toUpperCase();
      const kodeB = (b.kode || '').toUpperCase();
      return kodeA.localeCompare(kodeB, undefined, { numeric: true, sensitivity: 'base' });
    });
    setMaterials(sorted.map((m, idx) => ({ ...m, no: idx + 1 })));
  };

  const loadSuppliers = async () => {
    const data = await storageService.get<Supplier[]>('suppliers') || [];
    setSuppliers(data);
  };

  // Optimized supplier filter - limit to 50 items
  const filteredSuppliers = useMemo(() => {
    if (!supplierInputValue) return suppliers.slice(0, 50);
    const query = supplierInputValue.toLowerCase();
    return suppliers
      .filter(s => {
        const code = (s.kode || '').toLowerCase();
        const name = (s.nama || '').toLowerCase();
        return code.includes(query) || name.includes(query);
      })
      .slice(0, 50);
  }, [supplierInputValue, suppliers]);

  // Optimized search filter with debounce
  const filteredMaterials = useMemo(() => {
    const materialsArray = Array.isArray(materials) ? materials : [];
    if (!debouncedSearch) return materialsArray;
    
    const query = debouncedSearch.toLowerCase();
    return materialsArray.filter(material => {
      if (!material) return false;
      return (
        (material.kode || '').toLowerCase().includes(query) ||
        (material.nama || '').toLowerCase().includes(query) ||
        (material.kategori || '').toLowerCase().includes(query) ||
        (material.supplier || '').toLowerCase().includes(query) ||
        (material.satuan || '').toLowerCase().includes(query)
      );
    });
  }, [materials, debouncedSearch]);

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMaterials = filteredMaterials.slice(startIndex, endIndex);

  const handleSave = async () => {
    try {
      let updated: Material[];
      if (editingItem) {
        updated = materials.map(m =>
          m.id === editingItem.id
            ? { ...formData, id: editingItem.id, no: editingItem.no, lastUpdate: new Date().toISOString(), userUpdate: 'System', ipAddress: '127.0.0.1' } as Material
            : m
        );
      } else {
        const newMaterial: Material = {
          id: Date.now().toString(),
          no: materials.length + 1,
          lastUpdate: new Date().toISOString(),
          userUpdate: 'System',
          ipAddress: '127.0.0.1',
          ...formData,
        } as Material;
        updated = [...materials, newMaterial];
      }
      const sorted = updated.sort((a, b) => {
        const kodeA = (a.kode || '').toUpperCase();
        const kodeB = (b.kode || '').toUpperCase();
        return kodeA.localeCompare(kodeB, undefined, { numeric: true, sensitivity: 'base' });
      });
      await storageService.set(StorageKeys.PACKAGING.MATERIALS, sorted);
      setMaterials(sorted.map((m, idx) => ({ ...m, no: idx + 1 })));
      resetForm();
      showToast(`Material "${formData.nama}" ${editingItem ? 'updated' : 'added'}`, 'success');
    } catch (error: any) {
      showToast(`Error saving material: ${error.message}`, 'error');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setSupplierInputValue('');
    setFormData({ kode: '', nama: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', supplier: '', priceMtr: 0 });
  };

  const handleEdit = (item: Material) => {
    setEditingItem(item);
    const supplier = suppliers.find(s => s.nama === item.supplier);
    setSupplierInputValue(supplier ? `${supplier.kode} - ${supplier.nama}` : item.supplier || '');
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Material) => {
    if (!item.id) {
      showToast(`Material "${item.nama}" tidak memiliki ID. Tidak bisa dihapus.`, 'error');
      return;
    }

    const confirmed = window.confirm(
      `Delete Material: ${item.nama}?\n\n⚠️ Data akan dihapus dengan aman.\n\nTindakan ini tidak bisa dibatalkan.`
    );

    if (!confirmed) return;

    try {
      const deleteResult = await deletePackagingItem('materials', item.id, 'id');
      if (deleteResult.success) {
        await reloadPackagingData('materials', setMaterials);
        const currentMaterials = await storageService.get<Material[]>('materials') || [];
        const activeMaterials = filterActiveItems(currentMaterials);
        const sorted = activeMaterials.sort((a, b) => {
          const kodeA = (a.kode || '').toUpperCase();
          const kodeB = (b.kode || '').toUpperCase();
          return kodeA.localeCompare(kodeB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setMaterials(sorted.map((m, idx) => ({ ...m, no: idx + 1 })));
        showToast(`Material "${item.nama}" deleted`, 'success');
      } else {
        showToast(`Error deleting material "${item.nama}": ${deleteResult.error || 'Unknown error'}`, 'error');
      }
    } catch (error: any) {
      showToast(`Error deleting material: ${error.message}`, 'error');
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        { 'Kode': 'MTR-001', 'Nama': 'Material Example 1', 'Satuan': 'KG', 'Kategori': 'Material', 'Supplier': 'Supplier A', 'Stock Aman': '100', 'Stock Minimum': '50', 'Price MTR': '25000' },
        { 'Kode': 'MTR-002', 'Nama': 'Material Example 2', 'Satuan': 'PCS', 'Kategori': 'Material', 'Supplier': 'Supplier B', 'Stock Aman': '200', 'Stock Minimum': '100', 'Price MTR': '35000' },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, `Materials_Template.xlsx`);
      showToast(`Template downloaded!`, 'success');
    } catch (error: any) {
      showToast(`Error downloading template: ${error.message}`, 'error');
    }
  };

  const handleImportExcel = () => {
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

        const newMaterials: Material[] = [];
        jsonData.forEach((row, index) => {
          const kode = mapColumn(row, ['Kode', 'Code', 'SKU']);
          const nama = mapColumn(row, ['Nama', 'Name']);
          const satuan = mapColumn(row, ['Satuan', 'Unit', 'UOM']);
          const kategori = mapColumn(row, ['Kategori', 'Category']);
          const supplier = mapColumn(row, ['Supplier']);
          const stockAman = parseFloat(mapColumn(row, ['Stock Aman', 'Safe Stock'])) || 0;
          const stockMinimum = parseFloat(mapColumn(row, ['Stock Minimum', 'Min Stock'])) || 0;
          const priceMtr = parseFloat(mapColumn(row, ['Price MTR', 'Price'])) || 0;

          if (!kode || !nama) return;

          const existingIndex = materials.findIndex(m => m.kode.toLowerCase() === kode.toLowerCase());
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
        });

        if (newMaterials.length === 0) {
          showToast('No valid data found in Excel file', 'error');
          return;
        }

        const confirmed = window.confirm(
          `Import ${newMaterials.length} materials from Excel?`
        );

        if (!confirmed) return;

        const updatedMaterials = [...materials];
        newMaterials.forEach(newMaterial => {
          const existingIndex = updatedMaterials.findIndex(m => m.kode.toLowerCase() === newMaterial.kode.toLowerCase());
          if (existingIndex >= 0) {
            updatedMaterials[existingIndex] = newMaterial;
          } else {
            updatedMaterials.push(newMaterial);
          }
        });

        const sorted = updatedMaterials.sort((a, b) => {
          const kodeA = (a.kode || '').toUpperCase();
          const kodeB = (b.kode || '').toUpperCase();
          return kodeA.localeCompare(kodeB, undefined, { numeric: true, sensitivity: 'base' });
        });
        const renumbered = sorted.map((m, idx) => ({ ...m, no: idx + 1 }));
        await storageService.set(StorageKeys.PACKAGING.MATERIALS, renumbered);
        setMaterials(renumbered);
        showToast(`Successfully imported ${newMaterials.length} materials`, 'success');
      } catch (error: any) {
        showToast(`Error importing Excel: ${error.message}`, 'error');
      }
    };
    input.click();
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
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Materials');
      const fileName = `Materials_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`Exported ${dataToExport.length} materials`, 'success');
    } catch (error: any) {
      showToast(`Error exporting to Excel: ${error.message}`, 'error');
    }
  };

  // Optimized columns - no findIndex, use index directly
  const columns = useMemo(() => [
    { 
      key: 'no', 
      header: t('common.number') || 'No',
      width: '50px',
      render: (item: Material) => {
        const idx = paginatedMaterials.indexOf(item);
        return idx >= 0 ? startIndex + idx + 1 : '';
      },
    },
    { key: 'kode', header: t('master.materialCode') || 'Kode (SKU/ID)' },
    { key: 'nama', header: t('master.materialName') || 'Nama' },
    { key: 'satuan', header: t('master.unit') || 'Satuan' },
    { key: 'kategori', header: t('master.category') || 'Kategori' },
    { key: 'supplier', header: t('master.supplierName') || 'Supplier' },
    { 
      key: 'priceMtr', 
      header: t('master.price') || 'Harga',
      render: (item: Material) => {
        const harga = item.priceMtr || item.harga || 0;
        return harga > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(harga) : '-';
      },
    },
    {
      key: 'actions',
      header: t('common.actions') || 'Actions',
      render: (item: Material) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={() => handleEdit(item)}>{t('common.edit') || 'Edit'}</Button>
          <Button variant="danger" onClick={() => handleDelete(item)}>{t('common.delete') || 'Delete'}</Button>
        </div>
      ),
    },
  ], [t, startIndex, paginatedMaterials]);

  return (
    <div className="master-compact">
      <ToastContainer />
      <div className="page-header">
        <h1>Master Material</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
          <Button variant="primary" onClick={handleImportExcel}>📤 Import Excel</Button>
          <Button onClick={() => { setFormData({ kode: '', nama: '', satuan: '', stockAman: 0, stockMinimum: 0, kategori: '', supplier: '', priceMtr: 0 }); setEditingItem(null); setSupplierInputValue(''); setShowForm(true); }}>
            + Tambah Material
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="dialog-overlay" onClick={resetForm} style={{ zIndex: 10000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', width: '90%', maxHeight: '90vh', overflowY: 'auto', zIndex: 10001, borderRadius: '10px' }}>
            {/* Header dengan Gradient */}
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '14px 18px', borderRadius: '10px 10px 0 0', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                {editingItem ? '✏️ Edit Material' : '➕ Tambah Material'}
              </h2>
            </div>

            {/* Form Content */}
            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '0 0 10px 10px' }}>
              {/* Basic Information Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>📋 Informasi Dasar</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input label="Kode (SKU/ID)" value={formData.kode || ''} onChange={(v) => setFormData({ ...formData, kode: v })} placeholder="MTR-001" />
                  <Input label="Nama" value={formData.nama || ''} onChange={(v) => setFormData({ ...formData, nama: v })} placeholder="Nama material" />
                  <Input label="Satuan" value={formData.satuan || ''} onChange={(v) => setFormData({ ...formData, satuan: v })} placeholder="KG/PCS" />
                  <Input label="Kategori" value={formData.kategori || ''} onChange={(v) => setFormData({ ...formData, kategori: v })} placeholder="Material" />
                </div>
              </div>

              {/* Stock Information Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>📦 Stok</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input label="Stock Aman" type="number" value={String(formData.stockAman || 0)} onChange={(v) => setFormData({ ...formData, stockAman: parseInt(v) || 0 })} placeholder="0" />
                  <Input label="Stock Minimum" type="number" value={String(formData.stockMinimum || 0)} onChange={(v) => setFormData({ ...formData, stockMinimum: parseInt(v) || 0 })} placeholder="0" />
                </div>
              </div>

              {/* Pricing & Supplier Section */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>💰 Harga & Supplier</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input label="Harga Satuan" type="number" value={String(formData.priceMtr || 0)} onChange={(v) => setFormData({ ...formData, priceMtr: parseInt(v) || 0 })} placeholder="0" />
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '4px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '12px' }}>Supplier</label>
                    <input
                      type="text"
                      value={supplierInputValue}
                      onChange={(e) => setSupplierInputValue(e.target.value)}
                      onFocus={() => setShowSupplierDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                      placeholder="Cari supplier..."
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '12px', transition: 'all 0.2s' }}
                    />
                    {showSupplierDropdown && filteredSuppliers.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 10002, maxHeight: '180px', overflowY: 'auto', marginTop: '2px' }}>
                        {filteredSuppliers.map(s => (
                          <div key={s.id} onClick={() => { setSupplierInputValue(`${s.kode} - ${s.nama}`); setFormData({ ...formData, supplier: s.nama }); setShowSupplierDropdown(false); }} style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '11px', transition: 'background 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                            <div style={{ fontWeight: '500' }}>{s.kode}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{s.nama}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <Button onClick={resetForm} variant="secondary" style={{ minWidth: '80px', padding: '6px 12px', fontSize: '12px' }}>
                  Batal
                </Button>
                <Button onClick={handleSave} variant="primary" style={{ minWidth: '80px', padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  {editingItem ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Kode, Nama, Kategori, Supplier, Satuan..."
            style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit', width: '100%' }}
          />
        </div>
        <Table columns={columns} data={paginatedMaterials} showPagination={false} emptyMessage={searchQuery ? "Tidak ada material yang cocok" : "Tidak ada data material"} />
        
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredMaterials.length)} of {filteredMaterials.length}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button variant="secondary" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
              <Button variant="secondary" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Prev</Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return (
                  <Button key={pageNum} variant={currentPage === pageNum ? 'primary' : 'secondary'} onClick={() => setCurrentPage(pageNum)} style={{ minWidth: '40px' }}>
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="secondary" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</Button>
              <Button variant="secondary" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>Last</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Materials;
