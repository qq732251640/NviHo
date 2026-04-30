from typing import List

from pydantic import BaseModel


class AdminPhotographerCreate(BaseModel):
    """运营后台代为录入摄影师(同时建 users 和 pm_photographers)。"""
    username: str
    nickname: str
    intro: str
    avatar: str | None = None
    cover_image: str | None = None
    base_city: str = "太原"
    service_radius_km: int = 50
    service_extra_fee: int = 200
    contact_phone: str
    contact_wechat: str | None = None
    external_portfolio_url: str | None = None
    years_of_experience: int = 1
    category_ids: List[int] = []
    auto_approve: bool = True


class AdminPhotographerUpdate(BaseModel):
    nickname: str | None = None
    intro: str | None = None
    avatar: str | None = None
    cover_image: str | None = None
    base_city: str | None = None
    service_radius_km: int | None = None
    service_extra_fee: int | None = None
    external_portfolio_url: str | None = None
    contact_phone: str | None = None
    contact_wechat: str | None = None
    years_of_experience: int | None = None
    category_ids: List[int] | None = None
    starting_price: int | None = None
    status: str | None = None


class AdminWorkCreate(BaseModel):
    image_url: str
    thumb_url: str | None = None
    title: str | None = None
    category_id: int | None = None
    is_cover: int = 0
    sort: int = 0
    shoot_date: str | None = None


class AdminWorksBatchCreate(BaseModel):
    works: List[AdminWorkCreate]


class AdminPackageCreate(BaseModel):
    category_id: int
    name: str
    duration_hours: int = 4
    photos_count: int = 50
    description: str | None = None
    price: int
