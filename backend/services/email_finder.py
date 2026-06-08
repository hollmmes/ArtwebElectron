import re
import asyncio
from playwright.async_api import async_playwright


EMAIL_REGEX = re.compile(
    r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}',
    re.IGNORECASE
)

EXCLUDED_EMAILS = {
    'example@example.com', 'email@example.com', 'info@example.com',
    'name@domain.com', 'user@domain.com', 'your@email.com',
}

EXCLUDED_DOMAINS = {
    'sentry.io', 'wixpress.com', 'googleapis.com', 'google.com',
    'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com',
    'w3.org', 'schema.org', 'apple.com', 'microsoft.com',
    'cloudflare.com', 'jsdelivr.net', 'unpkg.com',
}


def is_valid_email(email: str) -> bool:
    email = email.lower().strip()
    if email in EXCLUDED_EMAILS:
        return False
    domain = email.split('@')[1] if '@' in email else ''
    if domain in EXCLUDED_DOMAINS:
        return False
    if len(email) > 100 or len(email) < 6:
        return False
    if '..' in email or email.startswith('.') or email.endswith('.'):
        return False
    # Skip image/file extensions mistaken as emails
    if any(email.endswith(ext) for ext in ['.png', '.jpg', '.gif', '.svg', '.css', '.js']):
        return False
    return True


async def find_emails_from_website(website: str, timeout: int = 15000) -> list[str]:
    """Visit a website and extract email addresses."""
    if not website:
        return []

    url = website if website.startswith('http') else f'https://{website}'

    emails = set()
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

            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=timeout)
                await page.wait_for_timeout(2000)

                # Get page content
                content = await page.content()
                found = EMAIL_REGEX.findall(content)
                for email in found:
                    if is_valid_email(email):
                        emails.add(email.lower())

                # Check mailto: links
                mailto_links = page.locator('a[href^="mailto:"]')
                count = await mailto_links.count()
                for i in range(min(count, 10)):
                    href = await mailto_links.nth(i).get_attribute("href") or ""
                    email = href.replace("mailto:", "").split("?")[0].strip()
                    if email and is_valid_email(email):
                        emails.add(email.lower())

                # Try contact/about pages
                contact_links = page.locator('a[href*="contact"], a[href*="iletisim"], a[href*="hakkimizda"], a[href*="about"]')
                link_count = await contact_links.count()
                if link_count > 0:
                    try:
                        href = await contact_links.first.get_attribute("href") or ""
                        if href and not href.startswith("mailto:"):
                            if not href.startswith("http"):
                                href = f"{url.rstrip('/')}/{href.lstrip('/')}"
                            await page.goto(href, wait_until="domcontentloaded", timeout=10000)
                            await page.wait_for_timeout(1500)
                            content = await page.content()
                            found = EMAIL_REGEX.findall(content)
                            for email in found:
                                if is_valid_email(email):
                                    emails.add(email.lower())
                    except Exception:
                        pass

            except Exception:
                pass
            finally:
                await browser.close()

    except Exception:
        pass

    return list(emails)[:5]


async def find_emails_batch(businesses: list[dict]) -> list[dict]:
    """Find emails for multiple businesses in parallel."""
    semaphore = asyncio.Semaphore(3)
    results = []

    async def process(biz):
        async with semaphore:
            website = biz.get("website", "")
            if not website:
                return {**biz, "emails": []}
            emails = await find_emails_from_website(website)
            return {**biz, "emails": emails}

    tasks = [process(b) for b in businesses]
    results = await asyncio.gather(*tasks)
    return results
