from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.region import Region
from app.models.school import School
from app.models.user import User
from app.schemas.school import RegionOut, RegionTree, SchoolCreate, SchoolOut
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/regions", response_model=List[RegionOut])
def list_regions(level: Optional[str] = None, parent_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Region)
    if level:
        query = query.filter(Region.level == level)
    if parent_id is not None:
        query = query.filter(Region.parent_id == parent_id)
    return query.order_by(Region.name).all()


@router.get("/regions/tree", response_model=List[RegionTree])
def get_region_tree(db: Session = Depends(get_db)):
    provinces = db.query(Region).filter(Region.level == "province").order_by(Region.name).all()
    result = []
    for prov in provinces:
        cities = db.query(Region).filter(Region.parent_id == prov.id).order_by(Region.name).all()
        city_list = []
        for city in cities:
            districts = db.query(Region).filter(Region.parent_id == city.id).order_by(Region.name).all()
            city_list.append(RegionTree(
                id=city.id, name=city.name, level=city.level,
                children=[RegionTree(id=d.id, name=d.name, level=d.level) for d in districts]
            ))
        result.append(RegionTree(id=prov.id, name=prov.name, level=prov.level, children=city_list))
    return result


@router.get("", response_model=List[SchoolOut])
def list_schools(
    region_id: Optional[int] = None,
    grade_level: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("name", pattern="^(name|id)$"),
    db: Session = Depends(get_db),
):
    query = db.query(School)
    if region_id:
        query = query.filter(School.region_id == region_id)
    if grade_level:
        query = query.filter(School.grade_level == grade_level)
    if search:
        query = query.filter(School.name.ilike(f"%{search}%"))

    if sort_by == "name":
        query = query.order_by(School.name)
    else:
        query = query.order_by(School.id)

    schools = query.all()
    results = []
    for s in schools:
        region = db.query(Region).filter(Region.id == s.region_id).first()
        results.append(SchoolOut(
            id=s.id, name=s.name, region_id=s.region_id,
            grade_level=s.grade_level,
            region_name=region.name if region else None,
        ))
    return results


@router.post("", response_model=SchoolOut)
def create_school(data: SchoolCreate, db: Session = Depends(get_db)):
    region = db.query(Region).filter(Region.id == data.region_id).first()
    if not region:
        raise HTTPException(status_code=400, detail="区域不存在")

    school = School(name=data.name, region_id=data.region_id, grade_level=data.grade_level)
    db.add(school)
    db.commit()
    db.refresh(school)
    return SchoolOut(
        id=school.id, name=school.name, region_id=school.region_id,
        grade_level=school.grade_level, region_name=region.name,
    )


@router.get("/subjects")
def list_subjects(grade_level: Optional[str] = None, db: Session = Depends(get_db)):
    from app.models.subject import Subject
    query = db.query(Subject)
    if grade_level:
        query = query.filter(Subject.grade_level == grade_level)
    return query.order_by(Subject.name).all()


@router.get("/my-subjects")
def list_my_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.subject import Subject
    school = db.query(School).filter(School.id == current_user.school_id).first()
    gl = school.grade_level if school else None
    query = db.query(Subject)
    if gl:
        query = query.filter(Subject.grade_level == gl)
    subjects = query.all()

    order = SUBJECT_ORDER.get(gl, [])
    order_map = {name: i for i, name in enumerate(order)}
    subjects.sort(key=lambda s: order_map.get(s.name, 999))

    result = []
    for s in subjects:
        total = DEFAULT_TOTAL_SCORES.get(gl, {}).get(s.name, 100)
        result.append({"id": s.id, "name": s.name, "grade_level": s.grade_level, "default_total_score": total})
    return result


SUBJECT_ORDER = {
    "elementary": ["语文", "数学", "英语", "科学", "道德与法治", "体育", "音乐", "美术"],
    "middle": ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "道德与法治", "体育"],
    "high": ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治", "体育"],
}


DEFAULT_TOTAL_SCORES = {
    "elementary": {
        "语文": 100, "数学": 100, "英语": 100, "科学": 100,
        "道德与法治": 100, "体育": 100, "音乐": 100, "美术": 100,
    },
    "middle": {
        "语文": 120, "数学": 120, "英语": 120, "物理": 100,
        "化学": 100, "生物": 100, "历史": 100, "地理": 100,
        "道德与法治": 100, "体育": 100,
    },
    "high": {
        "语文": 150, "数学": 150, "英语": 150, "物理": 110,
        "化学": 100, "生物": 100, "历史": 100, "地理": 100,
        "政治": 100, "体育": 100,
    },
}
