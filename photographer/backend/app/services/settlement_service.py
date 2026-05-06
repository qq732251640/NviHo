"""结算单生成服务。

按周期(默认 7 天)聚合每个有完成订单的摄影师, 生成 Settlement 记录:
  - gross = 该周期内已完成订单总额
  - commission = 抽佣合计
  - refund = 该周期内发生的退款合计(含部分退款)
  - penalty = 该周期内 fine 类处罚合计
  - net_payout = gross - commission - refund - penalty

只统计 status in (auto_settled, settled, reviewed) 且 confirmed_at / completed_at 在周期内的订单。
重复运行同周期会跳过已存在的(period_start + period_end + photographer_id 唯一)。
"""
from __future__ import annotations

from datetime import date, datetime, time
from typing import Iterable

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models.order import Order, OrderStatus
from app.models.payment import Payment
from app.models.penalty import Penalty
from app.models.photographer import Photographer
from app.models.settlement import Settlement


COMPLETED_STATUSES = (
    OrderStatus.REVIEWED.value,
    OrderStatus.AUTO_SETTLED.value,
    OrderStatus.SETTLED.value,
)


def _settled_anchor(o: Order) -> datetime | None:
    return o.confirmed_at or o.completed_at or o.delivery_at


def generate_settlements(
    db: Session,
    period_start: date,
    period_end: date,
    operator_id: int | None = None,
) -> list[Settlement]:
    """生成该周期所有摄影师的结算单。返回新建的 Settlement 列表。"""
    if period_end < period_start:
        raise ValueError("period_end 早于 period_start")

    start_dt = datetime.combine(period_start, time.min)
    end_dt = datetime.combine(period_end, time.max)

    # 列出周期内有完成订单的摄影师 id
    pgr_ids = [
        row[0]
        for row in db.query(Order.photographer_id)
        .filter(
            Order.status.in_(COMPLETED_STATUSES),
            and_(Order.confirmed_at >= start_dt, Order.confirmed_at <= end_dt),
        )
        .group_by(Order.photographer_id)
        .all()
    ]

    new_settlements: list[Settlement] = []
    for pid in pgr_ids:
        # 该周期未生成过才建
        existing = (
            db.query(Settlement)
            .filter(
                Settlement.photographer_id == pid,
                Settlement.period_start == period_start,
                Settlement.period_end == period_end,
            )
            .first()
        )
        if existing:
            continue

        orders = (
            db.query(Order)
            .filter(
                Order.photographer_id == pid,
                Order.status.in_(COMPLETED_STATUSES),
                Order.confirmed_at >= start_dt,
                Order.confirmed_at <= end_dt,
            )
            .all()
        )

        gross = sum((o.amount_total or 0) for o in orders)
        commission = sum((o.commission or 0) for o in orders)

        # 周期内发生的退款(以 refunded_at 为准)
        refund_total = (
            db.query(func.coalesce(func.sum(Payment.amount), 0))
            .join(Order, Payment.order_id == Order.id)
            .filter(
                Order.photographer_id == pid,
                Payment.type == "refund",
                Payment.created_at >= start_dt,
                Payment.created_at <= end_dt,
            )
            .scalar()
            or 0
        )

        # 周期内未结算的 fine 类处罚
        # 简化: 只看 created_at 在该周期内, 后续可以加 settlement_id 把每条罚款挂到结算单上
        penalty_total = (
            db.query(func.coalesce(func.sum(Penalty.fine_amount), 0))
            .filter(
                Penalty.photographer_id == pid,
                Penalty.severity == "fine",
                Penalty.created_at >= start_dt,
                Penalty.created_at <= end_dt,
            )
            .scalar()
            or 0
        )

        net_payout = max(0, gross - commission - refund_total - penalty_total)

        s = Settlement(
            photographer_id=pid,
            period_start=period_start,
            period_end=period_end,
            order_count=len(orders),
            gross_amount=gross,
            commission_total=commission,
            refund_total=int(refund_total),
            penalty_total=int(penalty_total),
            net_payout=net_payout,
            status="pending",
            operator_id=operator_id,
        )
        db.add(s)
        new_settlements.append(s)

    db.flush()
    return new_settlements
