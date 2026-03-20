from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import numpy as np

from app.models.grade import Grade
from app.models.user import User
from app.models.subject import Subject
from app.schemas.grade import (
    GradeStats, GradeDistribution, GradeRanking,
    GradeTrend, SubjectComparison, GradePrediction,
    StudentGradeDistribution,
)


def _apply_gl(query, gl: Optional[str]):
    if gl:
        query = query.filter(Grade.grade_level == gl)
    return query


def get_stats(db: Session, student_id: Optional[int], subject_id: Optional[int],
              exam_name: Optional[str], school_id: Optional[int] = None,
              grade_level: Optional[str] = None) -> GradeStats:
    query = db.query(Grade)
    query = _apply_gl(query, grade_level)
    if student_id:
        query = query.filter(Grade.student_id == student_id)
    if subject_id:
        query = query.filter(Grade.subject_id == subject_id)
    if exam_name:
        query = query.filter(Grade.exam_name == exam_name)
    if school_id and not student_id:
        student_ids = [u.id for u in db.query(User).filter(User.school_id == school_id).all()]
        query = query.filter(Grade.student_id.in_(student_ids))

    result = query.with_entities(
        func.avg(Grade.score).label("avg"),
        func.max(Grade.score).label("max"),
        func.min(Grade.score).label("min"),
        func.count(Grade.id).label("cnt"),
    ).first()

    subject_name = None
    if subject_id:
        subj = db.query(Subject).filter(Subject.id == subject_id).first()
        subject_name = subj.name if subj else None

    return GradeStats(
        average=round(float(result.avg or 0), 2),
        highest=float(result.max or 0),
        lowest=float(result.min or 0),
        count=int(result.cnt or 0),
        subject_name=subject_name,
    )


def get_distribution(db: Session, subject_id: Optional[int], exam_name: Optional[str],
                     school_id: Optional[int] = None,
                     grade_level: Optional[str] = None) -> List[GradeDistribution]:
    query = db.query(Grade)
    query = _apply_gl(query, grade_level)
    if subject_id:
        query = query.filter(Grade.subject_id == subject_id)
    if exam_name:
        query = query.filter(Grade.exam_name == exam_name)
    if school_id:
        student_ids = [u.id for u in db.query(User).filter(User.school_id == school_id).all()]
        query = query.filter(Grade.student_id.in_(student_ids))

    scores = [g.score for g in query.all()]
    total = len(scores) if scores else 1

    ranges = [
        ("0-59", 0, 59),
        ("60-69", 60, 69),
        ("70-79", 70, 79),
        ("80-89", 80, 89),
        ("90-100", 90, 100),
    ]
    result = []
    for label, low, high in ranges:
        count = sum(1 for s in scores if low <= s <= high)
        result.append(GradeDistribution(
            range_label=label, count=count, percentage=round(count / total * 100, 1)
        ))
    return result


def get_student_distribution(db: Session, student_id: int,
                              exam_name: Optional[str] = None,
                              grade_level: Optional[str] = None) -> List[StudentGradeDistribution]:
    query = db.query(Grade).filter(Grade.student_id == student_id)
    query = _apply_gl(query, grade_level)
    if exam_name:
        query = query.filter(Grade.exam_name == exam_name)
    grades = query.all()

    ranges = [
        ("0-59 不及格", 0, 59),
        ("60-69 及格", 60, 69),
        ("70-79 中等", 70, 79),
        ("80-89 良好", 80, 89),
        ("90-100 优秀", 90, 100),
    ]
    result = []
    for label, low, high in ranges:
        matched = [g for g in grades if low <= g.score <= high]
        subject_names = []
        for g in matched:
            subj = db.query(Subject).filter(Subject.id == g.subject_id).first()
            name = subj.name if subj else "未知"
            subject_names.append(f"{name}({g.score}分)")
        result.append(StudentGradeDistribution(
            range_label=label, subjects=subject_names, count=len(matched)
        ))
    return result


