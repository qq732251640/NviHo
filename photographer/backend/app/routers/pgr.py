"""摄影师自助管理接口(摄影师端)。"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_photographer
from app.models.category import Category
from app.models.package import Package
from app.models.photographer import Photographer
from app.models.schedule import Schedule
from app.models.user import User
from app.models.work import Work
from app.schemas.agreement import (
    CURRENT_PHOTOGRAPHER_AGREEMENT_VERSION,
    CURRENT_SERVICE_COMMITMENT_VERSION,
)
from app.schemas.common import IdResponse, OkResponse
from app.schemas.photographer import (
    PackageCreate,
    PackageOut,
    PhotographerApply,
    PhotographerDetail,
    PhotographerUpdate,
    ScheduleUpsertItem,
    WorkCreate,
    WorkOut,
)

router = APIRouter()


def _ensure_my_pgr(db: Session, current_user: User) -> Photographer:
    pgr = db.query(Photographer).filter(Photographer.user_id == current_user.id).first()
    if not pgr:
        raise HTTPException(status_code=404, detail="尚未入驻摄影师")
    return pgr


def _refresh_starting_price(db: Session, pgr: Photographer) -> None:
    min_price = (
        db.query(Package.price)
        .filter(Package.photographer_id == pgr.id, Package.is_active == 1)
        .order_by(Package.price.asc())
        .first()
    )
    pgr.starting_price = min_price[0] if min_price else 0


@router.post("/apply", response_model=IdResponse)
def apply(
    data: PhotographerApply,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.photographer:
        raise HTTPException(status_code=400, detail="已申请入驻,请勿重复提交")
    if not (data.accept_photographer_agreement and data.accept_service_commitment):
        raise HTTPException(
            status_code=400,
            detail="必须同时接受《摄影师入驻协议》和《服务承诺书》方可入驻",
        )

    pgr = Photographer(
        user_id=current_user.id,
        nickname=data.nickname,
        avatar=data.avatar,
        cover_image=data.cover_image,
        intro=data.intro,
        years_of_experience=data.years_of_experience,
        base_city=data.base_city,
        service_radius_km=data.service_radius_km,
        contact_phone=data.contact_phone,
        contact_wechat=data.contact_wechat,
        external_portfolio_url=data.external_portfolio_url,
        status="pending",
        photographer_agreement_version=CURRENT_PHOTOGRAPHER_AGREEMENT_VERSION,
        service_commitment_version=CURRENT_SERVICE_COMMITMENT_VERSION,
        agreements_accepted_at=datetime.utcnow(),
    )
    if data.category_ids:
        cats = db.query(Category).filter(Category.id.in_(data.category_ids)).all()
        pgr.categories = cats
    db.add(pgr)
    current_user.pm_role = "photographer" if current_user.pm_role == "user" else "both"
    if data.contact_phone and not current_user.pm_phone:
        current_user.pm_phone = data.contact_phone
    db.commit()
    db.refresh(pgr)
    return IdResponse(id=pgr.id)


@router.get("/me", response_model=PhotographerDetail)
def my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_photographer),
):
    pgr = _ensure_my_pgr(db, current_user)
    return PhotographerDetail.model_validate(pgr)


@router.put("/me", response_model=PhotographerDetail)
def update_my_profile(
    data: PhotographerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_photographer),
):
    pgr = _ensure_my_pgr(db, current_user)
    for field in (
        "nickname",
        "intro",
        "avatar",
        "cover_image",
        "base_city",
        "service_radius_km",
        "service_extra_fee",
        "external_portfolio_url",
        "contact_phone",
        "contact_wechat",
        "years_of_experience",
    ):
        v = getattr(data, field, None)
        if v is not None:
            setattr(pgr, field, v)

    if data.category_ids is not None:
        cats = db.query(Category).filter(Category.id.in_(data.category_ids)).all()
        pgr.categories = cats

    db.commit()
    db.refresh(pgr)
    return PhotographerDetail.model_validate(pgr)


@router.post("/works", response_model=WorkOut)
def add_work(
    data: WorkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_photographer),
):
    pgr = _ensure_my_pgr(db, current_user)
    w = Work(
        photographer_id=pgr.id,
        category_id=data.category_id,
        image_url=data.image_url,
        thumb_url=data.thumb_url,
        title=data.title,
        is_cover=data.is_cover,
        sort=data.sort,
        shoot_date=data.shoot_date,
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return WorkOut.model_validate(w)


@router.delete("/works/{work_id}", response_model=OkResponse)
def delete_work(
    work_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_photographer),
):
    pgr = _ensure_my_pgr(db, current_user)
    w = db.query(Work).filter(Work.id == work_id, Work.photographer_id == pgr.id).first()
    if not w:
        raise HTTPException(status_code=404, detail="作品不存在")
    db.delete(w)
    db.commit()
    return OkResponse()


@router.post("/packages", response_model=PackageOut)
def add_package(
    data: PackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_photographer),
):
    pgr = _ensure_my_pgr(db, current_user)
    if data.price <= 0:
        raise HTTPException(status_code=400, detail="价格必须大于 0")
    pkg = Package(
        photographer_id=pgr.id,
        category_id=data.category_id,
        name=data.name,
        duration_hours=data.duration_hours,
        photos_count=data.photos_count,
        description=data.description,
        price=data.price,
        is_active=1,
    )
    db.add(pkg)
    db.flush()
    _refresh_starting_price(db, pgr)
    db.commit()
    db.refresh(pkg)
    return PackageOut.model_validate(pkg)


@router.delete("/packages/{package_id}", response_model=OkResponse)
def delete_package(
    package_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_photographer),
):
    pgr = _ensure_my_pgr(db, current_user)
    pkg = db.query(Package).filter(Package.id == package_id, Package.photographer_id == pgr.id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="套餐不存在")
    db.delete(pkg)
    db.flush()
    _refresh_starting_price(db, pgr)
    db.commit()
    return OkResponse()


@router.put("/schedule", response_model=OkResponse)
def upsert_schedule(
    items: List[ScheduleUpsertItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_photographer),
):
    pgr = _ensure_my_pgr(db, current_user)
    for item in items:
        existing = (
            db.query(Schedule)
            .filter(Schedule.photographer_id == pgr.id, Schedule.date == item.date)
            .first()
        )
        if existing:
            existing.status = item.status
            existing.price_adjust = item.price_adjust
            existing.note = item.note
        else:
            db.add(
                Schedule(
                    photographer_id=pgr.id,
                    date=item.date,
                    status=item.status,
                    price_adjust=item.price_adjust,
                    note=item.note,
                )
            )
    db.commit()
    return OkResponse(ok=True, message=f"已更新 {len(items)} 条档期")
