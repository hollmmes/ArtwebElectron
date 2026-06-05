import asyncio
from playwright.async_api import async_playwright


async def scrape_google_maps(query: str, location: str = "") -> list[dict]:
    search_term = f"{query} {location}".strip()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            locale="tr-TR",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        url = f"https://www.google.com/maps/search/{search_term.replace(' ', '+')}"
        await page.goto(url, wait_until="networkidle", timeout=30000)

        # Wait for results to load
        await page.wait_for_timeout(3000)

        # Try to accept cookies if dialog appears
        try:
            accept_btn = page.locator("button", has_text="Kabul")
            if await accept_btn.count() > 0:
                await accept_btn.first.click()
                await page.wait_for_timeout(1000)
        except Exception:
            pass

        # Scroll the results panel to load more
        results_panel = page.locator('[role="feed"]')
        if await results_panel.count() > 0:
            for _ in range(3):
                await results_panel.evaluate("el => el.scrollTop = el.scrollHeight")
                await page.wait_for_timeout(1500)

        # Extract business data
        businesses = []
        items = page.locator('[role="feed"] > div > div > a')
        count = await items.count()

        for i in range(min(count, 20)):
            try:
                item = items.nth(i)
                href = await item.get_attribute("href") or ""
                aria_label = await item.get_attribute("aria-label") or ""

                if not aria_label:
                    continue

                # Click item to get details
                await item.click()
                await page.wait_for_timeout(2000)

                business = await extract_business_details(page, aria_label)
                if business:
                    businesses.append(business)

            except Exception:
                continue

        await browser.close()

    return businesses


async def extract_business_details(page, name: str) -> dict | None:
    try:
        business = {"name": name}

        # Address
        address_el = page.locator('[data-item-id="address"]')
        if await address_el.count() > 0:
            business["address"] = await address_el.first.inner_text()
        else:
            business["address"] = ""

        # Phone
        phone_el = page.locator('[data-item-id*="phone"]')
        if await phone_el.count() > 0:
            business["phone"] = await phone_el.first.inner_text()
        else:
            business["phone"] = ""

        # Website
        website_el = page.locator('[data-item-id="authority"]')
        if await website_el.count() > 0:
            business["website"] = await website_el.first.inner_text()
        else:
            business["website"] = ""

        # Rating
        rating_el = page.locator('div.fontDisplayLarge')
        if await rating_el.count() > 0:
            try:
                business["rating"] = float(await rating_el.first.inner_text())
            except ValueError:
                business["rating"] = None
        else:
            business["rating"] = None

        # Reviews count
        reviews_el = page.locator('button[jsaction*="reviews"]')
        if await reviews_el.count() > 0:
            text = await reviews_el.first.inner_text()
            import re
            nums = re.findall(r"[\d.]+", text.replace(".", ""))
            business["reviews_count"] = int(nums[0]) if nums else None
        else:
            business["reviews_count"] = None

        # Category
        category_el = page.locator('button[jsaction*="category"]')
        if await category_el.count() > 0:
            business["category"] = await category_el.first.inner_text()
        else:
            business["category"] = ""

        # Hours
        hours_el = page.locator('[aria-label*="saat"]')
        if await hours_el.count() > 0:
            try:
                await hours_el.first.click()
                await page.wait_for_timeout(500)
                hours_table = page.locator("table tr")
                hours = []
                hours_count = await hours_table.count()
                for j in range(hours_count):
                    row_text = await hours_table.nth(j).inner_text()
                    if row_text.strip():
                        hours.append(row_text.strip())
                business["hours"] = hours
            except Exception:
                business["hours"] = []
        else:
            business["hours"] = []

        business["description"] = ""

        return business

    except Exception:
        return None
