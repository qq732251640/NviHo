from sqlalchemy import Column, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Schedule(Base):
    """摄影师档期(按天)。"""
    __tablename__ = "pm_schedules"
    __table_args__ = (
        UniqueConstraint("photographer_id", "date", name="uq_pm_schedule_pgr_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    photographer_id = Column(Integer, ForeignKey("pm_photographers.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    status = Column(String(20), default="free", comment="free/partial/busy/blocked")
    price_adjust = Column(Integer, default=0, comment="加价金额(元),节假日可正可负")
    note = Column(String(200), nullable=True)

    photographer = relationship("Photographer", back_populates="schedules")
