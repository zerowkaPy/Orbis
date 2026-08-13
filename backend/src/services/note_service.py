import logging
import tempfile

from fastapi import WebSocket, HTTPException, status
from faster_whisper import WhisperModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.note_category_repository import NoteCategoryRepository
from src.repositories.note_repository import NoteRepository
from starlette.websockets import WebSocketDisconnect
from .gemini_service import (
    GEMINI_PROD_MODEL,
    process_note,
    update_note,
    NoteProcessGeminiAnswer,
    NoteUpdateGeminiAnswer,
    InvalidNoteData
)


logger = logging.getLogger(__name__)

_whisper_model: WhisperModel | None = None

def get_whisper_model() -> WhisperModel:
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel(
            "small",
            device="cpu",
            compute_type="int8"
        )
    return _whisper_model

async def transcribe_audio_stream(websocket: WebSocket):
    """
    Accepts audio bytes over WebSocket, transcribes them with Whisper
    and returns clear text {"transcript": "..."}.
    """
    await websocket.accept()
    logger.info("WebSocket connection for transcription accepted.")

    transcript = ""

    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as temp_audio_file:
            await websocket.send_json({"status": "connected"})

            while True:
                message = await websocket.receive()

                if message["type"] == "websocket.disconnect":
                    logger.info("Received disconnect signal from client.")
                    break

                if message.get("bytes") is not None:
                    temp_audio_file.write(message["bytes"])

                elif message.get("text") == "finish":
                    logger.info("Received finish command. Processing audio...")
                    break

            if temp_audio_file.tell() == 0:
                logger.warning("Received empty audio.")
                await websocket.send_json({"status": "error", "message": "Audio stream was empty"})
                return

            temp_audio_file.flush()

            model = get_whisper_model()
            segments, info = model.transcribe(temp_audio_file.name, beam_size=5)

            logger.info(f"Detected language '{info.language}' ({info.language_probability:.2f})")

            for segment in segments:
                transcript += segment.text

            logger.info("Transcription completed successfully.")
            
            await websocket.send_json({
                "status": "completed",
                "transcript": transcript.strip()
            })

    except WebSocketDisconnect:
        logger.warning("Client disconnected unexpectedly.")
    except Exception:
        logger.exception("Error occurred during transcription.")
        await websocket.send_json({"status": "error", "message": "Failed to transcribe audio"})
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass
        logger.info("WebSocket connection closed.")

async def process_text_and_create_note(
    text: str,
    session: AsyncSession
) -> NoteProcessGeminiAnswer:
    categories = await NoteCategoryRepository.get_all(session=session)
    categories_dict: dict[int, str] = {category.id: category.name for category in categories}

    note = await process_note(
        text=text,
        categories=categories_dict,
        gemini_model=GEMINI_PROD_MODEL
    )

    if note is None or note.category_id is None or note.note_text_in_markdown_format is None:
        raise InvalidNoteData("Gemini returned invalid note data")

    note_dict = note.model_dump()

    await NoteRepository.add_one(
        session=session,
        category_id=note_dict["category_id"],
        text=note_dict["note_text_in_markdown_format"]
    )

    return note


async def change_note(
    websocket: WebSocket,
    session: AsyncSession,
    note_id: int
    ):
    await websocket.accept()
    logger.info("WebSocket connection accepted.")

    transcript = ""

    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as temp_audio_file:
            await websocket.send_json({
                "status": "connected"
            })

            while True:
                message = await websocket.receive()

                if message["type"] == "websocket.disconnect":
                    logger.info("Received disconnect signal from client.")
                    break

                if message.get("bytes") is not None:
                    temp_audio_file.write(message["bytes"])

                elif (
                    message.get("text") is not None and
                    message["text"] == "finish"
                ):
                    logger.info("Received finish command. Processing audio...")
                    break
                
            temp_audio_file.flush()

            model = get_whisper_model()
            segments, info = model.transcribe(
                temp_audio_file.name,
                beam_size=5,
            )

            logger.info(f"Detected language '{info.language}' with probability {info.language_probability:.2f}")

            for segment in segments:
                transcript += segment.text

            logger.info("Transcription completed successfully.")

            note = await NoteRepository.one_by_id(
                session=session,
                note_id=note_id
            )
            category = await NoteCategoryRepository.get_one_by_id(
                session=session,
                category_id=note.category_id)
            updated_note: NoteUpdateGeminiAnswer | None = await update_note(
                    category_name=category.name,
                    note_text=note.text,
                    user_request=transcript,
                    gemini_model=GEMINI_PROD_MODEL)
            logger.info(updated_note)
            if updated_note is None:
                raise HTTPException(
                    status_code=503,
                    detail="The AI service is temporarily unavailable. Please try again later."
                )
            note_dict = updated_note.model_dump()
            await NoteRepository.edit_one(
                session=session,
                note_id=note.id,
                text=note_dict["note_text_in_markdown_format"]
            )
            await websocket.send_json(note_dict)

    except WebSocketDisconnect:
        logger.warning("Client disconnected unexpectedly.")
    except Exception:
        logger.exception("Error occurred during processing note.")
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass
        logger.info("WebSocket connection closed.")