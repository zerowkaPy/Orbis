from fastapi import FastAPI

from .note_handlers import note_router



def import_handlers(app: FastAPI):
    app.include_router(note_router)