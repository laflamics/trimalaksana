const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');
const keystorePath = path.join(androidDir, 'trimalaksana-release.keystore');
const keystorePropertiesPath = path.join(androidDir, 'keystore.properties');

// Check if keystore already exists
if (fs.existsSync(keystorePath)) {
    console.log('✓ Keystore already exists at:', keystorePath);
    process.exit(0);
}

console.log('Generating Android release keystore...');
console.log('This will create a keystore file for signing your Android APK.');
console.log('');

// Default values (you can change these)
const keystoreAlias = 'trimalaksana';
const keystorePassword = 'trimalaksana123'; // Change this to a secure password
const keyPassword = 'trimalaksana123'; // Change this to a secure password
const validityYears = 10000; // 10000 years validity

// Generate keystore using keytool
try {
    const keytoolCommand = `keytool -genkey -v -keystore "${keystorePath}" -alias ${keystoreAlias} -keyalg RSA -keysize 2048 -validity ${validityYears} -storepass ${keystorePassword} -keypass ${keyPassword} -dname "CN=PT.Trima Laksana Jaya Pratama, OU=IT, O=PT.Trima Laksana Jaya Pratama, L=Jakarta, ST=Jakarta, C=ID"`;
    
    execSync(keytoolCommand, { stdio: 'inherit' });
    
    console.log('✓ Keystore generated successfully!');
    
    // Create keystore.properties file
    const keystoreProperties = `storeFile=trimalaksana-release.keystore
storePassword=${keystorePassword}
keyAlias=${keystoreAlias}
keyPassword=${keyPassword}
`;
    
    fs.writeFileSync(keystorePropertiesPath, keystoreProperties);
    console.log('✓ keystore.properties created!');
    console.log('');
    console.log('⚠️  IMPORTANT: Keep your keystore file and password secure!');
    console.log('   - Keystore location:', keystorePath);
    console.log('   - Store password:', keystorePassword);
    console.log('   - Key password:', keyPassword);
    console.log('   - Alias:', keystoreAlias);
    console.log('');
    console.log('⚠️  Make sure to add keystore.properties to .gitignore!');
    
} catch (error) {
    console.error('✗ Error generating keystore:', error.message);
    console.error('');
    console.error('Make sure Java JDK is installed and keytool is in your PATH.');
    process.exit(1);
}

