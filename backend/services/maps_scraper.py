import asyncio
import re
from playwright.async_api import async_playwright


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'[-​-‏ - ﻿\xa0]', '', text)
    text = re.sub(r'[\U000f0000-\U000ffffd]', '', text)
    return text.strip()


async def scrape_google_maps_stream(query: str, location: str = "", max_results: int = 20):
    search_term = f"{query} {location}".strip()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            locale="tr-TR",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        yield {"type": "status", "message": "Google Maps açılıyor..."}

        url = f"https://www.google.com/maps/search/{search_term.replace(' ', '+')}"
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(3000)

        # Çerez dialogunu kapat
        try:
            accept_btns = page.locator("button").filter(has_text=re.compile(r"Kabul|Tümünü kabul|Accept"))
            if await accept_btns.count() > 0:
                await accept_btns.first.click()
                await page.wait_for_timeout(1000)
        except Exception:
            pass

        yield {"type": "status", "message": "Sonuçlar yükleniyor..."}

        # Scroll ile linkleri topla
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
        yield {"type": "progress", "total": total, "current": 0, "message": f"{total} işletme bulundu, detaylar çekiliyor..."}

        if total == 0:
            await browser.close()
            yield {"type": "done"}
            return

        # Paralel detay çekme (5 sekme aynı anda)
        semaphore = asyncio.Semaphore(5)
        completed = {"count": 0}
        queue = asyncio.Queue()

        async def fetch_detail(link):
            async with semaphore:
                detail_page = None
                try:
                    detail_page = await context.new_page()
                    await detail_page.goto(link["href"], wait_until="domcontentloaded", timeout=30000)
                    try:
                        await detail_page.wait_for_selector('[data-item-id="address"], [data-item-id*="phone"]', timeout=8000)
                    except Exception:
                        pass
                    await detail_page.wait_for_timeout(1500)
                    business = await extract_business_details(detail_page, link["name"])
                    await detail_page.close()
                    completed["count"] += 1
                    if business:
                        await queue.put({"type": "result", "data": business, "current": completed["count"], "total": total})
                    else:
                        await queue.put({"type": "progress", "current": completed["count"], "total": total, "message": f"{completed['count']}/{total} tamamlandı"})
                except Exception:
                    if detail_page:
                        try:
                            await detail_page.close()
                        except Exception:
                            pass
                    completed["count"] += 1
                    await queue.put({"type": "progress", "current": completed["count"], "total": total, "message": f"{completed['count']}/{total} tamamlandı"})

        tasks = [asyncio.create_task(fetch_detail(link)) for link in links]

        finished = 0
        while finished < total:
            event = await queue.get()
            yield event
            finished += 1

        await asyncio.gather(*tasks)
        await browser.close()

        yield {"type": "done"}


async def extract_business_details(page, name: str) -> dict | None:
    try:
        business = {"name": name}

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

        # Yorum sayısı
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

        # Sosyal medya ve diğer linkler
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

        # Hakkında / Açıklama
        about_el = page.locator('[aria-label*="hakkında"], [aria-label*="Hakkında"]')
        if await about_el.count() > 0:
            try:
                about_text = await about_el.first.inner_text()
                business["about"] = clean_text(about_text)
            except Exception:
                business["about"] = ""
        else:
            business["about"] = ""

        # Yorumları çek (en son 5 yorum)
        reviews = []
        try:
            reviews_tab = page.locator('button[aria-label*="Yorum"], button[role="tab"]').filter(has_text=re.compile(r"Yorum"))
            if await reviews_tab.count() > 0:
                await reviews_tab.first.click()
                await page.wait_for_timeout(2000)

                review_items = page.locator('[data-review-id]')
                review_count = await review_items.count()
                for i in range(min(review_count, 5)):
                    try:
                        review_el = review_items.nth(i)
                        # Yorum metnini genişlet
                        more_btn = review_el.locator('button').filter(has_text=re.compile(r"Daha fazla|Devamı"))
                        if await more_btn.count() > 0:
                            await more_btn.first.click()
                            await page.wait_for_timeout(300)

                        review_text_el = review_el.locator('[class*="review-full-text"], .MyEned span, .wiI7pd')
                        review_text = ""
                        if await review_text_el.count() > 0:
                            review_text = clean_text(await review_text_el.first.inner_text())

                        # Yıldız
                        star_el = review_el.locator('[aria-label*="yıldız"]')
                        stars = None
                        if await star_el.count() > 0:
                            star_label = await star_el.first.get_attribute("aria-label") or ""
                            star_nums = re.findall(r"\d", star_label)
                            if star_nums:
                                stars = int(star_nums[0])

                        # Yazar
                        author_el = review_el.locator('[class*="d4r55"]')
                        author = ""
                        if await author_el.count() > 0:
                            author = clean_text(await author_el.first.inner_text())

                        if review_text or stars:
                            reviews.append({
                                "author": author,
                                "rating": stars,
                                "text": review_text,
                            })
                    except Exception:
                        continue
        except Exception:
            pass

        business["reviews"] = reviews

        return business

    except Exception:
        return None
