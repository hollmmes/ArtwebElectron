from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.maps_scraper import scrape_google_maps

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    location: str = ""


@router.post("/search")
async def search_businesses(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Arama kelimesi gerekli")

    try:
        results = await scrape_google_maps(request.query, request.location)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
