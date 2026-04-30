from typing import Generic, List, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int = 1
    page_size: int = 20


class IdResponse(BaseModel):
    id: int


class OkResponse(BaseModel):
    ok: bool = True
    message: str | None = None
