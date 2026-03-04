#!/usr/bin/env python3
"""
Fix CSV spacing issues - clean up extra spaces in the Ket column
"""
import csv
import re
import sys

def clean_ket_field(ket_value):
    """Clean up the Ket field by removing extra spaces"""
    if not ket_value:
        return ket_value
    
    # Replace multiple spaces with single space
    cleaned = re.sub(r'\s+', ' ', ket_value.strip())
    return cleaned

def fix_csv_file(input_file, output_file):
    """Fix spacing in CSV file"""
    try:
        # Read the CSV file
        with open(input_file, 'r', encoding='utf-8') as infile:
            reader = csv.reader(infile)
            rows = list(reader)
        
        # Process each row
        if len(rows) > 0:
            # Keep header as is
            header = rows[0]
            ket_index = None
            
            # Find the Ket column index
            for i, col in enumerate(header):
                if col.strip().lower() == 'ket':
                    ket_index = i
                    break
            
            print(f"Found 'Ket' column at index: {ket_index}")
            print(f"Total rows: {len(rows)}")
            
            # Clean up Ket column in all data rows
            cleaned_rows = [header]
            for row_idx, row in enumerate(rows[1:], 1):
                if ket_index is not None and ket_index < len(row):
                    # Clean the Ket field
                    original_ket = row[ket_index]
                    cleaned_ket = clean_ket_field(original_ket)
                    
                    # Show changes for rows with excessive spaces
                    if len(original_ket) > len(cleaned_ket) + 5:
                        print(f"Row {row_idx}: Cleaned '{original_ket[:50]}...' -> '{cleaned_ket[:50]}...'")
                    
                    row[ket_index] = cleaned_ket
                
                cleaned_rows.append(row)
        
        # Write the cleaned CSV file
        with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.writer(outfile)
            writer.writerows(cleaned_rows)
        
        print(f"\n✅ Fixed CSV saved to: {output_file}")
        print(f"Total rows processed: {len(cleaned_rows) - 1}")

    except Exception as e:
        print(f"❌ Error: {e}")

# Process both files
files_to_fix = [
    ('scripts/master/master2/packaging_master.csv', 'scripts/master/master2/packaging_master_fixed.csv'),
    ('scripts/master/master2/LAP PENJUALAN DETAIL PERIODE FEBRUARI PER 9 FEB 2026(1).csv', 
     'scripts/master/master2/LAP PENJUALAN DETAIL PERIODE FEBRUARI PER 9 FEB 2026_FIXED.csv'),
]

for input_file, output_file in files_to_fix:
    print(f"\n{'='*60}")
    print(f"Processing: {input_file}")
    print(f"{'='*60}")
    fix_csv_file(input_file, output_file)
