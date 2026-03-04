import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import './BusinessActivityReportDetail.css';

interface DetailProps {
  item: any;
  onClose: () => void;
}

const BusinessActivityReportDetail: React.FC<DetailProps> = ({ item, onClose }) => {
  const { t } = useLanguage();
  return (
    <div className="bar-detail-overlay" onClick={onClose}>
      <div className="bar-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bar-detail-header">
          <h2>{t('common.description') || 'Process Details'}</h2>
          <button className="bar-detail-close" onClick={onClose}>×</button>
        </div>

        <div className="bar-detail-content">
          {/* SO Section */}
          <div className="bar-detail-section">
            <h3>Sales Order</h3>
            <div className="bar-detail-grid">
              <div className="bar-detail-row">
                <span className="bar-detail-label">SO Number:</span>
                <span className="bar-detail-value">{item.soNo}</span>
              </div>
              <div className="bar-detail-row">
                <span className="bar-detail-label">Customer:</span>
                <span className="bar-detail-value">{item.customer}</span>
              </div>
              <div className="bar-detail-row">
                <span className="bar-detail-label">Status:</span>
                <span className="bar-detail-value">{item.soStatus}</span>
              </div>
              <div className="bar-detail-row">
                <span className="bar-detail-label">Created:</span>
                <span className="bar-detail-value">
                  {new Date(item.createdDate).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* PPIC/SPK Section */}
          <div className="bar-detail-section">
            <h3>PPIC - Work Order (SPK)</h3>
            <div className="bar-detail-grid">
              <div className="bar-detail-row">
                <span className="bar-detail-label">SPK Number:</span>
                <span className="bar-detail-value">{item.spkNo}</span>
              </div>
              <div className="bar-detail-row">
                <span className="bar-detail-label">Product:</span>
                <span className="bar-detail-value">{item.product}</span>
              </div>
              <div className="bar-detail-row">
                <span className="bar-detail-label">Quantity:</span>
                <span className="bar-detail-value">{item.qty} {item.unit}</span>
              </div>
              <div className="bar-detail-row">
                <span className="bar-detail-label">Status:</span>
                <span className="bar-detail-value">{item.spkStatus}</span>
              </div>
              <div className="bar-detail-row">
                <span className="bar-detail-label">Created:</span>
                <span className="bar-detail-value">
                  {item.spkCreatedDate ? new Date(item.spkCreatedDate).toLocaleString() : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Purchasing Section */}
          {item.prNo && (
            <div className="bar-detail-section">
              <h3>Purchasing</h3>
              <div className="bar-detail-grid">
                {item.prNo && (
                  <>
                    <div className="bar-detail-row">
                      <span className="bar-detail-label">PR Number:</span>
                      <span className="bar-detail-value">{item.prNo}</span>
                    </div>
                    <div className="bar-detail-row">
                      <span className="bar-detail-label">PR Status:</span>
                      <span className="bar-detail-value">{item.prStatus}</span>
                    </div>
                  </>
                )}
                {item.poNo && (
                  <>
                    <div className="bar-detail-row">
                      <span className="bar-detail-label">PO Number:</span>
                      <span className="bar-detail-value">{item.poNo}</span>
                    </div>
                    <div className="bar-detail-row">
                      <span className="bar-detail-label">Supplier:</span>
                      <span className="bar-detail-value">{item.supplier || '-'}</span>
                    </div>
                    <div className="bar-detail-row">
                      <span className="bar-detail-label">PO Status:</span>
                      <span className="bar-detail-value">{item.poStatus}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Production Section */}
          {item.productionNo && (
            <div className="bar-detail-section">
              <h3>Production</h3>
              <div className="bar-detail-grid">
                <div className="bar-detail-row">
                  <span className="bar-detail-label">Production No:</span>
                  <span className="bar-detail-value">{item.productionNo}</span>
                </div>
                <div className="bar-detail-row">
                  <span className="bar-detail-label">Produced Qty:</span>
                  <span className="bar-detail-value">{item.producedQty || 0}</span>
                </div>
                <div className="bar-detail-row">
                  <span className="bar-detail-label">Status:</span>
                  <span className="bar-detail-value">{item.productionStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* QC Section */}
          {item.qcNo && (
            <div className="bar-detail-section">
              <h3>Quality Control</h3>
              <div className="bar-detail-grid">
                <div className="bar-detail-row">
                  <span className="bar-detail-label">QC Number:</span>
                  <span className="bar-detail-value">{item.qcNo}</span>
                </div>
                <div className="bar-detail-row">
                  <span className="bar-detail-label">QC Result:</span>
                  <span className={`bar-detail-value qc-${item.qcResult?.toLowerCase()}`}>
                    {item.qcResult || 'PENDING'}
                  </span>
                </div>
                <div className="bar-detail-row">
                  <span className="bar-detail-label">Status:</span>
                  <span className="bar-detail-value">{item.qcStatus}</span>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Section */}
          {item.sjNo && (
            <div className="bar-detail-section">
              <h3>Delivery</h3>
              <div className="bar-detail-grid">
                <div className="bar-detail-row">
                  <span className="bar-detail-label">SJ Number:</span>
                  <span className="bar-detail-value">{item.sjNo}</span>
                </div>
                <div className="bar-detail-row">
                  <span className="bar-detail-label">Delivery Date:</span>
                  <span className="bar-detail-value">
                    {item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="bar-detail-row">
                  <span className="bar-detail-label">Status:</span>
                  <span className="bar-detail-value">{item.deliveryStatus}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bar-detail-footer">
          <button className="bar-detail-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default BusinessActivityReportDetail;
