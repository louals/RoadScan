import os
from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

# Initialize FastAPI app
app = FastAPI(
    title="RoadScan Vision API",
    description="Backend service for YOLO-driven road defect detection with Supabase persistence.",
    version="1.0.0"
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
from routers import predict, reports, users

app.include_router(predict.router)
app.include_router(reports.router)
app.include_router(users.router)