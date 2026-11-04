import os
from fastapi import FastAPI
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from fastapi import HTTPException
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

app = FastAPI(title="RoadScan Test Connexion")

@app.on_event("startup")
def test_db_connection():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).fetchone()
            print("\n--------------------------------------------------")
            print("SUCCÈS : Connecté à Supabase avec succès !")
            print(f"Version PostgreSQL : {result[0]}")
            print("--------------------------------------------------\n")
    except Exception as e:
        print("\n--------------------------------------------------")
        print("ERREUR DE CONNEXION :")
        print(e)
        print("--------------------------------------------------\n")

@app.get("/tables")
def get_supabase_tables():
    try:
        with engine.connect() as conn:
            # Requête pour lister toutes les tables du schéma public
            query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            result = conn.execute(query).fetchall()
            
            # Transformation du résultat en liste de chaînes de caractères
            tables = [row[0] for row in result]
            
            return {
                "status": "success",
                "database": "Supabase",
                "tables_count": len(tables),
                "tables": tables
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des tables : {str(e)}")        

@app.get("/")
def read_root():
    return {"status": "RoadScan API is running and connected!"}