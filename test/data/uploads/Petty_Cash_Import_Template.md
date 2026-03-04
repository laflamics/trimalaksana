# Petty Cash Import Template for Operational Expenses

## Required Headers (Column Names)

Use **exactly** these column headers in your Excel file for Petty Cash import:

| Column | Header Name | Example | Notes |
|--------|------------|---------|-------|
| 1 | **Date** | 2026-02-07 | Format: YYYY-MM-DD |
| 2 | **Type** | PettyCash | Must contain "petty" or "pc" (case-insensitive) |
| 3 | **Category** | Electricity | Options: Electricity, Water, Gas, Salary, Logistics, Other |
| 4 | **Description** | Monthly electricity bill | Required field |
| 5 | **Amount** | 500000 | Numbers only, no currency symbol |
| 6 | **Payment Method** | Cash | Options: Cash, Bank Transfer, Check, Credit Card |
| 7 | **Approved By** | Manager Name | Optional |
| 8 | **Requestor** | Employee Name | Optional (for Petty Cash) |
| 9 | **Notes** | Additional notes | Optional |

## Alternative Header Names (Case-Insensitive)

The system accepts these alternative names for each column:

### Date Column
- Date, DATE, Tanggal, TANGGAL, Expense Date, expense date

### Type Column
- Type, TYPE, Tipe, TIPE
- **Must contain "petty" or "pc"** to be recognized as Petty Cash

### Category Column
- Category, CATEGORY, Kategori, KATEGORI

### Description Column
- Description, DESCRIPTION, Deskripsi, DESKRIPSI

### Amount Column
- Amount, AMOUNT, Jumlah, JUMLAH

### Payment Method Column
- Payment Method, PAYMENT METHOD, Metode Pembayaran, metode pembayaran

### Approved By Column
- Approved By, APPROVED BY, Disetujui Oleh, disetujui oleh

### Requestor Column
- Requestor, REQUESTOR, Peminta, PEMINTA

### Notes Column
- Notes, NOTES, Catatan, CATATAN

## Example Excel Data

```
Date          | Type      | Category    | Description              | Amount  | Payment Method | Approved By | Requestor      | Notes
2026-02-07    | PettyCash | Electricity | Monthly electricity bill | 500000  | Cash           | Manager     | John Doe       | Feb 2026
2026-02-07    | PettyCash | Logistics   | Fuel for delivery        | 250000  | Bank Transfer  | Manager     | Jane Smith     | 
2026-02-08    | PettyCash | Other       | Office supplies          | 150000  | Cash           | Manager     | Bob Johnson    | Pens & paper
```

## Important Notes

1. **Date Format**: Must be YYYY-MM-DD (e.g., 2026-02-07)
2. **Type**: Must contain "petty" or "pc" to be recognized as Petty Cash (e.g., "PettyCash", "PC", "Petty Cash")
3. **Category**: Must be one of: Electricity, Water, Gas, Salary, Logistics, Other
4. **Description**: Required - cannot be empty
5. **Amount**: Required - numbers only, no currency symbols
6. **Payment Method**: Must be one of: Cash, Bank Transfer, Check, Credit Card
7. **Requestor**: Specific to Petty Cash - shows who requested the expense
8. **Empty rows**: Will be skipped automatically

## Troubleshooting

If import fails:
- Check that **Date** and **Description** columns are not empty
- Verify **Type** contains "petty" or "pc"
- Ensure **Amount** contains only numbers
- Check that **Category** is one of the valid options
- Make sure column headers match exactly (or use alternatives listed above)
