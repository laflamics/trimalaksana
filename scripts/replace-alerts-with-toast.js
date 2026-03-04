#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/services/report-service.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf-8');

// Count before
const alertCountBefore = (content.match(/alert\(/g) || []).length;
console.log(`📊 Found ${alertCountBefore} alert() calls`);

// Replace patterns
// Pattern 1: alert('✅ Laporan berhasil di-export!');
content = content.replace(/alert\('✅ Laporan berhasil di-export!'\);/g, "toast.success('Laporan berhasil di-export!');");

// Pattern 2: alert('✅ Laporan "..." berhasil di-export!');
content = content.replace(/alert\('✅ Laporan "([^"]+)" berhasil di-export!'\);/g, "toast.success('Laporan \"$1\" berhasil di-export!');");

// Pattern 3: alert(`❌ Error: ...`);
content = content.replace(/alert\(`❌ Error: \$\{error instanceof Error \? error\.message : 'Unknown error'\}`\);/g, "toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);");

// Pattern 4: alert('⚠️ Report harus menggunakan server mode...');
content = content.replace(/alert\('⚠️ Report harus menggunakan server mode\. Pastikan server URL sudah dikonfigurasi di Settings → Server Data'\);/g, "toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');");

// Pattern 5: alert('❌ Tidak ada data...');
content = content.replace(/alert\('❌ Tidak ada data ([^']+)'\);/g, "toast.error('Tidak ada data $1');");

// Pattern 6: alert('❌ Error: ...');
content = content.replace(/alert\(`❌ Error: ([^`]+)`\);/g, "toast.error(`Error: $1`);");

// Count after
const alertCountAfter = (content.match(/alert\(/g) || []).length;
console.log(`✅ Replaced ${alertCountBefore - alertCountAfter} alert() calls`);
console.log(`⚠️ Remaining alert() calls: ${alertCountAfter}`);

// Write the file
fs.writeFileSync(filePath, content, 'utf-8');
console.log(`📝 File updated: ${filePath}`);
