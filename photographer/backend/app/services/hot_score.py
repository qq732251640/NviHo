"""摄影师热度算法。

每日凌晨定时任务调用 refresh_all() 重算所有摄影师的 hot_score。
公式: views * 0.1 + favorites * 1 + completed_orders * 5
       + good_reviews * 3 - bad_reviews * 3
MVP 期没接入埋点,先按 completed_orders + avg_rating 简单加权。
"""

from sqlalchemy.orm import Session

from app.models.photographer import Photographer


def refresh_all(db: Session) -> int:
    photographers = db.query(Photographer).filter(Photographer.status == "approved").all()
    for pgr in photographers:
        pgr.hot_score = compute(pgr)
    db.commit()
    return len(photographers)


def compute(pgr: Photographer) -> float:
    base = (pgr.completed_orders or 0) * 5
    rating_bonus = ((pgr.avg_rating or 0) - 3) * (pgr.review_count or 0) * 2
    return round(base + rating_bonus, 2)
