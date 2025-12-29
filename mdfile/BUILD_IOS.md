# Panduan Build iOS untuk Trima Laksana ERP

## 🚀 Build dari Windows via GitHub Actions (TANPA APP STORE!)

**SOLUSI UNTUK WINDOWS USER!** Kamu bisa build iOS dari Windows pakai **GitHub Actions** dan dapatkan **IPA file** yang bisa langsung di-share via WhatsApp tanpa perlu App Store!

### Cara Pakai GitHub Actions:

1. **Push code ke GitHub** (jika belum):
   ```bash
   git add .
   git commit -m "Setup iOS build"
   git push origin main
   ```

2. **Jalankan Workflow**:
   - Buka repository di GitHub
   - Klik tab **Actions**
   - Pilih workflow **Build iOS**
   - Klik **Run workflow**
   - Pilih build type: **shareable** (untuk IPA yang bisa di-share)
   - Klik **Run workflow**

3. **Download IPA File**:
   - Tunggu workflow selesai (sekitar 5-10 menit)
   - Klik pada run yang selesai
   - Scroll ke bawah, download **ios-build** artifacts
   - Extract file **TrimaLaksanaERP.ipa**

4. **Share via WhatsApp**:
   - Kirim file `.ipa` via WhatsApp ke user
   - User install pakai tools (lihat cara install di bawah)

### Otomatis Build saat Push:
Workflow akan otomatis jalan kalau kamu push ke branch `main` atau `master` dan ada perubahan di:
- `src/**`
- `package.json`
- `capacitor.config.json`

### Catatan GitHub Actions:
- ✅ **Gratis** untuk public repo
- ✅ **macOS runner** sudah include Xcode
- ✅ **Build artifacts** tersimpan **30 hari** (untuk shareable build)
- ✅ **IPA file** bisa langsung di-share via WhatsApp
- ⚠️ Untuk **signing & App Store**, butuh setup Apple Developer secrets (opsional)

---

## 📲 Cara Install IPA ke iPhone (Tanpa App Store)

Setelah dapat file `.ipa` dari GitHub Actions, install ke iPhone pakai salah satu cara ini:

### Opsi 0: Install Langsung dari iPhone (BERBAYAR) 💰

**Service Online yang Support Install Langsung dari iPhone:**

