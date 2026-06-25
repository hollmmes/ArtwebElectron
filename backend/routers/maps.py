from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from services.maps_scraper import scrape_google_maps_stream
from services.email_finder import find_emails_from_website
from services.exporter import export_to_csv, export_to_json, export_to_xml, export_to_xlsx, export_to_html
from database import (
    save_business, get_existing_businesses, save_search,
    get_search_history, get_search_history_grouped,
    get_all_businesses, get_businesses_by_category,
    delete_business, update_business_emails, backfill_coordinates,
    get_businesses_geo
)
import json

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    location: str = ""
    max_results: int = 20


class EmailFinderRequest(BaseModel):
    business_id: int
    website: str


def _parse_locations(location: str) -> list[str]:
    """
    "Kadıköy, Beşiktaş, İstanbul" → ["Kadıköy İstanbul", "Beşiktaş İstanbul"]
    "İstanbul" → ["İstanbul"]
    "" → [""]
    """
    location = location.strip()
    if not location:
        return [""]
    parts = [p.strip() for p in location.split(',') if p.strip()]
    if len(parts) <= 1:
        return [location]
    # Son parça şehir, öncekiler ilçe
    city = parts[-1]
    districts = parts[:-1]
    return [f"{d} {city}" for d in districts]


@router.post("/search")
async def search_businesses(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Arama kelimesi gerekli")

    locations = _parse_locations(request.location)
    existing = await get_existing_businesses(request.query.strip(), request.location.strip())
    existing_keys = {(b["name"], b["address"]) for b in existing}

    async def event_stream():
        new_count = 0
        total_count = 0
        seen_keys = set(existing_keys)
        try:
            for loc_idx, loc in enumerate(locations):
                if len(locations) > 1:
                    loc_label = loc.split()[0] if loc else loc
                    yield f"data: {json.dumps({'type': 'status', 'message': f'{loc_label} taranıyor... ({loc_idx+1}/{len(locations)})'}, ensure_ascii=False)}\n\n"
                async for event in scrape_google_maps_stream(
                    request.query,
                    loc,
                    request.max_results,
                ):
                    if event["type"] == "result":
                        business = event["data"]
                        key = (business.get("name", ""), business.get("address", ""))
                        if key in seen_keys:
                            event["data"]["is_new"] = False
                        else:
                            seen_keys.add(key)
                            try:
                                is_new = await save_business(business, request.query.strip(), request.location.strip())
                            except Exception:
                                is_new = True
                            event["data"]["is_new"] = is_new
                            new_count += 1 if is_new else 0
                        total_count += 1
                    elif event["type"] == "done" and loc != locations[-1]:
                        # Ara done event'lerini gizle, sadece son lokasyon bitince gönder
                        continue

                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

            await save_search(request.query.strip(), request.location.strip(), total_count, new_count)
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/history")
async def search_history():
    history = await get_search_history()
    return {"history": history}


@router.get("/history/grouped")
async def search_history_grouped():
    grouped = await get_search_history_grouped()
    return {"groups": grouped}


@router.get("/categories")
async def business_categories():
    categories = await get_businesses_by_category()
    return {"categories": categories}


@router.get("/businesses")
async def list_businesses(
    limit: int = Query(default=100, ge=1, le=10000),
    offset: int = Query(default=0, ge=0),
    query: str = Query(default=""),
    location: str = Query(default=""),
    search: str = Query(default=""),
):
    if query:
        businesses = await get_existing_businesses(query, location)
        return {"total": len(businesses), "businesses": businesses}
    result = await get_all_businesses(limit, offset, search)
    return result


@router.get("/businesses/geo")
async def list_businesses_geo():
    """Harita için hafif işletme listesi (sadece koordinatlı kayıtlar, temel alanlar)."""
    businesses = await get_businesses_geo()
    return {"total": len(businesses), "businesses": businesses}


@router.post("/backfill-coordinates")
async def backfill_business_coordinates():
    """Mevcut kayıtlardaki maps_url'den lat/lng'leri parse edip günceller."""
    result = await backfill_coordinates()
    return result


@router.delete("/businesses/{business_id}")
async def remove_business(business_id: int):
    deleted = await delete_business(business_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi")
    return {"status": "deleted"}


@router.post("/find-email")
async def find_email(request: EmailFinderRequest):
    emails = await find_emails_from_website(request.website)
    if emails:
        await update_business_emails(request.business_id, emails)
    return {"emails": emails}


def _get_businesses_for_export(businesses_result):
    return businesses_result


async def _fetch_businesses(query: str, location: str):
    if query:
        return await get_existing_businesses(query, location)
    result = await get_all_businesses(limit=5000, offset=0)
    return result["businesses"]


def _safe_filename(query: str) -> str:
    name = query or 'tumu'
    # Türkçe karakter dönüşümü — dosya adında sorun çıkartır
    tr_map = str.maketrans('çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU')
    return name.translate(tr_map).replace(' ', '_')


@router.get("/export/csv")
async def export_csv(query: str = "", location: str = ""):
    businesses = await _fetch_businesses(query, location)
    content = export_to_csv(businesses)
    filename = f"isletmeler_{_safe_filename(query)}.csv"
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    )


@router.get("/export/json")
async def export_json_file(query: str = "", location: str = ""):
    businesses = await _fetch_businesses(query, location)
    content = export_to_json(businesses)
    filename = f"isletmeler_{_safe_filename(query)}.json"
    return Response(
        content=content,
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    )


@router.get("/export/xml")
async def export_xml_file(query: str = "", location: str = ""):
    businesses = await _fetch_businesses(query, location)
    content = export_to_xml(businesses)
    filename = f"isletmeler_{_safe_filename(query)}.xml"
    return Response(
        content=content,
        media_type="application/xml; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    )


@router.get("/export/xlsx")
async def export_xlsx_file(query: str = "", location: str = ""):
    businesses = await _fetch_businesses(query, location)
    try:
        content = export_to_xlsx(businesses)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    filename = f"isletmeler_{_safe_filename(query)}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    )


@router.get("/export/html")
async def export_html_file(query: str = "", location: str = ""):
    businesses = await _fetch_businesses(query, location)
    content = export_to_html(businesses, query=query, location=location)
    filename = f"isletmeler_{_safe_filename(query)}.html"
    return Response(
        content=content,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
    )
