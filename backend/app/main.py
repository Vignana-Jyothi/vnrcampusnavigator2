"""
FastAPI app entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import rooms, floor_maps, navigate

from app.routers.admin import router as admin_router

app = FastAPI(title="Campus Navigation API")

# Allow the React dev servers (CRA on 3000, Vite on 5173) to call this API.
# Add your deployed frontend's origin here too once you host it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://navigation.vjstartup.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(admin_router)
app.include_router(rooms.router)
app.include_router(floor_maps.router)
app.include_router(navigate.router)


@app.get("/")
async def health_check():
    return {"status": "ok", "service": "campus-navigation-api"}