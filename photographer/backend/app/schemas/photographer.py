from datetime import date, datetime
from typing import List

from pydantic import BaseModel

from app.schemas.category import CategoryOut


class WorkOut(BaseModel):
    id: int
    image_url: str
    thumb_url: str | None = None
    title: str | None = None
    is_cover: int = 0
    sort: int = 0
    shoot_date: datetime | None = None
    category: CategoryOut | None = None

    class Config:
        from_attributes = True


class PackageOut(BaseModel):
    id: int
    name: str
    duration_hours: int
    photos_count: int
    description: str | None = None
    price: int
    is_active: int = 1
    category: CategoryOut | None = None

    class Config:
        from_attributes = True


class PackageCreate(BaseModel):
    category_id: int
    name: str
    duration_hours: int = 4
    photos_count: int = 50
    description: str | None = None
    price: int


class ScheduleOut(BaseModel):
    date: date
    status: str
    price_adjust: int = 0
    note: str | None = None

    class Config:
        from_attributes = True


class ScheduleUpsertItem(BaseModel):
    date: date
    status: str
    price_adjust: int = 0
    note: str | None = None


class ReviewOut(BaseModel):
    id: int
    rating: int
    text: str | None = None
    tags: str | None = None
    images: str | None = None
    created_at: datetime
    user_nickname: str | None = None
    user_avatar: str | None = None

    class Config:
        from_attributes = True


class PhotographerListItem(BaseModel):
    id: int
    nickname: str
    avatar: str | None = None
    cover_image: str | None = None
    intro: str | None = None
    base_city: str | None = None
    avg_rating: float = 5.0
    review_count: int = 0
    completed_orders: int = 0
    starting_price: int = 0
    hot_score: float = 0.0
    categories: List[CategoryOut] = []
    is_favorited: bool = False

    class Config:
        from_attributes = True


class PhotographerDetail(BaseModel):
    id: int
    nickname: str
    avatar: str | None = None
    cover_image: str | None = None
    intro: str | None = None
    years_of_experience: int = 1
    base_city: str | None = None
    service_radius_km: int = 50
    service_extra_fee: int = 0
    avg_rating: float = 5.0
    review_count: int = 0
    completed_orders: int = 0
    starting_price: int = 0
    hot_score: float = 0.0
    external_portfolio_url: str | None = None
    categories: List[CategoryOut] = []
    works: List[WorkOut] = []
    packages: List[PackageOut] = []
    recent_reviews: List[ReviewOut] = []
    is_favorited: bool = False

    class Config:
        from_attributes = True


class PhotographerApply(BaseModel):
    nickname: str
    intro: str
    avatar: str | None = None
    cover_image: str | None = None
    base_city: str = "太原"
    service_radius_km: int = 50
    contact_phone: str
    contact_wechat: str | None = None
    external_portfolio_url: str | None = None
    category_ids: List[int] = []
    years_of_experience: int = 1
    # 入驻必须同时接受这两份协议
    accept_photographer_agreement: bool
    accept_service_commitment: bool


class PhotographerUpdate(BaseModel):
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
    category_ids: List[int] | None = None
    years_of_experience: int | None = None


class WorkCreate(BaseModel):
    image_url: str
    thumb_url: str | None = None
    title: str | None = None
    category_id: int | None = None
    is_cover: int = 0
    sort: int = 0
    shoot_date: datetime | None = None
