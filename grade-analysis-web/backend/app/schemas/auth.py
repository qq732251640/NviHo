from pydantic import BaseModel
from typing import Optional


class UserRegister(BaseModel):
    username: str
    password: str
    real_name: str
    role: str  # student / teacher
    school_id: Optional[int] = None
    school_name: Optional[str] = None
    region_id: Optional[int] = None
    grade_level: Optional[str] = None
    grade_name: Optional[str] = None
    student_no: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class WxLoginRequest(BaseModel):
    code: str


class CompleteProfileRequest(BaseModel):
    real_name: str
    role: str  # student / teacher
    school_name: str
    region_id: int
    grade_level: str  # elementary / middle / high
    grade_name: Optional[str] = None
    student_no: Optional[str] = None


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserUpdateSchool(BaseModel):
    school_id: Optional[int] = None
    school_name: Optional[str] = None
    region_id: Optional[int] = None
    grade_level: Optional[str] = None
    grade_name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    real_name: str
    role: str
    school_id: int
    grade_name: Optional[str] = None
    student_no: Optional[str] = None
    school_name: Optional[str] = None
    grade_level: Optional[str] = None
    region_id: Optional[int] = None
    region_path: Optional[list[int]] = None
    credits: int = 0
    free_report_used: int = 0
    free_paper_used: int = 0
    free_class_report_used: int = 0
    free_student_report_used: int = 0
    is_profile_complete: bool = True

    class Config:
        from_attributes = True
