# 🍎 macOS Build Guide - Trima Laksana ERP

**Status**: Ready to Build  
**Date**: February 28, 2026  
**Platform**: macOS (Intel & Apple Silicon)

---

## 📋 Prerequisites

### 1. System Requirements
- **macOS**: 10.13 or later (Intel or Apple Silicon)
- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+
- **Xcode**: Command Line Tools installed
- **Disk Space**: ~5GB free

### 2. Install Xcode Command Line Tools
```bash
xcode-select --install
```

### 3. Verify Installation
```bash
node --version      # Should be v18+
npm --version       # Should be v9+
xcode-select -p     # Should show path to Xcode
```

---

## 🚀 Build Steps

### Step 1: Clean Install Dependencies
```bash
# Remove old node_modules and lock file
rm -rf node_modules package-lock.json

# Install fresh dependencies
npm install
```

### Step 2: Build for macOS
```bash
# Option A: Build DMG (Recommended for distribution)
npm run build:app:mac

# Option B: Build ZIP (Faster, for testing)
npm run build:app:mac:zip

# Option C: Build both DMG and ZIP
npm run build:app:mac:all
```

### Step 3: Find Your Build
```bash
# Built files will be in:
ls -la release-build/

# You should see:
# - PT.Trima\ Laksana\ Jaya\ Pratama-1.0.6-build.162.dmg
# - PT.Trima\ Laksana\ Jaya\ Pratama-1.0.6-build.162.zip
# - latest-mac.yml (for auto-updates)
```

---

## 📝 Build Scripts to Add

Add these scripts to `package.json` in the `"scripts"` section:

```json
"build:app:mac": "node scripts/pre-build-generate-app-update.js && node scripts/update-build-version.js && node scripts/pre-build-cleanup.js && node scripts/ensure-previous-version.js && npm run build:all && CSC_IDENTITY_AUTO_DISCOVERY=false SKIP_NOTARIZATION=true electron-builder --mac --x64 --arm64 && node scripts/generate-latest-mac-yml.js",
"build:app:mac:fast": "node scripts/update-build-version.js && npm run build:all && CSC_IDENTITY_AUTO_DISCOVERY=false SKIP_NOTARIZATION=true electron-builder --mac --x64 --arm64 && node scripts/generate-latest-mac-yml.js",
"build:app:mac:zip": "node scripts/update-build-version.js && npm run build:all && CSC_IDENTITY_AUTO_DISCOVERY=false SKIP_NOTARIZATION=true electron-builder --mac --x64 --arm64 -c.artifactName='${productName}-${version}.${ext}'",
"build:app:mac:all": "npm run build:app:mac && npm run build:app:mac:zip"
```

---

## 🔧 Configuration

### electron-builder.yml - macOS Section

Current config already has macOS support:

```yaml
mac:
  target: dmg
  icon: public/noxtiz.ico  # Will be converted to .icns
```

**For better macOS support, update to:**

```yaml
mac:
  target:
    - dmg
    - zip
  icon: build/icon.icns  # Use .icns format
  category: public.app-category.business
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  signingIdentity: null  # Set to your signing identity if code signing
  identity: null
  notarize: false  # Set to true if you have Apple Developer account
```

---

## 🎨 Icon Setup for macOS

### Option 1: Use Existing Icon (Automatic Conversion)
```bash
# electron-builder will auto-convert .ico to .icns
# Just ensure public/noxtiz.ico exists
ls -la public/noxtiz.ico
```

### Option 2: Create Proper .icns File
```bash
# If you have a PNG file, convert to ICNS:
# Using ImageMagick
convert public/noxtiz.png -define icon:auto-resize=256,128,96,64,48,32,16 build/icon.icns

# Or using sips (built-in macOS tool)
sips -s format icns public/noxtiz.png --out build/icon.icns
```

---

## 🏗️ Build Architecture

### Universal Binary (Intel + Apple Silicon)
```bash
# Build for both architectures
npm run build:app:mac

# This creates:
# - x64 (Intel)
# - arm64 (Apple Silicon)
```

### Intel Only (Faster)
```bash
# Edit electron-builder.yml:
# mac:
#   target: dmg
#   arch: x64  # Add this line
```

### Apple Silicon Only
```bash
# Edit electron-builder.yml:
# mac:
#   target: dmg
#   arch: arm64  # Add this line
```

---

## 📦 Output Files

### DMG (Disk Image)
```
PT.Trima Laksana Jaya Pratama-1.0.6-build.162.dmg
├── PT.Trima Laksana Jaya Pratama.app
└── Applications (symlink)
```

**Size**: ~150-200MB  
**Format**: Compressed disk image  
**Distribution**: Recommended for end users

### ZIP
```
PT.Trima Laksana Jaya Pratama-1.0.6-build.162.zip
└── PT.Trima Laksana Jaya Pratama.app
```

