from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from src.services.note_service import NoteProcessGeminiAnswer


def test_add_note(test_client: TestClient):
    fake_segment = MagicMock()
    fake_segment.text = "Buy milk tomorrow"

    fake_info = MagicMock()
    fake_info.language = "en"
    fake_info.language_probability = 0.99

    mock_whisper = MagicMock()
    mock_whisper.transcribe.return_value = ([fake_segment], fake_info)

    fake_note = NoteProcessGeminiAnswer(
        category_id=1,
        category_name="Personal",
        note_text_in_markdown_format="Buy milk tomorrow",
    )

    with (
        patch(
            "src.services.note_service.get_whisper_model",
            return_value=mock_whisper
        ),
        patch(
            "src.services.note_service.NoteCategoryRepository.get_all",
            new_callable=AsyncMock,
            return_value=[
                MagicMock(id=1, name="Personal"),
            ],
        ),
        patch(
            "src.services.note_service.process_note",
            new_callable=AsyncMock,
            return_value=fake_note,
        ),
        patch(
            "src.services.note_service.NoteRepository.add_one",
            new_callable=AsyncMock,
        ),

        test_client.websocket_connect("/api/v1/note/add") as session
    ):

            response = session.receive_json()

            assert response == {
                "status": "connected"
            }

            session.send_bytes(b"fake audio data")

            session.send_text("finish")

            result = session.receive_json()

            assert result["category_id"] == 1
            assert result["category_name"] == "Personal"
            assert result["note_text_in_markdown_format"] == "Buy milk tomorrow"