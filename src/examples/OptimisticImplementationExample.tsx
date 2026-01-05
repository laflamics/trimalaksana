/**
 * Contoh Implementasi Optimistic Updates
 * Menunjukkan bagaimana mengganti tombol submit yang lambat dengan optimistic updates
 */

import React, { useState } from 'react';
import OptimisticButton from '../components/OptimisticButton';
import OptimisticProductionSubmit from '../components/OptimisticProductionSubmit';
import OptimisticGRNSubmit from '../components/OptimisticGRNSubmit';
import OptimisticSOConfirm from '../components/OptimisticSOConfirm';
import SyncStatusIndicator from '../components/SyncStatusIndicator';
import { useOptimisticOperations } from '../hooks/useOptimisticOperations';
import Card from '../components/Card';
import Button from '../components/Button';

// BEFORE: Tombol submit yang lambat dengan loading state
const SlowSubmitButton = ({ onSubmit, loading }: { onSubmit: () => Promise<void>; loading: boolean }) => {
  return (
    <Button 
      variant="primary" 
      onClick={onSubmit}
      disabled={loading}
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      {loading ? 'Submitting...' : 'Submit GRN'}
    </Button>
  );
};

// AFTER: Optimistic button dengan instant feedback
const FastOptimisticButton = ({ onSubmit }: { onSubmit: () => Promise<void> }) => {
  return (
    <OptimisticButton
      variant="primary"
      onClick={onSubmit}
      successMessage="GRN submitted!"
      errorMessage="Submit failed"
      showSyncStatus={true}
    >
      Submit GRN
    </OptimisticButton>
  );
};

