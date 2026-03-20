from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Region(Base):
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    level = Column(String(20), nullable=False)  # province / city / district
    parent_id = Column(Integer, ForeignKey("regions.id"), nullable=True)

    parent = relationship("Region", remote_side=[id], backref="children")
    schools = relationship("School", back_populates="region")
