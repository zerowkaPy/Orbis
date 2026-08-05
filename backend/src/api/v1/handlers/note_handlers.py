from fastapi import APIRouter, WebSocket

from backend.src.services import note_service

note_router = APIRouter(
    prefix="/api/v1",
    tags=["Note"]
)

@note_router.websocket("/note/add")
async def add_note(websocket: WebSocket):
    return await note_service.add_note(websocket) 