from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=False)
    grade_level = Column(String(20), nullable=False)  # elementary / middle / high

    region = relationship("Region", back_populates="schools")
    users = relationship("User", back_populates="school")
