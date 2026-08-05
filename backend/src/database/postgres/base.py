from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass

class BaseModel(Base):
    __abstract__ = True

    id: Mapped[int] = mapped_column(primary_key=True)

class TimestampedModel(BaseModel):
    __abstract__ = True
    
    created_at: Mapped[datetime] = mapped_column(server_default=text("TIMEZONE('utc', now())"))