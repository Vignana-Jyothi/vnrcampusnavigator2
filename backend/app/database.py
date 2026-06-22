"""
MongoDB Atlas connection setup.

Uses Motor (the async MongoDB driver) since FastAPI is async.
Connection string and database name come from environment variables
so credentials never live in source code — see .env.example.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "campus_navigation")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

rooms_collection = db["rooms"]
floor_maps_collection = db["floorMaps"]