from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import MidiFile
from datetime import datetime
import uuid
from app.midi.extract import extract_rhythm_vector

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload")
def upload_midi(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not (file.filename.lower().endswith('.mid') or file.filename.lower().endswith('.midi')):
        raise HTTPException(status_code=400, detail="Arquivo não é MIDI (.mid ou .midi)")
    # Extração real do vetor rítmico
    try:
        rhythm_vector = extract_rhythm_vector(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar MIDI: {e}")
    midi = MidiFile(
        id=uuid.uuid4(),
        filename=file.filename,
        bpm=120.0,  # Pode ser extraído depois
        time_signature="4/4",  # Pode ser extraído depois
        duration=60.0,  # Pode ser extraído depois
        rhythm_vector=rhythm_vector,
        created_at=datetime.utcnow()
    )
    db.add(midi)
    db.commit()
    db.refresh(midi)
    return {"id": str(midi.id), "filename": midi.filename}
