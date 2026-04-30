"""运营后台 SSR 页面。

直接挂在主应用下,访问 http://localhost:8001/admin。
登录后用 httpOnly cookie 携带 access_token,所有页面服务端渲染。
"""

from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates
from sqlalchemy import desc
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.category import Category
from app.models.package import Package
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


templates.env.filters["price"] = _fmt_price
templates.env.filters["date"] = _fmt_date
templates.env.filters["datetime"] = _fmt_datetime


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
    return f"/uploads/{object_key}"


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


# ---------- 摄影师列表(首页) ----------

@router.get("/", response_class=HTMLResponse)
def dashboard(
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
        "dashboard.html",
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

    return templates.TemplateResponse(
        "photographer_detail.html",
        {
            "request": request,
            "user": user,
            "pgr": pgr,
            "categories": categories,
            "selected_category_ids": selected_category_ids,
            "msg": request.query_params.get("msg"),
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
