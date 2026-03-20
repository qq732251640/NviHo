from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class GradeCreate(BaseModel):
    student_id: Optional[int] = None
    subject_id: int
    score: float
    total_score: float = 100.0
    exam_name: str
    exam_date: date


class GradeUpdate(BaseModel):
    score: Optional[float] = None
    total_score: Optional[float] = None
    exam_name: Optional[str] = None
    exam_date: Optional[date] = None
    subject_id: Optional[int] = None


class GradeItem(BaseModel):
    subject_id: int
    score: float
    total_score: float = 100.0


class BatchGradeCreate(BaseModel):
    exam_name: str
    exam_date: date
    grades: List[GradeItem]


class GradeOut(BaseModel):
    id: int
    student_id: int
    subject_id: int
    score: float
    total_score: float
    exam_name: str
    exam_date: date
    student_name: Optional[str] = None
    student_no: Optional[str] = None
    subject_name: Optional[str] = None

    class Config:
        from_attributes = True


class GradeStats(BaseModel):
    average: float
    highest: float
    lowest: float
    count: int
    subject_name: Optional[str] = None


class GradeDistribution(BaseModel):
    range_label: str
    count: int
    percentage: float


class StudentGradeDistribution(BaseModel):
    range_label: str
    subjects: List[str]
    count: int


class GradeRanking(BaseModel):
    rank: int
    student_name: str
    student_no: Optional[str] = None
    score: float
    subject_name: Optional[str] = None


class GradeTrend(BaseModel):
    exam_name: str
    exam_date: date
    score: float
    subject_name: Optional[str] = None


class SubjectComparison(BaseModel):
    subject_name: str
    score: float
    average: float


class GradePrediction(BaseModel):
    subject_name: str
    historical_scores: List[float]
    predicted_score: float
    exam_dates: List[str]


class SubjectOut(BaseModel):
    id: int
    name: str
    grade_level: str

    class Config:
        from_attributes = True
