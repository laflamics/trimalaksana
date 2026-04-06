; Custom NSIS script - CARA BARU: Langsung kill tanpa check, skip dialog error
; Override built-in check dengan cara yang benar-benar berbeda

; Override built-in check - langsung kill tanpa dialog, tidak check lagi
!macro customCheckAppRunning
  DetailPrint "Closing running application..."
  ; Kill process - pakai nsExec yang tidak muncul dialog
  nsExec::Exec 'taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T'
  Pop $0
  Sleep 10000
  nsExec::Exec 'taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T'
  Pop $0
  Sleep 10000
  nsExec::Exec 'wmic process where name="PT.Trima Laksana Jaya Pratama.exe" delete'
  Pop $0
  Sleep 10000
  ; Langsung lanjut - tidak check lagi apakah masih running
  DetailPrint "Continuing installation..."
!macroend

; Kill di preInit dengan delay sangat lama
!macro preInit
  DetailPrint "Pre-initialization: closing application..."
  nsExec::Exec 'taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T'
  Pop $0
  Sleep 20000
  nsExec::Exec 'taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T'
  Pop $0
  Sleep 20000
!macroend

!macro customUnInstall
  DetailPrint "Closing application before uninstall..."
  nsExec::Exec 'taskkill /F /IM "PT.Trima Laksana Jaya Pratama.exe" /T'
  Pop $0
  Sleep 10000
!macroend

; Set icon untuk shortcuts (Desktop dan Start Menu)
!macro customFinish
  ; Icon sudah di-set oleh electron-builder dari win.icon
  ; Pastikan icon.ico ada di buildResources (build folder)
!macroend
