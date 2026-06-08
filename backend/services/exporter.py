import csv
import json
import io
from datetime import datetime


def export_to_csv(businesses: list[dict]) -> str:
    """Export businesses to CSV string."""
    if not businesses:
        return ""

    output = io.StringIO()
    fields = [
        'name', 'category', 'address', 'phone', 'website', 'emails',
        'rating', 'reviews_count', 'working_hours', 'about',
        'facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'tiktok',
        'maps_url', 'latitude', 'longitude'
    ]

    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()

    for biz in businesses:
        row = {
            'name': biz.get('name', ''),
            'category': biz.get('category', ''),
            'address': biz.get('address', ''),
            'phone': biz.get('phone', ''),
            'website': biz.get('website', ''),
            'emails': '; '.join(biz.get('emails', [])) if isinstance(biz.get('emails'), list) else '',
            'rating': biz.get('rating', ''),
            'reviews_count': biz.get('reviews_count', ''),
            'working_hours': _format_hours(biz.get('working_hours', {})),
            'about': biz.get('about', ''),
            'maps_url': biz.get('maps_url', ''),
            'latitude': biz.get('latitude', ''),
            'longitude': biz.get('longitude', ''),
        }
        social = biz.get('social_media', {})
        row['facebook'] = social.get('facebook', '')
        row['instagram'] = social.get('instagram', '')
        row['twitter'] = social.get('twitter', '')
        row['youtube'] = social.get('youtube', '')
        row['linkedin'] = social.get('linkedin', '')
        row['tiktok'] = social.get('tiktok', '')
        writer.writerow(row)

    return output.getvalue()


def export_to_json(businesses: list[dict]) -> str:
    """Export businesses to JSON string."""
    clean = []
    for biz in businesses:
        clean.append({
            'name': biz.get('name', ''),
            'category': biz.get('category', ''),
            'address': biz.get('address', ''),
            'phone': biz.get('phone', ''),
            'website': biz.get('website', ''),
            'emails': biz.get('emails', []),
            'rating': biz.get('rating'),
            'reviews_count': biz.get('reviews_count'),
            'working_hours': biz.get('working_hours', {}),
            'about': biz.get('about', ''),
            'social_media': biz.get('social_media', {}),
            'maps_url': biz.get('maps_url', ''),
            'latitude': biz.get('latitude'),
            'longitude': biz.get('longitude'),
            'reviews': biz.get('reviews', []),
        })
    return json.dumps(clean, ensure_ascii=False, indent=2)


def _format_hours(hours: dict) -> str:
    if not hours:
        return ''
    if 'info' in hours:
        return hours['info']
    return '; '.join(f"{day}: {time}" for day, time in hours.items())
