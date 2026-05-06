"""审计日志: 涉钱 / 涉权操作留痕。

写入场景(由各业务路由按需调用 audit_service.log()):
  - 退款 (refund)
  - 处罚 (penalty)
  - 佣金率改动 (commission_change)
  - 拉黑 / 解封 (user_ban / user_unban)
  - 结算单状态变更 (settlement_change)
  - 系统配置改动 (config_change)
  - 协议版本切换 (agreement_change)
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class AuditLog(Base):
    __tablename__ = "pm_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(40), nullable=False, index=True, comment="如 refund/penalty/config_change")
    target_type = Column(String(40), nullable=True, comment="如 order/photographer/user")
    target_id = Column(Integer, nullable=True, index=True)
    summary = Column(String(300), nullable=True, comment="一句话摘要")
    details = Column(Text, nullable=True, comment="JSON 详情")

    created_at = Column(DateTime, server_default=func.now(), index=True)

    operator = relationship("User", foreign_keys=[operator_id])
