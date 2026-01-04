# Setup SSH Server di Windows (PC Utama)

## Install OpenSSH Server di Windows

### Windows 10/11 (Built-in OpenSSH)

1. **Buka PowerShell sebagai Administrator** (Right click → Run as Administrator)

2. **Install OpenSSH Server:**
   ```powershell
   # Cek apakah sudah terinstall
   Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
   
   # Install OpenSSH Server
   Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
   ```

3. **Start SSH Server:**
   ```powershell
   Start-Service sshd
   Set-Service -Name sshd -StartupType 'Automatic'
   ```

4. **Cek status:**
   ```powershell
   Get-Service sshd
   ```

5. **Allow SSH di Windows Firewall (jika perlu):**
   ```powershell
   New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
   ```

6. **Test dari laptop:**
   ```bash
   ssh server-tljp@server-tljp.tail75a421.ts.net
   ```

## Alternatif: Pakai Shared Folder (SMB/CIFS)

Kalau SSH tidak bisa, bisa pakai shared folder Windows:

1. **Share folder di Windows:**
   - Right click folder `D:\trimalaksana\apps\PT.Trima Laksana Jaya Pratama\docker\data`
   - Properties → Sharing → Share
   - Set permissions (Read/Write)

2. **Mount di Linux:**
   ```bash
   # Install cifs-utils
   sudo pacman -S cifs-utils
   
   # Mount shared folder
   sudo mkdir -p /mnt/windows-share
   sudo mount -t cifs //server-tljp.tail75a421.ts.net/data /mnt/windows-share -o username=server-tljp,password=YOUR_PASSWORD
   ```

3. **Update script untuk pakai mount point ini**

## Alternatif: Pakai HTTP Upload (yang sudah ada)

Kalau semua tidak bisa, tetap pakai HTTP upload tapi dengan optimasi:
- Direct IP (sudah ada)
- Raw binary (sudah ada)
- Compression disabled (sudah ada)
