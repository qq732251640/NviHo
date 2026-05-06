"""摄影师结算单。

每周/每月生成一份, 把这段时间的已完成订单聚合, 减去罚款, 得到摄影师实际应得。
运营审核后线上/线下转账, 标记 paid。
"""
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


SETTLEMENT_STATUSES = (
    "pending",   # 已生成, 待运营审核
    "approved",  # 审核通过, 待打款
    "paid",      # 已打款
    "void",      # 作废 / 重算
)


class Settlement(Base):
    __tablename__ = "pm_settlements"

    id = Column(Integer, primary_key=True, index=True)
    photographer_id = Column(
        Integer, ForeignKey("pm_photographers.id"), nullable=False, index=True
    )

    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    order_count = Column(Integer, default=0)
    gross_amount = Column(Integer, default=0, comment="该周期已完成订单总额(分)")
    commission_total = Column(Integer, default=0, comment="平台抽佣合计(分)")
    refund_total = Column(Integer, default=0, comment="该周期发生的退款合计(分)")
    penalty_total = Column(Integer, default=0, comment="该周期罚款合计(分)")
    net_payout = Column(Integer, default=0, comment="摄影师实得(分) = gross - commission - refund - penalty")

    status = Column(String(20), default="pending", index=True)
    paid_at = Column(DateTime, nullable=True)
    transfer_no = Column(String(80), nullable=True, comment="银行转账 / 微信商户单号")
    notes = Column(Text, nullable=True)

    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    photographer = relationship("Photographer", backref="settlements")
    operator = relationship("User", foreign_keys=[operator_id])
