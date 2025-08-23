import os
import pretty_midi
import numpy as np
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from typing import List
from app.midi.extract import extract_rhythm_vector

router = APIRouter()

MIDI_SEARCH_DIR = os.path.join(os.path.dirname(__file__), '../Midi_search')

# Função para calcular distância euclidiana
def euclidean_distance(vec1, vec2):
    return float(np.linalg.norm(np.array(vec1) - np.array(vec2)))

@router.get("/search")
def search(
    rhythm_vector: List[float] = Query(..., description="Vetor rítmico de busca", min_items=32, max_items=32),
    limit: int = 5
):
    results = []
    for filename in os.listdir(MIDI_SEARCH_DIR):
        if filename.lower().endswith('.mid') or filename.lower().endswith('.midi'):
            filepath = os.path.join(MIDI_SEARCH_DIR, filename)
            try:
                with open(filepath, 'rb') as f:
                    midi_vec = extract_rhythm_vector(f)
                dist = euclidean_distance(rhythm_vector, midi_vec)
                results.append({
                    "filename": filename,
                    "distance": dist
                })
            except Exception:
                continue
    results.sort(key=lambda x: x["distance"])
    return results[:limit]

@router.post("/search/file")
def search_by_file(
    file: UploadFile = File(...),
    limit: int = 5
):
    if not (file.filename.lower().endswith('.mid') or file.filename.lower().endswith('.midi')):
        raise HTTPException(status_code=400, detail="Arquivo não é MIDI (.mid ou .midi)")
    try:
        rhythm_vector = extract_rhythm_vector(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar MIDI: {e}")
    results = []
    for filename in os.listdir(MIDI_SEARCH_DIR):
        if filename.lower().endswith('.mid') or filename.lower().endswith('.midi'):
            filepath = os.path.join(MIDI_SEARCH_DIR, filename)
            try:
                with open(filepath, 'rb') as f:
                    midi_vec = extract_rhythm_vector(f)
                dist = euclidean_distance(rhythm_vector, midi_vec)
                results.append({
                    "filename": filename,
                    "distance": dist
                })
            except Exception:
                continue
    results.sort(key=lambda x: x["distance"])
    return results[:limit]
