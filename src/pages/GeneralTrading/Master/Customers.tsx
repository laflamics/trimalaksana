import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import type { Column } from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { safeDeleteItem, filterActiveItems } from '../../../utils/data-persistence-helper';
import { useDialog } from '../../../hooks/useDialog';
import * as XLSX from 'xlsx';
import '../../../styles/common.css';
import '../../../styles/compact.css';
import './Inventory.css';

interface Customer {
  id: string;
  no: number;
  kode: string;
  nama: string;
  kontak: string;
  picTitle?: string;
  npwp: string;
  email: string;
  telepon: string;
  alamat: string;
  kategori: string;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert, showConfirm, closeDialog, DialogComponent } = useDialog();

  const [editingItem, setEditingItem] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [formData, setFormData] = useState<Partial<Customer>>({
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
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await storageService.get<Customer[]>('gt_customers') || [];
    // Filter out deleted items menggunakan helper function
    const activeCustomers = filterActiveItems(data);
    setCustomers(activeCustomers.map((c, idx) => ({ ...c, no: idx + 1 })));
  };

  // Auto generate kode customer: CUST-001, CUST-002, dst
  const generateCustomerCode = (existingCustomers: Customer[]): string => {
    const prefix = 'CUST';
    const existingCodes = existingCustomers
      .map(c => c.kode)
      .filter(k => k && k.startsWith(prefix))
      .map(k => {
        const match = k.match(/^CUST-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        // Update existing
        const updated = customers.map(c =>
          c.id === editingItem.id
            ? { 
                ...formData, 
                id: editingItem.id, 
                no: editingItem.no,
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now(),
                _timestamp: Date.now()
              } as Customer
            : c
        );
        await storageService.set('gt_customers', updated);
        setCustomers(updated.map((c, idx) => ({ ...c, no: idx + 1 })));
      } else {
        // Manual add: selalu auto generate kode (ignore kode yang diisi manual)
        const autoKode = generateCustomerCode(customers);
        
        // Create new
        const newCustomer: Customer = {
          id: Date.now().toString(),
          no: customers.length + 1,
          lastUpdate: new Date().toISOString(),
          timestamp: Date.now(),
          _timestamp: Date.now(),
          ...formData,
          kode: autoKode,
        } as Customer;
        const updated = [...customers, newCustomer];
        await storageService.set('gt_customers', updated);
        setCustomers(updated.map((c, idx) => ({ ...c, no: idx + 1 })));
      }
      setShowForm(false);
      setEditingItem(null);
            setFormData({ kode: '', nama: '', kontak: '', picTitle: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '' });
    } catch (error: any) {
      showAlert(`Error saving customer: ${error.message}`, 'Error');
    }
  };

  const handleEdit = (item: Customer) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  };

  const handleDelete = async (item: Customer) => {
    showConfirm(
      `Are you sure you want to delete customer "${item.nama}"? This action cannot be undone.`,
      async () => {
        try {
          // Pakai helper function untuk safe delete (tombstone pattern)
          const success = await safeDeleteItem('gt_customers', item.id, 'id');
          
          if (success) {
            // Reload data dengan filter active items
            const updatedCustomers = await storageService.get<Customer[]>('gt_customers') || [];
            const activeCustomers = filterActiveItems(updatedCustomers);
            setCustomers(activeCustomers.map((c, idx) => ({ ...c, no: idx + 1 })));
            showAlert(`Customer "${item.nama}" deleted successfully`, 'Success');
          } else {
            showAlert(`Error deleting customer. Silakan coba lagi.`, 'Error');
          }
        } catch (error: any) {
          showAlert(`Error deleting customer: ${error.message}`, 'Error');
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
        { 'Kode': 'CUST-001', 'Nama': 'PT Customer Example 1', 'Kontak': 'John Doe', 'NPWP': '01.234.567.8-901.000', 'Email': 'john@example.com', 'Telepon': '021-12345678', 'Alamat': 'Jl. Example No. 123', 'Kategori': 'Customer' },
        { 'Kode': 'CUST-002', 'Nama': 'PT Customer Example 2', 'Kontak': 'Jane Smith', 'NPWP': '02.345.678.9-012.000', 'Email': 'jane@example.com', 'Telepon': '021-87654321', 'Alamat': 'Jl. Example No. 456', 'Kategori': 'Customer' },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const fileName = `Customers_Template.xlsx`;
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
      { 'Kode': 'CUST-001', 'Nama': 'PT Customer Example 1', 'Kontak': 'John Doe', 'NPWP': '01.234.567.8-901.000', 'Email': 'john@example.com', 'Telepon': '021-12345678', 'Alamat': 'Jl. Example No. 123', 'Kategori': 'Customer' },
      { 'Kode': 'CUST-002', 'Nama': 'PT Customer Example 2', 'Kontak': 'Jane Smith', 'NPWP': '02.345.678.9-012.000', 'Email': 'jane@example.com', 'Telepon': '021-87654321', 'Alamat': 'Jl. Example No. 456', 'Kategori': 'Customer' },
    ];
    
    const showPreviewDialog = () => {
      showConfirm(
        `📋 Format Excel untuk Import Customers\n\nPastikan file Excel Anda memiliki header berikut:\n\n${exampleHeaders.join(' | ')}\n\nContoh data:\n${exampleData.map((row, idx) => `${idx + 1}. ${exampleHeaders.map(h => String(row[h as keyof typeof row] || '')).join(' | ')}`).join('\n')}\n\n⚠️ Catatan:\n- Header harus ada di baris pertama\n- Kode dan Nama wajib diisi\n- Header bisa menggunakan variasi: Kode/Code, Nama/Name, Kontak/Contact, dll\n\nKlik "Download Template" untuk mendapatkan file Excel template, atau "Lanjutkan" untuk memilih file Excel yang sudah Anda siapkan.`,
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

              const newCustomers: Customer[] = [];
              const errors: string[] = [];

              jsonData.forEach((row, index) => {
                try {
                  const kode = mapColumn(row, ['Kode', 'KODE', 'Code', 'CODE', 'Customer Code', 'customer_code']);
                  const nama = mapColumn(row, ['Nama', 'NAMA', 'Name', 'NAME', 'Customer Name', 'customer_name']);
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

                  const existingIndex = customers.findIndex(c => c.kode.toLowerCase() === kode.toLowerCase());

                  if (existingIndex >= 0) {
                    const existing = customers[existingIndex];
                    newCustomers.push({
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
                    newCustomers.push({
                      id: Date.now().toString() + index,
                      no: customers.length + newCustomers.length + 1,
                      kode,
                      nama,
                      kontak: kontak || '',
                      npwp: npwp || '',
                      email: email || '',
                      telepon: telepon || '',
                      alamat: alamat || '',
                      kategori: kategori || '',
                    } as Customer);
                  }
                } catch (error: any) {
                  errors.push(`Row ${index + 2}: ${error.message}`);
                }
              });

              if (newCustomers.length === 0) {
                showAlert('No valid data found in Excel file', 'Information');
                return;
              }

              const importCustomers = async () => {
                try {
                  const updatedCustomers = [...customers];
                  newCustomers.forEach(newCustomer => {
                    const existingIndex = updatedCustomers.findIndex(c => c.kode.toLowerCase() === newCustomer.kode.toLowerCase());
                    if (existingIndex >= 0) {
                      updatedCustomers[existingIndex] = newCustomer;
                    } else {
                      updatedCustomers.push(newCustomer);
                    }
                  });

                  const renumbered = updatedCustomers.map((c, idx) => ({ ...c, no: idx + 1 }));
                  await storageService.set('gt_customers', renumbered);
                  setCustomers(renumbered);

                  if (errors.length > 0) {
                    showAlert(`Imported ${newCustomers.length} customers, but ${errors.length} errors occurred.\n\nFirst few errors:\n${errors.slice(0, 5).join('\n')}`, 'Import Completed');
                  } else {
                    showAlert(`✅ Successfully imported ${newCustomers.length} customers`, 'Success');
                  }
                } catch (error: any) {
                  showAlert(`Error importing customers: ${error.message}`, 'Error');
                }
              };

              showConfirm(
                `Import ${newCustomers.length} customers from Excel?${errors.length > 0 ? `\n\n${errors.length} errors occurred.` : ''}`,
                importCustomers,
                undefined,
                'Confirm Import'
              );
            } catch (error: any) {
              showAlert(`Error importing Excel: ${error.message}\n\nMake sure the file is a valid Excel file (.xlsx or .xls)`, 'Error');
            }
          };
          input.click();
        },
        () => closeDialog(),
        'Format Excel Preview'
      );
    };
    
    showPreviewDialog();
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredCustomers.map(customer => ({
        'No': customer.no,
        'Kode': customer.kode,
        'PIC Name': customer.kontak || '',
        'Company Name': customer.nama,
        'PIC Title': customer.picTitle || '',
        'Phone': customer.telepon || '',
        'Email': customer.email || '',
        'Address': customer.alamat || '',
        'NPWP': customer.npwp || '',
        'Kategori': customer.kategori || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      
      const fileName = `Customers_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} customers to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const filteredCustomers = useMemo(() => {
    // Ensure customers is always an array and filter deleted items
    const customersArray = Array.isArray(customers) ? customers : [];
    const activeCustomers = filterActiveItems(customersArray);
    
    // Filter by search query
    let filtered = activeCustomers.filter(customer => {
      if (!customer) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (customer.kode || '').toLowerCase().includes(query) ||
        (customer.nama || '').toLowerCase().includes(query) ||
        (customer.kontak || '').toLowerCase().includes(query) ||
        (customer.picTitle || '').toLowerCase().includes(query) ||
        (customer.email || '').toLowerCase().includes(query) ||
        (customer.telepon || '').toLowerCase().includes(query) ||
        (customer.alamat || '').toLowerCase().includes(query) ||
        (customer.npwp || '').toLowerCase().includes(query) ||
        (customer.kategori || '').toLowerCase().includes(query)
      );
    });
    
    // Sort by completeness (most complete first)
    // Count filled fields: kode, nama, kontak, picTitle, npwp, email, telepon, alamat
    filtered.sort((a, b) => {
      const countFields = (c: Customer) => {
        let count = 0;
        if (c.kode && c.kode.trim()) count++;
        if (c.nama && c.nama.trim()) count++;
        if (c.kontak && c.kontak.trim()) count++;
        if (c.picTitle && c.picTitle.trim()) count++;
        if (c.npwp && c.npwp.trim()) count++;
        if (c.email && c.email.trim()) count++;
        if (c.telepon && c.telepon.trim()) count++;
        if (c.alamat && c.alamat.trim()) count++;
        return count;
      };
      return countFields(b) - countFields(a);
    });
    
    return filtered;
  }, [customers, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fixed columns - show all fields
  const columns = useMemo((): Column<Customer>[] => {
      return [
      { key: 'no', header: 'No' },
      { key: 'kode', header: 'Kode' },
      { key: 'nama', header: 'Company Name' },
      { key: 'kontak', header: 'PIC Name' },
      { key: 'picTitle', header: 'PIC Title' },
      { key: 'telepon', header: 'Phone' },
      { key: 'email', header: 'Email' },
      { key: 'alamat', header: 'Address' },
      { key: 'npwp', header: 'NPWP' },
      { key: 'kategori', header: 'Kategori' },
      {
        key: 'actions',
        header: 'Actions',
        render: (item: Customer) => (
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
  }, [customers]);

  return (
    <div className="master-compact">
      <div className="page-header">
        <h1>Master Customers</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
          <Button variant="secondary" onClick={handleDownloadTemplate}>📋 Download Template</Button>
          <Button variant="primary" onClick={handleImportExcel}>📤 Import Excel</Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Customer'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card title={editingItem ? "Edit Customer" : "Add New Customer"} className="mb-4">
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
            value={formData.picTitle || ''}
            onChange={(v) => setFormData({ ...formData, picTitle: v })}
          />
          <Input
            label="Kategori"
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
            Documents: NIB, KTP, Others (upload functionality)
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ kode: '', nama: '', kontak: '', npwp: '', email: '', telepon: '', alamat: '', kategori: '' }); }} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {editingItem ? 'Update Customer' : 'Save Customer'}
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
        <Table columns={columns} data={paginatedCustomers} emptyMessage={searchQuery ? "No customers found matching your search" : "No customers data"} />
        
        {/* Pagination Controls */}
        {(totalPages > 1 || filteredCustomers.length > 0) && (
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
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} customers
              {searchQuery && ` (filtered from ${customers.length} total)`}
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

export default Customers;
