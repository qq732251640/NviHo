"""协议版本管理。

把 docs/agreements/*.md 内容入库, 支持后台多版本切换:
  - 同 type 只能有一个 is_current=1, 用户接受协议时必须使用当前版本
  - 老版本保留供历史订单查阅
"""
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.database import Base


AGREEMENT_TYPES = (
    "user",                  # 用户协议
    "photographer",          # 摄影师入驻协议
    "service_commitment",    # 服务承诺书
)


class Agreement(Base):
    __tablename__ = "pm_agreements"
    __table_args__ = (
        UniqueConstraint("type", "version", name="uq_agreement_type_version"),
    )

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(40), nullable=False, index=True)
    version = Column(String(20), nullable=False, comment="如 v1.0 / v1.1")
    title = Column(String(120), nullable=False)
    content_md = Column(Text, nullable=False)
    effective_date = Column(Date, nullable=False)
    is_current = Column(Integer, default=0, index=True, comment="是否为当前生效版本(同 type 仅一个=1)")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    operator = relationship("User", foreign_keys=[operator_id])
