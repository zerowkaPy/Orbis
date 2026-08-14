from fastapi import FastAPI

from .api.v1.handlers import import_handlers
from .core.logging import setup_logging

setup_logging()

app = FastAPI()
import_handlers(app)
