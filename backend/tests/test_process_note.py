import pytest
from src.services.gemini_service import GEMINI_TEST_MODEL, process_note


@pytest.mark.asyncio
async def test_successful_process_note():
    result = await process_note(
        text="В Пітоні асинхронність забезпечується завдяки модулю asyncio.",
        categories={1: "Python", 2: "English"},
        gemini_model=GEMINI_TEST_MODEL
    )
    assert result is not None
    assert result.category_id is not None
    assert result.category_name is not None
    assert result.note_text_in_markdown_format is not None
    print(result.note_text_in_markdown_format)

@pytest.mark.asyncio
async def test_fail_process_note():
    result = await process_note(
        text="В Пітоні асинхронність забезпечується завдяки модулю asyncio.",
        categories={1: "Садоводство", 2: "English"},
        gemini_model=GEMINI_TEST_MODEL
    )
    assert result is not None
    assert result.category_id is None
    assert result.category_name is None
    assert result.note_text_in_markdown_format is None
