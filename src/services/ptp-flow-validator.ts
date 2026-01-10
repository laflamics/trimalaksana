/**
 * PTP Flow Validator
 * Ensures PTP follows same validation and QC requirements as SO flow
 * CRITICAL FIX for PTP flow consistency issues
 */

export interface PTPValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresQC: boolean;
  requiresInvoice: boolean;
}

export interface PTPFlowConfig {
  enforceQC: boolean; // Always require QC, even for stock-fulfilled items
  requireInvoiceGeneration: boolean; // Require invoice/documentation for PTP
  validateSameasSO: boolean; // Use same validation rules as SO→SPK
}

class PTPFlowValidator {
  private config: PTPFlowConfig = {
    enforceQC: true, // CRITICAL: Always enforce QC
    requireInvoiceGeneration: true, // Require proper documentation
    validateSameasSO: true, // Use same validation as SO flow
  };

  /**
   * Validate PTP creation (same rules as SO creation)
   */
  validatePTPCreation(ptpData: any): PTPValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Same validation as SO creation
    if (!ptpData.customer || !ptpData.customer.trim()) {
      errors.push('Customer is required for PTP');
    }

    if (!ptpData.items || !Array.isArray(ptpData.items) || ptpData.items.length === 0) {
      errors.push('PTP must have at least one product item');
    }

    // Validate each item (same as SO items)
    ptpData.items?.forEach((item: any, index: number) => {
      if (!item.productId && !item.productKode) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }
      if (!item.qty || item.qty <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (!item.price || item.price <= 0) {
        warnings.push(`Item ${index + 1}: Price not set - will use default product price`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresQC: this.config.enforceQC, // Always require QC
      requiresInvoice: this.config.requireInvoiceGeneration,
    };
  }

  /**
   * Validate SPK creation from PTP (same rules as SO→SPK)
   */
  validateSPKFromPTP(ptpData: any, spkData: any): PTPValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.validateSameasSO) {
      return {
        isValid: true,
        errors: [],
        warnings: ['PTP→SPK validation disabled'],
        requiresQC: this.config.enforceQC,
        requiresInvoice: this.config.requireInvoiceGeneration,
      };
    }

    // Same validation as SO→SPK
    if (!spkData.spkNo || !spkData.spkNo.trim()) {
      errors.push('SPK Number is required');
    }

    if (!spkData.product_id && !spkData.productId) {
      errors.push('Product ID is required for SPK');
    }

    if (!spkData.qty || spkData.qty <= 0) {
      errors.push('SPK quantity must be greater than 0');
    }

    // Validate PTP is confirmed (same as SO confirmation requirement)
    if (ptpData.status !== 'CONFIRMED' && ptpData.status !== 'OPEN') {
      errors.push('PTP must be confirmed before creating SPK');
    }

    // CRITICAL: Validate stock fulfillment still requires QC
    if (spkData.stockFulfilled === true && !spkData.requiresQC) {
      errors.push('CRITICAL: Stock-fulfilled SPK must still require QC validation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresQC: this.config.enforceQC, // Always require QC
      requiresInvoice: this.config.requireInvoiceGeneration,
    };
  }

  /**
   * Validate QC process for PTP (enforce QC even for stock-fulfilled)
   */
  validatePTPQCProcess(spkData: any, qcData: any): PTPValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // CRITICAL: Always require QC, even for stock-fulfilled items
    if (spkData.stockFulfilled === true && !qcData) {
      errors.push('CRITICAL: Stock-fulfilled items must still go through QC process');
    }

    if (qcData) {
      if (!qcData.qcResult || !['PASS', 'FAIL', 'PARTIAL'].includes(qcData.qcResult)) {
        errors.push('QC Result must be PASS, FAIL, or PARTIAL');
      }

      if (qcData.qcResult === 'PARTIAL') {
        if (!qcData.qtyPassed || !qcData.qtyFailed) {
          errors.push('PARTIAL QC result requires qtyPassed and qtyFailed');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresQC: true, // Always require QC
      requiresInvoice: this.config.requireInvoiceGeneration,
    };
  }

  /**
   * Validate PTP invoice/documentation requirements
   */
  validatePTPDocumentation(ptpData: any, deliveryData: any): PTPValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.requireInvoiceGeneration) {
      return {
        isValid: true,
        errors: [],
        warnings: ['PTP invoice generation disabled'],
        requiresQC: this.config.enforceQC,
        requiresInvoice: false,
      };
    }

    // Require proper documentation for PTP
    if (deliveryData && deliveryData.status === 'DELIVERED') {
      if (!deliveryData.invoiceNo && !deliveryData.internalTransferNo) {
        errors.push('PTP delivery requires invoice number or internal transfer documentation');
      }

      if (!deliveryData.documentType) {
        warnings.push('Document type not specified (INVOICE vs INTERNAL_TRANSFER)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiresQC: this.config.enforceQC,
      requiresInvoice: true,
    };
  }

  /**
   * Get PTP flow configuration
   */
  getConfig(): PTPFlowConfig {
    return { ...this.config };
  }

  /**
   * Update PTP flow configuration
   */
  updateConfig(newConfig: Partial<PTPFlowConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Validate complete PTP flow consistency with SO flow
   */
  validatePTPFlowConsistency(ptpData: any, spkData: any, qcData: any, deliveryData: any): PTPValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Validate each step
    const ptpValidation = this.validatePTPCreation(ptpData);
    const spkValidation = this.validateSPKFromPTP(ptpData, spkData);
    const qcValidation = this.validatePTPQCProcess(spkData, qcData);
    const docValidation = this.validatePTPDocumentation(ptpData, deliveryData);

    // Collect all errors and warnings
    allErrors.push(...ptpValidation.errors, ...spkValidation.errors, ...qcValidation.errors, ...docValidation.errors);
    allWarnings.push(...ptpValidation.warnings, ...spkValidation.warnings, ...qcValidation.warnings, ...docValidation.warnings);

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      requiresQC: this.config.enforceQC,
      requiresInvoice: this.config.requireInvoiceGeneration,
    };
  }
}

// Singleton instance
export const ptpFlowValidator = new PTPFlowValidator();