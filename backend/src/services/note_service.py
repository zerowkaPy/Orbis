import logging
import tempfile

from fastapi import WebSocket
from faster_whisper import WhisperModel
from starlette.websockets import WebSocketDisconnect

from .gemini_service import process_note

logger = logging.getLogger(__name__)

model = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8"
)

async def add_note(websocket: WebSocket):
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

            segments, info = model.transcribe(
                temp_audio_file.name,
                beam_size=5,
            )

            logger.info(f"Detected language '{info.language}' with probability {info.language_probability:.2f}")

            for segment in segments:
                transcript += segment.text

            logger.info("Transcription completed successfully.")

            note = process_note(
                text=transcript,
                categories=[])
            await websocket.send_json({
                "status": "completed",
                "text": transcript,
            })

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