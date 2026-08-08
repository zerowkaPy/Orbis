from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    category_id: int
    created_at: datetime

class NoteRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    text: str | None = None
    category_id: int

class NoteUpdate(BaseModel):
    id: int
    
