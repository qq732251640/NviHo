from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    score = Column(Float, nullable=False)
    total_score = Column(Float, default=100.0)
    exam_name = Column(String(200), nullable=False)
    exam_date = Column(Date, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    grade_level = Column(String(20), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("User", back_populates="grades", foreign_keys=[student_id])
    uploader = relationship("User", back_populates="uploaded_grades", foreign_keys=[uploaded_by])
    subject = relationship("Subject", back_populates="grades")
