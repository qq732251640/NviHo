from sqlalchemy import Column, DateTime, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    wx_openid = Column(String(100), unique=True, nullable=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    nickname = Column(String(100), nullable=True)
    avatar = Column(String(500), nullable=True)

    pm_role = Column(String(20), nullable=False, default="user", comment="user/photographer/both/admin/banned")
    pm_phone = Column(String(20), nullable=True)
    pm_city = Column(String(50), nullable=True, default="太原")
    banned_at = Column(DateTime, nullable=True, comment="拉黑时间")
    banned_reason = Column(String(500), nullable=True)

    # 协议接受记录(用户协议)
    user_agreement_version = Column(String(20), nullable=True, comment="已接受的用户协议版本号")
    user_agreement_accepted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    photographer = relationship(
        "Photographer", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    orders = relationship(
        "Order", back_populates="user", foreign_keys="Order.user_id"
    )
    favorites = relationship(
        "Favorite", back_populates="user", cascade="all, delete-orphan"
    )
    reviews = relationship("Review", back_populates="user")
