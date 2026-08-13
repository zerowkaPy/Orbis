from typing import Annotated
import logging

from fastapi import APIRouter, HTTPException, Query, WebSocket, status
from src.repositories.note_repository import NoteRepository
from src.services import note_service

from src.api.v1.models.process_text_model import ProcessTextRequest

from ..dependencies.session import Session
from ..models.note_model import NoteRequest, NoteResponse

logger = logging.getLogger(__name__)
note_router = APIRouter(
    prefix="/api/v1",
    tags=["Note"]
)

@note_router.websocket("/note/transcribe")
async def transcribe_voice(websocket: WebSocket):
    return await note_service.transcribe_audio_stream(websocket=websocket)

@note_router.post("/note/process-text", status_code=status.HTTP_201_CREATED)
async def process_text_to_note(
    payload: ProcessTextRequest,
    session: Session
):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    try:
        return await note_service.process_text_and_create_note(
            text=payload.text,
            session=session
        )
    except Exception as e:
        logger.exception("Exception in /note/process-text route")
        raise HTTPException(status_code=500, detail=str(e))

@note_router.websocket("/note/update")
async def change_note(
    websocket: WebSocket,
    session: Session,
    note_id: Annotated[int, Query()]
    ):
    return await note_service.change_note(
        websocket=websocket,
        session=session,
        note_id=note_id)

@note_router.get("/notes")
async def get_notes(
    session: Session,
    category_id: Annotated[int | None, Query()] = None
):
    notes = await NoteRepository.get(
        session=session,
        category_id=category_id
    )
    return [
            NoteResponse.model_validate(note)
            for note in notes
        ]

@note_router.post(
    "/notes",
    status_code=status.HTTP_201_CREATED)
async def create_note(
    session: Session,
    note: NoteRequest
):
    created_note = await NoteRepository.add_one(
        session=session,
        category_id=note.category_id,
        text=note.text
    )
    return NoteResponse.model_validate(created_note)

@note_router.patch("/notes/{note_id}")
async def update_note(
    session: Session,
    note_id: int,
    note: NoteRequest
):
    updated_note = await NoteRepository.edit_one(
        session=session,
        note_id=note_id,
        **note.model_dump(exclude_unset=True)
    )
    return NoteResponse.model_validate(updated_note)

@note_router.delete(
    "/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    session: Session,
    note_id: int,
):
    await NoteRepository.delete_by_id(
        session=session,
        note_id=note_id
    )