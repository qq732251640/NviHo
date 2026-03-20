from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import io
from datetime import date

from app.database import get_db
from app.models.user import User
from app.models.grade import Grade
from app.models.subject import Subject
from app.schemas.grade import GradeCreate, GradeOut, BatchGradeCreate, GradeUpdate
from app.utils.auth import get_current_user
from app.utils.school import get_user_grade_level, filter_by_grade_level

router = APIRouter()


@router.post("/batch")
def batch_create_grades(data: BatchGradeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    gl = get_user_grade_level(db, current_user)
    created = []
    updated = []
    for item in data.grades:
        if item.score is None:
            continue
        subject = db.query(Subject).filter(Subject.id == item.subject_id).first()
        if not subject:
            continue

        existing = db.query(Grade).filter(
            Grade.student_id == current_user.id,
            Grade.subject_id == item.subject_id,
            Grade.exam_name == data.exam_name,
            Grade.exam_date == data.exam_date,
            Grade.grade_level == gl,
        ).first()

        if existing:
            existing.score = item.score
            existing.total_score = item.total_score
            updated.append(subject.name)
        else:
            grade = Grade(
                student_id=current_user.id,
                subject_id=item.subject_id,
                score=item.score,
                total_score=item.total_score,
                exam_name=data.exam_name,
                exam_date=data.exam_date,
                uploaded_by=current_user.id,
                grade_level=gl,
            )
            db.add(grade)
            created.append(subject.name)
    db.commit()
    return {"created": len(created), "updated": len(updated),
            "subjects": created + updated,
            "message": f"新增 {len(created)} 科，更新 {len(updated)} 科"}


@router.post("", response_model=GradeOut)
def create_grade(data: GradeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student_id = data.student_id if data.student_id else current_user.id

    if current_user.role == "student" and student_id != current_user.id:
        raise HTTPException(status_code=403, detail="学生只能上传自己的成绩")

    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()
    if not subject:
        raise HTTPException(status_code=400, detail="科目不存在")

    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=400, detail="学生不存在")

    gl = get_user_grade_level(db, current_user)

    grade = db.query(Grade).filter(
        Grade.student_id == student_id,
        Grade.subject_id == data.subject_id,
        Grade.exam_name == data.exam_name,
        Grade.exam_date == data.exam_date,
        Grade.grade_level == gl,
    ).first()

    if grade:
        grade.score = data.score
        grade.total_score = data.total_score
    else:
        grade = Grade(
            student_id=student_id,
            subject_id=data.subject_id,
            score=data.score,
            total_score=data.total_score,
            exam_name=data.exam_name,
            exam_date=data.exam_date,
            uploaded_by=current_user.id,
            grade_level=gl,
        )
        db.add(grade)
    db.commit()
    db.refresh(grade)

    return GradeOut(
        id=grade.id, student_id=grade.student_id, subject_id=grade.subject_id,
        score=grade.score, total_score=grade.total_score,
        exam_name=grade.exam_name, exam_date=grade.exam_date,
        student_name=student.real_name, student_no=student.student_no,
        subject_name=subject.name,
    )


@router.post("/batch-upload")
def batch_upload_grades(
    file: UploadFile = File(...),
    exam_name: str = Query(...),
    exam_date: date = Query(...),
    subject_id: int = Query(0),
    grade_name: str = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="只有教师可以批量上传")

    all_subjects_mode = subject_id == 0
    fixed_subject = None
    if not all_subjects_mode:
        fixed_subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not fixed_subject:
            raise HTTPException(status_code=400, detail="科目不存在")

    gl = get_user_grade_level(db, current_user)

    try:
        content = file.file.read()
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="文件解析失败，请检查文件格式")

    required_cols = {"student_name", "student_no", "score"}
    if all_subjects_mode:
        required_cols.add("subject")
    if not required_cols.issubset(set(df.columns)):
        raise HTTPException(status_code=400, detail=f"文件必须包含列: {required_cols}")

    created = 0
    updated = 0
    errors = []
    for _, row in df.iterrows():
        sno = str(row["student_no"]).strip()
        sname = str(row["student_name"]).strip()

        if all_subjects_mode:
            subj_name = str(row["subject"]).strip()
            subj = db.query(Subject).filter(Subject.name == subj_name, Subject.grade_level == gl).first()
            if not subj:
                subj = db.query(Subject).filter(Subject.name == subj_name).first()
            if not subj:
                errors.append(f"科目「{subj_name}」不存在（学号 {sno}）")
                continue
            cur_subject_id = subj.id
        else:
            cur_subject_id = fixed_subject.id

        student = db.query(User).filter(
            User.student_no == sno,
            User.school_id == current_user.school_id,
        ).first()

        if not student:
            student = User(
                username=f"auto_{sno}",
                password_hash="!auto_created",
                real_name=sname,
                student_no=sno,
                role="student",
                school_id=current_user.school_id,
                grade_name=grade_name or None,
            )
            db.add(student)
            db.flush()

        if grade_name and student.grade_name != grade_name:
            student.grade_name = grade_name

        existing = db.query(Grade).filter(
            Grade.student_id == student.id,
            Grade.subject_id == cur_subject_id,
            Grade.exam_name == exam_name,
            Grade.exam_date == exam_date,
            Grade.grade_level == gl,
        ).first()

        if existing:
            existing.score = float(row["score"])
            existing.total_score = float(row.get("total_score", 100))
            updated += 1
        else:
            grade = Grade(
                student_id=student.id,
                subject_id=cur_subject_id,
                score=float(row["score"]),
                total_score=float(row.get("total_score", 100)),
                exam_name=exam_name,
                exam_date=exam_date,
                uploaded_by=current_user.id,
                grade_level=gl,
            )
            db.add(grade)
            created += 1

    db.commit()
    return {
        "created": created,
        "updated": updated,
        "errors": errors,
        "message": f"新增 {created} 条，更新 {updated} 条" + (f"，{len(errors)} 条错误" if errors else ""),
    }


