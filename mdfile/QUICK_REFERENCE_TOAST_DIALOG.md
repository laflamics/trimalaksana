# Quick Reference - Toast & Dialog Usage

---

## Toast Notifications

### Import
```typescript
import { useToast } from '../../hooks/useToast';
```

### Usage
```typescript
const { showToast, ToastContainer } = useToast();

// In JSX
<ToastContainer />
```

### Show Toast
```typescript
// Success
showToast('Operation successful', 'success');

// Error
showToast('Something went wrong', 'error');

// Info
showToast('Information message', 'info');

// Warning
showToast('Warning message', 'warning');
```

### Toast Types
| Type | Icon | Color | Usage |
|------|------|-------|-------|
| success | ✓ | Green | Operations completed |
| error | ✕ | Red | Errors/failures |
| info | ℹ | Blue | Information |
| warning | ⚠ | Orange | Warnings |

### Auto-dismiss
- Default: 3000ms (3 seconds)
- Custom: `showToast(message, type, 5000)` for 5 seconds

---

## Dialog System

### Import
```typescript
import { useDialog } from '../../hooks/useDialog';
```

### Usage
```typescript
const { showAlert, showConfirm, closeDialog, DialogComponent } = useDialog();

// In JSX
<DialogComponent />
```

### Show Alert
```typescript
showAlert('This is an alert message', 'Alert Title');
```

### Show Confirmation
```typescript
showConfirm(
  'Are you sure you want to delete?',
  async () => {
    // Confirmed action
    await deleteItem();
    showToast('Item deleted', 'success');
  },
  () => {
    // Cancelled action (optional)
    console.log('Cancelled');
  },
  'Confirm Delete'
);
```

---

## Common Patterns

### Add/Create Operation
```typescript
const handleSave = async () => {
  try {
    // Validation
    if (!formData.name) {
      showToast('Name is required', 'error');
      return;
    }
    
    // Save
    await storageService.set(key, data);
    
    // Success
    showToast(`"${formData.name}" created successfully`, 'success');
    resetForm();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
};
```

### Edit Operation
```typescript
const handleEdit = (item) => {
  setEditingItem(item);
  setFormData(item);
  setShowForm(true);
};

const handleSave = async () => {
  try {
    // Update
    const updated = items.map(i => 
      i.id === editingItem.id ? { ...formData } : i
    );
    await storageService.set(key, updated);
    
    // Success
    showToast(`"${formData.name}" updated successfully`, 'success');
    resetForm();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
};
```

### Delete Operation
```typescript
const handleDelete = (item) => {
  showConfirm(
    `Delete "${item.name}"?\n\nThis action cannot be undone.`,
    async () => {
      try {
        const updated = items.filter(i => i.id !== item.id);
        await storageService.set(key, updated);
        showToast(`"${item.name}" deleted successfully`, 'success');
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
    },
    undefined,
    'Confirm Delete'
  );
};
```

### Import Operation
```typescript
const handleImport = async (file) => {
  try {
    const data = parseFile(file);
    
    if (data.length === 0) {
      showToast('No data found in file', 'error');
      return;
    }
    
    showConfirm(
      `Import ${data.length} items?`,
      async () => {
        await storageService.set(key, data);
        showToast(`Imported ${data.length} items`, 'success');
      },
      undefined,
      'Confirm Import'
    );
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
};
```

### Export Operation
```typescript
const handleExport = () => {
  try {
    const file = generateFile(data);
    downloadFile(file);
    showToast(`Exported ${data.length} items`, 'success');
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
};
```

---

## Form Dialog Pattern

### Structure
```typescript
{showForm && (
  <div className="dialog-overlay" onClick={() => resetFormState()}>
    <div onClick={(e) => e.stopPropagation()} 
         style={{ maxWidth: '800px', width: '90%', ... }}>
      <Card title={editingItem ? "Edit Item" : "Add New Item"}>
        {/* Form inputs */}
        <Input
          label="Name"
          value={formData.name || ''}
          onChange={(v) => setFormData({ ...formData, name: v })}
        />
        
        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button onClick={resetFormState} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary">
            {editingItem ? 'Update' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  </div>
)}
```

