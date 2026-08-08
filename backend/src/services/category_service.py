import logging
import tempfile

from fastapi import WebSocket
from faster_whisper import WhisperModel
from starlette.websockets import WebSocketDisconnect

from .gemini_service import process_note

logger = logging.getLogger(__name__)