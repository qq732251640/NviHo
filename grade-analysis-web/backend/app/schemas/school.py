from pydantic import BaseModel
from typing import Optional, List


class RegionOut(BaseModel):
    id: int
    name: str
    level: str
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True


class RegionTree(BaseModel):
    id: int
    name: str
    level: str
    children: List["RegionTree"] = []

    class Config:
        from_attributes = True


class SchoolCreate(BaseModel):
    name: str
    region_id: int
    grade_level: str  # elementary / middle / high


class SchoolOut(BaseModel):
    id: int
    name: str
    region_id: int
    grade_level: str
    region_name: Optional[str] = None

    class Config:
        from_attributes = True
