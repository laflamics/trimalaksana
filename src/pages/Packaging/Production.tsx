import { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Table from '../../components/Table';
import DateRangeFilter from '../../components/DateRangeFilter';
import { storageService, extractStorageValue, StorageKeys } from '../../services/storage';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import '../../styles/common.css';
import '../../styles/compact.css';
import './ProductionDaily.css';

interface SPKItem {
  id: string;
  spkNo: string;
  soNo: string;
  productId: string;
  product_id?: string;
  productCode: string;
  kode?: string;
  productName: string;
  product?: string;
  targetQty: number;
  qty?: number;
  unit: string;
  customer?: string;
  status: string;
  notes?: string;
  created?: string;
  progress?: number;
  stockFulfilled?: boolean;
}

interface ProductionDailyItem {
  id: string;
  spkNo: string;
  soNo?: string;
  productCode: string;
  productName: string;
  targetQty: number;
  unit: string;
  customer?: string;
  wipCutting: number;
  wipSlitter: number;
  wipDieCut: number;
  wipCentralRotary: number;
  wipLongWay: number;
  wipSablon: number;
  wipStitching: number;
  resultFinishGood: number;
  approvedBy: string;
  checkedBy: string;
  noted: string;
  productionDate: string;
  shift: string;
  createdAt: string;
  createdBy: string;
}

const ProductionDaily = () => {
  const [spkList, setSpkList] = useState<SPKItem[]>([]);
  const [productionDailyList, setProductionDailyList] = useState<ProductionDailyItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [spkSearchQuery, setSpkSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    spkNo: '',
    productCode: '',
    productName: '',
    targetQty: '',
    unit: '',
    wipCutting: '',
    wipSlitter: '',
    wipDieCut: '',
    wipCentralRotary: '',
    wipLongWay: '',
    wipSablon: '',
    wipStitching: '',
    resultFinishGood: '',
    approvedBy: '',
    checkedBy: '',
    noted: '',
    productionDate: new Date().toISOString().split('T')[0],
    shift: '1',
  });

  useEffect(() => {
    loadSPKData();
    loadProductionDailyData();
  }, [dateFrom, dateTo, searchQuery]);

  const loadSPKData = async () => {
    try {
      const spkRaw = extractStorageValue(await storageService.get<any[]>(StorageKeys.PACKAGING.SPK));
      const spk = filterActiveItems(Array.isArray(spkRaw) ? spkRaw : []);
      const activeSPK = spk.filter((s: any) => 
        s.status !== 'CLOSE' && s.status !== 'VOID' && s.status !== 'CANCELLED'
      );
      setSpkList(activeSPK);
    } catch (error) {
      console.error('Error loading SPK data:', error);
    }
  };

  const loadProductionDailyData = async () => {
    try {
      const prodDailyRaw = extractStorageValue(await storageService.get<any[]>('productionDaily'));
      const prodDaily = filterActiveItems(Array.isArray(prodDailyRaw) ? prodDailyRaw : []);
      
      // Filter by date range
      let filtered = prodDaily;
      if (dateFrom || dateTo) {
        filtered = prodDaily.filter((p: any) => {
          if (!p.createdAt) return false;
          const itemDate = new Date(p.createdAt);
          const fromDate = dateFrom ? new Date(dateFrom) : null;
          const toDate = dateTo ? new Date(dateTo) : null;
          
          if (fromDate && itemDate < fromDate) return false;
          if (toDate) {
            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (itemDate > endOfDay) return false;
          }
          return true;
        });
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((p: any) =>
          p.spkNo?.toLowerCase().includes(query) ||
          p.productCode?.toLowerCase().includes(query) ||
          p.productName?.toLowerCase().includes(query)
        );
      }
      
      setProductionDailyList(filtered);
    } catch (error) {
      console.error('Error loading production daily data:', error);
    }
  };

  const handleSelectSPK = (spk: SPKItem) => {
    const productCode = spk.kode || spk.productCode || '';
    const productName = spk.product || spk.productName || '';
    const targetQty = spk.qty || spk.targetQty || 0;
    
    setFormData({
      spkNo: spk.spkNo,
      productCode: productCode,
      productName: productName,
      targetQty: targetQty.toString(),
      unit: spk.unit,
      wipCutting: '',
      wipSlitter: '',
      wipDieCut: '',
      wipCentralRotary: '',
      wipLongWay: '',
      wipSablon: '',
      wipStitching: '',
      resultFinishGood: '',
      approvedBy: '',
      checkedBy: '',
      noted: spk.notes || '',
      productionDate: new Date().toISOString().split('T')[0],
      shift: '1',
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewForm = () => {
    setFormData({
      spkNo: '',
      productCode: '',
      productName: '',
      targetQty: '',
      unit: '',
      wipCutting: '',
      wipSlitter: '',
      wipDieCut: '',
      wipCentralRotary: '',
      wipLongWay: '',
      wipSablon: '',
      wipStitching: '',
      resultFinishGood: '',
      approvedBy: '',
      checkedBy: '',
      noted: '',
      productionDate: new Date().toISOString().split('T')[0],
      shift: '1',
    });
    setSpkSearchQuery('');
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.spkNo) {
        alert('Please select SPK first');
        return;
      }

      const newItem: ProductionDailyItem = {
        id: `pd-${Date.now()}`,
        spkNo: formData.spkNo,
        productCode: formData.productCode,
        productName: formData.productName,
        targetQty: parseFloat(formData.targetQty) || 0,
        unit: formData.unit,
        wipCutting: parseFloat(formData.wipCutting) || 0,
        wipSlitter: parseFloat(formData.wipSlitter) || 0,
        wipDieCut: parseFloat(formData.wipDieCut) || 0,
        wipCentralRotary: parseFloat(formData.wipCentralRotary) || 0,
        wipLongWay: parseFloat(formData.wipLongWay) || 0,
        wipSablon: parseFloat(formData.wipSablon) || 0,
        wipStitching: parseFloat(formData.wipStitching) || 0,
        resultFinishGood: parseFloat(formData.resultFinishGood) || 0,
        approvedBy: formData.approvedBy,
        checkedBy: formData.checkedBy,
        noted: formData.noted,
        productionDate: formData.productionDate,
        shift: formData.shift,
        createdAt: new Date().toISOString(),
        createdBy: 'current-user',
      };

      const existingRaw = extractStorageValue(await storageService.get<any[]>('productionDaily'));
      const existing = filterActiveItems(Array.isArray(existingRaw) ? existingRaw : []);
      const updated = [...existing, newItem];
      
      await storageService.set('productionDaily', updated);
      await loadProductionDailyData();
      
      setShowForm(false);
      alert('Production Daily saved successfully');
    } catch (error) {
      console.error('Error saving production daily:', error);
      alert('Error saving production daily');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const existingRaw = extractStorageValue(await storageService.get<any[]>('productionDaily'));
      const existing = filterActiveItems(Array.isArray(existingRaw) ? existingRaw : []);
      const updated = existing.map((item: any) => 
        item.id === id ? { ...item, deleted: true } : item
      );
      
      await storageService.set('productionDaily', updated);
      await loadProductionDailyData();
      alert('Record deleted successfully');
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error deleting record');
    }
  };

  const handleExportExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();
      const columns: ExcelColumn[] = [
        { header: 'SPK No', key: 'spkNo', width: 15 },
        { header: 'Product Code', key: 'productCode', width: 15 },
        { header: 'Product Name', key: 'productName', width: 25 },
        { header: 'Target Qty', key: 'targetQty', width: 12 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Cutting', key: 'wipCutting', width: 12 },
        { header: 'Slitter', key: 'wipSlitter', width: 12 },
        { header: 'Die Cut', key: 'wipDieCut', width: 12 },
        { header: 'Central Rotary', key: 'wipCentralRotary', width: 15 },
        { header: 'Long Way', key: 'wipLongWay', width: 12 },
        { header: 'Sablon', key: 'wipSablon', width: 12 },
        { header: 'Stitching', key: 'wipStitching', width: 12 },
        { header: 'Finish Good', key: 'resultFinishGood', width: 15 },
        { header: 'Approved By', key: 'approvedBy', width: 15 },
        { header: 'Checked By', key: 'checkedBy', width: 15 },
        { header: 'Notes', key: 'noted', width: 25 },
        { header: 'Created At', key: 'createdAt', width: 20 },
      ];

      const ws = createStyledWorksheet(productionDailyList, columns);
      setColumnWidths(ws, columns);
      XLSX.utils.book_append_sheet(wb, ws, 'Production Daily');
      XLSX.writeFile(wb, `Production_Daily_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel');
    }
  };

  const filteredSPK = spkList.filter(spk =>
    spk.spkNo.toLowerCase().includes(spkSearchQuery.toLowerCase()) ||
    spk.productCode.toLowerCase().includes(spkSearchQuery.toLowerCase()) ||
    spk.productName.toLowerCase().includes(spkSearchQuery.toLowerCase())
  );

  const columns = [
    { key: 'spkNo', header: 'SPK No' },
    { key: 'productCode', header: 'Product Code' },
    { key: 'productName', header: 'Product Name' },
    { key: 'targetQty', header: 'Target Qty' },
    { key: 'wipCutting', header: 'Cutting' },
    { key: 'wipSlitter', header: 'Slitter' },
    { key: 'wipDieCut', header: 'Die Cut' },
    { key: 'wipCentralRotary', header: 'Central Rotary' },
    { key: 'wipLongWay', header: 'Long Way' },
    { key: 'wipSablon', header: 'Sablon' },
    { key: 'wipStitching', header: 'Stitching' },
    { key: 'resultFinishGood', header: 'Finish Good' },
    { key: 'approvedBy', header: 'Approved By' },
    { key: 'checkedBy', header: 'Checked By' },
    { 
      key: 'actions', 
      header: 'Actions',
      render: (item: ProductionDailyItem) => (
        <Button 
          variant="danger" 
          onClick={() => handleDelete(item.id)}
          style={{ fontSize: '10px', padding: '3px 6px' }}
        >
          Delete
        </Button>
      )
    },
  ];

  return (
    <div className="production-daily-page">
      {/* Header */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#333' }}>Production Daily</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <Button onClick={handleNewForm}>+ New Production Daily</Button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SPK No, Product Code, Product Name..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: '#f8f9fa',
                color: '#333',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '400px' }}>
            <DateRangeFilter
              onDateChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
              defaultFrom={dateFrom}
              defaultTo={dateTo}
            />
          </div>
        </div>
      </Card>

      {/* Form Dialog - Enterprise Style */}
      {showForm && (
        <div className="dialog-overlay" onClick={() => setShowForm(false)}>
          <div className="enterprise-form-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="form-header">
              <h2>Production Daily Entry</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>

            {/* Body */}
            <div className="form-body">
              {/* Section 1: SPK Selection */}
              <div className="form-section">
                <div className="section-title">1. Select SPK (Surat Perintah Kerja)</div>
                
                {!formData.spkNo ? (
                  <div className="spk-search-box">
                    <input
                      type="text"
                      value={spkSearchQuery}
                      onChange={(e) => setSpkSearchQuery(e.target.value)}
                      placeholder="Search SPK by No, Product Code, or Product Name..."
                      className="search-input"
                      autoFocus
                    />
                    <div className="spk-list-container">
                      {filteredSPK.length > 0 ? (
                        filteredSPK.map(spk => (
                          <div 
                            key={spk.id}
                            className="spk-list-item"
                            onClick={() => {
                              handleSelectSPK(spk);
                              setSpkSearchQuery('');
                            }}
                          >
                            <div className="spk-item-header">
                              <span className="spk-no">{spk.spkNo}</span>
                              <span className="spk-so">SO: {spk.soNo}</span>
                            </div>
                            <div className="spk-item-detail">
                              <span className="spk-code">{spk.kode || spk.productCode}</span>
                              <span className="spk-product">{spk.product || spk.productName}</span>
                            </div>
                            <div className="spk-item-footer">
                              <span className="spk-qty">Qty: {spk.qty || spk.targetQty} {spk.unit}</span>
                              {spk.customer && <span className="spk-customer">{spk.customer}</span>}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">No SPK found</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="spk-selected-box">
                    <div className="selected-info">
                      <div className="selected-header">
                        <span className="selected-spk">{formData.spkNo}</span>
                        <span className="selected-product">{formData.productCode} - {formData.productName}</span>
                      </div>
                      <div className="selected-detail">
                        <span>Target Qty: {formData.targetQty} {formData.unit}</span>
                      </div>
                    </div>
                    <button 
                      className="change-btn"
                      onClick={() => {
                        handleInputChange('spkNo', '');
                        setSpkSearchQuery('');
                      }}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {formData.spkNo && (
                <>
                  {/* Section 2: Production Details */}
                  <div className="form-section">
                    <div className="section-title">2. Production Details</div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Production Date</label>
                        <input
                          type="date"
                          value={formData.productionDate}
                          onChange={(e) => handleInputChange('productionDate', e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Shift</label>
                        <select
                          value={formData.shift}
                          onChange={(e) => handleInputChange('shift', e.target.value)}
                          className="form-input"
                        >
                          <option value="1">Shift 1</option>
                          <option value="2">Shift 2</option>
                          <option value="3">Shift 3</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: WIP Data */}
                  <div className="form-section">
                    <div className="section-title">3. Work In Progress (WIP) Data</div>
                    <div className="form-grid-4">
                      <div className="form-group">
                        <label>Cutting</label>
                        <input
                          type="number"
                          value={formData.wipCutting}
                          onChange={(e) => handleInputChange('wipCutting', e.target.value)}
                          placeholder="0"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Slitter</label>
                        <input
                          type="number"
                          value={formData.wipSlitter}
                          onChange={(e) => handleInputChange('wipSlitter', e.target.value)}
                          placeholder="0"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Die Cut</label>
                        <input
                          type="number"
                          value={formData.wipDieCut}
                          onChange={(e) => handleInputChange('wipDieCut', e.target.value)}
                          placeholder="0"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Central Rotary</label>
                        <input
                          type="number"
                          value={formData.wipCentralRotary}
                          onChange={(e) => handleInputChange('wipCentralRotary', e.target.value)}
                          placeholder="0"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Long Way</label>
                        <input
                          type="number"
                          value={formData.wipLongWay}
                          onChange={(e) => handleInputChange('wipLongWay', e.target.value)}
                          placeholder="0"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Sablon</label>
                        <input
                          type="number"
                          value={formData.wipSablon}
                          onChange={(e) => handleInputChange('wipSablon', e.target.value)}
                          placeholder="0"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Stitching</label>
                        <input
                          type="number"
                          value={formData.wipStitching}
                          onChange={(e) => handleInputChange('wipStitching', e.target.value)}
                          placeholder="0"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Result Finish Good</label>
                        <input
                          type="number"
                          value={formData.resultFinishGood}
                          onChange={(e) => handleInputChange('resultFinishGood', e.target.value)}
                          placeholder="0"
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Approval & Notes */}
                  <div className="form-section">
                    <div className="section-title">4. Approval & Notes</div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Approved By</label>
                        <input
                          type="text"
                          value={formData.approvedBy}
                          onChange={(e) => handleInputChange('approvedBy', e.target.value)}
                          placeholder="Name"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Checked By</label>
                        <input
                          type="text"
                          value={formData.checkedBy}
                          onChange={(e) => handleInputChange('checkedBy', e.target.value)}
                          placeholder="Name"
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-group full-width">
                      <label>Notes</label>
                      <textarea
                        value={formData.noted}
                        onChange={(e) => handleInputChange('noted', e.target.value)}
                        placeholder="Enter any additional notes..."
                        rows={3}
                        className="form-textarea"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="form-footer">
              <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button 
                className="btn-save" 
                onClick={handleSave}
                disabled={!formData.spkNo}
              >
                Save Production Daily
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Daily List */}
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#333' }}>
            Production Daily Records ({productionDailyList.length})
          </h3>
        </div>
        {productionDailyList.length > 0 ? (
          <Table
            columns={columns}
            data={productionDailyList}
            pageSize={20}
            showPagination={true}
          />
        ) : (
          <div className="empty-state">
            No production daily records found
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProductionDaily;