### Reset Function
```typescript
const resetFormState = () => {
  setShowForm(false);
  setEditingItem(null);
  setFormData({ name: '', email: '', ... });
};
```

---

## Styling

### Dialog Overlay
```css
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
```

### Dialog Card
```css
.dialog-card {
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 10001;
}
```

### Toast Container
```css
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  background: white;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 300px;
  animation: slideIn 0.3s ease-out;
}

.toast-success { border-left: 4px solid #28a745; }
.toast-error { border-left: 4px solid #dc3545; }
.toast-warning { border-left: 4px solid #ffc107; }
.toast-info { border-left: 4px solid #17a2b8; }
```

---

## Best Practices

### ✅ DO
- Use toast for non-critical feedback
- Use dialog for confirmations
- Show success messages after operations
- Show error messages with details
- Auto-dismiss toasts after 3 seconds
- Use clear, concise messages
- Provide action buttons in dialogs

### ❌ DON'T
- Use alerts for everything
- Show multiple toasts at once
- Use vague error messages
- Block user with dialogs unnecessarily
- Forget to handle errors
- Leave forms in dirty state
- Use hardcoded strings

---

## Common Messages

### Success
```typescript
showToast(`"${item.name}" created successfully`, 'success');
showToast(`"${item.name}" updated successfully`, 'success');
showToast(`"${item.name}" deleted successfully`, 'success');
showToast(`Imported ${count} items`, 'success');
showToast(`Exported ${count} items`, 'success');
```

### Error
```typescript
showToast('Name is required', 'error');
showToast('Email is invalid', 'error');
showToast(`Error: ${error.message}`, 'error');
showToast('Network error. Please try again', 'error');
```

### Warning
```typescript
showToast(`Imported ${count} items with ${errors} errors`, 'warning');
showToast('Some fields are empty', 'warning');
```

### Info
```typescript
showToast('Loading...', 'info');
showToast('No data found', 'info');
```

---

## Migration Checklist

- [ ] Import `useToast` hook
- [ ] Import `useDialog` hook
- [ ] Add `<ToastContainer />` to JSX
- [ ] Add `<DialogComponent />` to JSX
- [ ] Replace `alert()` with `showToast()`
- [ ] Replace `confirm()` with `showConfirm()`
- [ ] Test all operations
- [ ] Test error handling
- [ ] Test on mobile
- [ ] Test on different browsers

---

## Troubleshooting

### Toast not showing
```typescript
// Check 1: Is ToastContainer rendered?
<ToastContainer />

// Check 2: Is useToast imported?
import { useToast } from '../../hooks/useToast';

// Check 3: Is showToast called correctly?
showToast('Message', 'success');
```

### Dialog not showing
```typescript
// Check 1: Is DialogComponent rendered?
<DialogComponent />

// Check 2: Is useDialog imported?
import { useDialog } from '../../hooks/useDialog';

// Check 3: Is showConfirm called correctly?
showConfirm('Message', onConfirm, onCancel, 'Title');
```

### Form not resetting
```typescript
// Check 1: Is resetFormState called?
onClick={() => resetFormState()}

// Check 2: Does resetFormState reset all state?
const resetFormState = () => {
  setShowForm(false);
  setEditingItem(null);
  setFormData({ /* all fields */ });
};
```

---

## Resources

- Hook: `src/hooks/useToast.tsx`
- Hook: `src/hooks/useDialog.tsx`
- CSS: `src/styles/toast.css`
- Example: `src/pages/Master/Products.tsx`
- Example: `src/pages/Master/Customers.tsx`
- Example: `src/pages/Master/Suppliers.tsx`

---

**Last Updated**: March 12, 2026  
**Version**: 1.0  
**Status**: ✅ Ready to Use

