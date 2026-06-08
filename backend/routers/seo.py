from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncio
import json
import re
from playwright.async_api import async_playwright

router = APIRouter()


class SeoAuditRequest(BaseModel):
    url: str


@router.post("/audit")
async def seo_audit(request: SeoAuditRequest):
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL gerekli")
    if not url.startswith("http"):
        url = f"https://{url}"

    result = await run_seo_audit(url)
    return result


async def run_seo_audit(url: str) -> dict:
    base_url = url.rstrip('/')
    domain = re.sub(r'https?://(www\.)?', '', base_url).split('/')[0]

    report = {
        "url": url,
        "domain": domain,
        "score": 0,
        "meta": {},
        "headings": {},
        "robots_txt": None,
        "sitemap_xml": None,
        "llms_txt": None,
        "images": {},
        "links": {},
        "performance": {},
        "issues": [],
        "passed": [],
    }

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--ignore-certificate-errors', '--disable-web-security']
            )
            context = await browser.new_context(
                ignore_https_errors=True,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = await context.new_page()

            # Ana sayfa
            try:
                response = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_timeout(2000)
                report["performance"]["status_code"] = response.status if response else None
            except Exception as e:
                report["issues"].append({"type": "critical", "message": f"Site acilamadi: {str(e)[:100]}"})
                await browser.close()
                report["score"] = 0
                return report

            # Meta tags
            report["meta"] = await extract_meta(page)

            # Headings
            report["headings"] = await extract_headings(page)

            # Images
            report["images"] = await extract_image_stats(page)

            # Links
            report["links"] = await extract_link_stats(page)

            # Screenshot
            try:
                screenshot = await page.screenshot(type="jpeg", quality=60, full_page=False)
                import base64
                report["screenshot"] = f"data:image/jpeg;base64,{base64.b64encode(screenshot).decode()}"
            except Exception:
                report["screenshot"] = None

            await browser.close()

    except Exception as e:
        report["issues"].append({"type": "critical", "message": f"Analiz hatasi: {str(e)[:100]}"})

    # robots.txt
    report["robots_txt"] = await fetch_file(f"{base_url}/robots.txt")

    # sitemap.xml
    report["sitemap_xml"] = await fetch_file(f"{base_url}/sitemap.xml")

    # llms.txt
    report["llms_txt"] = await fetch_file(f"{base_url}/llms.txt")

    # Score
    report["score"], report["issues"], report["passed"] = calculate_score(report)

    return report


async def extract_meta(page) -> dict:
    meta = {}
    try:
        meta["title"] = await page.title() or ""
        meta["title_length"] = len(meta["title"])

        desc_el = page.locator('meta[name="description"]')
        if await desc_el.count() > 0:
            meta["description"] = await desc_el.first.get_attribute("content") or ""
        else:
            meta["description"] = ""
        meta["description_length"] = len(meta["description"])

        # Canonical
        canonical = page.locator('link[rel="canonical"]')
        meta["canonical"] = await canonical.first.get_attribute("href") if await canonical.count() > 0 else ""

        # OG tags
        og_title = page.locator('meta[property="og:title"]')
        meta["og_title"] = await og_title.first.get_attribute("content") if await og_title.count() > 0 else ""

        og_desc = page.locator('meta[property="og:description"]')
        meta["og_description"] = await og_desc.first.get_attribute("content") if await og_desc.count() > 0 else ""

        og_image = page.locator('meta[property="og:image"]')
        meta["og_image"] = await og_image.first.get_attribute("content") if await og_image.count() > 0 else ""

        # Viewport
        viewport = page.locator('meta[name="viewport"]')
        meta["has_viewport"] = await viewport.count() > 0

        # Charset
        charset = page.locator('meta[charset]')
        meta["has_charset"] = await charset.count() > 0

        # Favicon
        favicon = page.locator('link[rel*="icon"]')
        meta["has_favicon"] = await favicon.count() > 0

        # Language
        html_el = page.locator('html')
        meta["lang"] = await html_el.first.get_attribute("lang") if await html_el.count() > 0 else ""

    except Exception:
        pass
    return meta


async def extract_headings(page) -> dict:
    headings = {"h1": [], "h2": [], "h3": []}
    try:
        for tag in ["h1", "h2", "h3"]:
            els = page.locator(tag)
            count = await els.count()
            for i in range(min(count, 10)):
                text = (await els.nth(i).inner_text()).strip()
                if text:
                    headings[tag].append(text[:100])
    except Exception:
        pass
    return headings


async def extract_image_stats(page) -> dict:
    stats = {"total": 0, "without_alt": 0, "large": []}
    try:
        imgs = page.locator('img')
        stats["total"] = await imgs.count()
        for i in range(min(stats["total"], 50)):
            alt = await imgs.nth(i).get_attribute("alt")
            if not alt or alt.strip() == "":
                stats["without_alt"] += 1
    except Exception:
        pass
    return stats


async def extract_link_stats(page) -> dict:
    stats = {"internal": 0, "external": 0, "total": 0}
    try:
        links = page.locator('a[href]')
        count = await links.count()
        stats["total"] = count
        current_domain = (await page.evaluate("window.location.hostname")) or ""
        for i in range(min(count, 100)):
            href = await links.nth(i).get_attribute("href") or ""
            if href.startswith("http") and current_domain not in href:
                stats["external"] += 1
            else:
                stats["internal"] += 1
    except Exception:
        pass
    return stats


async def fetch_file(url: str) -> dict | None:
    import aiohttp
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10), ssl=False) as resp:
                if resp.status == 200:
                    content = await resp.text()
                    return {"exists": True, "content": content[:5000], "size": len(content)}
                return {"exists": False, "status": resp.status}
    except Exception:
        return {"exists": False, "status": None}


