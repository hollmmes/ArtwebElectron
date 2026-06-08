<p align="center">
  <img src="assets/icon.png" alt="Art Web Toolkit" width="120" />
</p>

<h1 align="center">Art Web Toolkit</h1>

<p align="center">
  Art Web Tasarım ekibi için geliştirilen masaüstü uygulaması.<br/>
  Birden fazla aracı tek çatı altında toplar.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.4-blue" />
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey" />
  <img src="https://img.shields.io/badge/license-Proprietary-red" />
</p>

---

## Ozellikler

### Site Dashboard
Yonettiginiz web sitelerini grid halinde gorun. Her siteye tiklayinca SEO analizi yapilir, puan hesaplanir, Lighthouse calistirilabilir.

### Google Maps Ripper
Anahtar kelime + sehir/ilce girerek Google Maps'ten isletme verisi cekin. Isletme adi, adres, telefon, website, email, puan, yorumlar, sosyal medya, calisma saatleri, fotograflar. Sonuclari CSV/JSON olarak disari aktarin.

### Lighthouse
Herhangi bir URL'nin performans raporunu alin. Masaustu + Mobil ayri ayri, Chrome DevTools ile birebir ayni HTML rapor.

### SEO Bot
robots.txt, sitemap.xml, llms.txt kontrolu. Meta tag, heading, Open Graph, gorsel alt etiketi analizi. 100 uzerinden puanlama.

---

## Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Masaustu | Electron |
| Frontend | React + Tailwind CSS |
| Backend | Python FastAPI |
| Scraping | Playwright (headless Chrome) |
| Veritabani | SQLite |
| Guncelleme | electron-updater (GitHub releases) |

---

## Proje Hakkinda (AI Context)

Bu proje Art Web Tasarim sirketi icin gelistirilen dahili bir masaustu uygulamasidir. Electron (Node.js) ile paketlenmis, React + Tailwind CSS frontend ve Python FastAPI backend kullanan cok modullu bir mimari uzerine kuruludur.

**Mimari:** Electron ana pencereyi olusturur, icinde React SPA calisir. Backend ayri bir Python process olarak baslatilir (port 42310) ve Playwright ile headless Chrome uzerinden web scraping/analiz yapar. Frontend ile backend arasinda REST API + Server-Sent Events (streaming) iletisimi vardir.

**Moduller:**
- `src/components/dashboard/` — Site yonetim paneli, SEO analiz sonuclari, screenshot onbellekleme
- `src/components/maps/` — Google Maps isletme veri kazima, SQLite'a kayit, CSV/JSON export
- `src/components/lighthouse/` — Google Lighthouse performans raporu (npx lighthouse CLI)
- `backend/routers/seo.py` — SEO bot (meta tag, heading, robots.txt, sitemap, llms.txt analizi + puanlama)
- `backend/routers/maps.py` — Maps scraper API, veritabani islemleri, export
- `backend/routers/lighthouse.py` — Lighthouse CLI wrapper, HTML rapor uretimi
- `backend/services/maps_scraper.py` — Playwright ile Google Maps scraping, paralel detay cekme
- `backend/database.py` — SQLite sema, CRUD islemleri, migration

**Veri akisi:** Kullanici arama yapar -> backend Playwright ile headless Chrome acar -> Google Maps'te arar -> sonuclari stream eder (SSE) -> frontend anlik gosterir -> backend SQLite'a kaydeder.

**Build/Release:** electron-builder ile NSIS installer uretilir. GitHub Releases uzerinden auto-update (electron-updater). Artifact adi: `ArtWebToolkit-Setup-X.Y.Z.exe`.

---

## Lisans

Bu yazilim ozel mulkiyete tabidir. Kaynak kodu paylasilamaz, kopyalanamaz veya degistirilemez. Tum haklar saklidir.

**Art Web Tasarim** tarafindan gelistirilmektedir.
