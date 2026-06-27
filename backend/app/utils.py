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