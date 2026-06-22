"""
Pydantic models for request/response validation.
"""
from pydantic import BaseModel, Field


class RoomIn(BaseModel):
    """Shape of a room as sent from the Admin page when saving."""
    roomNo: str = Field(..., examples=["A101"])
    block: str = Field(..., examples=["A"])
    floor: int = Field(..., examples=[1])
    x: float
    y: float
    width: float
    height: float


class RoomOut(BaseModel):
    """Shape of a room as returned to the frontend (no Mongo _id)."""
    roomNo: str
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
    source: RoomOut
    destination: RoomOut