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

mongo_uri_env = os.getenv("MONGODB_URI", "").strip()
MONGODB_URI = mongo_uri_env if mongo_uri_env else "mongodb://localhost:27017"
db_name_env = os.getenv("DB_NAME", "").strip()
DB_NAME = db_name_env if db_name_env else "campus_navigation"

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

rooms_collection = db["rooms"]
floor_maps_collection = db["floorMaps"]