from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Package(Base):
    """摄影师套餐 / 价格表。"""
    __tablename__ = "pm_packages"

    id = Column(Integer, primary_key=True, index=True)
    photographer_id = Column(Integer, ForeignKey("pm_photographers.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("pm_categories.id"), nullable=False, index=True)

    name = Column(String(100), nullable=False)
    duration_hours = Column(Integer, default=4)
    photos_count = Column(Integer, default=50, comment="精修张数")
    description = Column(Text, nullable=True)
    price = Column(Integer, nullable=False, comment="单位:分")
    is_active = Column(Integer, default=1)
    sort = Column(Integer, default=0)

    # 套餐级佣金率, NULL 时 fallback 到摄影师 → 平台默认
    commission_rate = Column(
        Float, nullable=True, comment="套餐专属抽佣比例, 优先级最高"
    )

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    photographer = relationship("Photographer", back_populates="packages")
    category = relationship("Category", lazy="selectin")
