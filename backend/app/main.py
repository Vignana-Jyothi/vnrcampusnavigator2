"""
FastAPI app entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import rooms, floor_maps, navigate

from app.routers.admin import router as admin_router
from app.database import db, rooms_collection, MONGODB_URI

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

@app.get("/debug/db")
async def debug_db():
    try:
        # Check the first few characters of the URI to see if it's localhost or an actual Atlas URI
        uri_redacted = MONGODB_URI[:15] + "..." if MONGODB_URI else "EMPTY"
        
        collections = await db.list_collection_names()
        room_count = await rooms_collection.count_documents({})
        sample_rooms = await rooms_collection.find({}, {"roomName": 1, "roomNumbers": 1, "_id": 0}).limit(5).to_list(length=5)
        
        return {
            "uri_starts_with": uri_redacted,
            "database_name": db.name,
            "collections_found": collections,
            "total_rooms": room_count,
            "sample_rooms": sample_rooms
        }
    except Exception as e:
        return {"error": str(e), "uri_starts_with": MONGODB_URI[:15] + "..." if MONGODB_URI else "EMPTY"}