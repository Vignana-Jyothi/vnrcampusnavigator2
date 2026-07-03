from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

router = APIRouter()

class LoginRequest(BaseModel):
    password: str

@router.post("/admin/login")
def login(data: LoginRequest):

    if data.password == os.getenv("ADMIN_PASSWORD"):
        return {"success": True}

    raise HTTPException(
        status_code=401,
        detail="Invalid Password"
    )