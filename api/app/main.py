from fastapi import FastAPI, UploadFile, File, Query
import os
from app.populate_db import populate_from_folder
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


# Endpoint para popular o banco a partir de uma pasta local (admin) ou upload de zip
from fastapi import Request
import tempfile

@app.post("/api/populate-db")
async def api_populate_db(
    folder: str = Query(None, description="Caminho absoluto da pasta local no servidor/backend (opcional)"),
    file: UploadFile = File(None)
):
    if file is not None:
        # Upload de arquivo zipado
        if not file.filename.lower().endswith('.zip'):
            return {"success": False, "detail": "Envie um arquivo .zip contendo arquivos MIDI."}
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmpzip:
                tmpzip.write(await file.read())
                tmpzip_path = tmpzip.name
            from app.populate_db import populate_from_folder
            import zipfile
            import shutil
            import tempfile as tf
            # Extrai o zip para uma pasta temporária e processa
            with tf.TemporaryDirectory() as tmpdir:
                with zipfile.ZipFile(tmpzip_path, 'r') as zip_ref:
                    zip_ref.extractall(tmpdir)
                added, errors = populate_from_folder(tmpdir)
            os.remove(tmpzip_path)
            if errors:
                return {"success": False, "detail": f"{added} arquivos adicionados. Erros: {'; '.join(errors)}"}
            return {"success": True, "detail": f"{added} arquivos MIDI adicionados com sucesso."}
        except Exception as e:
            return {"success": False, "detail": f"Erro ao processar o arquivo: {e}"}
    elif folder:
        # Caminho local (admin)
        try:
            added, errors = populate_from_folder(folder)
            if errors:
                return {"success": False, "detail": f"{added} arquivos adicionados. Erros: {'; '.join(errors)}"}
            return {"success": True, "detail": f"{added} arquivos MIDI adicionados com sucesso."}
        except Exception as e:
            return {"success": False, "detail": str(e)}
    else:
        return {"success": False, "detail": "Envie um arquivo .zip ou informe o caminho da pasta."}
