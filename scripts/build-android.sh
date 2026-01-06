#!/bin/bash

# Script untuk build Android APK (cross-platform)
# Usage: npm run build:android

set -e

echo "🔨 Building Android APK..."

# Check Java version (Gradle 8.2.1 butuh Java 17-19)
echo "☕ Checking Java version..."
JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | sed '/^1\./s///' | cut -d'.' -f1)
echo "   Java version: $JAVA_VERSION"

# Try to use Java 17 if available (Gradle 8.2.1 compatible)
if [ "$JAVA_VERSION" -gt 19 ]; then
  echo "⚠️  Java $JAVA_VERSION detected. Gradle 8.2.1 requires Java 17-19."
  
  # Check if Java 17 is installed
  if [ -d "/usr/lib/jvm/java-17-openjdk" ]; then
    echo "✅ Found Java 17, switching to it..."
    export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
    export PATH="$JAVA_HOME/bin:$PATH"
  elif [ -d "/usr/lib/jvm/java-19-openjdk" ]; then
    echo "✅ Found Java 19, switching to it..."
    export JAVA_HOME=/usr/lib/jvm/java-19-openjdk
    export PATH="$JAVA_HOME/bin:$PATH"
  else
    echo "❌ Java 17 or 19 not found!"
    echo "   Please install: sudo pacman -S jdk17-openjdk"
    echo "   Or update Gradle to version that supports Java 25"
    exit 1
  fi
  
  # Verify Java version after switch
  NEW_JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | sed '/^1\./s///' | cut -d'.' -f1)
  echo "   Now using Java: $NEW_JAVA_VERSION"
fi

# Build renderer
echo "📦 Building renderer..."
npm run build:renderer

# Sync Capacitor
echo "🔄 Syncing Capacitor Android..."
npx cap sync android

# Generate Gradle wrapper
echo "🔧 Generating Gradle wrapper..."
node scripts/generate-gradle-wrapper.js

# Setup Android SDK location
echo "📱 Setting up Android SDK..."

# Check if ANDROID_HOME is set but directory doesn't exist
if [ -n "$ANDROID_HOME" ] && [ ! -d "$ANDROID_HOME" ]; then
  echo "⚠️  ANDROID_HOME is set to non-existent directory: $ANDROID_HOME"
  echo "   Unsetting ANDROID_HOME to auto-detect correct path..."
  unset ANDROID_HOME
fi

