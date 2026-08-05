from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.postgres.orm import NoteOrm

class NoteRepository:
    @classmethod
    async def add_one(
        cls,
        *,
        session: AsyncSession,
        category_id: int,
        text: str
    ):
        stmt = (
            insert(NoteOrm)
            .values(
                text=text,
                category_id=category_id
            # TODO: add authentication system and user_id=user_id
            ))
        await session.execute(stmt)
        await session.commit()

    