from fastapi import APIRouter, WebSocket, status

from src.services import category_service
from src.repositories.note_category_repository import NoteCategoryRepository as Repository
from ..dependencies.session import Session
from ..models.category_model import CategoryResponse, CategoryRequest

category_router = APIRouter(
    prefix="/api/v1",
    tags=["Category"]
)

@category_router.get("/categories")
async def get_categories(
    session: Session
    # TODO: add Depends(current_user) in future
):
    categories = await Repository.get_all(
        session=session
    )
    return [
        CategoryResponse.model_validate(category)
        for category in categories
    ]

@category_router.post(
        "/categories",
        status_code=status.HTTP_201_CREATED)
async def create_category(
    session: Session,
    category: CategoryRequest
    # TODO: add Depends(current_user) in future
):
    created_category = await Repository.add_one(
        session=session,
        name=category.name,
        color=category.color
    )
    return CategoryResponse.model_validate(created_category)

@category_router.patch("/categories/{category_id}")
async def edit_category(
    session: Session,
    category_id: int,
    category: CategoryRequest
    # TODO: add Depends(current_user) in future
):
    updated_category = await Repository.edit_one(
        session=session,
        note_category_id=category_id,
        **category.model_dump()
    )
    return CategoryResponse.model_validate(updated_category)

@category_router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    session: Session,
    category_id: int,
    # TODO: add Depends(current_user) in future
):
    updated_category = await Repository.delete_by_id(
        session=session,
        note_category_id=category_id,
    )