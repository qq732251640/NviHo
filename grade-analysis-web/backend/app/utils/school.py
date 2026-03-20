from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.school import School
from app.models.grade import Grade


def get_user_grade_level(db: Session, user: User) -> Optional[str]:
    school = db.query(School).filter(School.id == user.school_id).first()
    return school.grade_level if school else None


def filter_by_grade_level(query, db: Session, user: User):
    gl = get_user_grade_level(db, user)
    if gl:
        query = query.filter(Grade.grade_level == gl)
    return query
