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

    created_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="review")
    user = relationship("User", back_populates="reviews")
    photographer = relationship("Photographer", back_populates="reviews")
