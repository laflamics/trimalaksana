#!/usr/bin/env node

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const excelPath = path.join(__dirname, '../data/uploads/SObaruJan2026 copy.xlsx');
const workbook = XLSX.readFile(excelPath);

console.log('=== EXCEL FILE ANALYSIS ===\n');

// Get sheet names
console.log('Sheet Names:', workbook.SheetNames);
console.log();

// Read first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

console.log(`=== SHEET: ${sheetName} ===`);
console.log(`Total Rows: ${jsonData.length}`);
console.log();

if (jsonData.length > 0) {
  console.log('=== COLUMNS ===');
  const columns = Object.keys(jsonData[0]);
  columns.forEach((col, idx) => {
    console.log(`${idx + 1}. ${col}`);
  });
  console.log();

  console.log('=== FIRST 5 ROWS ===');
  jsonData.slice(0, 5).forEach((row, idx) => {
    console.log(`\nRow ${idx + 1}:`);
    console.log(JSON.stringify(row, null, 2));
  });
  console.log();

  console.log('=== SAMPLE DATA TYPES ===');
  const firstRow = jsonData[0];
  Object.entries(firstRow).forEach(([key, value]) => {
    console.log(`${key}: ${typeof value} (${value})`);
  });
}
