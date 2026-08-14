from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient


def test_transcribe(test_client: TestClient):
    fake_segment = MagicMock()
    fake_segment.text = "Buy milk tomorrow"

    fake_info = MagicMock()
    fake_info.language = "en"
    fake_info.language_probability = 0.99

    mock_whisper = MagicMock()
    mock_whisper.transcribe.return_value = ([fake_segment], fake_info)

    with (
            patch(
                "src.services.note_service.get_whisper_model",
                return_value=mock_whisper
            ),
            test_client.websocket_connect("/api/v1/note/transcribe") as session
    ):
        msg: dict = session.receive_json()
        assert msg.get("status") == "connected"
        session.send_bytes(b"fake audio bytes")
        session.send_text("finish")
        msg: dict = session.receive_json()
        assert msg.get("status") == "completed"
        assert (transcript := msg.get("transcript")) is not None
        assert isinstance(transcript, str)


def test_transcribe_empty_audio(test_client: TestClient):
    fake_segment = MagicMock()
    fake_segment.text = "Buy milk tomorrow"

    fake_info = MagicMock()
    fake_info.language = "en"
    fake_info.language_probability = 0.99

    mock_whisper = MagicMock()
    mock_whisper.transcribe.return_value = ([fake_segment], fake_info)

    with (
            patch(
                "src.services.note_service.get_whisper_model",
                return_value=mock_whisper
            ),
            test_client.websocket_connect("/api/v1/note/transcribe") as session
    ):
        msg: dict = session.receive_json()
        assert msg.get("status") == "connected"
        session.send_bytes(b"")
        session.send_text("finish")
        msg: dict = session.receive_json()
        assert msg.get("status") == "error"
        assert msg.get("message") == "Audio stream was empty"

def test_transcribe_failed(test_client: TestClient):
    fake_segment = MagicMock()
    fake_segment.text = "Buy milk tomorrow"

    fake_info = MagicMock()
    fake_info.language = "en"
    fake_info.language_probability = 0.99

    mock_whisper = MagicMock()
    mock_whisper.transcribe = MagicMock(side_effect=KeyError('foo'))

    with (
            patch(
                "src.services.note_service.get_whisper_model",
                return_value=mock_whisper
            ),
            test_client.websocket_connect("/api/v1/note/transcribe") as session
    ):
        msg: dict = session.receive_json()
        assert msg.get("status") == "connected"
        session.send_bytes(b"fake audio bytes")
        session.send_text("finish")
        msg: dict = session.receive_json()
        assert msg.get("status") == "error"
        assert msg.get("message") == "Failed to transcribe audio"