const OptimisticImplementationExample = () => {
  const { submitGRN, submitProduction, confirmSalesOrder } = useOptimisticOperations();
  const [showProductionDialog, setShowProductionDialog] = useState(false);
  const [showGRNDialog, setShowGRNDialog] = useState(false);
  
  // Sample data
  const sampleProduction = {
    id: 'prod-001',
    productionNo: 'PROD-001',
    spkNo: 'SPK-001',
    soNo: 'SO-001',
    customer: 'PT. Contoh Customer',
    status: 'OPEN' as const,
    target: 100,
    progress: 75,
    remaining: 25,
    productName: 'Product A',
    productId: 'PROD-A'
  };
  
  const samplePO = {
    id: 'po-001',
    poNo: 'PO-001',
    spkNo: 'SPK-001',
    materialId: 'MAT-001',
    materialName: 'Material A',
    qty: 1000,
    unit: 'KG',
    supplier: 'PT. Supplier ABC'
  };
  
  const sampleSO = {
    id: 'so-001',
    soNo: 'SO-001',
    customer: 'PT. Customer XYZ',
    customerKode: 'CUST-001',
    status: 'OPEN' as const,
    items: [
      {
        id: 'item-001',
        productId: 'PROD-A',
        productKode: 'PROD-A',
        productName: 'Product A',
        qty: 100,
        unit: 'PCS',
        price: 10000,
        total: 1000000
      }
    ],
    confirmed: false
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Optimistic Updates Implementation Example</h1>
      
      {/* Sync Status Indicator */}
      <SyncStatusIndicator position="top-right" showDetails={true} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        
        {/* BEFORE: Current Implementation */}
        <Card title="❌ BEFORE: Current Implementation (Slow)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Problems with Current Flow:</h3>
            <ul style={{ fontSize: '14px', color: '#666' }}>
              <li>User waits 2-5 seconds for each submit</li>
              <li>Loading spinners block user interaction</li>
              <li>Sequential operations are very slow</li>
              <li>No feedback until server responds</li>
              <li>Poor user experience</li>
            </ul>
            
            <div style={{ padding: '12px', backgroundColor: '#ffebee', borderRadius: '6px' }}>
              <strong>Example: Submit GRN</strong>
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                1. User clicks submit → Loading... (2s)<br/>
                2. Validate data → Loading... (0.5s)<br/>
                3. Update GRN → Loading... (1s)<br/>
                4. Update inventory → Loading... (1.5s)<br/>
                5. Update notifications → Loading... (1s)<br/>
                <strong>Total: ~6 seconds of waiting!</strong>
              </div>
            </div>
          </div>
        </Card>
        
        {/* AFTER: Optimistic Implementation */}
        <Card title="✅ AFTER: Optimistic Implementation (Fast)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Benefits of Optimistic Updates:</h3>
            <ul style={{ fontSize: '14px', color: '#4CAF50' }}>
              <li>Instant UI feedback (0ms perceived lag)</li>
              <li>No loading states for user actions</li>
              <li>Background sync without blocking</li>
              <li>Better user experience</li>
              <li>Offline capability</li>
            </ul>
            
            <div style={{ padding: '12px', backgroundColor: '#e8f5e8', borderRadius: '6px' }}>
              <strong>Example: Submit GRN</strong>
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                1. User clicks submit → ✅ Success! (0ms)<br/>
                2. UI updates immediately<br/>
                3. Background sync starts<br/>
                4. User continues working<br/>
                <strong>Total: Instant response!</strong>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Demo Buttons */}
      <div style={{ marginTop: '30px' }}>
        <h2>Interactive Demo</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* GRN Submit Demo */}
          <Card title="GRN Submit">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                PO: {samplePO.poNo} | Material: {samplePO.materialName}
              </div>
              
              <OptimisticButton
                variant="primary"
                onClick={async () => {
                  await submitGRN({
                    id: 'demo-grn-' + Date.now(),
                    grnNo: 'GRN-DEMO-' + Date.now(),
                    poNo: samplePO.poNo,
                    spkNo: samplePO.spkNo,
                    materialId: samplePO.materialId,
                    qtyReceived: 100,
                    receivedDate: new Date().toISOString()
                  });
                }}
                successMessage="GRN created instantly!"
                showSyncStatus={true}
              >
                Submit GRN (Optimistic)
              </OptimisticButton>
              
              <Button 
                variant="secondary" 
                onClick={() => setShowGRNDialog(true)}
                style={{ fontSize: '11px' }}
              >
                Open GRN Dialog
              </Button>
            </div>
          </Card>
          
          {/* Production Submit Demo */}
          <Card title="Production Submit">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Production: {sampleProduction.productionNo} | Progress: {sampleProduction.progress}/{sampleProduction.target}
              </div>
              
              <OptimisticButton
                variant="primary"
                onClick={async () => {
                  await submitProduction({
                    id: sampleProduction.id,
                    productionNo: sampleProduction.productionNo || '',
                    spkNo: sampleProduction.spkNo || '',
                    soNo: sampleProduction.soNo,
                    qtyProduced: 25,
                    target: sampleProduction.target,
                    productId: sampleProduction.productId
                  });
                }}
                successMessage="Production updated instantly!"
                showSyncStatus={true}
              >
                Submit Production (Optimistic)
              </OptimisticButton>
              
              <Button 
                variant="secondary" 
                onClick={() => setShowProductionDialog(true)}
                style={{ fontSize: '11px' }}
              >
                Open Production Dialog
              </Button>
            </div>
          </Card>
          
          {/* SO Confirmation Demo */}
          <Card title="Sales Order Confirmation">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                SO: {sampleSO.soNo} | Customer: {sampleSO.customer}
              </div>
              
              <OptimisticSOConfirm
                salesOrder={sampleSO}
                onSuccess={() => {
                  console.log('SO confirmed with optimistic updates!');
                }}
              />
              
              <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                ✨ Creates SPK and notifications instantly
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Performance Comparison */}
      <div style={{ marginTop: '30px' }}>
        <Card title="Performance Comparison">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#f44336' }}>❌ Current Implementation</h4>
              <ul style={{ fontSize: '12px' }}>
                <li>GRN Submit: ~3-6 seconds</li>
                <li>Production Submit: ~4-8 seconds</li>
                <li>SO Confirm: ~2-5 seconds</li>
                <li>User waits for each operation</li>
                <li>Sequential operations are very slow</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#4CAF50' }}>✅ Optimistic Implementation</h4>
              <ul style={{ fontSize: '12px' }}>
                <li>GRN Submit: ~0ms (instant)</li>
                <li>Production Submit: ~0ms (instant)</li>
                <li>SO Confirm: ~0ms (instant)</li>
                <li>Background sync without blocking</li>
                <li>95%+ performance improvement</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Implementation Guide */}
      <div style={{ marginTop: '30px' }}>
        <Card title="Implementation Guide">
          <div style={{ fontSize: '14px' }}>
            <h4>How to Replace Slow Buttons:</h4>
            <ol>
              <li><strong>Replace Button with OptimisticButton:</strong>
                <pre style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
{`// Before
<Button onClick={handleSubmit} disabled={loading}>
  {loading ? 'Submitting...' : 'Submit'}
</Button>

// After  
<OptimisticButton onClick={handleOptimisticSubmit}>
  Submit
</OptimisticButton>`}
                </pre>
              </li>
              
              <li><strong>Use Optimistic Operations:</strong>
                <pre style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
{`const { submitGRN } = useOptimisticOperations();

const handleOptimisticSubmit = async () => {
  await submitGRN(grnData); // Instant local update + background sync
};`}
                </pre>
              </li>
              
              <li><strong>Add Sync Status Indicator:</strong>
                <pre style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
{`<SyncStatusIndicator position="top-right" showDetails={true} />`}
                </pre>
              </li>
            </ol>
          </div>
        </Card>
      </div>
      
      {/* Dialogs */}
      {showProductionDialog && (
        <OptimisticProductionSubmit
          production={sampleProduction}
          onClose={() => setShowProductionDialog(false)}
          onSuccess={() => {
            console.log('Production submitted with optimistic updates!');
          }}
        />
      )}
      
      {showGRNDialog && (
        <OptimisticGRNSubmit
          po={samplePO}
          totalReceived={0}
          maxAllowedQty={samplePO.qty}
          onClose={() => setShowGRNDialog(false)}
          onSuccess={() => {
            console.log('GRN created with optimistic updates!');
          }}
        />
      )}
    </div>
  );
};

export default OptimisticImplementationExample;