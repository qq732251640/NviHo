from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_optional_user
from app.models.favorite import Favorite
from app.models.photographer import Photographer
from app.models.review import Review
from app.models.schedule import Schedule
from app.models.user import User
from app.schemas.common import OkResponse, Page
from app.schemas.photographer import (
    PhotographerDetail,
    PhotographerListItem,
    ReviewOut,
    ScheduleOut,
)
from pydantic import BaseModel


class FavoriteToggleResponse(BaseModel):
    ok: bool = True
    favorited: bool
    message: str | None = None

router = APIRouter()


def _fav_ids_for(db: Session, user: User | None, photographer_ids: list[int]) -> set[int]:
    """批量查询当前用户对一组摄影师的收藏关系, 返回已收藏的 id 集合。"""
    if not user or not photographer_ids:
        return set()
    rows = (
        db.query(Favorite.photographer_id)
        .filter(
            Favorite.user_id == user.id,
            Favorite.photographer_id.in_(photographer_ids),
        )
        .all()
    )
    return {row[0] for row in rows}


@router.get("", response_model=Page[PhotographerListItem])
def list_photographers(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
    category_id: int | None = Query(None),
    city: str | None = Query(None),
    sort_by: str = Query("hot", pattern="^(hot|rating|price_asc|price_desc|new)$"),
    price_min: int | None = Query(None, description="单位:分"),
    price_max: int | None = Query(None, description="单位:分"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    q = db.query(Photographer).filter(Photographer.status == "approved")
    if city:
        q = q.filter(Photographer.base_city == city)
    if category_id:
        q = q.filter(Photographer.categories.any(id=category_id))
    if price_min is not None:
        q = q.filter(Photographer.starting_price >= price_min)
    if price_max is not None:
        q = q.filter(Photographer.starting_price <= price_max)

    if sort_by == "hot":
        q = q.order_by(desc(Photographer.hot_score), desc(Photographer.avg_rating))
    elif sort_by == "rating":
        q = q.order_by(desc(Photographer.avg_rating), desc(Photographer.review_count))
    elif sort_by == "price_asc":
        q = q.order_by(Photographer.starting_price.asc())
    elif sort_by == "price_desc":
        q = q.order_by(desc(Photographer.starting_price))
    else:  # new
        q = q.order_by(desc(Photographer.created_at))

    total = q.count()
    rows = q.offset((page - 1) * page_size).limit(page_size).all()

    fav_ids = _fav_ids_for(db, current_user, [r.id for r in rows])

    items: list[PhotographerListItem] = []
    for r in rows:
        item = PhotographerListItem.model_validate(r)
        item.is_favorited = r.id in fav_ids
        items.append(item)

    return Page[PhotographerListItem](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{photographer_id}", response_model=PhotographerDetail)
def get_photographer(
    photographer_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    pgr = (
        db.query(Photographer)
        .options(
            selectinload(Photographer.categories),
            selectinload(Photographer.works),
            selectinload(Photographer.packages),
        )
        .filter(Photographer.id == photographer_id, Photographer.status == "approved")
        .first()
    )
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在或未上架")

    recent_reviews = (
        db.query(Review)
        .filter(Review.photographer_id == photographer_id)
        .order_by(desc(Review.created_at))
        .limit(10)
        .all()
    )
    review_outs = []
    for r in recent_reviews:
        review_outs.append(
            ReviewOut(
                id=r.id,
                rating=r.rating,
                text=r.text,
                tags=r.tags,
                images=r.images,
                created_at=r.created_at,
                user_nickname=r.user.nickname if r.user else None,
                user_avatar=r.user.avatar if r.user else None,
            )
        )

    is_favorited = False
    if current_user:
        is_favorited = (
            db.query(Favorite)
            .filter(
                Favorite.user_id == current_user.id,
                Favorite.photographer_id == photographer_id,
            )
            .first()
            is not None
        )

    detail = PhotographerDetail.model_validate(pgr)
    detail.recent_reviews = review_outs
    detail.is_favorited = is_favorited
    return detail


@router.get("/{photographer_id}/schedule", response_model=list[ScheduleOut])
def get_photographer_schedule(
    photographer_id: int,
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
):
    year, mon = month.split("-")
    start = date(int(year), int(mon), 1)
    if int(mon) == 12:
        end = date(int(year) + 1, 1, 1)
    else:
        end = date(int(year), int(mon) + 1, 1)

    rows = (
        db.query(Schedule)
        .filter(
            Schedule.photographer_id == photographer_id,
            Schedule.date >= start,
            Schedule.date < end,
        )
        .order_by(Schedule.date.asc())
        .all()
    )
    return [ScheduleOut.model_validate(r) for r in rows]


@router.post("/{photographer_id}/favorite", response_model=FavoriteToggleResponse)
def toggle_favorite(
    photographer_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="请先登录")

    fav = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == current_user.id,
            Favorite.photographer_id == photographer_id,
        )
        .first()
    )
    if fav:
        db.delete(fav)
        db.commit()
        return FavoriteToggleResponse(favorited=False, message="已取消收藏")

    db.add(Favorite(user_id=current_user.id, photographer_id=photographer_id))
    db.commit()
    return FavoriteToggleResponse(favorited=True, message="已收藏")


@router.get("/me/favorites", response_model=list[PhotographerListItem])
def my_favorites(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    if not current_user:
        return []
    rows = (
        db.query(Photographer)
        .join(Favorite, Favorite.photographer_id == Photographer.id)
        .filter(Favorite.user_id == current_user.id)
        .order_by(desc(Favorite.created_at))
        .all()
    )
    items: list[PhotographerListItem] = []
    for r in rows:
        item = PhotographerListItem.model_validate(r)
        item.is_favorited = True
        items.append(item)
    return items
