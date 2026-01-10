#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script untuk convert MASTER DATA trucking.xlsx ke CSV dengan tiga sheet
Sheet 1: Drivers
Sheet 2: Vehicles  
Sheet 3: Routes
"""

import pandas as pd
import sys
import os

def convert_excel_to_csv():
    excel_file = 'data/MASTER DATA trucking.xlsx'
    output_dir = 'data'
    
    if not os.path.exists(excel_file):
        print(f"[ERROR] File tidak ditemukan: {excel_file}")
        return
    
    try:
        # Baca semua sheet dari Excel
        excel_data = pd.read_excel(excel_file, sheet_name=None)
        
        print(f"[OK] File ditemukan: {excel_file}")
        print(f"[INFO] Jumlah sheet: {len(excel_data)}")
        print(f"[INFO] Nama sheet: {list(excel_data.keys())}")
        
        # Convert setiap sheet ke CSV
        for sheet_name, df in excel_data.items():
            # Bersihkan nama file dari karakter yang tidak valid
            safe_name = sheet_name.replace('/', '_').replace('\\', '_')
            csv_file = os.path.join(output_dir, f'tracking_master_{safe_name}.csv')
            
            # Simpan ke CSV
            df.to_csv(csv_file, index=False, encoding='utf-8-sig')
            print(f"[OK] Sheet '{sheet_name}' -> {csv_file} ({len(df)} rows)")
        
        print("\n[OK] Konversi selesai!")
        
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    convert_excel_to_csv()

