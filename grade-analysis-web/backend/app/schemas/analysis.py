from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AnalysisReportOut(BaseModel):
    id: int
    user_id: int
    report_type: str
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnalysisRequest(BaseModel):
    student_id: Optional[int] = None
    subject_id: Optional[int] = None
    exam_name: Optional[str] = None


class ClassAnalysisRequest(BaseModel):
    grade_name: Optional[str] = None
    subject_id: Optional[int] = None
    exam_name: Optional[str] = None