@router.get("", response_model=List[GradeOut])
def list_grades(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Grade)
    query = filter_by_grade_level(query, db, current_user)

    if current_user.role == "student":
        query = query.filter(Grade.student_id == current_user.id)
    elif student_id:
        query = query.filter(Grade.student_id == student_id)
    else:
        students = db.query(User).filter(User.school_id == current_user.school_id).all()
        student_ids = [s.id for s in students]
        query = query.filter(Grade.student_id.in_(student_ids))

    if subject_id:
        query = query.filter(Grade.subject_id == subject_id)
    if exam_name:
        query = query.filter(Grade.exam_name.ilike(f"%{exam_name}%"))

    grades = query.order_by(Grade.exam_date.desc()).all()
    results = []
    for g in grades:
        student = db.query(User).filter(User.id == g.student_id).first()
        subject = db.query(Subject).filter(Subject.id == g.subject_id).first()
        results.append(GradeOut(
            id=g.id, student_id=g.student_id, subject_id=g.subject_id,
            score=g.score, total_score=g.total_score,
            exam_name=g.exam_name, exam_date=g.exam_date,
            student_name=student.real_name if student else None,
            student_no=student.student_no if student else None,
            subject_name=subject.name if subject else None,
        ))
    return results


@router.get("/my", response_model=List[GradeOut])
def get_my_grades(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Grade).filter(Grade.student_id == current_user.id)
    query = filter_by_grade_level(query, db, current_user)

    grades = query.order_by(Grade.exam_date.desc()).all()
    results = []
    for g in grades:
        subject = db.query(Subject).filter(Subject.id == g.subject_id).first()
        results.append(GradeOut(
            id=g.id, student_id=g.student_id, subject_id=g.subject_id,
            score=g.score, total_score=g.total_score,
            exam_name=g.exam_name, exam_date=g.exam_date,
            student_name=current_user.real_name,
            student_no=current_user.student_no,
            subject_name=subject.name if subject else None,
        ))
    return results


@router.put("/{grade_id}", response_model=GradeOut)
def update_grade(grade_id: int, data: GradeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="成绩记录不存在")
    if current_user.role == "student" and grade.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能修改自己的成绩")
    if current_user.role == "teacher":
        student = db.query(User).filter(User.id == grade.student_id).first()
        if not student or student.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="只能修改本校学生的成绩")

    if data.score is not None:
        grade.score = data.score
    if data.total_score is not None:
        grade.total_score = data.total_score
    if data.exam_name is not None:
        grade.exam_name = data.exam_name
    if data.exam_date is not None:
        grade.exam_date = data.exam_date
    if data.subject_id is not None:
        grade.subject_id = data.subject_id

    db.commit()
    db.refresh(grade)

    student = db.query(User).filter(User.id == grade.student_id).first()
    subject = db.query(Subject).filter(Subject.id == grade.subject_id).first()
    return GradeOut(
        id=grade.id, student_id=grade.student_id, subject_id=grade.subject_id,
        score=grade.score, total_score=grade.total_score,
        exam_name=grade.exam_name, exam_date=grade.exam_date,
        student_name=student.real_name if student else None,
        student_no=student.student_no if student else None,
        subject_name=subject.name if subject else None,
    )


@router.delete("/{grade_id}")
def delete_grade(grade_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="成绩记录不存在")
    if current_user.role == "student" and grade.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能删除自己的成绩")
    if current_user.role == "teacher":
        student = db.query(User).filter(User.id == grade.student_id).first()
        if not student or student.school_id != current_user.school_id:
            raise HTTPException(status_code=403, detail="只能删除本校学生的成绩")

    db.delete(grade)
    db.commit()
    return {"message": "删除成功"}


@router.post("/batch-delete")
def batch_delete_grades(
    ids: List[int] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school_student_ids = {u.id for u in db.query(User).filter(User.school_id == current_user.school_id).all()}
    deleted = 0
    for gid in ids:
        grade = db.query(Grade).filter(Grade.id == gid).first()
        if not grade:
            continue
        if current_user.role == "student" and grade.student_id != current_user.id:
            continue
        if current_user.role == "teacher" and grade.student_id not in school_student_ids:
            continue
        db.delete(grade)
        deleted += 1
    db.commit()
    return {"deleted": deleted, "message": f"成功删除 {deleted} 条成绩"}
