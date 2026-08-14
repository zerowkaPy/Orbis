from collections.abc import AsyncGenerator, Generator
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from src.api.v1.dependencies.session import get_db
from src.main import app


@pytest.fixture
def test_client() -> Generator[TestClient, None, None]:
    async def override_get_db() -> AsyncGenerator[MagicMock, None]:
        yield MagicMock()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()