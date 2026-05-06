"""运营后台 SSR 页面。

直接挂在主应用下,访问 http://localhost:8001/admin。
登录后用 httpOnly cookie 携带 access_token,所有页面服务端渲染。
"""

from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates
from sqlalchemy import desc, func
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.database import get_db
from app.models.category import Category
from app.models.order import Order, OrderStatus
from app.models.package import Package
from app.models.payment import Payment
from app.models.penalty import PENALTY_SEVERITIES, PENALTY_TYPES, Penalty
from app.models.photographer import Photographer
from app.models.user import User
from app.models.work import Work
from app.services.jd_oss import make_object_key
from app.utils.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter()

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

LOCAL_UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"
LOCAL_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

COOKIE_NAME = "admin_token"
COOKIE_MAX_AGE = 60 * 60 * 24


# ---------- jinja filter ----------

def _fmt_price(cents) -> str:
    if cents is None:
        return "-"
    return f"¥{cents / 100:.0f}"


def _fmt_date(dt) -> str:
    if not dt:
        return ""
    if isinstance(dt, str):
        return dt
    try:
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return str(dt)


def _fmt_datetime(dt) -> str:
    if not dt:
        return ""
    try:
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(dt)


def _fmt_pct(rate) -> str:
    if rate is None:
        return "—"
    try:
        return f"{float(rate) * 100:.1f}%"
    except Exception:
        return "—"


templates.env.filters["price"] = _fmt_price
templates.env.filters["date"] = _fmt_date
templates.env.filters["datetime"] = _fmt_datetime
templates.env.filters["pct"] = _fmt_pct


# ---------- 订单 / 处罚 常量 ----------

ORDER_STATUS_LABELS = {
    "pending_pay": "待支付",
    "pending_confirm": "待接单",
    "accepted": "进行中",
    "rejected": "已拒单",
    "shooting_done": "待确认收片",
    "reviewed": "已评价",
    "auto_settled": "已完成",
    "settled": "已结算",
    "user_cancelled": "用户取消",
    "cancelled": "已取消",
    "refunded": "已退款",
    "partial_refunded": "部分退款",
}

ORDER_STATUS_GROUPS = {
    "pending_pay": ["pending_pay"],
    "pending_confirm": ["pending_confirm"],
    "in_progress": ["accepted", "shooting_done"],
    "done": ["reviewed", "auto_settled", "settled"],
    "refunded": ["refunded", "partial_refunded"],
    "cancelled": ["rejected", "user_cancelled", "cancelled"],
}

PENALTY_TYPE_LABELS = {
    "reject": "拒单",
    "no_show": "爽约",
    "late_delivery": "超时未交付",
    "quality_complaint": "客诉",
    "behavior": "服务态度",
    "manual": "其他",
}

PENALTY_SEVERITY_LABELS = {
    "warning": "警告",
    "fine": "罚款",
    "suspend": "暂停接单",
    "ban": "永久封禁",
}

WARNING_AUTO_FREEZE_THRESHOLD = 3   # 累计 3 次 warning 自动 frozen


templates.env.globals["ORDER_STATUS_LABELS"] = ORDER_STATUS_LABELS
templates.env.globals["PENALTY_TYPE_LABELS"] = PENALTY_TYPE_LABELS
templates.env.globals["PENALTY_SEVERITY_LABELS"] = PENALTY_SEVERITY_LABELS
templates.env.globals["PENALTY_TYPES"] = PENALTY_TYPES
templates.env.globals["PENALTY_SEVERITIES"] = PENALTY_SEVERITIES


# ---------- 鉴权 ----------

def _get_admin_or_none(request: Request, db: Session) -> User | None:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or user.pm_role != "admin":
        return None
    return user


def _require_admin(request: Request, db: Session = Depends(get_db)) -> User:
    user = _get_admin_or_none(request, db)
    if not user:
        raise HTTPException(status_code=302, headers={"Location": "/admin/login"})
    return user


# ---------- 文件上传辅助 ----------

