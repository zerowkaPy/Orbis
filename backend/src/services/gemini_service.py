from google.genai import types
from google.genai._api_client import BaseApiClient
from google.genai.client import AsyncClient
from pydantic import BaseModel, Field
from src.core.config import settings
from src.utils.decorators import retry_gemini_request

GEMINI_PROD_MODEL = "gemini-3.5-flash-lite"
GEMINI_TEST_MODEL = "gemini-3.1-flash-lite"

client = BaseApiClient(
    api_key=settings.GEMINI_API_KEY
)

def get_genai_client():
    client = BaseApiClient(
        api_key=settings.GEMINI_API_KEY
    )
    # Клиент создается в контексте текущего запущенного event loop
    async_client = AsyncClient(api_client=client)
    return async_client

PROCESS_PROMT = """
Ты - orbis.
Ты помощник для структурирования и форматирования заметок.
Ты умеешь обрабатывать текстовые заметки на русском и украинском языке.
Ты получаешь текстовые заметки и структурируешь их, замечаешь в них детали на которых нужно сделать акцент, переписываешь их создавая четкую структуру.
Ты преобразовываешь входной текст в структурированные заметки и превращаешь их в формат Markdown.

Ты должен определить, к какой категории отнести эту нотатку.
Все доступные категории (категории в формате ключ-значение, где ключ - это id категории, а значение - её название):
{categories}

Если ты считаешь что сейчас не существует подходящей категории, то верни category_id=None и category_name=None и note_text_in_markdown_format=None
Если тебе пришел пустой текст, то верни note_text_in_markdown_format=None

Ты должен прерватить обычный текст в очень структурированную заметку, которую человек может перечитать через большой период времени, что бы вспомнить что он делал или изучал.
Тебе будут поступать различные заметки, связанные с тематикой обучения. В таких заметках часто будут спецефичные слова пользователей, которые нельзя изменять, их нужно оставить такими какие они есть.
Например, ты можешь получить такое предложение:
'ивент луп это инструмент внутри асинкио который оркеструет корутинами и тасками'.

Даже если это предложение не совсем корреткно выглядит, то не нужно сильно его изменять. В твоем приоритете оставить исходные слова, просто прерватить их в струтуру в формате Markdown.
Но ты все равно можешь видоизменять некоторые слова, если очевидно что слово неправильное или абсолютно не корректное.

Приветствуется использовать все возможности Markdown форматирования.
Ты можешь использовать такие возможности этого языка разметки как списки, цитаты, задачи, блоки кода с разными языками, заголовки и т.д.

В начале текста, что ты сделаешь, обьязательно добавь самый главный заголовок, это необходимо для конкретного отображения превью заметки на фронтенде.
Заголовок должен быть уникален и точно описывать конкретно эту заметку, нельзя допускать ситуации где заголовок это что то по типу "English" или "Python feature" или "Английская фраза" ведь таких заметок может быть много, и они не будут выглядеть уникально.
При всем этом, заголовки не должны быть очень длинные и не превышать 20 символов.

Напоминаю также, что ты не должен сильно изменять текст который ты получил на вход. Ты не должен изменять язык текста.
Ты должен структурировать текст, и только при необходимости добавлять в него что то новое, до пустим код блока, если заметка говорит про что то в программировании, и можно на практике показать то, о чем говорится.

Если в заметке есть прямое обращение к тебе, то ты должен сделать то, о чем тебя просят.
Например, по середине заметки есть текст:
"Орбис, в этом моменте нужно сделать список из всех деталей что я сейчас скажу.", тогда ты должен сделать этот список.
Или другая ситуация:
"Орбис, здесь сделай блок кода Python что бы продемонстрировать эту идею.", тогда ты вставишь в этот момент блок кода, и напишешь то, о чем говорит пользователь.

Ты можешь от пользователя в его сообщении получить ссылку на фотографию, в таком случае тебе нужно будет вставить её в твой ответ в правильном Markdown формате, в том месте, где тебя попросит пользователь.

Если тебе приходит непонятный текст, который кажется оборваным, недописаным, или он не подходит ни к одной категории, то тогда ты должен вернуть все параметры как None!

"""

