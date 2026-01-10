import { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import ProductionScheduleDialog from './ProductionScheduleDialog';
import DeliveryScheduleDialog from './DeliveryScheduleDialog';
import { getTheme } from '../utils/theme';
import './ScheduleDialog.css';

interface GeneralScheduleDialogProps {
  item: {
    soNo: string;
    customer: string;
    spks: Array<{
      spkNo: string;
      soNo: string;
      product: string;
      productId: string;
      qty: number;
      target?: number;
      progress?: number;
      remaining?: number;
      scheduleStartDate?: string;
      scheduleEndDate?: string;
      scheduleDate?: string;
      productionBatches?: any[];
      deliveryBatches?: any[];
    }>;
  } | null;
  activeTab?: 'production' | 'delivery';
  onClose: () => void;
  onSaveProduction: (data: any) => void;
  onSaveDelivery: (data: any) => void;
}

const GeneralScheduleDialog = ({ 
  item, 
  activeTab: initialTab = 'production',
  onClose, 
  onSaveProduction,
  onSaveDelivery 
}: GeneralScheduleDialogProps) => {
  const [activeTab, setActiveTab] = useState<'production' | 'delivery'>(initialTab);
  const [selectedProductionItem, setSelectedProductionItem] = useState<any>(null);
  const [selectedDeliveryItem, setSelectedDeliveryItem] = useState<any>(null);

  useEffect(() => {
    if (item) {
      // Prepare data untuk production schedule (single SPK atau multiple)
      if (item.spks && item.spks.length > 0) {
        // Untuk production schedule, kita handle per SPK
        // Tapi untuk sekarang, kita akan handle delivery schedule yang sudah support multiple
        setSelectedDeliveryItem({
          soNo: item.soNo,
          customer: item.customer,
          spks: item.spks.map(spk => ({
            spkNo: spk.spkNo,
            soNo: spk.soNo,
            product: spk.product,
            productId: spk.productId,
            qty: spk.qty,
            productionBatches: spk.productionBatches || [],
            deliveryBatches: spk.deliveryBatches || [],
          })),
        });
      }
    } else {
      setSelectedProductionItem(null);
      setSelectedDeliveryItem(null);
    }
  }, [item]);

  if (!item) return null;

  const handleSaveProductionSchedule = (data: any) => {
    // Data dari ProductionScheduleDialog sudah include semua SPK yang di-save
    // Format: { spkProductions: [{ spkNo, startDate, endDate, batches }] }
    onSaveProduction(data);
  };

  const handleSaveDeliverySchedule = (data: any) => {
    onSaveDelivery(data);
  };

  return (
    <div className="dialog-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <Card
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '95%',
          width: '1200px',
          maxHeight: '95vh',
          overflow: 'auto',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
              General Schedule - {item.soNo}
            </h2>
            <Button variant="secondary" onClick={onClose}>
              ✕ Close
            </Button>
          </div>

          {/* Tab Navigation */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '20px',
            borderBottom: '2px solid var(--border-color)',
          }}>
            <button
              onClick={() => setActiveTab('production')}
              style={{
                padding: '10px 20px',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === 'production' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'production' ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'production' ? '600' : '400',
                transition: 'all 0.2s',
              }}
            >
              🏭 Production Schedule
            </button>
            <button
              onClick={() => setActiveTab('delivery')}
              style={{
                padding: '10px 20px',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === 'delivery' ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'delivery' ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'delivery' ? '600' : '400',
                transition: 'all 0.2s',
              }}
            >
              📦 Delivery Schedule
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'production' && (
            <ProductionScheduleDialog
              item={item ? {
                soNo: item.soNo,
                customer: item.customer,
                spks: item.spks.map(spk => {
                  // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
                  // Material override hanya untuk material requirement, bukan untuk product qty
                  // General Schedule harus ikutin qty asli dari SO data
                  const finalQty = spk.qty || 0; // Pakai qty asli dari SPK (dari SO), bukan dari override
                  const finalTarget = spk.qty || 0; // Pakai qty asli dari SPK (dari SO), bukan dari override
                  
                  return {
                    spkNo: spk.spkNo,
                    soNo: spk.soNo,
                    product: spk.product,
                    productId: spk.productId,
                    qty: finalQty, // Pakai qty asli dari SPK (dari SO)
                    target: finalTarget, // Pakai qty asli dari SPK (dari SO)
                    progress: spk.progress || 0,
                    remaining: spk.remaining || (finalQty - (spk.progress || 0)),
                    scheduleStartDate: spk.scheduleStartDate,
                    scheduleEndDate: spk.scheduleEndDate,
                    productionBatches: spk.productionBatches || [],
                    // Jangan kirim overrideQty karena product qty tidak boleh terpengaruh material override
                  };
                }),
              } : null}
              onClose={() => {}}
              onSave={handleSaveProductionSchedule}
              inline={true}
            />
          )}

          {activeTab === 'delivery' && selectedDeliveryItem && (
            <DeliveryScheduleDialog
              item={selectedDeliveryItem}
              onClose={() => {}}
              onSave={handleSaveDeliverySchedule}
              inline={true}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default GeneralScheduleDialog;

