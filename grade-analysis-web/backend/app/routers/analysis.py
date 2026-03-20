from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import csv

from app.database import get_db
from app.models.user import User
from app.models.grade import Grade
from app.models.subject import Subject
from app.models.school import School
from app.models.analysis_report import AnalysisReport
from app.schemas.grade import (
    GradeStats, GradeDistribution, GradeRanking,
    GradeTrend, SubjectComparison, GradePrediction,
    StudentGradeDistribution,
)
from app.schemas.analysis import AnalysisReportOut, AnalysisRequest, ClassAnalysisRequest
from app.services import analysis_service
from app.services.gemini_service import generate_grade_analysis, generate_class_analysis
from app.utils.auth import get_current_user
from app.utils.school import get_user_grade_level
from app.utils.credits import check_and_consume

router = APIRouter()


@router.get("/stats", response_model=GradeStats)
def get_stats(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = student_id if current_user.role == "teacher" else current_user.id
    gl = get_user_grade_level(db, current_user)
    return analysis_service.get_stats(db, sid, subject_id, exam_name, current_user.school_id, gl)


@router.get("/distribution", response_model=List[GradeDistribution])
def get_distribution(
    subject_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    gl = get_user_grade_level(db, current_user)
    return analysis_service.get_distribution(db, subject_id, exam_name, current_user.school_id, gl)


@router.get("/my-distribution", response_model=List[StudentGradeDistribution])
def get_my_distribution(
    exam_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    gl = get_user_grade_level(db, current_user)
    return analysis_service.get_student_distribution(db, current_user.id, exam_name, gl)


@router.get("/ranking", response_model=List[GradeRanking])
def get_ranking(
    subject_id: int = Query(...),
    exam_name: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    gl = get_user_grade_level(db, current_user)
    return analysis_service.get_ranking(db, subject_id, exam_name, current_user.school_id, gl)


@router.get("/trends", response_model=List[GradeTrend])
def get_trends(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = student_id if current_user.role == "teacher" and student_id else current_user.id
    gl = get_user_grade_level(db, current_user)
    return analysis_service.get_trends(db, sid, subject_id, gl)


@router.get("/comparison", response_model=List[SubjectComparison])
def get_comparison(
    exam_name: str = Query(...),
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = student_id if current_user.role == "teacher" and student_id else current_user.id
    gl = get_user_grade_level(db, current_user)
    return analysis_service.get_comparison(db, sid, exam_name, current_user.school_id, gl)


@router.get("/prediction", response_model=List[GradePrediction])
def get_prediction(
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = student_id if current_user.role == "teacher" and student_id else current_user.id
    gl = get_user_grade_level(db, current_user)
    return analysis_service.get_prediction(db, sid, gl)


@router.post("/report", response_model=AnalysisReportOut)
def generate_report(
    req: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    feature = "student_report" if current_user.role == "teacher" else "report"
    check_and_consume(db, current_user, feature)

    sid = req.student_id if current_user.role == "teacher" and req.student_id else current_user.id
    student = db.query(User).filter(User.id == sid).first()
    gl = get_user_grade_level(db, current_user)

    query = db.query(Grade).filter(Grade.student_id == sid)
    if gl:
        query = query.filter(Grade.grade_level == gl)
    if req.subject_id:
        query = query.filter(Grade.subject_id == req.subject_id)
    if req.exam_name:
        query = query.filter(Grade.exam_name == req.exam_name)

    grades = query.order_by(Grade.exam_date.desc()).all()
    grades_data = []
    for g in grades:
        subject = db.query(Subject).filter(Subject.id == g.subject_id).first()
        grades_data.append({
            "exam_name": g.exam_name,
            "subject_name": subject.name if subject else "未知",
            "score": g.score,
            "total_score": g.total_score,
            "exam_date": g.exam_date.isoformat(),
        })

    content = generate_grade_analysis(student.real_name if student else "未知", grades_data)

    report = AnalysisReport(
        user_id=sid,
        report_type="grade_analysis",
        content=content,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/reports", response_model=List[AnalysisReportOut])
def list_reports(
    student_id: Optional[int] = None,
    report_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "teacher":
        user_ids = [current_user.id]
        if student_id:
            user_ids.append(student_id)
        query = db.query(AnalysisReport).filter(AnalysisReport.user_id.in_(user_ids))
    else:
        query = db.query(AnalysisReport).filter(AnalysisReport.user_id == current_user.id)

    if report_type:
        query = query.filter(AnalysisReport.report_type == report_type)

    return query.order_by(AnalysisReport.created_at.desc()).all()


@router.get("/exams")
def list_exams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    gl = get_user_grade_level(db, current_user)
    if current_user.role == "student":
        query = db.query(Grade.exam_name, Grade.exam_date).filter(Grade.student_id == current_user.id)
    else:
        student_ids = [u.id for u in db.query(User).filter(User.school_id == current_user.school_id).all()]
        query = db.query(Grade.exam_name, Grade.exam_date).filter(Grade.student_id.in_(student_ids))

    if gl:
        query = query.filter(Grade.grade_level == gl)

    exams = query.distinct().order_by(Grade.exam_date.desc()).all()
    return [{"exam_name": e[0], "exam_date": e[1].isoformat()} for e in exams]


@router.get("/students")
def list_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "teacher":
        return []
    students = db.query(User).filter(
        User.school_id == current_user.school_id,
        User.role == "student",
    ).order_by(User.real_name).all()
    return [{"id": s.id, "real_name": s.real_name, "student_no": s.student_no, "grade_name": s.grade_name} for s in students]


@router.get("/grade-names")
def list_grade_names(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """List distinct grade_name values (classes) for the teacher's school."""
    students = db.query(User.grade_name).filter(
        User.school_id == current_user.school_id,
        User.role == "student",
        User.grade_name != None,
    ).distinct().all()
    return [g[0] for g in students if g[0]]


@router.get("/upload-template")
def download_upload_template(mode: str = Query("all")):
    output = io.StringIO()
    writer = csv.writer(output)
    if mode == "single":
        writer.writerow(["student_name", "student_no", "score", "total_score"])
        writer.writerow(["张三", "2024001", "92", "100"])
        writer.writerow(["李四", "2024002", "85", "100"])
        writer.writerow(["王五", "2024003", "78", "100"])
    else:
        writer.writerow(["student_name", "student_no", "subject", "score", "total_score"])
        writer.writerow(["张三", "2024001", "语文", "92", "100"])
        writer.writerow(["张三", "2024001", "数学", "88", "100"])
        writer.writerow(["张三", "2024001", "英语", "95", "100"])
        writer.writerow(["李四", "2024002", "语文", "85", "100"])
        writer.writerow(["李四", "2024002", "数学", "78", "100"])
        writer.writerow(["李四", "2024002", "英语", "90", "100"])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=grade_upload_template_{mode}.csv"},
    )


@router.post("/class-report", response_model=AnalysisReportOut)
def generate_class_report(
    req: ClassAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_and_consume(db, current_user, "class_report")
    gl = get_user_grade_level(db, current_user)
    students_q = db.query(User).filter(
        User.school_id == current_user.school_id,
        User.role == "student",
    )
    if req.grade_name:
        students_q = students_q.filter(User.grade_name == req.grade_name)
    students = students_q.all()
    student_ids = [s.id for s in students]
    student_map = {s.id: s.real_name for s in students}

    query = db.query(Grade).filter(Grade.student_id.in_(student_ids))
    if gl:
        query = query.filter(Grade.grade_level == gl)
    if req.subject_id:
        query = query.filter(Grade.subject_id == req.subject_id)
    if req.exam_name:
        query = query.filter(Grade.exam_name == req.exam_name)

    grades = query.order_by(Grade.exam_date.desc()).all()
    grades_data = []
    for g in grades:
        subject = db.query(Subject).filter(Subject.id == g.subject_id).first()
        grades_data.append({
            "student_name": student_map.get(g.student_id, "未知"),
            "exam_name": g.exam_name,
            "subject_name": subject.name if subject else "未知",
            "score": g.score,
            "total_score": g.total_score,
        })

    class_label = req.grade_name or "全部班级"
    content = generate_class_analysis(class_label, grades_data, len(students))

    report = AnalysisReport(
        user_id=current_user.id,
        report_type="class_analysis",
        content=content,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
