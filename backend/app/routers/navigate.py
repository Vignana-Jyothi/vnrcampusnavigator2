"""
Navigate endpoint — MVP version.

GET /navigate?source=A101&destination=Computer+Lab

Fetches both rooms from the `rooms` collection — matching by EITHER
room number or room name, case-insensitively — and returns them
together. No pathfinding — just the two rooms' data so the frontend
can highlight them on the floor map.
"""
from fastapi import APIRouter, HTTPException, Query

from app.models import NavigateResponse, RoomOut
from app.utils import find_room_by_query

router = APIRouter(tags=["navigate"])


@router.get("/navigate", response_model=NavigateResponse)
async def navigate(
    source: str = Query(..., description="Source room number or room name"),
    destination: str = Query(..., description="Destination room number or room name"),
):
    source_doc = await find_room_by_query(source)
    if not source_doc:
        raise HTTPException(status_code=404, detail=f"Source room '{source}' not found")

    destination_doc = await find_room_by_query(destination)
    if not destination_doc:
        raise HTTPException(
            status_code=404, detail=f"Destination room '{destination}' not found"
        )

    return NavigateResponse(
        source=RoomOut(**source_doc),
        destination=RoomOut(**destination_doc),
    )