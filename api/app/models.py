from sqlalchemy import Column, String, Float, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db import Base
from pgvector.sqlalchemy import Vector

class MidiFile(Base):
    __tablename__ = "midifiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    bpm = Column(Float)
    time_signature = Column(String)
    duration = Column(Float)
    rhythm_vector = Column(Vector(32))
    created_at = Column(TIMESTAMP)
