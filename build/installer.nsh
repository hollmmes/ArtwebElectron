; ─────────────────────────────────────────────────────────────────────────────
; Art Web Toolkit — NSIS Custom Script
; ─────────────────────────────────────────────────────────────────────────────

; Uygulama çalışıyorsa kapat, port serbest kalana kadar bekle, sonra kur.
!macro customInit
  ; 1. Çalışan app process'i kontrol et
  FindWindow $0 "" "Art Web Toolkit"
  ${If} $0 != 0
    MessageBox MB_YESNO|MB_ICONEXCLAMATION \
      "Art Web Toolkit şu an açık.$\n$\nKuruluma devam etmek için uygulama kapatılacak.$\n$\nDevam edilsin mi?" \
      IDYES closeApp IDNO abortInstall

    closeApp:
      DetailPrint "Uygulama kapatılıyor..."
      SendMessage $0 ${WM_CLOSE} 0 0
      Sleep 1500
      ; Hâlâ açıksa zorla öldür
      FindWindow $0 "" "Art Web Toolkit"
      ${If} $0 != 0
        nsExec::ExecToStack 'taskkill /F /IM "Art Web Toolkit.exe"'
        Pop $0
        Pop $1
        Sleep 1000
      ${EndIf}
      Goto checkPort

    abortInstall:
      Abort "Kurulum iptal edildi."

    checkPort:
  ${EndIf}

  ; 2. Port 42310'u dinleyen process varsa öldür (arka planda kalmış backend)
  nsExec::ExecToStack 'cmd /c for /f "tokens=5" %a in (''netstat -ano ^| findstr ":42310 " ^| findstr "LISTENING"'') do taskkill /F /PID %a'
  Pop $0
  Pop $1
  ${If} $0 == 0
    DetailPrint "Port 42310 temizlendi."
    Sleep 800
  ${EndIf}
!macroend


!macro customInstall
  ; Güvenlik duvarı kurallarını ekle
  DetailPrint "Güvenlik duvarı kuralları ayarlanıyor..."
  nsExec::ExecToStack 'netsh advfirewall firewall delete rule name="Art Web Toolkit"'
  Pop $0
  Pop $1

  nsExec::ExecToStack 'netsh advfirewall firewall add rule name="Art Web Toolkit" dir=in action=allow program="$INSTDIR\Art Web Toolkit.exe" enable=yes profile=any'
  Pop $0
  Pop $1

  nsExec::ExecToStack 'netsh advfirewall firewall add rule name="Art Web Toolkit - Backend" dir=in action=allow protocol=TCP localport=42310 enable=yes profile=any'
  Pop $0
  Pop $1

  DetailPrint "Kurulum tamamlandı."
!macroend


!macro customUnInstall
  ; Güvenlik duvarı kurallarını temizle
  nsExec::ExecToStack 'netsh advfirewall firewall delete rule name="Art Web Toolkit"'
  Pop $0
  Pop $1
  nsExec::ExecToStack 'netsh advfirewall firewall delete rule name="Art Web Toolkit - Backend"'
  Pop $0
  Pop $1
!macroend
