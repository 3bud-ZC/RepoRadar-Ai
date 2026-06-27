from fastapi import APIRouter, FastAPI

app = FastAPI()
router = APIRouter()

@app.get("/health")
def health():
    return {"ok": True}

@router.post("/items")
def create_item():
    return {"ok": True}

