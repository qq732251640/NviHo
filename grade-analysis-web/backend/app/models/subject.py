from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    grade_level = Column(String(20), nullable=False)  # elementary / middle / high

    grades = relationship("Grade", back_populates="subject")
