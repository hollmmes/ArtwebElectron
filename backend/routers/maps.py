from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from services.maps_scraper import scrape_google_maps_stream
from services.email_finder import find_emails_from_website
from services.exporter import export_to_csv, export_to_json
from database import (
    save_business, get_existing_businesses, save_search,
    get_search_history, get_search_history_grouped,
    get_all_businesses, get_businesses_by_category,
    delete_business, update_business_emails
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


@router.post("/search")
async def search_businesses(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Arama kelimesi gerekli")

    existing = await get_existing_businesses(request.query.strip(), request.location.strip())
    existing_keys = {(b["name"], b["address"]) for b in existing}

    async def event_stream():
        new_count = 0
        total_count = 0
        try:
            async for event in scrape_google_maps_stream(
                request.query,
                request.location,
                request.max_results,
            ):
                if event["type"] == "result":
                    business = event["data"]
                    key = (business.get("name", ""), business.get("address", ""))
                    try:
                        is_new = await save_business(business, request.query.strip(), request.location.strip())
                    except Exception:
                        is_new = True
                    event["data"]["is_new"] = is_new
                    if key in existing_keys:
                        event["data"]["is_new"] = False
                    else:
                        new_count += 1 if is_new else 0
                    total_count += 1

                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

                if event.get("type") == "done":
                    await save_search(request.query.strip(), request.location.strip(), total_count, new_count)
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
    limit: int = Query(default=100, ge=1, le=500),
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


@router.get("/export/csv")
async def export_csv(query: str = "", location: str = ""):
    if query:
        businesses = await get_existing_businesses(query, location)
    else:
        result = await get_all_businesses(limit=5000, offset=0)
        businesses = result["businesses"]

    csv_content = export_to_csv(businesses)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=isletmeler_{query or 'tumu'}.csv"}
    )


@router.get("/export/json")
async def export_json_file(query: str = "", location: str = ""):
    if query:
        businesses = await get_existing_businesses(query, location)
    else:
        result = await get_all_businesses(limit=5000, offset=0)
        businesses = result["businesses"]

    json_content = export_to_json(businesses)
    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=isletmeler_{query or 'tumu'}.json"}
    )
