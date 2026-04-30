from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Payment(Base):
    """微信支付/退款流水,对账用。"""
    __tablename__ = "pm_payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("pm_orders.id"), nullable=False, index=True)
    type = Column(String(20), nullable=False, comment="pay / refund")
    amount = Column(Integer, nullable=False, comment="单位:分")
    wx_transaction_id = Column(String(50), nullable=True, index=True)
    status = Column(String(20), default="pending", comment="pending/success/fail")
    raw_callback = Column(Text, nullable=True, comment="微信回调原文")
    created_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="payments")
