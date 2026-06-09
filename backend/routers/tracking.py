from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import (
    upsert_domain, bulk_insert_domains, get_domains, delete_domain,
    upsert_hosting, bulk_insert_hostings, get_hostings, delete_hosting,
    upsert_ssl, bulk_insert_ssls, get_ssls, delete_ssl,
)

router = APIRouter()


class DomainIn(BaseModel):
    id: Optional[int] = None
    domain: str
    renewal_date: str
    amount: str = ""
    status: str = "Aktif"
    notes: str = ""


class HostingIn(BaseModel):
    id: Optional[int] = None
    product_name: str
    domain: str
    renewal_date: str
    amount: str = ""
    status: str = "Aktif"
    notes: str = ""


class SslIn(BaseModel):
    id: Optional[int] = None
    product_name: str
    domain: str
    renewal_date: str
    amount: str = ""
    status: str = "Aktif"
    notes: str = ""


class BulkDomains(BaseModel):
    rows: list[DomainIn]


class BulkHostings(BaseModel):
    rows: list[HostingIn]


class BulkSsls(BaseModel):
    rows: list[SslIn]


# ── Domains ────────────────────────────────────────────────────────────────

@router.get("/domains")
async def list_domains():
    return {"domains": await get_domains()}


@router.post("/domains")
async def save_domain(data: DomainIn):
    row_id = await upsert_domain(data.model_dump())
    return {"id": row_id}


@router.post("/domains/bulk")
async def save_domains_bulk(payload: BulkDomains):
    await bulk_insert_domains([r.model_dump() for r in payload.rows])
    return {"status": "ok", "count": len(payload.rows)}


@router.delete("/domains/{domain_id}")
async def remove_domain(domain_id: int):
    if not await delete_domain(domain_id):
        raise HTTPException(status_code=404, detail="Bulunamadi")
    return {"status": "deleted"}


# ── Hostings ───────────────────────────────────────────────────────────────

@router.get("/hostings")
async def list_hostings():
    return {"hostings": await get_hostings()}


@router.post("/hostings")
async def save_hosting(data: HostingIn):
    row_id = await upsert_hosting(data.model_dump())
    return {"id": row_id}


@router.post("/hostings/bulk")
async def save_hostings_bulk(payload: BulkHostings):
    await bulk_insert_hostings([r.model_dump() for r in payload.rows])
    return {"status": "ok", "count": len(payload.rows)}


@router.delete("/hostings/{hosting_id}")
async def remove_hosting(hosting_id: int):
    if not await delete_hosting(hosting_id):
        raise HTTPException(status_code=404, detail="Bulunamadi")
    return {"status": "deleted"}


# ── SSL Certs ──────────────────────────────────────────────────────────────

@router.get("/ssls")
async def list_ssls():
    return {"ssls": await get_ssls()}


@router.post("/ssls")
async def save_ssl(data: SslIn):
    row_id = await upsert_ssl(data.model_dump())
    return {"id": row_id}


@router.post("/ssls/bulk")
async def save_ssls_bulk(payload: BulkSsls):
    await bulk_insert_ssls([r.model_dump() for r in payload.rows])
    return {"status": "ok", "count": len(payload.rows)}


@router.delete("/ssls/{ssl_id}")
async def remove_ssl(ssl_id: int):
    if not await delete_ssl(ssl_id):
        raise HTTPException(status_code=404, detail="Bulunamadi")
    return {"status": "deleted"}
