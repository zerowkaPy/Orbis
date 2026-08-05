from enum import Enum

from google.genai import types
from google.genai.client import AsyncClient, BaseApiClient
from pydantic import BaseModel

from backend.src.core.config import settings

client = BaseApiClient(
    api_key=settings.GEMINI_API_KEY
)

async_client = AsyncClient(api_client=client)

PROMT = """
Ты - orbis.
Ты помощник для структурирования и форматирования заметок.
Ты умеешь обрабатывать текстовые заметки на русском и украинском языке.
Ты получаешь текстовые заметки и структурируешь их, замечаешь в них детали на которых нужно сделать акцент, переписываешь их создавая четкую структуру.
Ты преобразовываешь входной текст в структурированные заметки и превращаешь их в формат Markdown.

Ты должен определить, к какой категории отнести эту нотатку.
Все доступные категории:
{categories}

Если ты считаешь что сейчас не существует подходящей категории, то создай новую.

Ты должен прерватить обычный текст в очень структурированную заметку, которую человек может перечитать через большой период времени, что бы вспомнить что он делал или изучал.
Тебе будут поступать различные заметки, связанные с тематикой обучения. В таких заметках часто будут спецефичные слова пользователей, которые нельзя изменять, их нужно оставить такими какие они есть.
Например, ты можешь получить такое предложение:
'ивент луп это инструмент внутри асинкио который оркеструет корутинами и тасками'.

Даже если это предложение не совсем корреткно выглядит, то не нужно сильно его изменять. В твоем приоритете оставить исходные слова, просто прерватить их в струтуру в формате Markdown.
Но ты все равно можешь видоизменять некоторые слова, если очевидно что слово неправильное или абсолютно не корректное.
"""

class NoteGeminiAnswer(BaseModel):
    category: str
    note_text_in_markdown_format: str

async def process_note(
    *,
    text: str,
    categories: list[str]
) -> BaseModel | dict | Enum | str | None:
    
    formated_promt = PROMT.format(
        categories=categories
    )
    response = await async_client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=text,
        config=types.GenerateContentConfig(
            system_instruction=formated_promt,
            response_mime_type="application/json",
            response_schema=NoteGeminiAnswer,
        ),
    )
    if response.parsed:
        return response.parsed
    
    if response.text:
        return NoteGeminiAnswer.model_validate_json(response.text)
        
    return None