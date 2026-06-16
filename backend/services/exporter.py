import csv
import json
import io
import xml.etree.ElementTree as ET
from datetime import datetime


FIELDS = [
    'name', 'category', 'address', 'phone', 'website', 'emails',
    'rating', 'reviews_count', 'working_hours', 'about',
    'facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'tiktok',
    'maps_url', 'latitude', 'longitude'
]

FIELD_LABELS = {
    'name': 'İşletme Adı',
    'category': 'Kategori',
    'address': 'Adres',
    'phone': 'Telefon',
    'website': 'Website',
    'emails': 'E-posta',
    'rating': 'Puan',
    'reviews_count': 'Yorum Sayısı',
    'working_hours': 'Çalışma Saatleri',
    'about': 'Hakkında',
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'twitter': 'Twitter/X',
    'youtube': 'YouTube',
    'linkedin': 'LinkedIn',
    'tiktok': 'TikTok',
    'maps_url': 'Google Maps URL',
    'latitude': 'Enlem',
    'longitude': 'Boylam',
}


def _build_row(biz: dict) -> dict:
    social = biz.get('social_media', {}) or {}
    emails = biz.get('emails', [])
    return {
        'name': biz.get('name', '') or '',
        'category': biz.get('category', '') or '',
        'address': biz.get('address', '') or '',
        'phone': biz.get('phone', '') or '',
        'website': biz.get('website', '') or '',
        'emails': '; '.join(emails) if isinstance(emails, list) else (emails or ''),
        'rating': biz.get('rating', '') if biz.get('rating') is not None else '',
        'reviews_count': biz.get('reviews_count', '') if biz.get('reviews_count') is not None else '',
        'working_hours': _format_hours(biz.get('working_hours', {})),
        'about': biz.get('about', '') or '',
        'facebook': social.get('facebook', '') or '',
        'instagram': social.get('instagram', '') or '',
        'twitter': social.get('twitter', '') or '',
        'youtube': social.get('youtube', '') or '',
        'linkedin': social.get('linkedin', '') or '',
        'tiktok': social.get('tiktok', '') or '',
        'maps_url': biz.get('maps_url', '') or '',
        'latitude': biz.get('latitude', '') if biz.get('latitude') is not None else '',
        'longitude': biz.get('longitude', '') if biz.get('longitude') is not None else '',
    }


def export_to_csv(businesses: list[dict]) -> bytes:
    if not businesses:
        return ''.encode('utf-8-sig')

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=FIELDS, extrasaction='ignore')
    # Türkçe başlık satırı
    writer.writerow({f: FIELD_LABELS.get(f, f) for f in FIELDS})
    for biz in businesses:
        writer.writerow(_build_row(biz))

    # utf-8-sig = UTF-8 BOM → Excel'de Türkçe karakterler bozulmaz
    return output.getvalue().encode('utf-8-sig')


def export_to_json(businesses: list[dict]) -> bytes:
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
    return json.dumps(clean, ensure_ascii=False, indent=2).encode('utf-8')


def export_to_xml(businesses: list[dict]) -> bytes:
    root = ET.Element('isletmeler')
    root.set('olusturulma', datetime.now().strftime('%Y-%m-%d %H:%M'))
    root.set('toplam', str(len(businesses)))

    for biz in businesses:
        row = _build_row(biz)
        item = ET.SubElement(root, 'isletme')
        for field in FIELDS:
            child = ET.SubElement(item, field)
            child.text = str(row.get(field, ''))

    tree = ET.ElementTree(root)
    buf = io.BytesIO()
    tree.write(buf, encoding='utf-8', xml_declaration=True)
    return buf.getvalue()


def export_to_xlsx(businesses: list[dict]) -> bytes:
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
    except ImportError:
        raise RuntimeError("openpyxl kurulu değil. 'pip install openpyxl' ile kurun.")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'İşletmeler'

    header_font = Font(bold=True, color='FFFFFF', size=11)
    header_fill = PatternFill(start_color='1E40AF', end_color='1E40AF', fill_type='solid')
    header_align = Alignment(horizontal='center', vertical='center', wrap_text=True)

    headers = [FIELD_LABELS.get(f, f) for f in FIELDS]
    ws.append(headers)
    for col_idx, cell in enumerate(ws[1], 1):
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align

    ws.row_dimensions[1].height = 30

    for biz in businesses:
        row = _build_row(biz)
        ws.append([str(row.get(f, '')) for f in FIELDS])

    # Kolon genişliklerini otomatik ayarla
    col_widths = {'name': 35, 'address': 45, 'about': 40, 'working_hours': 35,
                  'website': 30, 'maps_url': 30, 'emails': 30}
    for col_idx, field in enumerate(FIELDS, 1):
        width = col_widths.get(field, 18)
        ws.column_dimensions[ws.cell(1, col_idx).column_letter].width = width

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _format_hours(hours: dict) -> str:
    if not hours:
        return ''
    if 'info' in hours:
        return hours['info']
    return '; '.join(f"{day}: {time}" for day, time in hours.items())
