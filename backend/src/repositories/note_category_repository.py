from sqlalchemy import and_, delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.postgres.orm import NoteCategoryOrm


class NoteCategoryRepository:
    @classmethod
    async def add_one(
        cls,
        *,
        session: AsyncSession,
        name: str,
        color: str
    ):
        stmt = (
            insert(NoteCategoryOrm)
            .values(
                name=name,
                color=color)
            .returning(NoteCategoryOrm)
            # TODO: add authentication system and user_id=user_id
        )
        result = await session.execute(stmt)
        await session.commit()
        return result.scalar_one()

    @classmethod
    async def edit_one(
        cls,
        *,
        session: AsyncSession,
        note_category_id: int,
        **kwargs
        ):
        stmt = (
            update(NoteCategoryOrm)
            .where(NoteCategoryOrm.id == note_category_id)
            .values(**kwargs)
            .returning(NoteCategoryOrm)
        )
        result = await session.execute(stmt)
        await session.commit()
        return result.scalar_one()

    @classmethod
    async def get_all(
        cls,
        *,
        session: AsyncSession
        # TODO: add keyword parameter 'user_id' in future
    ):
        query = (
            select(NoteCategoryOrm)
        )
        result = await session.execute(query)
        return result.scalars().all()

    @classmethod
    async def delete_by_id(
        cls,
        *,
        session: AsyncSession,
        note_category_id: int
    ):
        stmt = (
            delete(NoteCategoryOrm)
            .where(
                and_(
                    NoteCategoryOrm.id == note_category_id,
                    # TODO: add 'NoteOrm.user_id == user_id' in future
                )
            )
        )
        await session.execute(stmt)
        await session.commit()

    @classmethod
    async def get_one_by_id(
        cls,
        *,
        session: AsyncSession,
        category_id: int
    ):
        query = (
            select(NoteCategoryOrm)
            .where(NoteCategoryOrm.id == category_id)
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()


    