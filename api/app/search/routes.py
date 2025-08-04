from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import MidiFile
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/search")
def search(
    rhythm_vector: List[float] = Query(..., description="Vetor rítmico de busca", min_items=32, max_items=32),
    limit: int = 5,
    db: Session = Depends(get_db)
):
    # Busca por similaridade usando pgvector (distância Euclidiana)
    results = db.execute(
        """
        SELECT * FROM midifiles
        ORDER BY rhythm_vector <-> :vector
        LIMIT :limit
        """,
        {"vector": rhythm_vector, "limit": limit}
    ).fetchall()
    return [{"id": str(row.id), "filename": row.filename, "distance": None} for row in results]
