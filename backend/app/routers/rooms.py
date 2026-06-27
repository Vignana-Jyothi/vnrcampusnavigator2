"""
Room endpoints.

POST /rooms              — save (or update) a room
GET  /rooms               — list rooms, optionally filtered by block/floor
GET  /rooms/{room_query}  — fetch a single room by room number OR room name
"""
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.database import rooms_collection
from app.models import RoomIn, RoomOut
from app.utils import find_room_by_query

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomOut, status_code=201)
async def save_room(room: RoomIn):
    """
    Upsert by the rectangle's identity — (block, floor, x, y, width,
    height) — NOT by room number. This is what requirement #7 means by
    "do not create duplicate documents": re-saving the same rectangle
    (e.g. after editing its room numbers or name in the Admin page)
    updates the existing document instead of creating a new one, even
    though roomNumbers itself may have changed.
    """
    identity_filter = {
        "block": room.block,
        "floor": room.floor,
        "x": room.x,
        "y": room.y,
        "width": room.width,
        "height": room.height,
    }

    await rooms_collection.update_one(
        identity_filter,
        {"$set": room.model_dump()},
        upsert=True,
    )
    return room


@router.get("", response_model=List[RoomOut])
async def list_rooms(
    block: Optional[str] = Query(None, description="Filter by block, e.g. A"),
    floor: Optional[int] = Query(None, description="Filter by floor, e.g. 1"),
):
    """
    Returns every room on a floor (or every room overall if no filters
    are given). Used by the Student page to draw the *complete* floor
    map — every rectangle, every label — not just source/destination.
    """
    filter_query = {}
    if block is not None:
        filter_query["block"] = block
    if floor is not None:
        filter_query["floor"] = floor

    docs = await rooms_collection.find(filter_query).to_list(length=1000)
    return [RoomOut(**doc) for doc in docs]


@router.get("/{room_query}", response_model=RoomOut)
async def get_room(room_query: str):
    """
    Fetch a single room by EITHER a room number (e.g. "A101") or a
    room name (e.g. "Computer Lab") — case-insensitive either way.
    """
    doc = await find_room_by_query(room_query)
    if not doc:
        raise HTTPException(
            status_code=404, detail=f"No room found matching '{room_query}'"
        )
    return RoomOut(**doc)