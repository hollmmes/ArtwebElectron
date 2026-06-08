# Art Web Toolkit - Electron App

## Release Süreci (Auto-Update ile Uyumlu)

Yeni sürüm çıkarken bu adımları takip et:

### 1. Versiyon Güncelle
- `package.json` → `"version": "X.Y.Z"`
- `src/components/Settings.jsx` → `const APP_VERSION = 'X.Y.Z'`

### 2. Commit & Push
```bash
git add -A
git commit -m "vX.Y.Z: Açıklama"
git push origin master
```

### 3. Build
```bash
npm run electron:build
```

### 4. GitHub Release Oluştur
```bash
"/c/Program Files/GitHub CLI/gh.exe" release create vX.Y.Z \
  "dist-electron/ArtWebToolkit-Setup-X.Y.Z.exe" \
  "dist-electron/ArtWebToolkit-Setup-X.Y.Z.exe.blockmap" \
  "dist-electron/latest.yml" \
  --title "vX.Y.Z" \
  --notes "Release notları"
```

### Kritik Kurallar

- **Artifact adında ASLA boşluk olmamalı.** `artifactName` package.json'da `"ArtWebToolkit-Setup-${version}.${ext}"` olarak ayarlı. Değiştirme.
- GitHub release'e yüklenen `.exe` dosya adı ile `latest.yml` içindeki `url` ve `path` alanları birebir eşleşmeli.
- Her release'e 3 dosya yükle: `.exe`, `.exe.blockmap`, `latest.yml`
- `latest.yml` her build'de otomatik güncellenir, elle düzenleme.

## Proje Yapısı

- **Main process:** `electron/main.cjs`
- **Preload:** `electron/preload.cjs`
- **Renderer:** `src/` (React + Tailwind)
- **Backend:** `backend/` (Python FastAPI)
- **Build config:** `package.json` → `"build"` alanı

## Auto-Update Notları

- Provider: GitHub (`hollmmes/ArtwebElectron`)
- `autoUpdater.autoDownload = false` (kullanıcı manuel tetikler)
- `forceDevUpdateConfig` sadece dev modda aktif
- Code signing yok (`verifyUpdateCodeSignature: false`)

## Tema

- Dark/Light mod desteği var (`ThemeContext`)
- Tercih `localStorage`'da saklanır
