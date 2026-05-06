"""摄影师违约 / 处罚记录。

由运营在订单详情或摄影师详情页手动录入, 也可由系统在拒单/超时未接/超时未交付等场景自动产出。
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


PENALTY_TYPES = (
    "reject",          # 摄影师拒单
    "no_show",         # 爽约 / 拍摄当日未到场
    "late_delivery",   # 超时未交付
    "quality_complaint",  # 客诉:成片质量问题
    "behavior",        # 服务态度 / 违规行为
    "manual",          # 运营手动登记的其它情况
)

PENALTY_SEVERITIES = (
    "warning",   # 仅警告, 不扣钱
    "fine",      # 罚款, 从下次结算扣除
    "suspend",   # 暂时下架
    "ban",       # 永久封禁
)


class Penalty(Base):
    __tablename__ = "pm_penalties"

    id = Column(Integer, primary_key=True, index=True)
    photographer_id = Column(
        Integer, ForeignKey("pm_photographers.id"), nullable=False, index=True
    )
    order_id = Column(
        Integer, ForeignKey("pm_orders.id"), nullable=True, index=True,
        comment="关联订单, 可为空(主动登记的处罚)"
    )

    type = Column(String(30), nullable=False, comment="reject/no_show/late_delivery/quality_complaint/behavior/manual")
    severity = Column(String(20), nullable=False, comment="warning/fine/suspend/ban")

    fine_amount = Column(Integer, default=0, comment="罚款金额(分), 从结算单扣")
    notes = Column(Text, nullable=True, comment="详细说明 / 客诉内容")

    operator_id = Column(
        Integer, ForeignKey("users.id"), nullable=True,
        comment="录入处罚的运营 user.id"
    )

    created_at = Column(DateTime, server_default=func.now())

    photographer = relationship("Photographer", backref="penalties")
    order = relationship("Order", foreign_keys=[order_id])
    operator = relationship("User", foreign_keys=[operator_id])
