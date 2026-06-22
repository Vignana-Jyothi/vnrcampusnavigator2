"""
Room endpoints.

POST /rooms              — save (or update) a room
GET  /rooms/{roomNo}      — fetch a single room by its room number
"""
from fastapi import APIRouter, HTTPException

from app.database import rooms_collection
from app.models import RoomIn, RoomOut

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomOut, status_code=201)
async def save_room(room: RoomIn):
    """
    Upsert by roomNo — re-saving the same room number (e.g. after the
    Admin page re-maps a rectangle) updates it instead of creating a
    duplicate document.
    """
    await rooms_collection.update_one(
        {"roomNo": room.roomNo},
        {"$set": room.model_dump()},
        upsert=True,
    )
    return room


@router.get("/{room_no}", response_model=RoomOut)
async def get_room(room_no: str):
    doc = await rooms_collection.find_one({"roomNo": room_no})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Room '{room_no}' not found")
    return RoomOut(**doc)