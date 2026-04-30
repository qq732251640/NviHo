from pydantic import BaseModel


class WxLoginRequest(BaseModel):
    code: str
    nickname: str | None = None
    avatar: str | None = None


class DevLoginRequest(BaseModel):
    """开发期免微信登录:任意用户名密码即可,自动创建。"""
    username: str
    password: str = "123456"


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    username: str
    nickname: str | None = None
    avatar: str | None = None
    pm_role: str
    pm_phone: str | None = None
    pm_city: str | None = None
    photographer_id: int | None = None

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    nickname: str | None = None
    avatar: str | None = None
    pm_phone: str | None = None
    pm_city: str | None = None
