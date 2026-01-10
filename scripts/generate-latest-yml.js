const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RELEASE_DIR = path.join(__dirname, '..', 'release-build');
const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const { getBuildNumber } = require('./get-build-number');

// Wrap dalam async function untuk support await
(async () => {
  try {
    // Read package.json to get version
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
    const version = packageJson.version;
    const buildNumber = getBuildNumber();

    // CRITICAL FIX: Electron-updater requires valid semver format (MAJOR.MINOR.PATCH)
    // Format dengan 4 bagian (1.0.6.4) tidak valid untuk semver
    // Gunakan prerelease format: 1.0.6-build.4 atau build metadata: 1.0.6+4
    // Untuk generic provider, gunakan prerelease format: 1.0.6-build.4
    // Note: package.json.version sudah di-update dengan build number di update-build-version.js
    // Jadi kita bisa langsung pakai version dari package.json, atau extract base version
    let versionWithBuild;
    if (version.includes('-build.')) {
      // Version sudah include build number, pakai langsung
      versionWithBuild = version;
    } else {
      // Version belum include build number, tambahkan
      versionWithBuild = `${version}-build.${buildNumber}`;
    }

    // Find the installer exe file
    const files = fs.readdirSync(RELEASE_DIR);
    // Lebih fleksibel: cari semua .exe yang bukan blockmap atau patch
    let installerFile = files.find(f => 
      f.endsWith('.exe') && 
      !f.includes('blockmap') &&
      !f.endsWith('.exe.patch') &&
      f.includes('PT.Trima Laksana Jaya Pratama')
    );

    // Fallback: cari .exe apapun yang bukan blockmap atau patch
    if (!installerFile) {
      installerFile = files.find(f => 
        f.endsWith('.exe') && 
        !f.includes('blockmap') &&
        !f.endsWith('.exe.patch')
      );
    }

    if (!installerFile) {
      console.error(`⚠️  Installer .exe file not found in ${RELEASE_DIR}`);
      console.error(`   Available files: ${files.filter(f => f.endsWith('.exe')).join(', ') || 'none'}`);
      process.exit(0);
    }

    // CRITICAL FIX: Extract version from installer filename
    // Filename format: "PT.Trima Laksana Jaya Pratama 1.0.6-build.22.exe"
    // This ensures version in latest.yml matches the actual installer file
    let versionFromFilename = null;
    const versionMatch = installerFile.match(/(\d+\.\d+\.\d+(?:-build\.\d+)?)/);
    if (versionMatch) {
      versionFromFilename = versionMatch[1];
      console.log(`📦 Extracted version from filename: ${versionFromFilename}`);
    }

    const installerPath = path.join(RELEASE_DIR, installerFile);
    const stats = fs.statSync(installerPath);
    const fileSize = stats.size;

    // Calculate SHA512 hash for main installer (pakai streaming untuk file besar - LEBIH CEPAT)
    console.log(`📊 Calculating SHA512 hash for ${installerFile} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);
    const hashSum = crypto.createHash('sha512');
    const fileStream = fs.createReadStream(installerPath);

    // Pakai streaming untuk calculate hash (tidak load seluruh file ke memory)
    const sha512 = await new Promise((resolve, reject) => {
      fileStream.on('data', (chunk) => {
        hashSum.update(chunk);
      });
      fileStream.on('end', () => {
        resolve(hashSum.digest('hex'));
      });
      fileStream.on('error', (error) => {
        reject(error);
      });
    });

    // Generate files section: main installer + patch file (jika ada untuk differential update)
    let filesSection = `  - url: ${installerFile}
    sha512: ${sha512}
    size: ${fileSize}`;
    
    // Cek apakah ada patch file untuk differential update
    const patchFile = files.find(f => f.endsWith('.exe.patch') && f.includes('PT.Trima Laksana Jaya Pratama'));
    if (patchFile) {
      const patchPath = path.join(RELEASE_DIR, patchFile);
      const patchStats = fs.statSync(patchPath);
      const patchSize = patchStats.size;
      
      // Calculate SHA512 untuk patch file
      console.log(`📊 Calculating SHA512 hash for patch file ${patchFile} (${(patchSize / 1024 / 1024).toFixed(2)} MB)...`);
      const patchHashSum = crypto.createHash('sha512');
      const patchStream = fs.createReadStream(patchPath);
      
      const patchSha512 = await new Promise((resolve, reject) => {
        patchStream.on('data', (chunk) => {
          patchHashSum.update(chunk);
        });
        patchStream.on('end', () => {
          resolve(patchHashSum.digest('hex'));
        });
        patchStream.on('error', (error) => {
          reject(error);
        });
      });
      
      filesSection += `\n  - url: ${patchFile}
    sha512: ${patchSha512}
    size: ${patchSize}`;
      console.log(`✅ Found patch file for differential update: ${patchFile}`);
    }

    // Use version from filename if available (more reliable), otherwise use from package.json
    const finalVersion = versionFromFilename || versionWithBuild;

    const latestYml = `version: ${finalVersion}
files:
${filesSection}
path: ${installerFile}
sha512: ${sha512}
releaseDate: '${new Date().toISOString()}'
`;

    console.log(`✅ Generated latest.yml with version: ${finalVersion}`);
    console.log(`   Installer file: ${installerFile}`);

    // Write latest.yml
    const latestYmlPath = path.join(RELEASE_DIR, 'latest.yml');
    fs.writeFileSync(latestYmlPath, latestYml, 'utf8');

    // Cleanup: Hapus semua file yang tidak diperlukan
    // Keep: .exe installer, latest.yml, dan patch file (jika ada untuk differential update)
    const allFiles = fs.readdirSync(RELEASE_DIR);
    const patchFileName = patchFile || null;
    const filesToKeep = [installerFile, 'latest.yml', patchFileName].filter(Boolean);
    
    for (const file of allFiles) {
      // Skip file yang perlu di-keep
      if (filesToKeep.includes(file)) {
        continue;
      }
      
      const filePath = path.join(RELEASE_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        // Hanya hapus file, skip folder (seperti win-unpacked)
        if (stats.isFile()) {
          // Hapus file debug dan file tambahan (tapi keep patch file untuk differential update)
          if (file.endsWith('.yaml') || 
              (file.endsWith('.yml') && file !== 'latest.yml') || 
              file.endsWith('.7z') || 
              file.endsWith('.blockmap') || 
              file.includes('builder-')) {
            fs.unlinkSync(filePath);
            console.log(`🧹 Cleaned up ${file}`);
          }
        }
      } catch (error) {
        // Skip jika error (file mungkin sudah dihapus)
      }
    }
  } catch (error) {
    console.error(`❌ Error generating latest.yml: ${error.message}`);
    process.exit(1);
  }
})();

