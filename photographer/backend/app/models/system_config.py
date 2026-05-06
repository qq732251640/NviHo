"""平台运行时配置, 后台可热改, 不需要重启 / 改 .env。

key 是字符串, value 是 JSON 字符串(便于存数字/布尔/列表)。
读取通过 app.services.config_service.get_config(key, default)。
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class SystemConfig(Base):
    __tablename__ = "pm_system_configs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(80), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False, comment="JSON 字符串")
    description = Column(String(200), nullable=True)

    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    operator = relationship("User", foreign_keys=[updated_by])
