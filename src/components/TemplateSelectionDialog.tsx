import React from 'react';
import Button from './Button';

interface TemplateSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: number) => void;
  templates: Array<{
    id: number;
    name: string;
    description: string;
  }>;
}

export const TemplateSelectionDialog: React.FC<TemplateSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  templates,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-primary)' }}>
          Pilih Template Surat Jalan
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {templates.map((template) => (
            <div
              key={template.id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: 'var(--bg-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                e.currentTarget.style.borderColor = 'var(--primary-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
              onClick={() => {
                onSelectTemplate(template.id);
                onClose();
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>
                Template {template.id}: {template.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {template.description}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
};