def get_ranking(db: Session, subject_id: int, exam_name: str,
                school_id: int, grade_level: Optional[str] = None) -> List[GradeRanking]:
    student_ids = [u.id for u in db.query(User).filter(User.school_id == school_id).all()]
    query = db.query(Grade).filter(
        Grade.subject_id == subject_id,
        Grade.exam_name == exam_name,
        Grade.student_id.in_(student_ids),
    )
    query = _apply_gl(query, grade_level)
    grades = query.order_by(Grade.score.desc()).all()

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    result = []
    for i, g in enumerate(grades, 1):
        student = db.query(User).filter(User.id == g.student_id).first()
        result.append(GradeRanking(
            rank=i,
            student_name=student.real_name if student else "未知",
            student_no=student.student_no if student else None,
            score=g.score,
            subject_name=subject.name if subject else None,
        ))
    return result


def get_trends(db: Session, student_id: int, subject_id: Optional[int] = None,
               grade_level: Optional[str] = None) -> List[GradeTrend]:
    query = db.query(Grade).filter(Grade.student_id == student_id)
    query = _apply_gl(query, grade_level)
    if subject_id:
        query = query.filter(Grade.subject_id == subject_id)

    grades = query.order_by(Grade.exam_date.asc()).all()
    result = []
    for g in grades:
        subject = db.query(Subject).filter(Subject.id == g.subject_id).first()
        result.append(GradeTrend(
            exam_name=g.exam_name, exam_date=g.exam_date, score=g.score,
            subject_name=subject.name if subject else None,
        ))
    return result


def get_comparison(db: Session, student_id: int, exam_name: str,
                   school_id: int, grade_level: Optional[str] = None) -> List[SubjectComparison]:
    query = db.query(Grade).filter(
        Grade.student_id == student_id,
        Grade.exam_name == exam_name,
    )
    query = _apply_gl(query, grade_level)
    student_grades = query.all()

    student_ids = [u.id for u in db.query(User).filter(User.school_id == school_id).all()]

    result = []
    for g in student_grades:
        avg_q = db.query(func.avg(Grade.score)).filter(
            Grade.subject_id == g.subject_id,
            Grade.exam_name == exam_name,
            Grade.student_id.in_(student_ids),
        )
        avg_q = _apply_gl(avg_q, grade_level)
        avg_score = avg_q.scalar() or 0

        subject = db.query(Subject).filter(Subject.id == g.subject_id).first()
        result.append(SubjectComparison(
            subject_name=subject.name if subject else "未知",
            score=g.score,
            average=round(float(avg_score), 2),
        ))
    return result


def get_prediction(db: Session, student_id: int,
                   grade_level: Optional[str] = None) -> List[GradePrediction]:
    subj_query = db.query(Grade.subject_id).filter(Grade.student_id == student_id)
    subj_query = _apply_gl(subj_query, grade_level)
    subjects = subj_query.distinct().all()

    results = []
    for (subject_id,) in subjects:
        query = db.query(Grade).filter(
            Grade.student_id == student_id,
            Grade.subject_id == subject_id,
        )
        query = _apply_gl(query, grade_level)
        grades = query.order_by(Grade.exam_date.asc()).all()

        if len(grades) < 2:
            continue

        scores = [g.score for g in grades]
        dates = [g.exam_date.isoformat() for g in grades]
        x = np.arange(len(scores)).reshape(-1, 1)
        y = np.array(scores)

        from sklearn.linear_model import LinearRegression
        model = LinearRegression()
        model.fit(x, y)
        predicted = float(model.predict([[len(scores)]])[0])
        predicted = max(0, min(predicted, grades[0].total_score or 100))

        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        results.append(GradePrediction(
            subject_name=subject.name if subject else "未知",
            historical_scores=scores,
            predicted_score=round(predicted, 1),
            exam_dates=dates,
        ))
    return results
