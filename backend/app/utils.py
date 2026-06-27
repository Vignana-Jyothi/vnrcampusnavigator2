"""
Shared lookup helper used by both the rooms router and the navigate
router, so "search by room number OR room name, case-insensitively"
is implemented in exactly one place.
"""
import re

from app.database import rooms_collection


async def find_room_by_query(query: str):
    """
    Looks up a single room document where `query` exactly matches
    (case-insensitively):
      - any entry inside the roomNumbers array, OR
      - the roomName field

    MongoDB matches an array field against a scalar condition (including
    a $regex) if ANY element of the array satisfies it, so this single
    query covers "search by any of the room's room numbers" for free.

    Returns the raw Mongo document, or None if nothing matched.

    NOTE: this returns only the FIRST match and is kept only for the
    single-room GET /rooms/{room_query} lookup. For navigation/
    highlighting, use find_rooms_by_query() below instead — room
    names like "Toilets" or "Lift" are intentionally duplicated
    across multiple rooms on a floor, and find_one() would silently
    drop every match but the first.
    """
    escaped = re.escape(query.strip())
    exact_case_insensitive = {"$regex": f"^{escaped}$", "$options": "i"}

    return await rooms_collection.find_one(
        {
            "$or": [
                {"roomNumbers": exact_case_insensitive},
                {"roomName": exact_case_insensitive},
            ]
        }
    )


async def find_rooms_by_query(query: str):
    """
    Looks up EVERY room document where `query` exactly matches
    (case-insensitively) any entry in roomNumbers OR the roomName
    field, and returns them ALL.

    This is the one to use for navigation/highlighting: a search like
    "Toilets" or "Lift" is expected to match several rooms on the same
    floor, and every one of them should be returned and highlighted —
    not just the first one Mongo happens to find.

    Returns a list of raw Mongo documents (possibly empty, never None).
    """
    escaped = re.escape(query.strip())
    exact_case_insensitive = {"$regex": f"^{escaped}$", "$options": "i"}

    cursor = rooms_collection.find(
        {
            "$or": [
                {"roomNumbers": exact_case_insensitive},
                {"roomName": exact_case_insensitive},
            ]
        }
    )
    return await cursor.to_list(length=100)