async def _save_uploaded(
    file: UploadFile, scope: str = "work", min_size: int = 1
) -> str | None:
    """保存上传的文件,返回 public_url(以 / 开头的相对路径)。空文件返回 None。"""
    if not file or not file.filename:
        return None
    contents = await file.read()
    if len(contents) < min_size:
        return None
    object_key = make_object_key(scope, file.filename)
    target = LOCAL_UPLOAD_ROOT / object_key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(contents)
    return f"/pm-uploads/{object_key}"


def _refresh_starting_price(db: Session, pgr: Photographer) -> None:
    min_price = (
        db.query(Package.price)
        .filter(Package.photographer_id == pgr.id, Package.is_active == 1)
        .order_by(Package.price.asc())
        .first()
    )
    pgr.starting_price = min_price[0] if min_price else 0


# ---------- 登录 / 退出 ----------

@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request, error: str | None = None):
    return templates.TemplateResponse(
        "login.html", {"request": request, "error": error}
    )


@router.post("/login")
def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "用户名或密码错误"},
            status_code=400,
        )
    if user.pm_role != "admin":
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "该账号没有运营后台权限"},
            status_code=403,
        )
    token = create_access_token({"sub": str(user.id)})
    response = RedirectResponse("/admin/", status_code=302)
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return response


@router.get("/logout")
def logout():
    response = RedirectResponse("/admin/login", status_code=302)
    response.delete_cookie(COOKIE_NAME)
    return response


# ---------- 数据看板(首页) ----------

@router.get("/", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db)):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    d7 = today_start - timedelta(days=7)
    d30 = today_start - timedelta(days=30)

    paid_filter = Order.paid_at.is_not(None)

    def _sum_amount(since):
        return (
            db.query(func.coalesce(func.sum(Order.amount_total), 0))
            .filter(paid_filter, Order.paid_at >= since)
            .scalar()
            or 0
        )

    def _sum_commission(since):
        return (
            db.query(func.coalesce(func.sum(Order.commission), 0))
            .filter(paid_filter, Order.paid_at >= since)
            .scalar()
            or 0
        )

    def _count_paid(since):
        return (
            db.query(func.count(Order.id))
            .filter(paid_filter, Order.paid_at >= since)
            .scalar()
            or 0
        )

    kpi = {
        "gmv_today": _sum_amount(today_start),
        "gmv_7d": _sum_amount(d7),
        "gmv_30d": _sum_amount(d30),
        "commission_30d": _sum_commission(d30),
        "orders_today": _count_paid(today_start),
        "orders_7d": _count_paid(d7),
        "orders_30d": _count_paid(d30),
        "refund_30d": (
            db.query(func.coalesce(func.sum(Order.refund_amount), 0))
            .filter(Order.refunded_at.is_not(None), Order.refunded_at >= d30)
            .scalar()
            or 0
        ),
    }

    pgr_counts = {
        "all": db.query(Photographer).count(),
        "pending": db.query(Photographer).filter(Photographer.status == "pending").count(),
        "approved": db.query(Photographer).filter(Photographer.status == "approved").count(),
        "frozen": db.query(Photographer).filter(Photographer.status == "frozen").count(),
    }

    user_counts = {
        "total": db.query(User).count(),
        "new_30d": db.query(User).filter(User.created_at >= d30).count(),
    }

    # 待运营处理的事项
    todos = {
        "pending_pgr": db.query(Photographer).filter(Photographer.status == "pending").count(),
        "pending_confirm": db.query(Order).filter(Order.status == "pending_confirm").count(),
        "shooting_done": db.query(Order).filter(Order.status == "shooting_done").count(),
    }

    # 近 30 天每日 GMV 趋势(用于折线图)
    daily_rows = (
        db.query(
            func.date(Order.paid_at).label("d"),
            func.coalesce(func.sum(Order.amount_total), 0).label("gmv"),
            func.count(Order.id).label("cnt"),
        )
        .filter(paid_filter, Order.paid_at >= d30)
        .group_by(func.date(Order.paid_at))
        .order_by(func.date(Order.paid_at))
        .all()
    )
    trend = [
        {"date": str(r.d), "gmv": int(r.gmv or 0), "cnt": int(r.cnt or 0)}
        for r in daily_rows
    ]

    # TOP 5 摄影师 (按 30 天 GMV)
    top_pgr_rows = (
        db.query(
            Photographer.id,
            Photographer.nickname,
            Photographer.avatar,
            func.coalesce(func.sum(Order.amount_total), 0).label("gmv"),
            func.count(Order.id).label("cnt"),
        )
        .join(Order, Order.photographer_id == Photographer.id)
        .filter(paid_filter, Order.paid_at >= d30)
        .group_by(Photographer.id)
        .order_by(desc("gmv"))
        .limit(5)
        .all()
    )

    # 订单状态分布 (饼图)
    status_rows = (
        db.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )
    status_dist = [
        {"status": s, "label": ORDER_STATUS_LABELS.get(s, s), "count": c}
        for s, c in status_rows
    ]

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "user": user,
            "kpi": kpi,
            "pgr_counts": pgr_counts,
            "user_counts": user_counts,
            "todos": todos,
            "trend": trend,
            "top_pgr": top_pgr_rows,
            "status_dist": status_dist,
        },
    )


