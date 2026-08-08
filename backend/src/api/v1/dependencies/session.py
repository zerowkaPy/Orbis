from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.postgres.session import session_maker


async def get_db():
    async with session_maker() as session:
        yield session

Session = Annotated[AsyncSession, Depends(get_db)]