from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..base import BaseModel

if TYPE_CHECKING:
    from .note_orm import NoteOrm
    from .user_orm import UserOrm


class NoteCategoryOrm(BaseModel):
    __tablename__ = "note_categories"
    __table_args__ = (
        CheckConstraint(
            "color ~ '^#[0-9A-Fa-f]{6}$'",
            name="ck_note_category_color",
        ),
    )
   
    name: Mapped[str] = mapped_column(
        nullable=False
    )
    color: Mapped[str] = mapped_column(
        String(7),
        nullable=False,
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    user: Mapped["UserOrm"] = relationship(
        back_populates="categories",
    )

    notes: Mapped[list["NoteOrm"]] = relationship(
        back_populates="category"
    )