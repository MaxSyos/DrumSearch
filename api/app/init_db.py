from app.db import engine, Base
from sqlalchemy import text

# Cria extensão pgvector se não existir
def create_pgvector_extension():
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()

def init_db():
    create_pgvector_extension()
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("Banco de dados inicializado com sucesso!")
