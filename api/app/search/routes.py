from fastapi import APIRouter, Query, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import MidiFile
from typing import List
from app.midi.extract import extract_rhythm_vector

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
        SELECT *, rhythm_vector <-> :vector AS distance FROM midifiles
        ORDER BY distance
        LIMIT :limit
        """,
        {"vector": rhythm_vector, "limit": limit}
    ).fetchall()
    return [
        {"id": str(row.id), "filename": row.filename, "distance": float(row.distance)}
        for row in results
    ]


@router.post("/search/file")
def search_by_file(
    file: UploadFile = File(...),
    limit: int = 5,
    db: Session = Depends(get_db)
):
    if not (file.filename.lower().endswith('.mid') or file.filename.lower().endswith('.midi')):
        raise HTTPException(status_code=400, detail="Arquivo não é MIDI (.mid ou .midi)")
    try:
        rhythm_vector = extract_rhythm_vector(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar MIDI: {e}")
    results = db.execute(
        """
        SELECT *, rhythm_vector <-> :vector AS distance FROM midifiles
        ORDER BY distance
        LIMIT :limit
        """,
        {"vector": rhythm_vector, "limit": limit}
    ).fetchall()
    return [
        {"id": str(row.id), "filename": row.filename, "distance": float(row.distance)}
        for row in results
    ]
