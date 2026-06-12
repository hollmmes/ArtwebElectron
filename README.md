<p align="center">
  <img src="assets/icon.png" alt="Art Web Toolkit" width="120" />
</p>

<h1 align="center">Art Web Toolkit</h1>

<p align="center">
  Art Web Tasarım ekibi için geliştirilmiş çok modüllü masaüstü uygulaması.<br/>
  A multi-module desktop application built for the Art Web Tasarım team.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.5.0-blue" />
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey" />
  <img src="https://img.shields.io/badge/license-Source%20Available-orange" />
</p>

---

## Türkçe

### Proje Nedir?

Art Web Toolkit, Art Web Tasarım'ın günlük operasyonlarını tek bir arayüzden yönetmek için geliştirilmiş bir masaüstü uygulamasıdır. Web sitesi takibi, domain/hosting/SSL yönetimi, Google Maps veri toplama, SEO analizi ve Lighthouse performans raporlama araçlarını bir arada sunar.

### Nasıl Çalışır?

Uygulama üç katmandan oluşur:

**1. Electron (Masaüstü Kabuğu)**
Node.js tabanlı Electron uygulamayı bir pencere içinde çalıştırır. Uygulama açıldığında arka planda Python backend sürecini de başlatır (port 42310).

**2. React Frontend (Arayüz)**
Tailwind CSS ile tasarlanmış, dark/light mod destekli arayüz. Electron penceresi içinde çalışan bir React SPA'dır. Backend ile REST API ve Server-Sent Events (SSE) üzerinden iletişim kurar.

**3. Python FastAPI Backend**
Tüm iş mantığı burada çalışır: web scraping, SEO analizi, Lighthouse raporu üretimi, veritabanı işlemleri. `127.0.0.1:42310` portunda dinler, yalnızca yerel bağlantı kabul eder.

### Veritabanı

Uygulama yerel bir **SQLite** veritabanı kullanır (`backend/artweb.db`). Bu dosya:

- `.gitignore` kapsamındadır, repoya dahil edilmez.
- Uygulama ilk açıldığında `backend/database.py` içindeki `init_db()` fonksiyonu tarafından otomatik olarak **boş** oluşturulur.
- Projeyi klonlayan veya indiren biri kendi boş veritabanıyla başlar, bizim verilerimizi almaz.

**Tablolar:**

| Tablo | İçerik |
|-------|--------|
| `businesses` | Google Maps'ten toplanan işletme verileri |
| `searches` | Geçmiş arama kayıtları |
| `custom_sites` | Site İzleme paneline eklenen siteler |
| `domains` | Domain kayıtları ve yenileme tarihleri |
| `hostings` | Hosting ürün kayıtları |
| `ssl_certs` | SSL sertifika takip kayıtları |

### Modüller

**Dashboard**
İstanbul saati (GMT+3), Giresun ve İzmir için 7 günlük hava durumu. 7 gün içinde süresi dolacak domain/SSL/hosting kayıtları için otomatik uyarı. Aktif kayıt özet sayıları.

**Site İzleme**
Yönetilen web sitelerini grid görünümünde listeler. Her siteye tıklandığında SEO analizi çalışır, 100 üzerinden puan hesaplanır. Lighthouse başlatılabilir.

**Domain / Hosting / SSL Takip**
Domain, hosting ve SSL sertifikalarını tek ekranda CRUD olarak yönetin. Yenileme tarihi, tutar, durum, kalan gün hesaplama. Acil yenileme için otomatik renk uyarıları.

**Google Maps Ripper**
Anahtar kelime + şehir/ilçe girerek Google Maps'ten işletme verisi çeker. İşletme adı, adres, telefon, website, e-posta, puan, yorum sayısı, sosyal medya, çalışma saatleri. Playwright ile headless Chrome kullanır. Sonuçlar SQLite'a kaydedilir, CSV/JSON olarak dışa aktarılır.

**Lighthouse**
Herhangi bir URL için Google Lighthouse performans raporu üretir. Masaüstü + Mobil ayrı ayrı. Chrome DevTools ile birebir aynı HTML rapor çıktısı.

