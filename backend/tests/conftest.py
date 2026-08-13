import asyncio
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from src.api.v1.dependencies.session import get_db
from src.main import app


@pytest.fixture
def test_client():
    async def override_get_db():
        yield MagicMock()

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    yield client

    app.dependency_overrides.clear()
