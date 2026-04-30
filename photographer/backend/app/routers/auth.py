import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    DevLoginRequest,
    Token,
    UpdateProfileRequest,
    UserOut,
    WxLoginRequest,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
)

router = APIRouter()
settings = get_settings()

WX_CODE2SESSION_URL = "https://api.weixin.qq.com/sns/jscode2session"


def _build_user_out(user: User) -> UserOut:
    pgr_id = user.photographer.id if user.photographer else None
    return UserOut(
        id=user.id,
        username=user.username,
        nickname=user.nickname,
        avatar=user.avatar,
        pm_role=user.pm_role,
        pm_phone=user.pm_phone,
        pm_city=user.pm_city,
        photographer_id=pgr_id,
    )


def _issue_token(user: User) -> Token:
    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/wx-login", response_model=Token)
def wx_login(data: WxLoginRequest, db: Session = Depends(get_db)):
    if not settings.WX_APP_ID or not settings.WX_APP_SECRET:
        raise HTTPException(status_code=500, detail="微信登录未配置,请联系管理员")

    resp = httpx.get(
        WX_CODE2SESSION_URL,
        params={
            "appid": settings.WX_APP_ID,
            "secret": settings.WX_APP_SECRET,
            "js_code": data.code,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    wx_data = resp.json()
    if "errcode" in wx_data and wx_data["errcode"] != 0:
        raise HTTPException(
            status_code=400, detail=f"微信登录失败: {wx_data.get('errmsg', '未知错误')}"
        )

    openid = wx_data.get("openid")
    if not openid:
        raise HTTPException(status_code=400, detail="微信登录失败: 未获取到 openid")

    user = db.query(User).filter(User.wx_openid == openid).first()
    if not user:
        user = User(
            username=f"wx_{uuid.uuid4().hex[:12]}",
            password_hash=hash_password(uuid.uuid4().hex),
            nickname=data.nickname or "微信用户",
            avatar=data.avatar,
            wx_openid=openid,
            pm_role="user",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return _issue_token(user)


@router.post("/dev-login", response_model=Token)
def dev_login(data: DevLoginRequest, db: Session = Depends(get_db)):
    """开发期免微信登录:任意用户名即可,首次自动创建。生产环境应关闭。"""
    user = db.query(User).filter(User.username == data.username).first()
    if not user:
        user = User(
            username=data.username,
            password_hash=hash_password(data.password),
            nickname=data.username,
            pm_role="user",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return _issue_token(user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return _build_user_out(current_user)


@router.put("/me", response_model=UserOut)
def update_me(
    data: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.nickname is not None:
        current_user.nickname = data.nickname
    if data.avatar is not None:
        current_user.avatar = data.avatar
    if data.pm_phone is not None:
        current_user.pm_phone = data.pm_phone
    if data.pm_city is not None:
        current_user.pm_city = data.pm_city
    db.commit()
    db.refresh(current_user)
    return _build_user_out(current_user)
