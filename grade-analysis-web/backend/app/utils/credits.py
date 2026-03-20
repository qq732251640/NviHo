from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.user import User

FREE_LIMIT = 2

FEATURE_LABELS = {
    "report": "成绩分析报告",
    "paper": "试卷分析",
    "class_report": "班级报告",
    "student_report": "学生报告",
}


def check_and_consume(db: Session, user: User, feature: str):
    free_field = f"free_{feature}_used"
    free_used = getattr(user, free_field, 0) or 0
    credits = user.credits or 0

    if free_used < FREE_LIMIT:
        setattr(user, free_field, free_used + 1)
        db.flush()
        return "free"
    elif credits > 0:
        user.credits = credits - 1
        db.flush()
        return "paid"
    else:
        label = FEATURE_LABELS.get(feature, feature)
        raise HTTPException(
            status_code=403,
            detail=f"{label}免费次数已用完（{FREE_LIMIT}次），请充值后使用。",
        )
