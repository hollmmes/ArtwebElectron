import asyncio
import re
from playwright.async_api import async_playwright


def clean_text(text: str) -> str:
    if not text:
        return ""
    # Remove all characters that render as squares/boxes:
    # BMP Private Use Area (U+E000-U+F8FF) - Google Material Icons
    # Supplementary Private Use Area (U+F0000-U+10FFFF)
    # Tags block (U+E0000-U+E007F)
    # Variation selectors (U+FE00-U+FE0F)
    # Zero-width and formatting chars (U+200B-U+200F, U+2028-U+202F, U+FEFF)
    result = []
    for ch in text:
        cp = ord(ch)
        if 0xE000 <= cp <= 0xF8FF:
            continue
        if 0xF0000 <= cp <= 0x10FFFF:
            continue
        if 0xE0000 <= cp <= 0xE007F:
            continue
        if 0xFE00 <= cp <= 0xFE0F:
            continue
        if 0x200B <= cp <= 0x200F:
            continue
        if 0x2028 <= cp <= 0x202F:
            continue
        if cp == 0xFEFF:
            continue
        if cp == 0xA0:
            continue
        if cp == 0xFFFD:
            continue
        result.append(ch)
    text = ''.join(result)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()


async def scrape_google_maps_stream(query: str, location: str = "", max_results: int = 20):
    search_term = f"{query} {location}".strip()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--ignore-certificate-errors',
                '--ignore-ssl-errors',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ]
        )
        context = await browser.new_context(
            locale="tr-TR",
            ignore_https_errors=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        yield {"type": "status", "message": "Google Maps aciliyor..."}

        url = f"https://www.google.com/maps/search/{search_term.replace(' ', '+')}"
        for attempt in range(3):
            try:
                await page.goto(url, wait_until="commit", timeout=60000)
                break
            except Exception as e:
                if attempt == 2:
                    raise
                await page.wait_for_timeout(2000)
        await page.wait_for_timeout(3000)

        try:
            accept_btns = page.locator("button").filter(has_text=re.compile(r"Kabul|Accept"))
            if await accept_btns.count() > 0:
                await accept_btns.first.click()
                await page.wait_for_timeout(1000)
        except Exception:
            pass

        yield {"type": "status", "message": "Sonuclar yukleniyor..."}

        results_panel = page.locator('[role="feed"]')
        links = []
        if await results_panel.count() > 0:
            prev_count = 0
            stale_rounds = 0
            while stale_rounds < 3:
                await results_panel.evaluate("el => el.scrollTop = el.scrollHeight")
                await page.wait_for_timeout(1500)
                items = page.locator('[role="feed"] > div > div > a[href]')
                current_count = await items.count()
                if current_count >= max_results:
                    break
                if current_count == prev_count:
                    stale_rounds += 1
                else:
                    stale_rounds = 0
                prev_count = current_count

            items = page.locator('[role="feed"] > div > div > a[href]')
            count = await items.count()
            for i in range(min(count, max_results)):
                href = await items.nth(i).get_attribute("href")
                name = await items.nth(i).get_attribute("aria-label") or ""
                if href and name:
                    links.append({"href": href, "name": clean_text(name)})

        await page.close()

        total = len(links)
        yield {"type": "progress", "total": total, "current": 0, "message": f"{total} isletme bulundu, detaylar cekiliyor..."}

        if total == 0:
            await browser.close()
            yield {"type": "done"}
            return

        semaphore = asyncio.Semaphore(5)
        completed = {"count": 0}
        queue = asyncio.Queue()

        async def fetch_detail(link):
            async with semaphore:
                detail_page = None
                try:
                    detail_page = await context.new_page()
                    for attempt in range(3):
                        try:
                            await detail_page.goto(link["href"], wait_until="commit", timeout=30000)
                            break
                        except Exception:
                            if attempt == 2:
                                raise
                            await detail_page.wait_for_timeout(1500)
                    try:
                        await detail_page.wait_for_selector('[data-item-id="address"], [data-item-id*="phone"]', timeout=8000)
                    except Exception:
                        pass
                    await detail_page.wait_for_timeout(1500)
                    business = await extract_business_details(detail_page, link["name"], link["href"])
                    await detail_page.close()
                    completed["count"] += 1
                    if business:
                        await queue.put({"type": "result", "data": business, "current": completed["count"], "total": total})
                    else:
                        await queue.put({"type": "progress", "current": completed["count"], "total": total, "message": f"{completed['count']}/{total} tamamlandi"})
                except Exception:
                    if detail_page:
                        try:
                            await detail_page.close()
                        except Exception:
                            pass
                    completed["count"] += 1
                    await queue.put({"type": "progress", "current": completed["count"], "total": total, "message": f"{completed['count']}/{total} tamamlandi"})

        tasks = [asyncio.create_task(fetch_detail(link)) for link in links]

        finished = 0
        while finished < total:
            event = await queue.get()
            yield event
            finished += 1

        await asyncio.gather(*tasks)
        await browser.close()

        yield {"type": "done"}


async def extract_business_details(page, name: str, maps_url: str) -> dict | None:
    try:
        business = {"name": name, "maps_url": maps_url}

        # Adres
        address_el = page.locator('[data-item-id="address"]')
        if await address_el.count() > 0:
            text = await address_el.first.inner_text()
            business["address"] = clean_text(text)
        else:
            business["address"] = ""

        # Telefon
        phone_el = page.locator('[data-item-id*="phone"]')
        if await phone_el.count() > 0:
            text = await phone_el.first.inner_text()
            business["phone"] = clean_text(text)
        else:
            business["phone"] = ""

        # Website
        website_el = page.locator('[data-item-id="authority"]')
        if await website_el.count() > 0:
            text = await website_el.first.inner_text()
            business["website"] = clean_text(text)
        else:
            business["website"] = ""

        # Puan
        rating_el = page.locator('div.fontDisplayLarge')
        if await rating_el.count() > 0:
            try:
                raw = await rating_el.first.inner_text()
                business["rating"] = float(raw.replace(",", "."))
            except ValueError:
                business["rating"] = None
        else:
            business["rating"] = None

        # Yorum sayisi
        reviews_el = page.locator('button[jsaction*="reviews"]')
        if await reviews_el.count() > 0:
            text = await reviews_el.first.inner_text()
            nums = re.findall(r"[\d.]+", text.replace(".", ""))
            business["reviews_count"] = int(nums[0]) if nums else None
        else:
            business["reviews_count"] = None

        # Kategori
        category_el = page.locator('button[jsaction*="category"]')
        if await category_el.count() > 0:
            business["category"] = clean_text(await category_el.first.inner_text())
        else:
            business["category"] = ""

        # Calisma saatleri
        business["working_hours"] = await extract_working_hours(page)

        # Hizmetler / Ozellikler
        business["features"] = await extract_features(page)

        # Fotograf URL'leri
        business["photos"] = await extract_photos(page)

        # Konum (lat/lng)
        business["latitude"], business["longitude"] = extract_coordinates(maps_url)

        # Email (Maps uzerinden)
        emails = []
        email_el = page.locator('[data-item-id*="email"]')
        if await email_el.count() > 0:
            email_text = clean_text(await email_el.first.inner_text())
            if email_text and '@' in email_text:
                emails.append(email_text)
        business["emails"] = emails

        # Sosyal medya
        social_media = {}
        all_links = page.locator('a[data-item-id*="authority"], a[href*="facebook.com"], a[href*="instagram.com"], a[href*="twitter.com"], a[href*="youtube.com"], a[href*="linkedin.com"], a[href*="tiktok.com"]')
        link_count = await all_links.count()
        for i in range(link_count):
            href = await all_links.nth(i).get_attribute("href") or ""
            if "facebook.com" in href:
                social_media["facebook"] = href
            elif "instagram.com" in href:
                social_media["instagram"] = href
            elif "twitter.com" in href or "x.com" in href:
                social_media["twitter"] = href
            elif "youtube.com" in href:
                social_media["youtube"] = href
            elif "linkedin.com" in href:
                social_media["linkedin"] = href
            elif "tiktok.com" in href:
                social_media["tiktok"] = href
        business["social_media"] = social_media

        # Yorumlar
        reviews = []
        try:
            reviews_tab = page.locator('button[role="tab"]').filter(has_text=re.compile(r"Yorum|Review"))
            if await reviews_tab.count() > 0:
                await reviews_tab.first.click()
                await page.wait_for_timeout(2500)

                # Scroll the review panel to load more
                try:
                    for _ in range(10):
                        await page.evaluate("""() => {
                            const panels = document.querySelectorAll('.m6QErb.DxyBCb, .m6QErb, [class*="review"]');
                            for (const el of panels) {
                                if (el.scrollHeight > el.clientHeight) {
                                    el.scrollTop = el.scrollHeight;
                                }
                            }
                        }""")
                        await page.wait_for_timeout(800)
                except Exception:
                    pass

                review_items = page.locator('[data-review-id]')
                review_count = await review_items.count()
                seen_ids = set()
                seen_content = set()
                for i in range(min(review_count, 50)):
                    try:
                        review_el = review_items.nth(i)
                        review_id = await review_el.get_attribute("data-review-id") or ""

                        if review_id and review_id in seen_ids:
                            continue
                        seen_ids.add(review_id)

                        # Expand long reviews
                        more_btn = review_el.locator('button').filter(has_text=re.compile(r"Daha fazla|Devam|More"))
                        if await more_btn.count() > 0:
                            await more_btn.first.click()
                            await page.wait_for_timeout(300)

                        # Review text
                        review_text_el = review_el.locator('.wiI7pd, [class*="review-full-text"], .MyEned span')
                        review_text = ""
                        if await review_text_el.count() > 0:
                            review_text = clean_text(await review_text_el.first.inner_text())

                        # Stars - broader selector
                        stars = None
                        star_el = review_el.locator('[role="img"][aria-label]')
                        if await star_el.count() > 0:
                            star_label = await star_el.first.get_attribute("aria-label") or ""
                            star_nums = re.findall(r"\d", star_label)
                            if star_nums:
                                stars = int(star_nums[0])

                        # Author
                        author_el = review_el.locator('[class*="d4r55"], [class*="TSUbDb"] a')
                        author = ""
                        if await author_el.count() > 0:
                            author = clean_text(await author_el.first.inner_text())

                        # Accept review if it has text OR stars
                        if review_text or stars:
                            content_key = f"{author}|{review_text[:60]}"
                            if content_key not in seen_content:
                                seen_content.add(content_key)
                                reviews.append({
                                    "author": author,
                                    "rating": stars,
                                    "text": review_text,
                                })

                        if len(reviews) >= 50:
                            break
                    except Exception:
                        continue
        except Exception:
            pass

        business["reviews"] = reviews

        # Hakkinda (sekme degistirmeden, mevcut sayfadan)
        business["about"] = await extract_about(page)

        return business

    except Exception:
        return None


async def extract_working_hours(page) -> dict:
    hours = {}
    try:
        hours_table = page.locator('table[class*="eK4R0e"], table[class*="WgFkxc"]')
        if await hours_table.count() > 0:
            rows = hours_table.locator('tr')
            row_count = await rows.count()
            for i in range(row_count):
                row = rows.nth(i)
                cells = row.locator('td')
                if await cells.count() >= 2:
                    day = clean_text(await cells.nth(0).inner_text())
                    time_text = clean_text(await cells.nth(1).inner_text())
                    if day:
                        hours[day] = time_text
        else:
            hours_btn = page.locator('[data-item-id="oh"], [aria-label*="saat"]')
            if await hours_btn.count() > 0:
                aria = await hours_btn.first.get_attribute("aria-label") or ""
                if aria:
                    hours["info"] = clean_text(aria)
    except Exception:
        pass
    return hours


async def extract_about(page) -> str:
    try:
        desc_selectors = [
            '[class*="PYvSYb"]',
            '[class*="WeS02d"]',
            '[class*="bfdHYd"]',
            '[class*="Io6YTe"]',
        ]
        for sel in desc_selectors:
            el = page.locator(sel)
            if await el.count() > 0:
                text = clean_text(await el.first.inner_text())
                if text and len(text) > 20 and not _looks_like_category_list(text):
                    return text
    except Exception:
        pass
    return ""


def _looks_like_category_list(text: str) -> bool:
    keywords = ["Restoranlar", "Oteller", "Eczaneler", "ATM", "Yapilacaklar", "Otopark", "Toplu Tasima"]
    matches = sum(1 for k in keywords if k in text)
    return matches >= 2


async def extract_features(page) -> list:
    features = []
    try:
        feature_items = page.locator('[class*="wmQCje"] [class*="iNvpkc"], [class*="CK16pd"] [class*="hpLkke"]')
        count = await feature_items.count()
        if count > 0:
            for i in range(min(count, 20)):
                text = clean_text(await feature_items.nth(i).inner_text())
                if text and text not in features:
                    features.append(text)
        else:
            service_items = page.locator('[data-item-id*="service"], [data-item-id*="attribute"]')
            count = await service_items.count()
            for i in range(min(count, 20)):
                text = clean_text(await service_items.nth(i).inner_text())
                if text and text not in features:
                    features.append(text)
    except Exception:
        pass
    return features


async def extract_photos(page) -> list:
    photos = []
    try:
        # All images on the page that are from Google servers
        all_imgs = page.locator('img[src*="googleusercontent.com"], img[src*="ggpht.com"]')
        count = await all_imgs.count()
        for i in range(min(count, 30)):
            src = await all_imgs.nth(i).get_attribute("src") or ""
            if not src:
                continue
            # Skip tiny icons/avatars (profile pics are usually small)
            width = await all_imgs.nth(i).get_attribute("width") or ""
            if width and int(width) < 50:
                continue
            # Make high-res
            high_res = re.sub(r'=w\d+-h\d+[^"\'&\s]*', '=w800-h600', src)
            high_res = re.sub(r'=s\d+[^"\'&\s]*', '=s800', high_res)
            if high_res not in photos:
                photos.append(high_res)
            if len(photos) >= 10:
                break

        # Fallback: background-image style
        if not photos:
            styled_els = page.locator('[style*="background-image"]')
            count = await styled_els.count()
            for i in range(min(count, 15)):
                style = await styled_els.nth(i).get_attribute("style") or ""
                urls = re.findall(r'url\(["\']?(https://[^"\']+googleusercontent[^"\']+)["\']?\)', style)
                for u in urls:
                    high_res = re.sub(r'=w\d+-h\d+[^"\'&\s]*', '=w800-h600', u)
                    if high_res not in photos:
                        photos.append(high_res)
                    if len(photos) >= 10:
                        break
    except Exception:
        pass
    return photos


def extract_coordinates(maps_url: str) -> tuple:
    try:
        match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', maps_url)
        if match:
            return float(match.group(1)), float(match.group(2))
        lat_match = re.search(r'!3d(-?\d+\.\d+)', maps_url)
        lng_match = re.search(r'!4d(-?\d+\.\d+)', maps_url)
        if lat_match and lng_match:
            return float(lat_match.group(1)), float(lng_match.group(1))
    except Exception:
        pass
    return None, None
