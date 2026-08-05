from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, relationship

from ..base import BaseModel

if TYPE_CHECKING:
    from .note_category_orm import NoteCategoryOrm
    from .note_orm import NoteOrm


class UserOrm(BaseModel):
    __tablename__ = "users"

    categories: Mapped[list["NoteCategoryOrm"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    notes: Mapped[list["NoteOrm"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
