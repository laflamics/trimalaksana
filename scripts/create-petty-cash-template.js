const XLSX = require('xlsx');

// Create template data for Petty Cash
const templateData = [
  {
    'Date': '2026-02-07',
    'Type': 'PettyCash',
    'Category': 'Electricity',
    'Description': 'Monthly electricity bill',
    'Amount': '500000',
    'Payment Method': 'Cash',
    'Approved By': 'Manager Name',
    'Requestor': 'Employee Name',
    'Notes': 'February 2026'
  },
  {
    'Date': '2026-02-07',
    'Type': 'PettyCash',
    'Category': 'Logistics',
    'Description': 'Fuel for delivery',
    'Amount': '250000',
    'Payment Method': 'Bank Transfer',
    'Approved By': 'Manager Name',
    'Requestor': 'Driver Name',
    'Notes': ''
  },
  {
    'Date': '2026-02-08',
    'Type': 'PettyCash',
    'Category': 'Other',
    'Description': 'Office supplies',
    'Amount': '150000',
    'Payment Method': 'Cash',
    'Approved By': 'Manager Name',
    'Requestor': 'Admin Staff',
    'Notes': 'Pens, paper, and stationery'
  }
];

// Create workbook
const ws = XLSX.utils.json_to_sheet(templateData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Petty Cash');

// Set column widths
ws['!cols'] = [
  { wch: 12 }, // Date
  { wch: 12 }, // Type
  { wch: 15 }, // Category
  { wch: 25 }, // Description
  { wch: 12 }, // Amount
  { wch: 15 }, // Payment Method
  { wch: 15 }, // Approved By
  { wch: 15 }, // Requestor
  { wch: 20 }  // Notes
];

// Write file
XLSX.writeFile(wb, 'Petty_Cash_Import_Template.xlsx');
console.log('✅ Template created: Petty_Cash_Import_Template.xlsx');