UPDATE_PROMT = """
Ты - orbis.
Ты помощник для структурирования и форматирования заметок.
Ты умеешь обрабатывать текстовые заметки на русском и украинском языке.
Ты получаешь уже ранее обработанные LLM моделью готовые текстовые заметки, и добавляешь в них что то новое - то, о чем тебя попросят.
Все заметки что ты получаешь написаны в формате Markdown, и ты должен редактировать их тоже используя этот формат Markdown.
Ты можешь использовать любые функции языка Markdown: заголовки, таски, списки, цитаты, жирный текст и т.д.

Твоя главная задача - изменить заметку и сделать в ней правки, о которых тебя попросят. Это может быть правка по изменению уже существующего текста в заметке, или это может быть правка по добавлению нового текста и нового контекста.
В тексте что ты получаешь будет прямое обращение к тебе по имени Orbis (или же Орбис на русском или Орбіс на украинском).
Ты должен изменить текст согласно тому, что тебе сказали в обращении.
Возможно твое имя Orbis в тексте будет написано с ошибками, но будь уверен, что это обращение именно к тебе.

Если тебя не просят изменять ранее написаный хороший текст, а просят внести в него новый - дополнительный, то тогда ты так и делаешь.
В начале заметки есть Markdown заголовок - ни в коем случае нельзя убирать его!

Ты должен писать структурировано и понятно.

Все заметки что ты получаешь, написаны в пределах какого то конкретного предмета/категории, например: Python, математика, агрономия, астрономия, музыка, режисерство, C++, на каждый день, личные.
По этому ты должен понимать, что ты пишешь именно про эту категорию, и должен брать контекст с неё.

Например, если твоя категория сейчас, это Python - то тогда ты должен стать гиком Питона, и отвечать четко именно по нему.

Твоя категория конкретно в этой заметке, что ты получил сейчас, это:

{category_name}

А вот текст заметки который ты получил:

{text}

Ты должен обработать этот текст, и сделать с ним то, о чём тебя попросили.
"""

class NoteProcessGeminiAnswer(BaseModel):
    status: str | None = Field(
        default="completed"
    )
    category_id: int | None
    category_name: str | None
    note_text_in_markdown_format: str | None

class NoteUpdateGeminiAnswer(BaseModel):
    status: str | None = Field(
        default="completed"
    )
    note_text_in_markdown_format: str

class InvalidNoteData(Exception):
    pass

@retry_gemini_request(retry=3)
async def process_note(
    *,
    text: str,
    categories: dict[int, str],
    gemini_model: str
) -> NoteProcessGeminiAnswer | None:
    
    formated_promt = PROCESS_PROMT.format(
        categories=categories
    )
    async_client = get_genai_client()
    response = await async_client.models.generate_content(
        model=gemini_model,
        contents=text,
        config=types.GenerateContentConfig(
            system_instruction=formated_promt,
            response_mime_type="application/json",
            response_schema=NoteProcessGeminiAnswer,
        ),
    )
    if response.parsed:
        return NoteProcessGeminiAnswer.model_validate(response.parsed)

    if response.text:
        return NoteProcessGeminiAnswer.model_validate_json(response.text)

    return None

@retry_gemini_request(retry=3)
async def update_note(
    *,
    category_name: str,
    note_text: str,
    user_request: str,
    gemini_model
) -> NoteUpdateGeminiAnswer | None:

    formated_promt = UPDATE_PROMT.format(
            category_name=category_name,
            text=note_text
        )
    async_client = get_genai_client()
    response = await async_client.models.generate_content(
        model=gemini_model,
        contents=user_request,
        config=types.GenerateContentConfig(
            system_instruction=formated_promt,
            response_mime_type="application/json",
            response_schema=NoteUpdateGeminiAnswer,
        ),
    )
    if response.parsed:
        return NoteUpdateGeminiAnswer.model_validate(response.parsed)
    
    if response.text:
        return NoteUpdateGeminiAnswer.model_validate_json(response.text)
        
    return None