from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: int
    code: str
    name: str
    icon: str | None = None
    sort: int = 0

    class Config:
        from_attributes = True
