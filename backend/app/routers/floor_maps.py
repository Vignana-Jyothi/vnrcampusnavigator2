"""
Floor map endpoints.

POST /floor-map                — save (or update) a floor map's SVG
GET  /floor-map/{block}/{floor} — fetch a floor map by block + floor
"""
from fastapi import APIRouter, HTTPException

from app.database import floor_maps_collection
from app.models import FloorMapIn, FloorMapOut

router = APIRouter(prefix="/floor-map", tags=["floor-map"])


@router.post("", response_model=FloorMapOut, status_code=201)
async def save_floor_map(floor_map: FloorMapIn):
    """
    Upsert by (block, floor) — re-uploading a map for the same block
    and floor replaces the old SVG instead of duplicating it.
    """
    await floor_maps_collection.update_one(
        {"block": floor_map.block, "floor": floor_map.floor},
        {"$set": floor_map.model_dump()},
        upsert=True,
    )
    return floor_map


@router.get("/{block}/{floor}", response_model=FloorMapOut)
async def get_floor_map(block: str, floor: int):
    doc = await floor_maps_collection.find_one({"block": block, "floor": floor})
    if not doc:
        raise HTTPException(
            status_code=404,
            detail=f"No floor map found for block '{block}', floor {floor}",
        )
    return FloorMapOut(**doc)