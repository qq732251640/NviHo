from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


photographer_category = Table(
    "pm_photographer_categories",
    Base.metadata,
    Column("photographer_id", ForeignKey("pm_photographers.id"), primary_key=True),
    Column("category_id", ForeignKey("pm_categories.id"), primary_key=True),
)


class Photographer(Base):
    __tablename__ = "pm_photographers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    nickname = Column(String(50), nullable=False)
    avatar = Column(String(500), nullable=True)
    cover_image = Column(String(500), nullable=True)
    intro = Column(Text, nullable=True)
    years_of_experience = Column(Integer, default=1)

    base_city = Column(String(50), default="太原")
    service_radius_km = Column(Integer, default=50)
    service_extra_fee = Column(Integer, default=200, comment="周边接单加价(元)")

    hot_score = Column(Float, default=0.0)
    avg_rating = Column(Float, default=5.0)
    review_count = Column(Integer, default=0)
    completed_orders = Column(Integer, default=0)

    external_portfolio_url = Column(String(500), nullable=True, comment="时光盒子/小红书等外链")

    contact_phone = Column(String(20), nullable=True, comment="脱敏存储,仅订单成立后释放")
    contact_wechat = Column(String(50), nullable=True)

    status = Column(String(20), default="pending", comment="pending/approved/frozen")
    starting_price = Column(Integer, default=0, comment="冗余字段:起拍价(元),用于列表页快速展示")

    # 协议接受记录(摄影师入驻协议 + 服务承诺书)
    photographer_agreement_version = Column(String(20), nullable=True, comment="已接受的入驻协议版本号")
    service_commitment_version = Column(String(20), nullable=True, comment="已接受的服务承诺书版本号")
    agreements_accepted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="photographer")
    categories = relationship("Category", secondary=photographer_category, lazy="selectin")
    works = relationship(
        "Work",
        back_populates="photographer",
        cascade="all, delete-orphan",
        order_by="Work.sort.desc()",
    )
    packages = relationship(
        "Package", back_populates="photographer", cascade="all, delete-orphan"
    )
    schedules = relationship(
        "Schedule", back_populates="photographer", cascade="all, delete-orphan"
    )
    orders = relationship("Order", back_populates="photographer")
    reviews = relationship("Review", back_populates="photographer")
