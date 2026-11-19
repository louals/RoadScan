import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
elif DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
engine = create_engine(DATABASE_URL)

# Initialize FastAPI app
app = FastAPI(
    title="RoadScan Vision API",
    description="Backend service for YOLO-driven road defect detection with Supabase persistence.",
    version="1.0.0"
)

# Allow the separately hosted browser app to call the API. Set
# FRONTEND_ORIGINS to a comma-separated list in deployed environments.
frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# --- Startup Database Connection Test ---
@app.on_event("startup")
def test_db_connection():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).fetchone()
            print("\n--------------------------------------------------")
            print("SUCCESS : Connected successfully !")
            print(f"PostgreSQL Version : {result[0]}")
            print("--------------------------------------------------\n")
    except Exception as e:
        print("\n--------------------------------------------------")
        print("Connection error :")
        print(e)
        print("--------------------------------------------------\n")

# --- Root Endpoint ---
@app.get("/")
def read_root():
    return {
        "status": "RoadScan API is running and connected!",
        "docs_url": "/docs"
    }


# --- Mount Business Logic Routers ---
from routers import auth, predict, reports, users

app.include_router(predict.router)
app.include_router(reports.router)
app.include_router(auth.router)
app.include_router(users.router)
