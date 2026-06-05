from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.maps_scraper import scrape_google_maps_stream
import json

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    location: str = ""
    max_results: int = 20


@router.post("/search")
async def search_businesses(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Arama kelimesi gerekli")

    async def event_stream():
        async for event in scrape_google_maps_stream(
            request.query,
            request.location,
            request.max_results,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
