from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..base import TimestampedModel

if TYPE_CHECKING:
    from .note_category_orm import NoteCategoryOrm
    from .user_orm import UserOrm


class NoteOrm(TimestampedModel):
    __tablename__ = "notes"
    __table_args__ = (
    Index(
        "ix_notes_user_category",
        "user_id",
        "category_id",
    ),
)
   
    text: Mapped[str]

    user_id: Mapped[int| None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True
    )

    category_id: Mapped[int] = mapped_column(
        ForeignKey("note_categories.id", ondelete="CASCADE"),
        nullable=False
    )

    user: Mapped["UserOrm"] = relationship(
        back_populates="notes"
    )
    category: Mapped["NoteCategoryOrm"] = relationship(
        back_populates="notes"
    )