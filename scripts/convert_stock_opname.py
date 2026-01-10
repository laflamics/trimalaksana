#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert Stock Opname Excel file to CSV
"""

import pandas as pd
import os
import sys

def convert_excel_to_csv(excel_path, output_dir='data'):
    """Convert Excel file to CSV"""
    try:
        # Read Excel file
        print(f"Reading Excel file: {excel_path}")
        excel_file = pd.ExcelFile(excel_path)
        
        # Get sheet names
        sheet_names = excel_file.sheet_names
        print(f"Found {len(sheet_names)} sheet(s): {', '.join(sheet_names)}")
        
        # Convert each sheet to CSV
        for sheet_name in sheet_names:
            try:
                # Read sheet
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                
                # Generate CSV filename
                # Remove special characters and spaces from sheet name
                safe_sheet_name = sheet_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
                csv_filename = f"stock_opname_{safe_sheet_name}.csv"
                csv_path = os.path.join(output_dir, csv_filename)
                
                # Save to CSV
                df.to_csv(csv_path, index=False, encoding='utf-8')
                print(f"  [OK] Converted sheet '{sheet_name}' -> {csv_filename} ({len(df)} rows)")
                
            except Exception as e:
                print(f"  [ERROR] Error converting sheet '{sheet_name}': {e}")
        
        print(f"\n[OK] Conversion completed! CSV files saved to {output_dir}/")
        
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    # Default path
    excel_path = 'data/2025. Stock Opname 30 November 2025 Rev. 03.xlsx'
    
    # Check if file exists
    if not os.path.exists(excel_path):
        print(f"[ERROR] File not found: {excel_path}")
        sys.exit(1)
    
    # Convert
    convert_excel_to_csv(excel_path)

