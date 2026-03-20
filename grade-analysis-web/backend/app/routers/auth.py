from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.school import School
from app.models.region import Region
from app.schemas.auth import UserRegister, UserLogin, Token, UserOut, UserUpdateSchool
from app.utils.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_current_user,
)

router = APIRouter()


def _get_region_path(db: Session, region_id: int) -> list[int]:
    path = []
    current = db.query(Region).filter(Region.id == region_id).first()
    while current:
        path.insert(0, current.id)
        if current.parent_id:
            current = db.query(Region).filter(Region.id == current.parent_id).first()
        else:
            break
    return path


def _build_user_out(user: User, school: School, db: Session) -> UserOut:
    region_id = school.region_id if school else None
    region_path = _get_region_path(db, region_id) if region_id else None
    return UserOut(
        id=user.id,
        username=user.username,
        real_name=user.real_name,
        role=user.role,
        school_id=user.school_id,
        grade_name=user.grade_name,
        student_no=user.student_no,
        school_name=school.name if school else None,
        grade_level=school.grade_level if school else None,
        region_id=region_id,
        region_path=region_path,
        credits=user.credits or 0,
        free_report_used=user.free_report_used or 0,
        free_paper_used=user.free_paper_used or 0,
        free_class_report_used=user.free_class_report_used or 0,
        free_student_report_used=user.free_student_report_used or 0,
    )


@router.post("/register", response_model=UserOut)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")

    if data.role == "student" and not data.student_no:
        raise HTTPException(status_code=400, detail="学生必须填写学号")

    # Resolve school: use school_id if provided, otherwise auto-create by school_name
    school = None
    if data.school_id:
        school = db.query(School).filter(School.id == data.school_id).first()
        if not school:
            raise HTTPException(status_code=400, detail="学校不存在")
    elif data.school_name:
        if not data.region_id:
            raise HTTPException(status_code=400, detail="自定义学校需选择所在地区")
        if not data.grade_level:
            raise HTTPException(status_code=400, detail="自定义学校需选择学段")
        region = db.query(Region).filter(Region.id == data.region_id).first()
        if not region:
            raise HTTPException(status_code=400, detail="地区不存在")
        school = db.query(School).filter(
            School.name == data.school_name,
            School.region_id == data.region_id,
            School.grade_level == data.grade_level,
        ).first()
        if not school:
            school = School(name=data.school_name, region_id=data.region_id, grade_level=data.grade_level)
            db.add(school)
            db.flush()
    else:
        raise HTTPException(status_code=400, detail="请选择学校或输入学校名称")

    if data.student_no:
        existing = db.query(User).filter(
            User.student_no == data.student_no,
            User.school_id == school.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="该学校已存在相同学号")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        real_name=data.real_name,
        role=data.role,
        school_id=school.id,
        grade_name=data.grade_name,
        student_no=data.student_no,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _build_user_out(user, school, db)


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == current_user.school_id).first()
    return _build_user_out(current_user, school, db)


@router.put("/switch-role", response_model=UserOut)
def switch_role(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.role = "teacher" if current_user.role == "student" else "student"
    db.commit()
    db.refresh(current_user)
    school = db.query(School).filter(School.id == current_user.school_id).first()
    return _build_user_out(current_user, school, db)


@router.put("/update-school", response_model=UserOut)
def update_school(data: UserUpdateSchool, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school = None
    if data.school_id:
        school = db.query(School).filter(School.id == data.school_id).first()
        if not school:
            raise HTTPException(status_code=400, detail="学校不存在")
    elif data.school_name and data.region_id and data.grade_level:
        school = db.query(School).filter(
            School.name == data.school_name,
            School.region_id == data.region_id,
            School.grade_level == data.grade_level,
        ).first()
        if not school:
            school = School(name=data.school_name, region_id=data.region_id, grade_level=data.grade_level)
            db.add(school)
            db.flush()
    elif data.grade_level:
        old_school = db.query(School).filter(School.id == current_user.school_id).first()
        if old_school and old_school.grade_level != data.grade_level:
            school = db.query(School).filter(
                School.name == old_school.name,
                School.region_id == old_school.region_id,
                School.grade_level == data.grade_level,
            ).first()
            if not school:
                school = School(name=old_school.name, region_id=old_school.region_id, grade_level=data.grade_level)
                db.add(school)
                db.flush()

    if school:
        current_user.school_id = school.id
    if data.grade_name is not None:
        current_user.grade_name = data.grade_name
    db.commit()
    db.refresh(current_user)

    school = db.query(School).filter(School.id == current_user.school_id).first()
    return _build_user_out(current_user, school, db)


@router.post("/recharge", response_model=UserOut)
def recharge(amount: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="充值次数必须大于0")
    current_user.credits = (current_user.credits or 0) + amount
    db.commit()
    db.refresh(current_user)
    school = db.query(School).filter(School.id == current_user.school_id).first()
    return _build_user_out(current_user, school, db)


@router.get("/credits")
def get_credits(current_user: User = Depends(get_current_user)):
    FREE_LIMIT = 2
    credits = current_user.credits or 0
    if current_user.role == "student":
        report_free = max(0, FREE_LIMIT - (current_user.free_report_used or 0))
        paper_free = max(0, FREE_LIMIT - (current_user.free_paper_used or 0))
        return {
            "credits": credits,
            "report_free_remaining": report_free,
            "paper_free_remaining": paper_free,
            "report_available": report_free > 0 or credits > 0,
            "paper_available": paper_free > 0 or credits > 0,
        }
    else:
        class_free = max(0, FREE_LIMIT - (current_user.free_class_report_used or 0))
        student_free = max(0, FREE_LIMIT - (current_user.free_student_report_used or 0))
        return {
            "credits": credits,
            "class_report_free_remaining": class_free,
            "student_report_free_remaining": student_free,
            "class_report_available": class_free > 0 or credits > 0,
            "student_report_available": student_free > 0 or credits > 0,
        }
