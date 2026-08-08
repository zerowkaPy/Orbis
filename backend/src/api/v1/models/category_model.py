from pydantic import BaseModel, ConfigDict


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str

class CategoryRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    color: str