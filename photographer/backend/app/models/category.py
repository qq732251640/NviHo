from sqlalchemy import Column, Integer, String

from app.database import Base


class Category(Base):
    """活儿类型字典:婚礼/跟拍/生日/写真/全家福/儿童/孕妇/商务 等。"""
    __tablename__ = "pm_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    name = Column(String(30), nullable=False)
    icon = Column(String(200), nullable=True)
    sort = Column(Integer, default=0)
