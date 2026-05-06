from datetime import date, datetime

from pydantic import BaseModel


class OrderCreate(BaseModel):
    photographer_id: int
    package_id: int
    shoot_date: date
    location: str
    requirements: str | None = None
    contact_name: str | None = None
    contact_phone: str | None = None


class OrderRejectRequest(BaseModel):
    reason: str | None = None


class OrderDeliverRequest(BaseModel):
    """摄影师上传成片(原 complete 接口的请求体, 升级版)。"""
    preview_images: list[str]
    delivery_url: str
    delivery_password: str | None = None
    delivery_note: str | None = None


# 兼容旧字段名(逐步废弃)
class OrderCompleteRequest(BaseModel):
    delivery_url: str | None = None


class OrderReviewRequest(BaseModel):
    rating: int
    text: str | None = None
    tags: list[str] | None = None
    images: list[str] | None = None


class OrderListItem(BaseModel):
    id: int
    order_no: str
    photographer_id: int
    photographer_nickname: str | None = None
    photographer_avatar: str | None = None
    package_name: str | None = None
    shoot_date: date
    location: str
    amount_total: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class OrderDetail(BaseModel):
    id: int
    order_no: str
    user_id: int
    user_nickname: str | None = None
    photographer_id: int
    photographer_nickname: str | None = None
    photographer_avatar: str | None = None
    photographer_phone: str | None = None
    package_id: int
    package_name: str | None = None
    package_description: str | None = None
    shoot_date: date
    location: str
    requirements: str | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    amount_total: int
    commission: int
    commission_rate: float
    status: str
    reject_reason: str | None = None

    # 交付信息: API 层根据状态决定哪些字段返回
    delivery_preview_images: list[str] | None = None  # 始终返回(展示水印预览)
    delivery_url: str | None = None                   # 用户视角:仅在 reviewed/auto_settled/settled 后返回
    delivery_password: str | None = None              # 用户视角:仅在 reviewed/auto_settled/settled 后返回
    delivery_note: str | None = None
    delivery_at: datetime | None = None
    delivery_unlocked: bool = False                   # 前端用,判断是否已经解锁链接

    created_at: datetime
    paid_at: datetime | None = None
    accepted_at: datetime | None = None
    completed_at: datetime | None = None
    confirmed_at: datetime | None = None
    settled_at: datetime | None = None

    class Config:
        from_attributes = True


class WxPayPrepay(BaseModel):
    """前端微信支付所需参数(MVP 阶段 mock)。"""
    timeStamp: str
    nonceStr: str
    package: str
    signType: str = "MD5"
    paySign: str
    order_no: str
