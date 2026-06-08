# Art Web Toolkit

Art Web Tasarım ekibi için geliştirilen masaüstü uygulaması. Birden fazla aracı tek çatı altında toplar.

## Ne İşe Yarıyor?

### 1. Site Dashboard
Yönettiğiniz web sitelerini grid halinde görün. Her siteye tıklayınca:
- **SEO analizi** yapılır (title, description, h1, robots.txt, sitemap.xml, llms.txt kontrolü)
- **SEO puanı** hesaplanır (100 üzerinden)
- **Lighthouse** çalıştırılabilir (Chrome DevTools raporu)
- Sonuçlar kaydedilir, tekrar açınca anında yüklenir

### 2. Google Maps Ripper
Anahtar kelime + şehir/ilçe girerek Google Maps'ten işletme verisi çekersiniz:
- İşletme adı, adres, telefon, website, email
- Puan, yorum sayısı, yorumlar (10'a kadar)
- Sosyal medya linkleri, çalışma saatleri, fotoğraflar
- Konum (lat/lng), Google Maps linki

Sonuçlar SQLite veritabanına kaydedilir. Aynı aramayı tekrar yapınca yeni/eski etiketleri görürsünüz.

**Geçmiş Sonuçlar** sayfasından kayıtlı işletmeleri kategoriye göre filtreleyebilir, arayabilir ve **CSV/JSON olarak dışarı aktarabilirsiniz**.

### 3. Lighthouse
Herhangi bir URL'nin performans raporunu alın:
- Masaüstü + Mobil ayrı ayrı
- Birden fazla site ekleyip sırayla analiz
- Chrome DevTools'taki ile birebir aynı HTML rapor
- Geçmiş raporlar saklanır

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Python bağımlılıkları
cd backend
pip install -r requirements.txt
playwright install chromium

# Çalıştır
cd ..
npm run electron:dev
```

## Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Masaüstü | Electron |
| Frontend | React + Tailwind CSS |
| Backend | Python FastAPI |
| Scraping | Playwright (headless Chrome) |
| Veritabanı | SQLite (aiosqlite) |
| Güncelleme | electron-updater (GitHub releases) |

## Build & Release

```bash
npm run electron:build
```

Build çıktısı `dist-electron/` klasöründe oluşur. Release süreci için `CLAUDE.md` dosyasına bakın.