# ---------- 摄影师管理(列表) ----------

@router.get("/photographers/", response_class=HTMLResponse)
def photographers_list(
    request: Request,
    status: str | None = Query(None),
    keyword: str | None = Query(None),
    db: Session = Depends(get_db),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    q = db.query(Photographer).options(selectinload(Photographer.categories))
    if status:
        q = q.filter(Photographer.status == status)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(Photographer.nickname.like(like))
    rows = q.order_by(desc(Photographer.created_at)).all()

    counts = {
        "all": db.query(Photographer).count(),
        "pending": db.query(Photographer).filter(Photographer.status == "pending").count(),
        "approved": db.query(Photographer).filter(Photographer.status == "approved").count(),
        "frozen": db.query(Photographer).filter(Photographer.status == "frozen").count(),
    }

    return templates.TemplateResponse(
        "photographers_list.html",
        {
            "request": request,
            "user": user,
            "rows": rows,
            "status": status or "all",
            "keyword": keyword or "",
            "counts": counts,
        },
    )


# ---------- 新建摄影师 ----------

@router.get("/photographers/new", response_class=HTMLResponse)
def new_photographer_page(
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    categories = db.query(Category).order_by(Category.sort).all()
    return templates.TemplateResponse(
        "photographer_form.html",
        {
            "request": request,
            "user": user,
            "mode": "new",
            "categories": categories,
            "pgr": None,
            "selected_category_ids": [],
            "error": None,
        },
    )


@router.post("/photographers/new")
async def new_photographer_submit(
    request: Request,
    db: Session = Depends(get_db),
    username: str = Form(...),
    nickname: str = Form(...),
    intro: str = Form(""),
    contact_phone: str = Form(""),
    contact_wechat: str = Form(""),
    base_city: str = Form("太原"),
    service_radius_km: int = Form(50),
    service_extra_fee: int = Form(200),
    years_of_experience: int = Form(1),
    external_portfolio_url: str = Form(""),
    auto_approve: str = Form("on"),
    category_ids: List[int] = Form([]),
    avatar_file: UploadFile | None = File(None),
    cover_file: UploadFile | None = File(None),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    error = None
    if db.query(User).filter(User.username == username).first():
        error = f"用户名 {username} 已存在"

    if error:
        categories = db.query(Category).order_by(Category.sort).all()
        return templates.TemplateResponse(
            "photographer_form.html",
            {
                "request": request,
                "user": user,
                "mode": "new",
                "categories": categories,
                "pgr": None,
                "selected_category_ids": category_ids,
                "error": error,
                "form": {
                    "username": username,
                    "nickname": nickname,
                    "intro": intro,
                    "contact_phone": contact_phone,
                    "contact_wechat": contact_wechat,
                    "base_city": base_city,
                    "service_radius_km": service_radius_km,
                    "service_extra_fee": service_extra_fee,
                    "years_of_experience": years_of_experience,
                    "external_portfolio_url": external_portfolio_url,
                },
            },
            status_code=400,
        )

    avatar_url = await _save_uploaded(avatar_file, "avatar") if avatar_file else None
    cover_url = await _save_uploaded(cover_file, "cover") if cover_file else None

    new_user = User(
        username=username,
        password_hash=hash_password("123456"),
        nickname=nickname,
        avatar=avatar_url,
        pm_role="photographer",
        pm_phone=contact_phone or None,
        pm_city=base_city,
    )
    db.add(new_user)
    db.flush()

    pgr = Photographer(
        user_id=new_user.id,
        nickname=nickname,
        avatar=avatar_url,
        cover_image=cover_url,
        intro=intro or None,
        years_of_experience=years_of_experience,
        base_city=base_city,
        service_radius_km=service_radius_km,
        service_extra_fee=service_extra_fee,
        contact_phone=contact_phone or None,
        contact_wechat=contact_wechat or None,
        external_portfolio_url=external_portfolio_url or None,
        status="approved" if auto_approve == "on" else "pending",
    )
    if category_ids:
        cats = db.query(Category).filter(Category.id.in_(category_ids)).all()
        pgr.categories = cats
    db.add(pgr)
    db.commit()
    db.refresh(pgr)

    return RedirectResponse(f"/admin/photographers/{pgr.id}", status_code=302)


# ---------- 摄影师详情(编辑 + 作品 + 套餐) ----------

@router.get("/photographers/{photographer_id}", response_class=HTMLResponse)
def photographer_detail_page(
    photographer_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    pgr = (
        db.query(Photographer)
        .options(
            selectinload(Photographer.categories),
            selectinload(Photographer.works).selectinload(Work.category),
            selectinload(Photographer.packages).selectinload(Package.category),
        )
        .filter(Photographer.id == photographer_id)
        .first()
    )
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在")

    categories = db.query(Category).order_by(Category.sort).all()
    selected_category_ids = [c.id for c in pgr.categories]

    # 处罚记录(默认隐藏 tab, 锚点 #penalty 跳过来时展开)
    penalties = (
        db.query(Penalty)
        .filter(Penalty.photographer_id == pgr.id)
        .order_by(desc(Penalty.created_at))
        .all()
    )
    warning_count = sum(1 for p in penalties if p.severity == "warning")
    fine_total = sum((p.fine_amount or 0) for p in penalties)

    # 该摄影师近期订单(给详情页一个快速入口)
    recent_orders = (
        db.query(Order)
        .options(selectinload(Order.user), selectinload(Order.package))
        .filter(Order.photographer_id == pgr.id)
        .order_by(desc(Order.created_at))
        .limit(20)
        .all()
    )

    settings = get_settings()

    return templates.TemplateResponse(
        "photographer_detail.html",
        {
            "request": request,
            "user": user,
            "pgr": pgr,
            "categories": categories,
            "selected_category_ids": selected_category_ids,
            "penalties": penalties,
            "warning_count": warning_count,
            "fine_total": fine_total,
            "warning_threshold": WARNING_AUTO_FREEZE_THRESHOLD,
            "recent_orders": recent_orders,
            "default_commission_rate": settings.DEFAULT_COMMISSION_RATE,
            "msg": request.query_params.get("msg"),
            "tab": request.query_params.get("tab") or "info",
        },
    )


@router.post("/photographers/{photographer_id}/edit")
async def photographer_edit_submit(
    photographer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    nickname: str = Form(...),
    intro: str = Form(""),
    contact_phone: str = Form(""),
    contact_wechat: str = Form(""),
    base_city: str = Form("太原"),
    service_radius_km: int = Form(50),
    service_extra_fee: int = Form(200),
    years_of_experience: int = Form(1),
    external_portfolio_url: str = Form(""),
    category_ids: List[int] = Form([]),
    avatar_file: UploadFile | None = File(None),
    cover_file: UploadFile | None = File(None),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    pgr = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在")

    pgr.nickname = nickname
    pgr.intro = intro or None
    pgr.contact_phone = contact_phone or None
    pgr.contact_wechat = contact_wechat or None
    pgr.base_city = base_city
    pgr.service_radius_km = service_radius_km
    pgr.service_extra_fee = service_extra_fee
    pgr.years_of_experience = years_of_experience
    pgr.external_portfolio_url = external_portfolio_url or None

    avatar_url = await _save_uploaded(avatar_file, "avatar") if avatar_file else None
    if avatar_url:
        pgr.avatar = avatar_url
    cover_url = await _save_uploaded(cover_file, "cover") if cover_file else None
    if cover_url:
        pgr.cover_image = cover_url

    if category_ids:
        cats = db.query(Category).filter(Category.id.in_(category_ids)).all()
        pgr.categories = cats

    db.commit()
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg=资料已保存", status_code=302
    )


@router.post("/photographers/{photographer_id}/works/add")
async def add_works(
    photographer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    category_id: int = Form(...),
    shoot_date: str | None = Form(None),
    files: List[UploadFile] = File(...),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    pgr = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在")

    parsed_shoot_date = None
    if shoot_date:
        try:
            parsed_shoot_date = datetime.fromisoformat(shoot_date)
        except ValueError:
            parsed_shoot_date = None

    max_sort = db.query(Work).filter(Work.photographer_id == pgr.id).count()

    added = 0
    for f in files:
        url = await _save_uploaded(f, "work")
        if not url:
            continue
        max_sort += 1
        is_cover = 1 if (db.query(Work).filter(Work.photographer_id == pgr.id).count() == 0) else 0
        db.add(
            Work(
                photographer_id=pgr.id,
                category_id=category_id,
                image_url=url,
                thumb_url=url,
                is_cover=is_cover,
                sort=max_sort,
                shoot_date=parsed_shoot_date,
            )
        )
        added += 1
    db.commit()
    msg = f"已上传 {added} 张作品"
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg={msg}", status_code=302
    )


@router.post("/photographers/{photographer_id}/works/{work_id}/delete")
def delete_work(
    photographer_id: int,
    work_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    w = (
        db.query(Work)
        .filter(Work.id == work_id, Work.photographer_id == photographer_id)
        .first()
    )
    if w:
        db.delete(w)
        db.commit()
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg=作品已删除", status_code=302
    )


@router.post("/photographers/{photographer_id}/works/{work_id}/cover")
def set_work_cover(
    photographer_id: int,
    work_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    works = db.query(Work).filter(Work.photographer_id == photographer_id).all()
    for w in works:
        w.is_cover = 1 if w.id == work_id else 0

    target = next((w for w in works if w.id == work_id), None)
    if target:
        pgr = db.query(Photographer).filter(Photographer.id == photographer_id).first()
        if pgr:
            pgr.cover_image = target.image_url
    db.commit()
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg=已设为封面", status_code=302
    )


@router.post("/photographers/{photographer_id}/packages/add")
def add_package(
    photographer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    category_id: int = Form(...),
    name: str = Form(...),
    duration_hours: int = Form(4),
    photos_count: int = Form(50),
    description: str = Form(""),
    price_yuan: int = Form(...),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    pgr = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在")

    if price_yuan <= 0:
        return RedirectResponse(
            f"/admin/photographers/{photographer_id}?msg=价格必须大于 0",
            status_code=302,
        )

    pkg = Package(
        photographer_id=pgr.id,
        category_id=category_id,
        name=name,
        duration_hours=duration_hours,
        photos_count=photos_count,
        description=description or None,
        price=price_yuan * 100,
        is_active=1,
    )
    db.add(pkg)
    db.flush()
    _refresh_starting_price(db, pgr)
    db.commit()
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg=套餐已添加", status_code=302
    )


@router.post("/photographers/{photographer_id}/packages/{package_id}/delete")
def delete_package(
    photographer_id: int,
    package_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    pkg = (
        db.query(Package)
        .filter(Package.id == package_id, Package.photographer_id == photographer_id)
        .first()
    )
    if pkg:
        db.delete(pkg)
        db.flush()
        pgr = db.query(Photographer).filter(Photographer.id == photographer_id).first()
        if pgr:
            _refresh_starting_price(db, pgr)
        db.commit()
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg=套餐已删除", status_code=302
    )


@router.post("/photographers/{photographer_id}/status")
def set_status(
    photographer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    status: str = Form(...),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    if status not in ("approved", "frozen", "pending"):
        raise HTTPException(status_code=400, detail="status 不合法")

    pgr = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在")
    pgr.status = status
    db.commit()
    label = {"approved": "已上架", "frozen": "已下架", "pending": "已设为待审核"}[status]
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg={label}", status_code=302
    )


# ---------- 摄影师佣金率 ----------

@router.post("/photographers/{photographer_id}/commission")
def set_photographer_commission(
    photographer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    commission_rate: str = Form(""),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)
    pgr = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在")

    val = (commission_rate or "").strip()
    if val == "":
        pgr.commission_rate = None
        msg = "已清除自定义费率, 改用平台默认"
    else:
        try:
            rate = float(val)
        except ValueError:
            return RedirectResponse(
                f"/admin/photographers/{photographer_id}?msg=费率必须是数字",
                status_code=302,
            )
        if rate > 1:
            rate = rate / 100.0  # 允许填 8 表示 8%
        if rate < 0 or rate > 1:
            return RedirectResponse(
                f"/admin/photographers/{photographer_id}?msg=费率范围 0~100%",
                status_code=302,
            )
        pgr.commission_rate = rate
        msg = f"佣金率已设为 {rate * 100:.1f}%"
    db.commit()
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg={msg}", status_code=302
    )


# ---------- 摄影师处罚 ----------

@router.post("/photographers/{photographer_id}/penalties/add")
def add_penalty(
    photographer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    type: str = Form(...),
    severity: str = Form(...),
    fine_amount_yuan: int = Form(0),
    notes: str = Form(""),
    order_id: int | None = Form(None),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)
    pgr = db.query(Photographer).filter(Photographer.id == photographer_id).first()
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在")
    if type not in PENALTY_TYPES:
        raise HTTPException(status_code=400, detail="处罚类型不合法")
    if severity not in PENALTY_SEVERITIES:
        raise HTTPException(status_code=400, detail="严重程度不合法")

    p = Penalty(
        photographer_id=pgr.id,
        order_id=order_id,
        type=type,
        severity=severity,
        fine_amount=max(0, fine_amount_yuan) * 100,
        notes=notes or None,
        operator_id=user.id,
    )
    db.add(p)

    # 自动联动: ban -> frozen, suspend -> frozen, warning 累积 N 次 -> frozen
    if severity in ("ban", "suspend"):
        pgr.status = "frozen"
    elif severity == "warning":
        warn_count = (
            db.query(func.count(Penalty.id))
            .filter(
                Penalty.photographer_id == pgr.id,
                Penalty.severity == "warning",
            )
            .scalar()
            or 0
        )
        # +1 因为还没 commit
        if warn_count + 1 >= WARNING_AUTO_FREEZE_THRESHOLD:
            pgr.status = "frozen"

    db.commit()
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg=处罚已记录&tab=penalty",
        status_code=302,
    )


@router.post("/photographers/{photographer_id}/penalties/{penalty_id}/delete")
def delete_penalty(
    photographer_id: int,
    penalty_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)
    p = (
        db.query(Penalty)
        .filter(Penalty.id == penalty_id, Penalty.photographer_id == photographer_id)
        .first()
    )
    if p:
        db.delete(p)
        db.commit()
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg=处罚已删除&tab=penalty",
        status_code=302,
    )


# ---------- 订单管理 ----------

def _eager_order_query(db: Session):
    return db.query(Order).options(
        selectinload(Order.user),
        selectinload(Order.photographer).selectinload(Photographer.user),
        selectinload(Order.package),
        selectinload(Order.payments),
    )


@router.get("/orders/", response_class=HTMLResponse)
def orders_list(
    request: Request,
    status: str | None = Query(None),
    keyword: str | None = Query(None, description="按订单号 / 用户名 / 摄影师昵称搜索"),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: Session = Depends(get_db),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    q = _eager_order_query(db)

    if status and status != "all":
        if status in ORDER_STATUS_GROUPS:
            q = q.filter(Order.status.in_(ORDER_STATUS_GROUPS[status]))
        else:
            q = q.filter(Order.status == status)

    if keyword:
        like = f"%{keyword}%"
        q = q.outerjoin(Order.user).outerjoin(Order.photographer)
        q = q.filter(
            (Order.order_no.like(like))
            | (User.nickname.like(like))
            | (User.username.like(like))
            | (Photographer.nickname.like(like))
        )

    if date_from:
        try:
            df = datetime.strptime(date_from, "%Y-%m-%d")
            q = q.filter(Order.created_at >= df)
        except ValueError:
            pass
    if date_to:
        try:
            dt_ = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(Order.created_at < dt_)
        except ValueError:
            pass

    rows = q.order_by(desc(Order.created_at)).limit(500).all()

    # 各分组计数(走原始 query, 忽略 status filter)
    base_count_q = db.query(func.count(Order.id))
    counts = {
        "all": base_count_q.scalar() or 0,
        "pending_pay": base_count_q.filter(Order.status == "pending_pay").scalar() or 0,
        "pending_confirm": db.query(func.count(Order.id))
        .filter(Order.status == "pending_confirm")
        .scalar()
        or 0,
        "in_progress": db.query(func.count(Order.id))
        .filter(Order.status.in_(ORDER_STATUS_GROUPS["in_progress"]))
        .scalar()
        or 0,
        "done": db.query(func.count(Order.id))
        .filter(Order.status.in_(ORDER_STATUS_GROUPS["done"]))
        .scalar()
        or 0,
        "refunded": db.query(func.count(Order.id))
        .filter(Order.status.in_(ORDER_STATUS_GROUPS["refunded"]))
        .scalar()
        or 0,
        "cancelled": db.query(func.count(Order.id))
        .filter(Order.status.in_(ORDER_STATUS_GROUPS["cancelled"]))
        .scalar()
        or 0,
    }

    return templates.TemplateResponse(
        "orders_list.html",
        {
            "request": request,
            "user": user,
            "rows": rows,
            "status": status or "all",
            "keyword": keyword or "",
            "date_from": date_from or "",
            "date_to": date_to or "",
            "counts": counts,
        },
    )


@router.get("/orders/{order_id}", response_class=HTMLResponse)
def order_detail(
    order_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)

    o = (
        _eager_order_query(db)
        .filter(Order.id == order_id)
        .first()
    )
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")

    payments = (
        db.query(Payment).filter(Payment.order_id == o.id).order_by(Payment.created_at).all()
    )
    penalties = (
        db.query(Penalty).filter(Penalty.order_id == o.id).order_by(desc(Penalty.created_at)).all()
    )

    refundable = max(0, (o.amount_total or 0) - (o.refund_amount or 0))

    timeline = []
    if o.created_at:
        timeline.append(("创建订单", o.created_at))
    if o.paid_at:
        timeline.append(("用户支付", o.paid_at))
    if o.accepted_at:
        timeline.append(("摄影师接单", o.accepted_at))
    if o.delivery_at:
        timeline.append(("摄影师交付", o.delivery_at))
    if o.confirmed_at:
        timeline.append(("用户确认收片", o.confirmed_at))
    if o.refunded_at:
        timeline.append(("退款", o.refunded_at))
    if o.cancelled_at:
        timeline.append(("订单取消", o.cancelled_at))
    if o.settled_at:
        timeline.append(("已结算给摄影师", o.settled_at))
    timeline.sort(key=lambda x: x[1])

    return templates.TemplateResponse(
        "order_detail.html",
        {
            "request": request,
            "user": user,
            "o": o,
            "payments": payments,
            "penalties": penalties,
            "timeline": timeline,
            "refundable": refundable,
            "msg": request.query_params.get("msg"),
        },
    )


@router.post("/orders/{order_id}/refund")
def refund_order(
    order_id: int,
    request: Request,
    db: Session = Depends(get_db),
    amount_yuan: int = Form(...),
    reason: str = Form(...),
    refund_type: str = Form("user_complaint"),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if not o.paid_at:
        return RedirectResponse(
            f"/admin/orders/{order_id}?msg=订单未支付, 无可退金额", status_code=302
        )

    amount_cents = max(0, amount_yuan) * 100
    refundable = (o.amount_total or 0) - (o.refund_amount or 0)
    if amount_cents <= 0:
        return RedirectResponse(
            f"/admin/orders/{order_id}?msg=退款金额必须大于 0", status_code=302
        )
    if amount_cents > refundable:
        return RedirectResponse(
            f"/admin/orders/{order_id}?msg=金额超出可退余额 {refundable / 100:.0f} 元",
            status_code=302,
        )

    # 写流水
    db.add(
        Payment(
            order_id=o.id,
            type="refund",
            amount=amount_cents,
            wx_transaction_id=None,
            status="success",
            raw_callback=f'{{"manual":true,"by":{user.id},"reason":{reason!r},"refund_type":{refund_type!r}}}',
        )
    )

    o.refund_amount = (o.refund_amount or 0) + amount_cents
    o.refunded_at = datetime.utcnow()
    o.refund_reason = (
        (o.refund_reason + "\n---\n" if o.refund_reason else "")
        + f"[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {refund_type} - {reason}"
    )

    if o.refund_amount >= (o.amount_total or 0):
        o.status = OrderStatus.REFUNDED.value
    else:
        o.status = OrderStatus.PARTIAL_REFUNDED.value

    # TODO: 真实接通微信退款时, 在这里调 services.wxpay.refund_order(o, amount_cents)

    db.commit()
    return RedirectResponse(
        f"/admin/orders/{order_id}?msg=已退款 ¥{amount_cents / 100:.0f}",
        status_code=302,
    )


@router.post("/orders/{order_id}/penalty")
def order_add_penalty(
    order_id: int,
    request: Request,
    db: Session = Depends(get_db),
    type: str = Form(...),
    severity: str = Form(...),
    fine_amount_yuan: int = Form(0),
    notes: str = Form(""),
):
    """从订单详情页对该订单的摄影师录入处罚记录。"""
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if type not in PENALTY_TYPES or severity not in PENALTY_SEVERITIES:
        raise HTTPException(status_code=400, detail="参数不合法")

    p = Penalty(
        photographer_id=o.photographer_id,
        order_id=o.id,
        type=type,
        severity=severity,
        fine_amount=max(0, fine_amount_yuan) * 100,
        notes=notes or None,
        operator_id=user.id,
    )
    db.add(p)
    if severity in ("ban", "suspend"):
        pgr = db.query(Photographer).filter(Photographer.id == o.photographer_id).first()
        if pgr:
            pgr.status = "frozen"
    db.commit()
    return RedirectResponse(
        f"/admin/orders/{order_id}?msg=已对摄影师录入处罚",
        status_code=302,
    )


# ---------- 套餐佣金率 (复用 add_package, 单独路由更新) ----------

@router.post("/photographers/{photographer_id}/packages/{package_id}/commission")
def set_package_commission(
    photographer_id: int,
    package_id: int,
    request: Request,
    db: Session = Depends(get_db),
    commission_rate: str = Form(""),
):
    user = _get_admin_or_none(request, db)
    if not user:
        return RedirectResponse("/admin/login", status_code=302)
    pkg = (
        db.query(Package)
        .filter(Package.id == package_id, Package.photographer_id == photographer_id)
        .first()
    )
    if not pkg:
        raise HTTPException(status_code=404, detail="套餐不存在")

    val = (commission_rate or "").strip()
    if val == "":
        pkg.commission_rate = None
    else:
        try:
            rate = float(val)
        except ValueError:
            return RedirectResponse(
                f"/admin/photographers/{photographer_id}?msg=费率必须是数字",
                status_code=302,
            )
        if rate > 1:
            rate = rate / 100.0
        if rate < 0 or rate > 1:
            return RedirectResponse(
                f"/admin/photographers/{photographer_id}?msg=费率范围 0~100%",
                status_code=302,
            )
        pkg.commission_rate = rate
    db.commit()
    return RedirectResponse(
        f"/admin/photographers/{photographer_id}?msg=套餐佣金率已更新",
        status_code=302,
    )
