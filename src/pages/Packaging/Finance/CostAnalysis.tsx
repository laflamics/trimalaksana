import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService } from '../../../services/storage';
import { useLanguage } from '../../../hooks/useLanguage';
import '../../../styles/common.css';
import '../../../styles/compact.css';

interface Product {
  id: string;
  kode: string;
  product_id?: string;
  nama: string;
  customer?: string;
  hargaFg?: number;
  harga?: number;
}

interface Material {
  id: string;
  kode: string;
  material_id?: string;
  nama: string;
  supplier: string;
  priceMtr?: number;
  harga?: number;
}

interface BOMItem {
  id: string;
  product_id: string;
  material_id: string;
  ratio: number;
}

interface ProductCostAnalysis {
  productId: string;
  productKode: string;
  productName: string;
  customer: string;
  sellingPrice: number;
  materialCosts: {
    materialId: string;
    materialName: string;
    supplier: string;
    materialPrice: number;
    ratio: number;
    costPerUnit: number;
  }[];
  totalCost: number;
  profit: number;
  profitMargin: number;
  hasBOM: boolean;
}

const CostAnalysis = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bomData, setBomData] = useState<BOMItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'alert',
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

  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: 'alert',
      title: '',
      message: '',
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, mats, bom] = await Promise.all([
        storageService.get<Product[]>('products') || [],
        storageService.get<Material[]>('materials') || [],
        storageService.get<BOMItem[]>('bom') || [],
      ]);
      setProducts(prods || []);
      setMaterials(mats || []);
      setBomData(bom || [] as BOMItem[]);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimize: Create indexes for faster lookup (O(1) instead of O(n))
  const costAnalysis = useMemo(() => {
    if (!products || products.length === 0) {
      return [];
    }

    // Create material index: materialId -> Material
    const materialIndex = new Map<string, Material>();
    // Ensure materials is always an array
    const materialsArray = Array.isArray(materials) ? materials : [];
    materialsArray.forEach(m => {
      const mId = (m.material_id || m.kode || '').toString().trim();
      if (mId) materialIndex.set(mId, m);
    });

    // Create BOM index: productId -> BOMItem[]
    const bomIndex = new Map<string, BOMItem[]>();
    // Ensure bomData is always an array
    const bomDataArray = Array.isArray(bomData) ? bomData : [];
    bomDataArray.forEach(b => {
      const bomProductId = (b.product_id || '').toString().trim();
      if (bomProductId) {
        if (!bomIndex.has(bomProductId)) {
          bomIndex.set(bomProductId, []);
        }
        bomIndex.get(bomProductId)!.push(b);
      }
    });

    // Calculate analysis using indexes
    const analysis: ProductCostAnalysis[] = [];

    // Ensure products is always an array
    const productsArray = Array.isArray(products) ? products : [];
    productsArray.forEach(product => {
      const productId = (product.product_id || product.kode || '').toString().trim();
      const sellingPrice = product.hargaFg || product.harga || 0;
      const customer = product.customer || '';

      // Get BOM items for this product (O(1) lookup)
      const productBOM = bomIndex.get(productId) || [];

      if (productBOM.length === 0) {
        // Product tanpa BOM
        analysis.push({
          productId: product.id,
          productKode: product.kode || productId,
          productName: product.nama,
          customer: customer,
          sellingPrice: sellingPrice,
          materialCosts: [],
          totalCost: 0,
          profit: sellingPrice,
          profitMargin: sellingPrice > 0 ? 100 : 0,
          hasBOM: false,
        });
        return;
      }

      // Calculate material costs using index (O(1) lookup per material)
      const materialCosts = productBOM.map(bom => {
        const materialId = (bom.material_id || '').toString().trim();
        const material = materialIndex.get(materialId);

        const materialPrice = material?.priceMtr || material?.harga || 0;
        const ratio = bom.ratio || 1;
        const costPerUnit = materialPrice * ratio;

        return {
          materialId: materialId,
          materialName: material?.nama || materialId,
          supplier: material?.supplier || '',
          materialPrice: materialPrice,
          ratio: ratio,
          costPerUnit: costPerUnit,
        };
      });

      const totalCost = materialCosts.reduce((sum, mc) => sum + mc.costPerUnit, 0);
      const profit = sellingPrice - totalCost;
      const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

      analysis.push({
        productId: product.id,
        productKode: product.kode || productId,
        productName: product.nama,
        customer: customer,
        sellingPrice: sellingPrice,
        materialCosts: materialCosts,
        totalCost: totalCost,
        profit: profit,
        profitMargin: profitMargin,
        hasBOM: true,
      });
    });

    return analysis;
  }, [products, materials, bomData]);

  const filteredAnalysis = useMemo(() => {
    // Ensure costAnalysis is always an array
    const costAnalysisArray = Array.isArray(costAnalysis) ? costAnalysis : [];
    return costAnalysisArray.filter(item => {
      const matchesSearch = !searchQuery ||
        item.productKode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCustomer = filterCustomer === 'all' || item.customer === filterCustomer;
      
      return matchesSearch && matchesCustomer;
    });
  }, [costAnalysis, searchQuery, filterCustomer]);

  const customers = useMemo(() => {
    const uniqueCustomers = new Set<string>();
    // Ensure costAnalysis is always an array
    const costAnalysisArray = Array.isArray(costAnalysis) ? costAnalysis : [];
    costAnalysisArray.forEach(item => {
      if (item.customer) uniqueCustomers.add(item.customer);
    });
    return Array.from(uniqueCustomers).sort();
  }, [costAnalysis]);

  // Pagination
  const totalPages = useMemo(() => {
    // Ensure filteredAnalysis is always an array
    const filteredAnalysisArray = Array.isArray(filteredAnalysis) ? filteredAnalysis : [];
    return Math.ceil(filteredAnalysisArray.length / itemsPerPage);
  }, [filteredAnalysis, itemsPerPage]);
  
  const paginatedAnalysis = useMemo(() => {
    // Ensure filteredAnalysis is always an array
    const filteredAnalysisArray = Array.isArray(filteredAnalysis) ? filteredAnalysis : [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAnalysisArray.slice(startIndex, endIndex);
  }, [filteredAnalysis, currentPage, itemsPerPage]);

  const summary = useMemo(() => {
    // Ensure filteredAnalysis is always an array
    const filteredAnalysisArray = Array.isArray(filteredAnalysis) ? filteredAnalysis : [];
    const totalProducts = filteredAnalysisArray.length;
    const productsWithBOM = filteredAnalysisArray.filter(item => item.hasBOM).length;
    const totalSellingPrice = filteredAnalysisArray.reduce((sum, item) => sum + item.sellingPrice, 0);
    const totalCost = filteredAnalysisArray.reduce((sum, item) => sum + item.totalCost, 0);
    const totalProfit = filteredAnalysisArray.reduce((sum, item) => sum + item.profit, 0);
    const avgProfitMargin = totalProducts > 0 
      ? filteredAnalysisArray.reduce((sum, item) => sum + item.profitMargin, 0) / totalProducts 
      : 0;

    return {
      totalProducts,
      productsWithBOM,
      totalSellingPrice,
      totalCost,
      totalProfit,
      avgProfitMargin,
    };
  }, [filteredAnalysis]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredAnalysis.map(item => ({
        'Product Code': item.productKode,
        'Product Name': item.productName,
        'Customer': item.customer || '',
        'Selling Price': item.sellingPrice,
        'Total Cost (BOM)': item.totalCost,
        'Profit': item.profit,
        'Profit Margin %': item.profitMargin.toFixed(2),
        'Has BOM': item.hasBOM ? 'Yes' : 'No',
        'Material Count': item.materialCosts.length,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cost Analysis');
      
      // Add detail sheet for BOM breakdown
      const bomDetail: any[] = [];
      // Ensure filteredAnalysis is always an array
      const filteredAnalysisArray = Array.isArray(filteredAnalysis) ? filteredAnalysis : [];
      filteredAnalysisArray.forEach(item => {
        if (item.materialCosts.length > 0) {
          item.materialCosts.forEach(mc => {
            bomDetail.push({
              'Product Code': item.productKode,
              'Product Name': item.productName,
              'Material Code': mc.materialId,
              'Material Name': mc.materialName,
              'Supplier': mc.supplier,
              'Material Price (BOS)': mc.materialPrice,
              'Ratio': mc.ratio,
              'Cost Per Unit': mc.costPerUnit,
            });
          });
        }
      });
      
      if (bomDetail.length > 0) {
        const wsDetail = XLSX.utils.json_to_sheet(bomDetail);
        XLSX.utils.book_append_sheet(wb, wsDetail, 'BOM Detail');
      }
      
      const fileName = `Cost_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert(`✅ Exported ${dataToExport.length} products to ${fileName}`, 'Success');
    } catch (error: any) {
      showAlert(`Error exporting to Excel: ${error.message}`, 'Error');
    }
  };

  const columns = [
    { key: 'productKode', header: 'Product Code' },
    { key: 'productName', header: 'Product Name' },
    { key: 'customer', header: 'Customer' },
    { 
      key: 'sellingPrice', 
      header: 'Harga Jual', 
      render: (item: ProductCostAnalysis) => 
        item.sellingPrice > 0 ? `Rp ${item.sellingPrice.toLocaleString('id-ID')}` : '-'
    },
    { 
      key: 'totalCost', 
      header: 'Total Cost (BOM)', 
      render: (item: ProductCostAnalysis) => {
        if (item.totalCost > 0) {
          return `Rp ${item.totalCost.toLocaleString('id-ID')}`;
        }
        return item.hasBOM ? '-' : <span style={{ color: '#ff9800' }}>No BOM</span>;
      }
    },
    { 
      key: 'profit', 
      header: 'Profit', 
      render: (item: ProductCostAnalysis) => {
        const color = item.profit >= 0 ? 'green' : 'red';
        return <span style={{ color }}>Rp {item.profit.toLocaleString('id-ID')}</span>;
      }
    },
    { 
      key: 'profitMargin', 
      header: 'Profit Margin %', 
      render: (item: ProductCostAnalysis) => {
        const color = item.profitMargin >= 0 ? 'green' : 'red';
        return <span style={{ color }}>{item.profitMargin.toFixed(2)}%</span>;
      }
    },
    { 
      key: 'materialCount', 
      header: 'Material Count', 
      render: (item: ProductCostAnalysis) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: item.hasBOM ? '#388e3c' : '#ff9800',
              display: 'inline-block',
            }}
            title={item.hasBOM ? 'Memiliki BOM' : 'Tidak memiliki BOM'}
          />
          <span>{item.materialCosts.length}</span>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Detail',
      render: (item: ProductCostAnalysis) => (
        <Button 
          variant="secondary" 
          onClick={() => {
            if (item.materialCosts.length === 0) {
              showAlert(`Product ${item.productName} tidak memiliki BOM.\n\nSilakan tambahkan BOM di Master Products.`, 'Warning');
              return;
            }
            const detail = item.materialCosts.map((mc, idx) => 
              `${idx + 1}. ${mc.materialName} (${mc.materialId})\n   Supplier: ${mc.supplier}\n   Harga BOS (Beli): Rp ${mc.materialPrice.toLocaleString('id-ID')}\n   Ratio: ${mc.ratio}\n   Cost per Unit: Rp ${mc.costPerUnit.toLocaleString('id-ID')}`
            ).join('\n\n');
            const summary = `\n\n═══════════════════════════════════\nHarga Jual: Rp ${item.sellingPrice.toLocaleString('id-ID')}\nTotal Cost (BOM): Rp ${item.totalCost.toLocaleString('id-ID')}\nProfit: Rp ${item.profit.toLocaleString('id-ID')}\nProfit Margin: ${item.profitMargin.toFixed(2)}%`;
            showAlert(`📊 Cost Breakdown - ${item.productName}\n\n${detail}${summary}`, 'Cost Breakdown');
          }}
          style={{ fontSize: '12px', padding: '4px 8px' }}
        >
          View BOM
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading...</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Calculating cost analysis...
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="module-compact">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2>Product Cost Analysis</h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Analisis biaya produk berdasarkan BOM dan harga material (BOS)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value="all">All Customers</option>
              {customers.map(cust => (
                <option key={cust} value={cust}>{cust}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Products</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{summary.totalProducts}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Products with BOM</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{summary.productsWithBOM}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Selling Price</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Rp {summary.totalSellingPrice.toLocaleString('id-ID')}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Cost (BOM)</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Rp {summary.totalCost.toLocaleString('id-ID')}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Profit</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: summary.totalProfit >= 0 ? 'green' : 'red' }}>
                Rp {summary.totalProfit.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Avg Profit Margin</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: summary.avgProfitMargin >= 0 ? 'green' : 'red' }}>
                {summary.avgProfitMargin.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <Table columns={columns as any[]} data={paginatedAnalysis as any[]} />

        {/* Pagination */}
        {(Array.isArray(filteredAnalysis) ? filteredAnalysis : []).length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, (Array.isArray(filteredAnalysis) ? filteredAnalysis : []).length)} of {(Array.isArray(filteredAnalysis) ? filteredAnalysis : []).length} products
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px' }}
              >
                Previous
              </Button>
              <div style={{ fontSize: '14px' }}>
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px' }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Custom Dialog untuk Alert/Confirm */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog} style={{ zIndex: 10001 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {dialogState.title}
              </h3>
            </div>
            
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {dialogState.message}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={closeDialog}>
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostAnalysis;