1. **Signulous** (https://signulous.com/) - $20/tahun
   - Upload IPA via browser di iPhone
   - Install langsung tanpa komputer
   - Auto-refresh setiap 7 hari

2. **AppDB** (https://appdb.to/) - €15/tahun
   - Upload IPA via browser
   - Install langsung dari iPhone
   - Support multiple apps

3. **ESign** (https://esign.com/) - Berbayar
   - Upload IPA via web
   - Install langsung dari iPhone

**Cara Pakai:**
1. Upload file IPA ke service tersebut
2. Buka link di Safari iPhone
3. Install langsung tanpa komputer ✅

**Catatan:** Service ini berbayar tapi paling praktis kalau mau install langsung dari iPhone tanpa komputer.

---

### Opsi 1: Sideloadly (PALING MUDAH & GRATIS) ⭐

**Download:** https://sideloadly.io/

1. **Install Sideloadly** di Windows/Mac
2. **Connect iPhone** ke komputer via USB
3. **Trust computer** di iPhone (kalau muncul popup)
4. **Buka Sideloadly**
5. **Pilih file IPA** (TrimaLaksanaERP.ipa)
6. **Pilih device** (iPhone kamu)
7. **Masukkan Apple ID** (bisa pakai Apple ID gratis)
8. Klik **Start** dan tunggu selesai
9. **Di iPhone**: Settings > General > VPN & Device Management > Trust developer
10. App siap dipakai! ✅

**Catatan:**
- App akan expired setelah 7 hari (gratis Apple ID)
- Install ulang kalau sudah expired
- Tidak perlu jailbreak

### Opsi 2: AltStore

**Download:** https://altstore.io/

1. Install **AltServer** di Mac/PC
2. Install **AltStore** di iPhone (via AltServer)
3. Buka **AltStore** di iPhone
4. Pilih **My Apps** > **+** > pilih file IPA
5. Tunggu install selesai

**Catatan:**
- Butuh refresh setiap 7 hari via AltServer
- Lebih kompleks setup-nya

### Opsi 3: 3uTools

**Download:** https://www.3u.com/

1. Install **3uTools** di Windows/Mac
2. Connect iPhone via USB
3. Pilih **Apps** > **Install IPA**
4. Pilih file IPA
5. Tunggu install selesai

### Opsi 4: Xcode (Kalau Punya Mac)

1. Buka **Xcode**
2. Connect iPhone via USB
3. **Window** > **Devices and Simulators**
4. Pilih iPhone kamu
5. Drag file `.ipa` ke **Installed Apps**
6. Tunggu install selesai

### Troubleshooting Install:

#### 🔴 Device Tidak Terdeteksi di Sideloadly

**Solusi Step-by-Step:**

1. **Install iTunes/Apple Mobile Device Support:**
   - Download **iTunes** dari Apple (https://www.apple.com/itunes/)
   - Atau install **Apple Mobile Device Support** saja (lebih ringan)
   - Restart komputer setelah install

2. **Trust Computer di iPhone:**
   - Unlock iPhone
   - Connect via USB
   - Kalau muncul popup "Trust This Computer?" → Tap **Trust**
   - Masukkan passcode iPhone kalau diminta

3. **Cek USB Connection:**
   - Coba ganti kabel USB (pakai original Apple cable kalau bisa)
   - Coba port USB lain di komputer
   - Jangan pakai USB hub, langsung ke port komputer

4. **Enable USB Accessories (iOS 11.4.1+):**
   - Settings > Face ID & Passcode (atau Touch ID & Passcode)
   - Scroll ke bawah, pastikan **"USB Accessories"** ON
   - Kalau OFF, unlock iPhone dulu baru bisa connect

5. **Restart Services (Windows):**
   ```powershell
   # Buka PowerShell as Administrator
   net stop "Apple Mobile Device Service"
   net start "Apple Mobile Device Service"
   ```
   - Atau restart komputer

6. **Cek Device Manager (Windows):**
   - Buka Device Manager
   - Cek apakah iPhone muncul di "Portable Devices" atau "Universal Serial Bus controllers"
   - Kalau ada tanda seru kuning → Update driver
   - Kalau tidak muncul sama sekali → Coba restart iPhone

7. **Restart iPhone:**
   - Restart iPhone (hold power + volume down)
   - Connect lagi setelah restart

8. **Cek Sideloadly Version:**
   - Update Sideloadly ke versi terbaru
   - Download dari: https://sideloadly.io/

9. **Coba Tools Lain:**
   - **3uTools** (https://www.3u.com/) - Alternatif yang lebih reliable
   - **AltStore** (https://altstore.io/) - Butuh setup lebih kompleks

10. **Cek Windows Firewall/Antivirus:**
    - Matikan antivirus sementara
    - Allow Sideloadly di Windows Firewall

**Error: "Untrusted Developer"**
- Settings > General > VPN & Device Management
- Tap developer certificate
- Tap **Trust**

**Error: "App cannot be installed"**
- Pastikan iOS version compatible
- Coba pakai tools lain (Sideloadly biasanya paling reliable)

**App expired setelah 7 hari:**
- Install ulang file IPA
- Atau pakai Apple Developer Account ($99/tahun) untuk 1 tahun validity

---

## Build Lokal di macOS

## Persyaratan

**PENTING**: Build iOS lokal hanya bisa dilakukan di **macOS** dengan **Xcode** terinstall.

### Software yang Diperlukan:
1. **macOS** (versi terbaru direkomendasikan)
2. **Xcode** (download dari App Store)
3. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
4. **CocoaPods** (untuk dependency management):
   ```bash
   sudo gem install cocoapods
   ```

### Apple Developer Account:
- Untuk build dan deploy ke App Store, butuh **Apple Developer Account** ($99/tahun)
- Untuk testing di device sendiri, bisa pakai **Free Apple ID** (terbatas)

## Setup Awal

### 1. Install Dependencies
```bash
npm install
```

### 2. Add iOS Platform (Hanya Sekali)
```bash
npm run cap:add:ios
```

Ini akan membuat folder `ios/` di project kamu.

### 3. Sync Project ke iOS
```bash
npm run cap:sync:ios
```

Atau bisa langsung:
```bash
npm run build:ios
```

## Build untuk Development/Testing

### Build dan Buka di Xcode:
```bash
npm run build:ios
```

Ini akan:
1. Build React app
2. Sync ke iOS project
3. Buka Xcode secara otomatis

### Di Xcode:
1. Pilih **scheme** (device atau simulator)
2. Klik **Run** (▶️) untuk build dan run
3. Atau pilih **Product > Archive** untuk build release

## Build untuk Release/App Store

### 1. Sync Project:
```bash
npm run build:ios:release
```

### 2. Buka di Xcode:
```bash
npx cap open ios
```

### 3. Di Xcode:

#### a. Setup Signing & Capabilities:
1. Pilih project di sidebar
2. Pilih target **App**
3. Tab **Signing & Capabilities**
4. Pilih **Team** (Apple Developer Account)
5. Xcode akan generate **Provisioning Profile** otomatis

#### b. Setup App Icons & Launch Screen:
- Icon: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Launch Screen: `ios/App/App/Assets.xcassets/LaunchImage.imageset/`

#### c. Build Archive:
1. Pilih **Any iOS Device** atau device fisik
2. **Product > Archive**
3. Tunggu sampai selesai
4. Window **Organizer** akan muncul

#### d. Upload ke App Store:
1. Di **Organizer**, pilih archive yang baru dibuat
2. Klik **Distribute App**
3. Pilih **App Store Connect**
4. Ikuti wizard untuk upload

## Build untuk Sharing (Tanpa App Store)

### Via GitHub Actions (Recommended):
1. Pilih build type: **shareable**
2. Download IPA file dari artifacts
3. Share via WhatsApp/email
4. User install pakai Sideloadly/AltStore/3uTools

### Via Xcode Lokal:
1. **Product > Archive**
2. Di **Organizer**, pilih archive
3. **Distribute App**
4. Pilih **Ad Hoc** atau **Development**
5. Export sebagai `.ipa` file
6. Share file IPA ke user

### Install ke Device:
- **Sideloadly** (paling mudah) ⭐
- **AltStore** (butuh AltServer)
- **3uTools** (Windows/Mac)
- **Xcode** (kalau punya Mac)

## Konfigurasi Tambahan

### Update App Info:
File: `ios/App/App/Info.plist`
- Bundle identifier
- Version number
- Display name
- dll

### Update Capacitor Config:
File: `capacitor.config.json`
```json
{
  "appId": "com.trimalaksana.erp",
  "appName": "Trima Laksana ERP",
  "webDir": "dist/renderer",
  "ios": {
    "contentInset": "automatic"
  }
}
```

## Troubleshooting

### Error: "No such module 'Capacitor'"
```bash
cd ios/App
pod install
cd ../..
```

### Error: "Code signing is required"
- Pastikan sudah pilih **Team** di Xcode
- Atau setup **Signing Certificate** manual

### Error: "Provisioning profile not found"
- Pastikan **Bundle Identifier** sama dengan di Apple Developer
- Atau regenerate provisioning profile di Xcode

### Build Error di Windows
- **SOLUSI**: Pakai **GitHub Actions** (lihat section di atas) ✅
- Atau pakai **macOS VM/Cloud** (MacStadium, AWS Mac, dll)
- Atau minta bantuan developer yang punya Mac

## Script yang Tersedia

- `npm run cap:add:ios` - Add iOS platform (sekali)
- `npm run cap:sync:ios` - Sync project ke iOS
- `npm run build:ios` - Build dan buka Xcode
- `npm run build:ios:release` - Build untuk release

## Catatan Penting

1. **Build iOS HARUS di macOS** - Tidak bisa di Windows/Linux
2. **Xcode wajib** - Tidak bisa build tanpa Xcode
3. **Apple Developer Account** - Untuk deploy ke App Store
4. **Sync setelah setiap perubahan** - Jalankan `npm run cap:sync:ios` setelah update code
5. **Pod install** - Jalankan `pod install` di folder `ios/App` jika ada masalah dependency

## Next Steps

Setelah build berhasil (via GitHub Actions atau lokal):
1. Download build artifacts dari GitHub Actions (jika pakai GitHub)
2. Extract dan buka folder `ios/App/` di Xcode
3. Test di **iOS Simulator** dulu
4. Test di **device fisik** (iPhone/iPad)
5. Upload ke **TestFlight** untuk beta testing
6. Submit ke **App Store** untuk production

## Setup Apple Developer Secrets (Opsional)

Untuk build signed dan upload ke App Store via GitHub Actions, tambahkan secrets di repository:

1. Buka repository di GitHub
2. **Settings** > **Secrets and variables** > **Actions**
3. Tambahkan secrets:
   - `APPLE_TEAM_ID` - Team ID dari Apple Developer
   - `APPLE_CERTIFICATE_BASE64` - Certificate dalam format base64
   - `APPLE_CERTIFICATE_PASSWORD` - Password certificate
   - `APPLE_PROVISIONING_PROFILE_BASE64` - Provisioning profile base64

**Note**: Untuk development/testing, secrets ini tidak wajib. Build tetap bisa jalan tanpa signing.

