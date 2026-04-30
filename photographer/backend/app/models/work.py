from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class Work(Base):
    """摄影师作品(图片)。"""
    __tablename__ = "pm_works"

    id = Column(Integer, primary_key=True, index=True)
    photographer_id = Column(Integer, ForeignKey("pm_photographers.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("pm_categories.id"), nullable=True, index=True)

    image_url = Column(String(500), nullable=False)
    thumb_url = Column(String(500), nullable=True)
    title = Column(String(100), nullable=True)
    is_cover = Column(Integer, default=0)
    sort = Column(Integer, default=0)

    shoot_date = Column(DateTime, nullable=True, comment="作品拍摄日期,展示用")
    created_at = Column(DateTime, server_default=func.now())

    photographer = relationship("Photographer", back_populates="works")
    category = relationship("Category", lazy="selectin")
