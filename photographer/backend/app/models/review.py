from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Review(Base):
    __tablename__ = "pm_reviews"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("pm_orders.id"), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    photographer_id = Column(Integer, ForeignKey("pm_photographers.id"), nullable=False, index=True)

    rating = Column(Integer, nullable=False, comment="1-5 星")
    tags = Column(String(500), nullable=True, comment="JSON 字符串数组")
    text = Column(Text, nullable=True)
    images = Column(Text, nullable=True, comment="JSON 字符串数组")

    is_hidden = Column(Integer, default=0, comment="0=正常 1=被运营隐藏")
    hidden_reason = Column(String(300), nullable=True)
    hidden_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    hidden_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="review")
    user = relationship("User", back_populates="reviews")
    photographer = relationship("Photographer", back_populates="reviews")
