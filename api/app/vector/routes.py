from fastapi import APIRouter

router = APIRouter()

@router.get("/vector/info")
def vector_info():
    return {"message": "Vector info endpoint"}
