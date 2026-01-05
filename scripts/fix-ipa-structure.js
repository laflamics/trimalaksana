#!/usr/bin/env node

/**
 * Script untuk memperbaiki struktur IPA file yang salah
 * 
 * IPA file yang benar harus punya struktur:
 * - Payload/
 *   - App.app/
 * 
 * Script ini akan:
 * 1. Extract IPA yang ada
 * 2. Perbaiki strukturnya
 * 3. Re-zip dengan struktur yang benar
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ipaPath = process.argv[2];

if (!ipaPath) {
  console.error('❌ Usage: node scripts/fix-ipa-structure.js <path-to-ipa-file>');
  console.error('   Example: node scripts/fix-ipa-structure.js E:/TrimaLaksanaERP.ipa');
  process.exit(1);
}

if (!fs.existsSync(ipaPath)) {
  console.error(`❌ File tidak ditemukan: ${ipaPath}`);
  process.exit(1);
}

const ipaDir = path.dirname(ipaPath);
const ipaName = path.basename(ipaPath, '.ipa');
const tempDir = path.join(ipaDir, `_temp_${ipaName}`);
const fixedIpaPath = path.join(ipaDir, `${ipaName}_fixed.ipa`);

try {
  console.log('🔧 Memperbaiki struktur IPA file...');
  console.log(`📁 File: ${ipaPath}`);
  
  // 1. Buat temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });
  
  // 2. Extract IPA (IPA adalah zip file, tapi PowerShell tidak support .ipa extension)
  console.log('📦 Extracting IPA...');
  const extractDir = path.join(tempDir, 'extracted');
  fs.mkdirSync(extractDir, { recursive: true });
  
  // Rename .ipa ke .zip untuk bisa di-extract oleh PowerShell
  const zipPath = path.join(tempDir, `${ipaName}.zip`);
  fs.copyFileSync(ipaPath, zipPath);
  
  try {
    // Extract dengan PowerShell (sekarang sudah .zip)
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, {
      stdio: 'inherit'
    });
    // Hapus file zip temporary
    fs.unlinkSync(zipPath);
  } catch (error) {
    // Cleanup zip file jika error
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    // Fallback: coba pakai 7zip atau tools lain jika tersedia
    try {
      // Coba pakai 7z jika tersedia
      execSync(`7z x "${ipaPath}" -o"${extractDir}" -y`, {
        stdio: 'inherit'
      });
    } catch (error2) {
      console.error('❌ Gagal extract IPA.');
      console.error('💡 Tips: IPA file sebenarnya adalah ZIP file.');
      console.error('   Coba rename manual: Rename .ipa ke .zip, extract, fix struktur, lalu zip lagi.');
      throw new Error('Tidak bisa extract IPA. PowerShell Expand-Archive tidak support .ipa extension.');
    }
  }
  
  // 3. Cek struktur yang ada
  const extractedFiles = fs.readdirSync(extractDir);
  let appPath = null;
  
  // Cek apakah ada folder Payload
  if (extractedFiles.includes('Payload')) {
    const payloadPath = path.join(extractDir, 'Payload');
    const payloadFiles = fs.readdirSync(payloadPath);
    if (payloadFiles.length > 0) {
      appPath = path.join(payloadPath, payloadFiles[0]);
      console.log('✅ Struktur Payload sudah benar');
    }
  } else {
    // Cari App.app langsung di root
    const appDirs = extractedFiles.filter(f => f.endsWith('.app'));
    if (appDirs.length > 0) {
      appPath = path.join(extractDir, appDirs[0]);
      console.log('⚠️  Struktur tidak benar, memperbaiki...');
    }
  }
  
  if (!appPath || !fs.existsSync(appPath)) {
    throw new Error('❌ App.app tidak ditemukan di dalam IPA');
  }
  
  // 4. Buat struktur yang benar
  const payloadDir = path.join(tempDir, 'Payload');
  fs.mkdirSync(payloadDir, { recursive: true });
  
  const appName = path.basename(appPath);
  const targetAppPath = path.join(payloadDir, appName);
  
  console.log('📋 Menyalin App.app ke Payload/...');
  if (fs.existsSync(targetAppPath)) {
    fs.rmSync(targetAppPath, { recursive: true, force: true });
  }
  
  // Copy recursive
  function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(file => {
        copyRecursive(path.join(src, file), path.join(dest, file));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  
  copyRecursive(appPath, targetAppPath);
  
  // 5. Zip Payload folder menjadi IPA baru
  console.log('📦 Membuat IPA baru dengan struktur yang benar...');
  const zipDir = path.dirname(payloadDir);
  const tempZipPath = path.join(zipDir, `${ipaName}_temp.zip`);
  
  try {
    // Pakai PowerShell untuk zip (Windows) - zip dulu, baru rename ke .ipa
    execSync(`powershell -Command "Compress-Archive -Path '${payloadDir}' -DestinationPath '${tempZipPath}' -Force"`, {
      stdio: 'inherit',
      cwd: zipDir
    });
    // Rename .zip ke .ipa
    if (fs.existsSync(tempZipPath)) {
      if (fs.existsSync(fixedIpaPath)) {
        fs.unlinkSync(fixedIpaPath);
      }
      fs.renameSync(tempZipPath, fixedIpaPath);
    }
  } catch (error) {
    // Cleanup temp zip jika error
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }
    // Fallback pakai 7zip atau tools lain
    try {
      execSync(`7z a "${fixedIpaPath}" "${payloadDir}\\*"`, {
        stdio: 'inherit',
        cwd: zipDir
      });
    } catch (error2) {
      console.error('❌ Gagal membuat IPA.');
      console.error('💡 Tips: Zip folder Payload secara manual, lalu rename ke .ipa');
      throw new Error('Tidak bisa membuat IPA. Pastikan PowerShell tersedia.');
    }
  }
  
  // 6. Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  console.log('');
  console.log('✅ IPA file berhasil diperbaiki!');
  console.log(`📁 File baru: ${fixedIpaPath}`);
  console.log('');
  console.log('📱 Langkah selanjutnya:');
  console.log('1. Coba install file IPA yang baru dengan Sideloadly');
  console.log('2. File lama bisa dihapus jika sudah berhasil');
  
} catch (error) {
  console.error('');
  console.error('❌ Error:', error.message);
  
  // Cleanup on error
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  process.exit(1);
}