**SEO Bot**
`robots.txt`, `sitemap.xml`, `llms.txt` kontrolü. Meta tag, heading yapısı, Open Graph, görsel alt etiketi analizi. 100 üzerinden puanlama sistemi.

### Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Masaüstü | Electron |
| Frontend | React + Tailwind CSS |
| Backend | Python FastAPI |
| Scraping | Playwright (headless Chrome) |
| Veritabanı | SQLite (aiosqlite) |
| Güncelleme | electron-updater (GitHub Releases) |

### Kurulum (Geliştirici)

```bash
npm install
cd backend && pip install -r requirements.txt
npm run dev
```

---

## English

### What Is This?

Art Web Toolkit is a multi-module desktop application built for the Art Web Tasarım team to manage daily operations from a single interface. It combines website monitoring, domain/hosting/SSL management, Google Maps data collection, SEO analysis, and Lighthouse performance reporting.

### How It Works

The application consists of three layers:

**1. Electron (Desktop Shell)**
Node.js-based Electron runs the app inside a native window. On startup, it also launches the Python backend process in the background (port 42310).

**2. React Frontend (UI)**
A React SPA styled with Tailwind CSS, with dark/light mode support. Communicates with the backend via REST API and Server-Sent Events (SSE).

**3. Python FastAPI Backend**
All business logic runs here: web scraping, SEO analysis, Lighthouse report generation, database operations. Listens on `127.0.0.1:42310`, accepts local connections only.

### Database

The application uses a local **SQLite** database (`backend/artweb.db`). This file:

- Is listed in `.gitignore` and is not included in the repository.
- Is automatically created **empty** on first launch by the `init_db()` function in `backend/database.py`.
- Anyone who clones or downloads the project starts with their own empty database — no existing data is shared.

**Tables:**

| Table | Content |
|-------|---------|
| `businesses` | Business data collected from Google Maps |
| `searches` | Historical search records |
| `custom_sites` | Sites added to the Site Monitoring panel |
| `domains` | Domain records and renewal dates |
| `hostings` | Hosting product records |
| `ssl_certs` | SSL certificate tracking records |

### Modules

**Dashboard**
Istanbul time (GMT+3), 7-day weather for Giresun and Izmir. Automatic alerts for domain/SSL/hosting records expiring within 7 days. Active record summary counts.

**Site Monitoring**
Lists managed websites in a grid view. Clicking a site triggers an SEO analysis scored out of 100. Lighthouse can be launched per site.

**Domain / Hosting / SSL Tracking**
Manage domains, hosting products, and SSL certificates with full CRUD support. Renewal date, cost, status, days remaining. Color-coded urgency alerts.

**Google Maps Ripper**
Scrapes business data from Google Maps by keyword + city/district. Collects: name, address, phone, website, email, rating, review count, social media, working hours. Uses Playwright with headless Chrome. Results are saved to SQLite and exportable as CSV/JSON.

**Lighthouse**
Generates Google Lighthouse performance reports for any URL. Desktop + Mobile separately. Produces the same HTML output as Chrome DevTools.

**SEO Bot**
Checks `robots.txt`, `sitemap.xml`, `llms.txt`. Analyzes meta tags, heading structure, Open Graph tags, image alt attributes. Scoring system out of 100.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron |
| Frontend | React + Tailwind CSS |
| Backend | Python FastAPI |
| Scraping | Playwright (headless Chrome) |
| Database | SQLite (aiosqlite) |
| Updates | electron-updater (GitHub Releases) |

### Setup (Developer)

```bash
npm install
cd backend && pip install -r requirements.txt
npm run dev
```

---

## License / Lisans

This project is distributed under a **Source Available** license. You may view and study the source code, but commercial use, redistribution, and use in other products or services require prior written permission from Art Web Tasarım.

Bu proje **Source Available** lisansı ile dağıtılmaktadır. Kaynak kodu görüntüleyebilir ve inceleyebilirsiniz, ancak ticari kullanım, yeniden dağıtım ve başka ürün veya hizmetlerde kullanım için Art Web Tasarım'dan önceden yazılı izin alınması zorunludur.

Full terms: [LICENSE](LICENSE)

---

**Art Web Tasarım** tarafından geliştirilmektedir.
