from enum import Enum

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class OrderStatus(str, Enum):
    PENDING_PAY = "pending_pay"
    PENDING_CONFIRM = "pending_confirm"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    SHOOTING_DONE = "shooting_done"
    REVIEWED = "reviewed"
    AUTO_SETTLED = "auto_settled"
    SETTLED = "settled"
    USER_CANCELLED = "user_cancelled"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Order(Base):
    __tablename__ = "pm_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(32), unique=True, nullable=False, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    photographer_id = Column(Integer, ForeignKey("pm_photographers.id"), nullable=False, index=True)
    package_id = Column(Integer, ForeignKey("pm_packages.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("pm_categories.id"), nullable=True)

    shoot_date = Column(Date, nullable=False)
    location = Column(String(200), nullable=False)
    requirements = Column(Text, nullable=True)
    contact_name = Column(String(50), nullable=True)
    contact_phone = Column(String(20), nullable=True)

    amount_total = Column(Integer, nullable=False, comment="单位:分")
    commission = Column(Integer, default=0, comment="平台抽佣,单位:分")
    commission_rate = Column(Float, default=0.08, comment="抽佣比例,落到订单上避免历史变动")

    status = Column(String(30), default=OrderStatus.PENDING_PAY.value, index=True)
    reject_reason = Column(String(200), nullable=True)

    # 交付信息(摄影师上传成片时填写)
    # 用户在 confirmed/auto_settled/reviewed/settled 之前看不到 delivery_url 和 delivery_password
    delivery_url = Column(String(500), nullable=True, comment="百度云原片下载链接")
    delivery_password = Column(String(50), nullable=True, comment="百度云提取码")
    delivery_preview_images = Column(Text, nullable=True, comment="水印预览图 URL 数组(JSON)")
    delivery_note = Column(String(500), nullable=True, comment="摄影师交付备注")
    delivery_at = Column(DateTime, nullable=True, comment="交付提交时间")

    created_at = Column(DateTime, server_default=func.now())
    paid_at = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    settled_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="orders", foreign_keys=[user_id])
    photographer = relationship("Photographer", back_populates="orders")
    package = relationship("Package")
    category = relationship("Category")
    payments = relationship(
        "Payment", back_populates="order", cascade="all, delete-orphan"
    )
    review = relationship(
        "Review", back_populates="order", uselist=False, cascade="all, delete-orphan"
    )
