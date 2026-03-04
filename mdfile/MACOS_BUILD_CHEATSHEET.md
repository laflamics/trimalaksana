# 🍎 macOS Build - Cheatsheet

**Copy & Paste Commands**

---

## 🚀 Build Commands

### Full Build (Production)
```bash
npm run build:app:mac
```

### Fast Build (Development)
```bash
npm run build:app:mac:fast
```

### ZIP Only (Testing)
```bash
npm run build:app:mac:zip
```

### Both DMG & ZIP
```bash
npm run build:app:mac:all
```

---

## 📦 Find Your App

```bash
# Open release-build folder
open release-build/

# Or list files
ls -lh release-build/
```

---

## 🧪 Test App

```bash
# Run from DMG
open release-build/PT.Trima\ Laksana\ Jaya\ Pratama.app

# Or extract ZIP and run
unzip release-build/PT.Trima\ Laksana\ Jaya\ Pratama-*.zip
open PT.Trima\ Laksana\ Jaya\ Pratama.app
```

---

## 🔧 Setup (First Time)

```bash
# Install dependencies
npm install

# Verify Node.js version
node --version  # Should be v18+

# Verify Xcode tools
xcode-select -p  # Should show path
```

---

## 🐛 Troubleshooting

### Clean Build
```bash
rm -rf node_modules package-lock.json
npm install
npm run build:app:mac
```

### Check Icon
```bash
ls -la public/noxtiz.ico
ls -la public/noxtiz.png
```

### Check Disk Space
```bash
df -h
```

---

## 📊 Output Files

| File | Size | Purpose |
|------|------|---------|
| `.dmg` | 150-200MB | Distribution |
| `.zip` | 100-150MB | Direct share |
| `latest-mac.yml` | <1KB | Auto-update |

---

## ⏱️ Build Times

- **First build**: 5-10 minutes
- **Fast build**: 1-2 minutes
- **ZIP only**: 1-2 minutes

---

## 💡 Tips

- Use `build:app:mac:fast` for development
- Build on SSD for better performance
- Close other apps to speed up build
- Check disk space before building

---

## 📚 Full Guides

- **Quick Start**: `MACOS_BUILD_QUICK_START.md`
- **Detailed**: `MACOS_BUILD_GUIDE.md`
- **Setup**: `MACOS_BUILD_SETUP_COMPLETE.md`

---

**Ready to build?**
```bash
npm run build:app:mac
```
