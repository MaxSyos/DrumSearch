from fastapi import FastAPI
from app.upload.routes import router as upload_router
from app.search.routes import router as search_router
from app.midi.routes import router as midi_router
from app.vector.routes import router as vector_router
from app.init_db import init_db

app = FastAPI(title="DrumSearch API")

# Inicializa o banco e extensão pgvector automaticamente
init_db()

app.include_router(upload_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(midi_router, prefix="/api")
app.include_router(vector_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "API DrumSearch rodando!"}
