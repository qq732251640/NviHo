from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    real_name = Column(String(100), nullable=False)
    student_no = Column(String(50), nullable=True, index=True)
    role = Column(String(20), nullable=False)  # student / teacher
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)
    grade_name = Column(String(50), nullable=True)  # e.g. 高一, 初二, 三年级
    credits = Column(Integer, default=0)
    free_report_used = Column(Integer, default=0)
    free_paper_used = Column(Integer, default=0)
    free_class_report_used = Column(Integer, default=0)
    free_student_report_used = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    wx_openid = Column(String(100), unique=True, nullable=True, index=True)
    is_profile_complete = Column(Integer, default=1)

    school = relationship("School", back_populates="users")
    grades = relationship("Grade", back_populates="student", foreign_keys="Grade.student_id")
    uploaded_grades = relationship("Grade", back_populates="uploader", foreign_keys="Grade.uploaded_by")
    exam_papers = relationship("ExamPaper", back_populates="uploader")
    analysis_reports = relationship("AnalysisReport", back_populates="user")
