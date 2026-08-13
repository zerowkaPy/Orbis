from collections.abc import Awaitable, Callable
from functools import wraps
from inspect import iscoroutinefunction
from typing import ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def retry_gemini_request(retry: int):
    def actual_decorator(
        func: Callable[P, Awaitable[R]]
    ) -> Callable[P, Awaitable[R]]:
        if not iscoroutinefunction(func):
            raise TypeError(f"{func.__name__} must be async function.")

        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for _ in range(retry):
                result = await func(*args, **kwargs)
                if result is not None:
                    return result
            return None  # type: ignore[return-value]

        return wrapper

    return actual_decorator