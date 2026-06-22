"""
Navigate endpoint — MVP version.

GET /navigate?source=A101&destination=A111

Fetches both rooms from the `rooms` collection and returns them
together. No pathfinding — just the two rooms' coordinates so the
frontend can highlight them on the floor map.
"""
from fastapi import APIRouter, HTTPException, Query

from app.database import rooms_collection
from app.models import NavigateResponse, RoomOut

router = APIRouter(tags=["navigate"])


@router.get("/navigate", response_model=NavigateResponse)
async def navigate(
    source: str = Query(..., description="Source room number, e.g. A101"),
    destination: str = Query(..., description="Destination room number, e.g. A111"),
):
    source_doc = await rooms_collection.find_one({"roomNo": source})
    if not source_doc:
        raise HTTPException(status_code=404, detail=f"Source room '{source}' not found")

    destination_doc = await rooms_collection.find_one({"roomNo": destination})
    if not destination_doc:
        raise HTTPException(
            status_code=404, detail=f"Destination room '{destination}' not found"
        )

    return NavigateResponse(
        source=RoomOut(**source_doc),
        destination=RoomOut(**destination_doc),
    )