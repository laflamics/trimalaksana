# 🍎 macOS Build - Quick Start

**Status**: Ready to Build  
**Time**: ~5-10 minutes first build, ~2-3 minutes after  
**Output**: DMG + ZIP files in `release-build/`

---

## ⚡ Quick Build (Copy & Paste)

### Step 1: Prepare
```bash
# Go to project directory
cd /path/to/trima-laksana-erp

# Install dependencies (first time only)
npm install
```

### Step 2: Build
```bash
# Build for macOS (Intel + Apple Silicon)
npm run build:app:mac
```

### Step 3: Find Your App
```bash
# Open release-build folder
open release-build/

# Or list files
ls -lh release-build/
```

---

## 📦 What You Get

After build completes, you'll have:

```
release-build/
├── PT.Trima Laksana Jaya Pratama-1.0.6-build.162.dmg    (150-200MB)
├── PT.Trima Laksana Jaya Pratama-1.0.6-build.162.zip    (100-150MB)
└── latest-mac.yml                                        (manifest)
```

---

## 🚀 Install & Test

### Option 1: DMG (Recommended)
```bash
# Open DMG file
open release-build/PT.Trima\ Laksana\ Jaya\ Pratama-*.dmg

# Drag app to Applications folder
# Or double-click to install
```

### Option 2: ZIP
```bash
# Extract ZIP
unzip release-build/PT.Trima\ Laksana\ Jaya\ Pratama-*.zip

# Run app
open PT.Trima\ Laksana\ Jaya\ Pratama.app
```

### Option 3: Direct Run
```bash
# Run from release-build
open release-build/PT.Trima\ Laksana\ Jaya\ Pratama.app
```

---

## 🔧 Build Options

### Fast Build (Development)
```bash
# Skips cleanup and version update
npm run build:app:mac:fast
```

### ZIP Only (Faster)
```bash
# Only creates ZIP, no DMG
npm run build:app:mac:zip
```

### Both DMG & ZIP
```bash
# Creates both formats
npm run build:app:mac:all
```

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build:app:mac
```

### "Cannot find module" Error
```bash
# Rebuild TypeScript
npm run build:main
npm run build:renderer
npm run build:app:mac
```

### Icon Not Showing
```bash
# Ensure icon exists
ls -la public/noxtiz.ico
ls -la public/noxtiz.png

# If missing, copy from Windows build
cp ../windows-build/public/noxtiz.* public/
```

### Apple Silicon Issues
```bash
# Build for Intel only
# Edit electron-builder.yml, change:
# mac:
#   arch: x64

npm run build:app:mac
```

---

## 📊 Build Progress

You'll see output like:
```
✔ Building main process
✔ Building renderer process
✔ Packing application
✔ Building macOS DMG
✔ Building macOS ZIP
✔ Generating latest-mac.yml
✅ Build complete!
```

---

## 📁 File Locations

| File | Location | Size | Purpose |
|------|----------|------|---------|
| DMG | `release-build/*.dmg` | 150-200MB | Distribution (recommended) |
| ZIP | `release-build/*.zip` | 100-150MB | Direct distribution |
| Manifest | `release-build/latest-mac.yml` | <1KB | Auto-update manifest |
| App | Inside DMG/ZIP | - | Actual application |

---

## 🎯 Next Steps

1. **Test the app**
   ```bash
   open release-build/PT.Trima\ Laksana\ Jaya\ Pratama.app
   ```

2. **Share DMG file**
   - Upload to server
   - Share download link
   - Users download and install

3. **Setup auto-updates** (optional)
   - Upload DMG + latest-mac.yml to server
   - App checks for updates automatically

---

## 💡 Tips

- **First build takes longer** (5-10 min) - subsequent builds are faster (2-3 min)
- **Use fast build** for development: `npm run build:app:mac:fast`
- **Build on SSD** for better performance
- **Close other apps** to speed up build
- **Check disk space** - need ~5GB free

---

## ✅ Checklist

- [ ] Node.js v18+ installed
- [ ] Xcode Command Line Tools installed
- [ ] Dependencies installed (`npm install`)
- [ ] No TypeScript errors
- [ ] Icon files present
- [ ] Disk space available
- [ ] Ready to build!

---

## 🎉 You're Ready!

```bash
npm run build:app:mac
```

Your macOS app will be ready in ~5-10 minutes!

---

**For detailed guide**: See `MACOS_BUILD_GUIDE.md`  
**For Windows build**: See `WINDOWS_BUILD_GUIDE.md` (if exists)  
**For Linux build**: See `LINUX_BUILD_GUIDE.md` (if exists)
