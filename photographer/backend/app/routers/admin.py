"""运营后台接口。

主要给"飞机/Hao"两位运营在 Swagger UI 上手动操作:
1. 创建摄影师档案(同时建 user)
2. 更新摄影师档案
3. 添加/删除摄影师的作品
4. 添加/删除摄影师的套餐
5. 审核 / 冻结 / 解冻摄影师
6. 刷新热度值

操作流程详见 backend/README.md 的「运营后台手动操作指南」。
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models.category import Category
from app.models.package import Package
from app.models.photographer import Photographer
from app.models.user import User
from app.models.work import Work
from app.schemas.admin import (
    AdminPackageCreate,
    AdminPhotographerCreate,
    AdminPhotographerUpdate,
    AdminWorkCreate,
    AdminWorksBatchCreate,
)
from app.schemas.common import IdResponse, OkResponse
from app.schemas.photographer import (
    PackageOut,
    PhotographerDetail,
    PhotographerListItem,
    WorkOut,
)
from app.services.hot_score import refresh_all
from app.utils.security import hash_password

router = APIRouter()


def _refresh_starting_price(db: Session, pgr: Photographer) -> None:
    min_price = (
        db.query(Package.price)
        .filter(Package.photographer_id == pgr.id, Package.is_active == 1)
        .order_by(Package.price.asc())
        .first()
    )
    pgr.starting_price = min_price[0] if min_price else 0


def _get_pgr_or_404(db: Session, photographer_id: int) -> Photographer:
    pgr = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在")
    return pgr


@router.get("/photographers", response_model=List[PhotographerListItem])
def list_all_photographers(
    status: str | None = Query(None, description="pending / approved / frozen,留空查全部"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(Photographer)
    if status:
        q = q.filter(Photographer.status == status)
    rows = q.order_by(desc(Photographer.created_at)).all()
    return [PhotographerListItem.model_validate(r) for r in rows]


@router.post("/photographers", response_model=PhotographerDetail)
def create_photographer(
    data: AdminPhotographerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """运营代为录入一个新摄影师(同时建 users 表)。

    - 用户名要求唯一(用作登录,可填拼音如 lunar_photo)
    - 默认密码 123456,摄影师后续可自行登录修改
    - auto_approve=True 时直接上架,可被用户搜到
    """
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail=f"用户名 {data.username} 已存在")

    user = User(
        username=data.username,
        password_hash=hash_password("123456"),
        nickname=data.nickname,
        avatar=data.avatar,
        pm_role="photographer",
        pm_phone=data.contact_phone,
        pm_city=data.base_city,
    )
    db.add(user)
    db.flush()

    pgr = Photographer(
        user_id=user.id,
        nickname=data.nickname,
        avatar=data.avatar,
        cover_image=data.cover_image,
        intro=data.intro,
        years_of_experience=data.years_of_experience,
        base_city=data.base_city,
        service_radius_km=data.service_radius_km,
        service_extra_fee=data.service_extra_fee,
        contact_phone=data.contact_phone,
        contact_wechat=data.contact_wechat,
        external_portfolio_url=data.external_portfolio_url,
        status="approved" if data.auto_approve else "pending",
    )
    if data.category_ids:
        cats = db.query(Category).filter(Category.id.in_(data.category_ids)).all()
        pgr.categories = cats
    db.add(pgr)
    db.commit()
    db.refresh(pgr)
    return PhotographerDetail.model_validate(pgr)


@router.put("/photographers/{photographer_id}", response_model=PhotographerDetail)
def update_photographer(
    photographer_id: int,
    data: AdminPhotographerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    pgr = _get_pgr_or_404(db, photographer_id)
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
        "starting_price",
        "status",
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


@router.post("/photographers/{photographer_id}/works", response_model=WorkOut)
def add_work(
    photographer_id: int,
    data: AdminWorkCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """给指定摄影师添加一张作品。

    image_url 用 POST /api/pm/uploads/direct 先把图片传上去拿到 public_url,再填到这里。
    """
    pgr = _get_pgr_or_404(db, photographer_id)

    shoot_date = None
    if data.shoot_date:
        try:
            shoot_date = datetime.fromisoformat(data.shoot_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="shoot_date 格式应为 YYYY-MM-DD")

    w = Work(
        photographer_id=pgr.id,
        category_id=data.category_id,
        image_url=data.image_url,
        thumb_url=data.thumb_url or data.image_url,
        title=data.title,
        is_cover=data.is_cover,
        sort=data.sort,
        shoot_date=shoot_date,
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return WorkOut.model_validate(w)


@router.post("/photographers/{photographer_id}/works/batch", response_model=List[WorkOut])
def add_works_batch(
    photographer_id: int,
    data: AdminWorksBatchCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """批量添加作品(一次传多张时用,比循环单传快很多)。"""
    pgr = _get_pgr_or_404(db, photographer_id)
    created: list[Work] = []
    for item in data.works:
        shoot_date = None
        if item.shoot_date:
            try:
                shoot_date = datetime.fromisoformat(item.shoot_date)
            except ValueError:
                continue
        w = Work(
            photographer_id=pgr.id,
            category_id=item.category_id,
            image_url=item.image_url,
            thumb_url=item.thumb_url or item.image_url,
            title=item.title,
            is_cover=item.is_cover,
            sort=item.sort,
            shoot_date=shoot_date,
        )
        db.add(w)
        created.append(w)
    db.commit()
    for w in created:
        db.refresh(w)
    return [WorkOut.model_validate(w) for w in created]


@router.delete("/photographers/{photographer_id}/works/{work_id}", response_model=OkResponse)
def delete_work(
    photographer_id: int,
    work_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    w = (
        db.query(Work)
        .filter(Work.id == work_id, Work.photographer_id == photographer_id)
        .first()
    )
    if not w:
        raise HTTPException(status_code=404, detail="作品不存在")
    db.delete(w)
    db.commit()
    return OkResponse()


@router.post("/photographers/{photographer_id}/packages", response_model=PackageOut)
def add_package(
    photographer_id: int,
    data: AdminPackageCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    pgr = _get_pgr_or_404(db, photographer_id)
    if data.price <= 0:
        raise HTTPException(status_code=400, detail="价格必须大于 0")

    cat = db.query(Category).filter(Category.id == data.category_id).first()
    if not cat:
        raise HTTPException(status_code=400, detail="品类不存在")

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


@router.delete("/photographers/{photographer_id}/packages/{package_id}", response_model=OkResponse)
def delete_package(
    photographer_id: int,
    package_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    pkg = (
        db.query(Package)
        .filter(Package.id == package_id, Package.photographer_id == photographer_id)
        .first()
    )
    if not pkg:
        raise HTTPException(status_code=404, detail="套餐不存在")
    pgr = _get_pgr_or_404(db, photographer_id)
    db.delete(pkg)
    db.flush()
    _refresh_starting_price(db, pgr)
    db.commit()
    return OkResponse()


@router.post("/photographers/{photographer_id}/approve", response_model=PhotographerDetail)
def approve(
    photographer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    pgr = _get_pgr_or_404(db, photographer_id)
    pgr.status = "approved"
    db.commit()
    db.refresh(pgr)
    return PhotographerDetail.model_validate(pgr)


@router.post("/photographers/{photographer_id}/freeze", response_model=PhotographerDetail)
def freeze(
    photographer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    pgr = _get_pgr_or_404(db, photographer_id)
    pgr.status = "frozen"
    db.commit()
    db.refresh(pgr)
    return PhotographerDetail.model_validate(pgr)


@router.post("/refresh-hot-score", response_model=OkResponse)
def refresh_hot_score(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    n = refresh_all(db)
    return OkResponse(ok=True, message=f"已刷新 {n} 位摄影师的热度值")
