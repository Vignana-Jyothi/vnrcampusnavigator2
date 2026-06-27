"""
Pydantic models for request/response validation.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class RoomIn(BaseModel):
    """
    Shape of a room as sent from the Admin page when saving.

    A single rectangle can represent more than one room number
    (e.g. a shared lab numbered both A101 and A102), so roomNumbers
    is always a list — even for a single room number, send ["A101"].
    roomName is optional.
    """
    roomNumbers: List[str] = Field(..., min_length=1, examples=[["A101", "A102"]])
    roomName: Optional[str] = Field(default=None, examples=["Computer Lab"])
    block: str = Field(..., examples=["A"])
    floor: int = Field(..., examples=[1])
    x: float
    y: float
    width: float
    height: float


class RoomOut(BaseModel):
    """Shape of a room as returned to the frontend (no Mongo _id)."""
    roomNumbers: List[str]
    roomName: Optional[str] = None
    block: str
    floor: int
    x: float
    y: float
    width: float
    height: float


class FloorMapIn(BaseModel):
    """Shape of a floor map as sent from the Admin page when saving."""
    block: str = Field(..., examples=["A"])
    floor: int = Field(..., examples=[1])
    svgContent: str


class FloorMapOut(BaseModel):
    block: str
    floor: int
    svgContent: str


class NavigateResponse(BaseModel):
    # Lists, not single rooms — a search term like "Toilets" or "Lift"
    # can legitimately match several rooms on the same floor, and all
    # of them need to be returned so the frontend can highlight every
    # one of them.
    source: List[RoomOut]
    destination: List[RoomOut]