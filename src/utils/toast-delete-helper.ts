/**
 * Toast-based delete helper - Non-blocking delete with toast confirmation
 * User dapat langsung lanjut kerja tanpa menunggu dialog
 */

export interface DeleteOptions {
  itemName: string;
  onConfirm: () => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  showConfirm?: (message: string, onConfirm: () => void, onCancel?: () => void, title?: string) => void;
}

/**
 * Delete dengan toast confirmation
 * Jika user confirm, langsung show success toast dan execute delete di background
 * User bisa langsung lanjut kerja
 */
export const handleToastDelete = async (options: DeleteOptions) => {
  const { itemName, onConfirm, showToast, showConfirm } = options;

  // Jika ada showConfirm, gunakan untuk confirmation dialog
  if (showConfirm) {
    showConfirm(
      `Delete "${itemName}"?\n\nThis action cannot be undone.`,
      async () => {
        try {
          // Show loading toast
          showToast(`Deleting "${itemName}"...`, 'info');
          
          // Execute delete
          await onConfirm();
          
          // Show success toast
          showToast(`"${itemName}" deleted successfully`, 'success');
        } catch (error: any) {
          showToast(`Error deleting "${itemName}": ${error.message}`, 'error');
        }
      },
      undefined,
      'Delete Confirmation'
    );
  } else {
    // Fallback: langsung execute delete tanpa confirmation
    try {
      showToast(`Deleting "${itemName}"...`, 'info');
      await onConfirm();
      showToast(`"${itemName}" deleted successfully`, 'success');
    } catch (error: any) {
      showToast(`Error deleting "${itemName}": ${error.message}`, 'error');
    }
  }
};

/**
 * Delete dengan toast confirmation - Simplified version
 * Langsung execute delete tanpa dialog, hanya show toast
 */
export const handleQuickDelete = async (
  itemName: string,
  onDelete: () => Promise<void>,
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
) => {
  try {
    showToast(`Deleting "${itemName}"...`, 'info');
    await onDelete();
    showToast(`"${itemName}" deleted successfully`, 'success');
  } catch (error: any) {
    showToast(`Error deleting "${itemName}": ${error.message}`, 'error');
  }
};
