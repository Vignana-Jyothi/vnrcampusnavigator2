"""
Navigate endpoint — MVP version.

GET /navigate?source=Toilets&destination=B205

Fetches ALL rooms matching `source` and ALL rooms matching
`destination` — matching by either room number or room name,
case-insensitively — and returns them as two arrays. Room names like
"Toilets", "Lift", and "Stairs" are intentionally duplicated across
multiple rooms on the same floor, so a name search can (and should)
return more than one room; a room-number search like "B205" will
naturally return an array with just one entry, since room numbers
are unique.

No pathfinding — just the matching rooms' data so the frontend can
highlight every one of them on the floor map.
"""
from fastapi import APIRouter, HTTPException, Query

from app.models import NavigateResponse, RoomOut
from app.utils import find_rooms_by_query

router = APIRouter(tags=["navigate"])


@router.get("/navigate", response_model=NavigateResponse)
async def navigate(
    source: str = Query(..., description="Source room number or room name"),
    destination: str = Query(..., description="Destination room number or room name"),
):
    source_docs = await find_rooms_by_query(source)
    if not source_docs:
        raise HTTPException(status_code=404, detail=f"Source room '{source}' not found")

    destination_docs = await find_rooms_by_query(destination)
    if not destination_docs:
        raise HTTPException(
            status_code=404, detail=f"Destination room '{destination}' not found"
        )

    return NavigateResponse(
        source=[RoomOut(**doc) for doc in source_docs],
        destination=[RoomOut(**doc) for doc in destination_docs],
    )