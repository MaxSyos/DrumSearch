from fastapi import FastAPI, UploadFile, File
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

# Endpoint para upload de arquivo MIDI via frontend
@app.post("/api/upload-midi-frontend")
async def upload_midi_frontend(file: UploadFile = File(...)):
    # Salva o arquivo em uma pasta específica
    save_dir = "/tmp/drumsearch_uploads"
    os.makedirs(save_dir, exist_ok=True)
    file_path = os.path.join(save_dir, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    return {"filename": file.filename, "path": file_path}
