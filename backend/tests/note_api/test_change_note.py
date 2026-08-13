from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, Mock, patch

from fastapi.testclient import TestClient
from src.database.postgres.orm.note_category_orm import NoteCategoryOrm
from src.database.postgres.orm.note_orm import NoteOrm
from src.services.gemini_service import NoteUpdateGeminiAnswer


def test_change_note(test_client: TestClient):
    print("1. START")
    mock_info = Mock()
    mock_info.language = "en"
    mock_info.language_probability = 1
    mock_segment = MagicMock()
    mock_segment.text = "Mock and MagicMock objects create all attributes and methods as you access them and store details of how they have been used."
    mock_info = MagicMock()
    mock_info.language = "en"
    mock_info.language_probability = 1.0

    mock_whisper = MagicMock()
    mock_whisper.transcribe.return_value = ([mock_segment], mock_info)

    fake_note = NoteOrm()
    fake_note.id = 25
    fake_note.text = "unittest.mock is a library for testing in Python."
    fake_note.created_at = datetime(2026, 8, 11, 19, 0, tzinfo=timezone.utc)
    fake_note.category_id = 2
    fake_note.user_id = 10

    fake_category = NoteCategoryOrm()
    fake_category.id = 2
    fake_category.name = "Python Testing"
    fake_category.color = "#F20000"
    fake_category.user_id = 10

    fake_gemini_updated_note = NoteUpdateGeminiAnswer(
        note_text_in_markdown_format="""# unittest.mock in Python
    `unittest.mock` is a library for testing in Python.
    ## Mock and MagicMock
    `Mock` and `MagicMock` allow you to create mock objects that automatically create attributes and methods as you access them.
    They also keep track of how those attributes and methods were used during the execution of the test."""
    )
    print("2. BEFORE PATCH")
    with (
        patch(
            "src.services.note_service.get_whisper_model",
            return_value=mock_whisper
        ),
        patch(
            "src.services.note_service.NoteRepository.one_by_id",
            new_callable=AsyncMock,
            return_value=fake_note
        ),
        patch(
            "src.services.note_service.NoteCategoryRepository.get_one_by_id",
            new_callable=AsyncMock,
            return_value=fake_category
        ),
        patch(
            "src.services.note_service.update_note",
            new_callable=AsyncMock,
            return_value=fake_gemini_updated_note
        ),
        patch(
            "src.services.note_service.NoteRepository.edit_one",
            new_callable=AsyncMock
        ),
        test_client.websocket_connect("/api/v1/note/update?note_id=25") as session
    ):
        print("3. WEBSOCKET CONNECTED")
        msg = session.receive_json()
        print("4. RECEIVED CONNECTED")
        assert msg["status"] == "connected"
        session.send_bytes(b"Fake audio bytes")
        print("5. SENT BYTES")
        session.send_text("finish")
        print("6. SENT FINISH")
        result = session.receive_json()
        print("7. RECEIVED RESULT")
        assert result["status"] == fake_gemini_updated_note.status
        assert result["note_text_in_markdown_format"] == fake_gemini_updated_note.note_text_in_markdown_format



