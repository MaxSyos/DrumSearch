from fastapi import APIRouter

router = APIRouter()

@router.get("/midi/info")
def midi_info():
    return {"message": "MIDI info endpoint"}