def calculate_score(report: dict) -> tuple:
    score = 0
    max_score = 0
    issues = []
    passed = []

    meta = report.get("meta", {})
    headings = report.get("headings", {})

    # Title (15 puan)
    max_score += 15
    title = meta.get("title", "")
    if title:
        if 30 <= len(title) <= 60:
            score += 15
            passed.append("Baslik uzunlugu ideal (30-60 karakter)")
        elif len(title) > 0:
            score += 8
            issues.append({"type": "warning", "message": f"Baslik uzunlugu ({len(title)}) ideal aralikta degil (30-60)"})
    else:
        issues.append({"type": "error", "message": "Sayfa basligi (title) eksik"})

    # Description (15 puan)
    max_score += 15
    desc = meta.get("description", "")
    if desc:
        if 120 <= len(desc) <= 160:
            score += 15
            passed.append("Meta aciklama uzunlugu ideal (120-160 karakter)")
        elif len(desc) > 0:
            score += 8
            issues.append({"type": "warning", "message": f"Meta aciklama uzunlugu ({len(desc)}) ideal degil (120-160)"})
    else:
        issues.append({"type": "error", "message": "Meta aciklama (description) eksik"})

    # H1 (10 puan)
    max_score += 10
    h1_list = headings.get("h1", [])
    if len(h1_list) == 1:
        score += 10
        passed.append("Tek H1 etiketi kullanilmis")
    elif len(h1_list) == 0:
        issues.append({"type": "error", "message": "H1 etiketi bulunamadi"})
    else:
        score += 5
        issues.append({"type": "warning", "message": f"Birden fazla H1 etiketi var ({len(h1_list)})"})

    # Viewport (5 puan)
    max_score += 5
    if meta.get("has_viewport"):
        score += 5
        passed.append("Viewport meta etiketi mevcut")
    else:
        issues.append({"type": "error", "message": "Viewport meta etiketi eksik (mobil uyumluluk)"})

    # Canonical (5 puan)
    max_score += 5
    if meta.get("canonical"):
        score += 5
        passed.append("Canonical URL tanimli")
    else:
        issues.append({"type": "warning", "message": "Canonical URL tanimlanmamis"})

    # OG Tags (10 puan)
    max_score += 10
    og_score = 0
    if meta.get("og_title"): og_score += 3
    if meta.get("og_description"): og_score += 3
    if meta.get("og_image"): og_score += 4
    score += og_score
    if og_score == 10:
        passed.append("Open Graph etiketleri tam")
    elif og_score > 0:
        issues.append({"type": "warning", "message": "Open Graph etiketleri eksik (sosyal medya paylasimi)"})
    else:
        issues.append({"type": "error", "message": "Open Graph etiketleri yok"})

    # robots.txt (10 puan)
    max_score += 10
    robots = report.get("robots_txt")
    if robots and robots.get("exists"):
        score += 10
        passed.append("robots.txt mevcut")
    else:
        issues.append({"type": "error", "message": "robots.txt bulunamadi"})

    # sitemap.xml (10 puan)
    max_score += 10
    sitemap = report.get("sitemap_xml")
    if sitemap and sitemap.get("exists"):
        score += 10
        passed.append("sitemap.xml mevcut")
    else:
        issues.append({"type": "error", "message": "sitemap.xml bulunamadi"})

    # llms.txt (5 puan bonus)
    max_score += 5
    llms = report.get("llms_txt")
    if llms and llms.get("exists"):
        score += 5
        passed.append("llms.txt mevcut (AI bot yonlendirmesi)")
    else:
        issues.append({"type": "info", "message": "llms.txt bulunamadi (opsiyonel - AI botlar icin)"})

    # Images alt (10 puan)
    max_score += 10
    imgs = report.get("images", {})
    total_imgs = imgs.get("total", 0)
    without_alt = imgs.get("without_alt", 0)
    if total_imgs > 0:
        alt_ratio = (total_imgs - without_alt) / total_imgs
        img_score = round(alt_ratio * 10)
        score += img_score
        if without_alt == 0:
            passed.append(f"Tum gorsellerde alt etiketi var ({total_imgs} gorsel)")
        else:
            issues.append({"type": "warning", "message": f"{without_alt}/{total_imgs} gorsel alt etiketi eksik"})
    else:
        score += 10
        passed.append("Gorsel kontrolu (gorsel yok)")

    # Favicon (5 puan)
    max_score += 5
    if meta.get("has_favicon"):
        score += 5
        passed.append("Favicon mevcut")
    else:
        issues.append({"type": "warning", "message": "Favicon bulunamadi"})

    final_score = round((score / max_score) * 100) if max_score > 0 else 0
    return final_score, issues, passed
