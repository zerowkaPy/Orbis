from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from httpx import Response
from src.database.postgres.orm.note_category_orm import NoteCategoryOrm
from src.services.gemini_service import NoteProcessGeminiAnswer


def test_note_process_text(test_client: TestClient):
    mock_note = NoteProcessGeminiAnswer(
            category_id=1,
            category_name="Bar",
            note_text_in_markdown_format="Foo"
    )
    fake_category = NoteCategoryOrm(
        name="Bar",
        color="#FFFFFF",
        user_id=1
    )
    
    with (
        patch(
            "src.services.note_service.NoteCategoryRepository.get_all",
            new_callable=AsyncMock,
            return_value=[fake_category]
        ),
        patch(
            "src.services.note_service.process_note",
            new_callable=AsyncMock,
            return_value = mock_note
        ),
        patch(
            "src.services.note_service.NoteRepository.add_one",
            new_callable=AsyncMock,
        )
    ):
        data = {"text": "foo"}
        response: Response = test_client.post(
            "/api/v1/note/process-text",
            json=data
        )
        result = response.json()
        assert result == mock_note.model_dump()

def test_note_process_text_empty(test_client: TestClient):
    data = {"text": ""}
    response: Response = test_client.post(
        "/api/v1/note/process-text",
        json=data
    )
    result: dict = response.json()
    assert response.status_code == 400
    assert result.get("detail") == "Text cannot be empty."

def test_note_process_text_failed(test_client: TestClient):
    mock_note = NoteProcessGeminiAnswer(
            category_id=1,
            category_name="Bar",
            note_text_in_markdown_format="Foo"
    )
    fake_category = NoteCategoryOrm(
        name="Bar",
        color="#FFFFFF",
        user_id=1
    )
    
    with (
        patch(
            "src.services.note_service.NoteCategoryRepository.get_all",
            new_callable=AsyncMock,
            return_value=[fake_category]
        ),
        patch(
            "src.services.note_service.process_note",
            new_callable=AsyncMock(
                side_effect=RuntimeError()
            ),
            return_value = mock_note
        )
    ):
        data = {"text": "foo"}
        response: Response = test_client.post(
            "/api/v1/note/process-text",
            json=data
        )
        assert response.status_code == 500