**Size**: ~100-150MB  
**Format**: Compressed archive  
**Distribution**: For direct app distribution

### latest-mac.yml
```yaml
version: 1.0.6-build.162
files:
  - url: PT.Trima Laksana Jaya Pratama-1.0.6-build.162.dmg
    sha512: ...
    size: ...
path: PT.Trima Laksana Jaya Pratama-1.0.6-build.162.dmg
sha512: ...
releaseDate: 2026-02-28T...
```

**Purpose**: Auto-update manifest

---

## 🔐 Code Signing (Optional)

### Without Code Signing (Development)
```bash
# Already configured - just build
npm run build:app:mac
```

### With Code Signing (Production)
```bash
# 1. Get your signing identity
security find-identity -v -p codesigning

# 2. Update electron-builder.yml
mac:
  signingIdentity: "Developer ID Application: Your Name (XXXXXXXXXX)"
  identity: "Developer ID Application: Your Name (XXXXXXXXXX)"

# 3. Build
npm run build:app:mac
```

### Notarization (Apple Requirement for Distribution)
```bash
# 1. Set up Apple Developer account
# 2. Create app-specific password
# 3. Update electron-builder.yml
mac:
  notarize:
    teamId: XXXXXXXXXX  # Your Team ID
    appleId: your-email@example.com
    appleIdPassword: "@keychain:AC_PASSWORD"

# 4. Build
npm run build:app:mac
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module" errors
```bash
# Solution: Clean install
rm -rf node_modules package-lock.json
npm install
npm run build:all
```

### Issue: Icon not showing
```bash
# Solution: Ensure icon file exists
ls -la public/noxtiz.ico
ls -la public/noxtiz.png

# Or create .icns file
sips -s format icns public/noxtiz.png --out build/icon.icns
```

### Issue: Build fails on Apple Silicon
```bash
# Solution: Install native dependencies
npm install --build-from-source

# Or use Rosetta 2
arch -x86_64 npm install
```

### Issue: "Code signature invalid"
```bash
# Solution: Disable code signing for development
export CSC_IDENTITY_AUTO_DISCOVERY=false
export SKIP_NOTARIZATION=true
npm run build:app:mac
```

### Issue: DMG creation fails
```bash
# Solution: Check disk space
df -h

# Or use ZIP instead
npm run build:app:mac:zip
```

---

## 📊 Build Performance

### Typical Build Times
- **First Build**: 5-10 minutes (includes all dependencies)
- **Subsequent Builds**: 2-3 minutes
- **Fast Build** (`build:app:mac:fast`): 1-2 minutes

### Optimization Tips
```bash
# 1. Use fast build for development
npm run build:app:mac:fast

# 2. Skip unnecessary steps
npm run build:all && electron-builder --mac

# 3. Build for single architecture
# Edit electron-builder.yml to specify arch: x64 or arm64

# 4. Use SSD for faster builds
# Ensure project is on SSD, not external drive
```

---

## 🚀 Distribution

### Option 1: Direct Download
1. Upload DMG to your server
2. Share download link
3. Users download and install

### Option 2: Auto-Update
1. Upload DMG and latest-mac.yml to server
2. App checks for updates automatically
3. Users get notified of new versions

### Option 3: App Store
1. Create Apple Developer account
2. Submit app to Mac App Store
3. Users install from App Store

### Option 4: Homebrew
```bash
# Create Homebrew formula
# Users can install with: brew install trima-laksana-erp
```

---

## 📋 Checklist

- [ ] macOS 10.13+ available
- [ ] Node.js v18+ installed
- [ ] Xcode Command Line Tools installed
- [ ] Dependencies installed (`npm install`)
- [ ] Build scripts added to package.json
- [ ] Icon files present (noxtiz.ico, noxtiz.png)
- [ ] Disk space available (~5GB)
- [ ] No TypeScript errors (`npm run build:all`)
- [ ] Ready to build (`npm run build:app:mac`)

---

## 🎯 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build for macOS
npm run build:app:mac

# 3. Find your app
ls -la release-build/

# 4. Install and test
open release-build/PT.Trima\ Laksana\ Jaya\ Pratama-*.dmg
```

---

## 📞 Support

### Common Issues
- **Build fails**: Check Node.js version and disk space
- **Icon missing**: Ensure icon files exist in public/
- **Code signing**: Use `CSC_IDENTITY_AUTO_DISCOVERY=false`
- **Apple Silicon**: Build with `--arm64` flag

### Resources
- [Electron Builder Docs](https://www.electron.build/)
- [macOS Code Signing](https://www.electron.build/code-signing)
- [Notarization Guide](https://www.electron.build/code-signing#macos)

---

## 🎉 You're Ready!

Your Trima Laksana ERP app is ready to build for macOS!

```bash
npm run build:app:mac
```

The built app will be in `release-build/` directory.

---

**Created**: February 28, 2026  
**Status**: Ready to Build  
**Next**: Run build command and test on macOS