if [ -z "$ANDROID_HOME" ]; then
  # Try common Android SDK locations (urutkan dari yang paling umum)
  if [ -d "/opt/android-sdk" ]; then
    export ANDROID_HOME="/opt/android-sdk"
    echo "   Found Android SDK at: $ANDROID_HOME"
  elif [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
    echo "   Found Android SDK at: $ANDROID_HOME"
  elif [ -d "$HOME/.android/sdk" ]; then
    export ANDROID_HOME="$HOME/.android/sdk"
    echo "   Found Android SDK at: $ANDROID_HOME"
  else
    echo "❌ Android SDK not found!"
    echo "   Please install Android SDK:"
    echo "   - Via Android Studio: Install Android Studio, SDK will be at ~/Android/Sdk"
    echo "   - Via AUR: yay -S android-sdk android-sdk-platform-tools"
    echo "   - Or set ANDROID_HOME environment variable"
    exit 1
  fi
else
  echo "   Using ANDROID_HOME from environment: $ANDROID_HOME"
  # Verify that the directory actually exists
  if [ ! -d "$ANDROID_HOME" ]; then
    echo "❌ Android SDK directory tidak ditemukan: $ANDROID_HOME"
    echo "   Please install Android SDK atau set ANDROID_HOME ke path yang benar"
    exit 1
  fi
fi

# Create or update local.properties
LOCAL_PROPERTIES="android/local.properties"
if [ ! -d "$ANDROID_HOME" ]; then
  echo "❌ Android SDK directory tidak ditemukan: $ANDROID_HOME"
  echo "   Please install Android SDK atau set ANDROID_HOME ke path yang benar"
  exit 1
fi

# Always update local.properties dengan path yang benar
echo "📝 Updating local.properties..."
echo "sdk.dir=$ANDROID_HOME" > "$LOCAL_PROPERTIES"
echo "   Updated: $LOCAL_PROPERTIES with sdk.dir=$ANDROID_HOME"

# Accept Android SDK licenses (required untuk build)
echo "📜 Accepting Android SDK licenses..."
LICENSES_DIR="$ANDROID_HOME/licenses"
if [ ! -d "$LICENSES_DIR" ]; then
  echo "   Creating licenses directory..."
  sudo mkdir -p "$LICENSES_DIR" 2>/dev/null || mkdir -p "$LICENSES_DIR"
fi

# Accept all licenses (Android SDK License, Android SDK Build-Tools License, dll)
LICENSE_FILES=(
  "android-sdk-license"
  "android-sdk-preview-license"
  "intel-android-extra-license"
  "google-gdk-license"
)

for license_file in "${LICENSE_FILES[@]}"; do
  LICENSE_PATH="$LICENSES_DIR/$license_file"
  if [ ! -f "$LICENSE_PATH" ]; then
    echo "   Accepting license: $license_file"
    echo "24333f8a63b6825ea9c5514f83c2829b004d1fee" | sudo tee "$LICENSE_PATH" > /dev/null 2>&1 || \
    echo "24333f8a63b6825ea9c5514f83c2829b004d1fee" > "$LICENSE_PATH" 2>/dev/null
  fi
done

# Install required SDK components (perlu sudo jika SDK di /opt)
echo "📦 Installing required Android SDK components..."
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [ ! -f "$SDKMANAGER" ]; then
  SDKMANAGER="$ANDROID_HOME/tools/bin/sdkmanager"
fi

if [ -f "$SDKMANAGER" ]; then
  # Check if SDK is writable
  if [ ! -w "$ANDROID_HOME" ]; then
    echo "   SDK directory is read-only, installing components with sudo..."
    sudo "$SDKMANAGER" "platforms;android-34" "build-tools;34.0.0" --sdk_root="$ANDROID_HOME" || \
    echo "   Note: Some components may need manual installation"
  else
    echo "   Installing SDK components..."
    "$SDKMANAGER" "platforms;android-34" "build-tools;34.0.0" --sdk_root="$ANDROID_HOME" || \
    echo "   Note: Some components may need manual installation"
  fi
else
  echo "   ⚠️  sdkmanager not found, skipping component installation"
  echo "   Please install manually: sudo $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \"platforms;android-34\" \"build-tools;34.0.0\""
fi

# Verify local.properties
if [ -f "$LOCAL_PROPERTIES" ]; then
  echo "   Content: $(cat $LOCAL_PROPERTIES)"
fi

# Build APK
echo "🏗️  Building APK release..."
cd android

# Detect OS: Windows pakai .bat, Linux/Mac pakai gradlew
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
  # Windows
  if [ -f "gradlew.bat" ]; then
    echo "📦 Using Gradle wrapper (Windows)..."
    gradlew.bat assembleRelease
  else
    echo "❌ gradlew.bat not found!"
    exit 1
  fi
else
  # Linux/Mac - pakai gradle wrapper (preferred)
  if [ -f "gradlew" ]; then
    echo "📦 Using Gradle wrapper (Linux/Mac)..."
    chmod +x gradlew
    ./gradlew assembleRelease
  elif command -v gradle >/dev/null 2>&1; then
    # Fallback: pakai gradle system jika wrapper tidak ada
    echo "📦 Using system Gradle (wrapper not found)..."
    gradle assembleRelease
  else
    echo "❌ Gradle wrapper not found and system Gradle not available!"
    echo "   Please install Gradle: sudo pacman -S gradle"
    echo "   Or ensure gradlew exists in android/ directory"
    exit 1
  fi
fi

cd ..

# Upload APK
echo "📤 Uploading APK to server..."
node scripts/upload-android-apk.js

echo "✅ Android build and upload complete!"
