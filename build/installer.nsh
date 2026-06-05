!macro customInstall
  ; Check if Python is installed
  nsExec::ExecToStack 'python --version'
  Pop $0
  Pop $1

  ${If} $0 != 0
    ; Python not found, ask user
    MessageBox MB_YESNO "Bu uygulama Python 3.10+ gerektirir.$\n$\nPython bulunamadı. Otomatik olarak indirilip kurulsun mu?$\n$\n(İnternet bağlantısı gereklidir)" IDYES installPython IDNO skipPython

    installPython:
      DetailPrint "Python 3.13 indiriliyor..."
      inetc::get "https://www.python.org/ftp/python/3.13.4/python-3.13.4-amd64.exe" "$TEMP\python-installer.exe" /END
      Pop $0
      ${If} $0 == "OK"
        DetailPrint "Python kuruluyor (bu birkaç dakika sürebilir)..."
        nsExec::ExecToStack '"$TEMP\python-installer.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1'
        Pop $0
        Delete "$TEMP\python-installer.exe"

        ; Wait a moment for PATH to update
        Sleep 2000

        ; Install pip dependencies
        DetailPrint "Python paketleri kuruluyor..."
        nsExec::ExecToStack 'cmd /c "$LOCALAPPDATA\Programs\Python\Python313\python.exe" -m pip install fastapi uvicorn playwright pydantic --quiet'
        Pop $0

        ; Install Playwright Chromium
        DetailPrint "Chromium tarayıcı kuruluyor..."
        nsExec::ExecToStack 'cmd /c "$LOCALAPPDATA\Programs\Python\Python313\python.exe" -m playwright install chromium'
        Pop $0

        DetailPrint "Python kurulumu tamamlandı."
      ${Else}
        MessageBox MB_OK "Python indirilemedi.$\n$\nLütfen https://www.python.org/downloads/ adresinden manuel olarak kurun.$\n$\nKurulum sırasında 'Add Python to PATH' seçeneğini işaretleyin!"
      ${EndIf}
    Goto endPythonCheck

    skipPython:
      MessageBox MB_OK "Uyarı: Python olmadan uygulama çalışamaz.$\n$\nLütfen daha sonra https://www.python.org/downloads/ adresinden kurun."

    endPythonCheck:
  ${Else}
    ; Python found, install dependencies silently
    DetailPrint "Python paketleri kontrol ediliyor..."
    nsExec::ExecToStack 'python -m pip install fastapi uvicorn playwright pydantic --quiet'
    Pop $0
    nsExec::ExecToStack 'python -m playwright install chromium'
    Pop $0
  ${EndIf}
!macroend
