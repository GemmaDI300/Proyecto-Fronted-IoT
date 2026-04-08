from typing import Generic, TypeVar
from pydantic import BaseModel
from fastapi import Query

T = TypeVar("T")


class PageParams:
    def __init__(
        self,
        offset: int = Query(default=0, ge=0, description="Número de registros a saltar"),
        limit: int = Query(default=20, ge=1, le=100, description="Límite de registros"),
    ):
        self.offset = offset
        self.limit = limit


class PageResponse(BaseModel, Generic[T]):
    total: int
    offset: int
    limit: int
    data: list[T]
