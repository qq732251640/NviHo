import json
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models.order import Order, OrderStatus
from app.models.package import Package
from app.models.payment import Payment
from app.models.photographer import Photographer
from app.models.review import Review
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.order import (
    OrderCompleteRequest,
    OrderCreate,
    OrderDeliverRequest,
    OrderDetail,
    OrderListItem,
    OrderRejectRequest,
    OrderReviewRequest,
    WxPayPrepay,
)
from app.services.wxpay import create_jsapi_order
from app.utils.order_no import gen_order_no

router = APIRouter()
settings = get_settings()


def _to_list_item(o: Order) -> OrderListItem:
    return OrderListItem(
        id=o.id,
        order_no=o.order_no,
        photographer_id=o.photographer_id,
        photographer_nickname=o.photographer.nickname if o.photographer else None,
        photographer_avatar=o.photographer.avatar if o.photographer else None,
        package_name=o.package.name if o.package else None,
        shoot_date=o.shoot_date,
        location=o.location,
        amount_total=o.amount_total,
        status=o.status,
        created_at=o.created_at,
    )


DELIVERY_UNLOCKED_STATUSES = {
    OrderStatus.REVIEWED.value,
    OrderStatus.AUTO_SETTLED.value,
    OrderStatus.SETTLED.value,
}


def _to_detail(o: Order, viewer: User) -> OrderDetail:
    is_photographer = (
        o.photographer
        and o.photographer.user_id == viewer.id
    )
    is_buyer = o.user_id == viewer.id
    is_admin = viewer.pm_role == "admin"
    if not (is_photographer or is_buyer or is_admin):
        raise HTTPException(status_code=403, detail="无权查看此订单")

    pgr_phone = None
    if o.status in (
        OrderStatus.ACCEPTED.value,
        OrderStatus.SHOOTING_DONE.value,
        OrderStatus.REVIEWED.value,
        OrderStatus.AUTO_SETTLED.value,
        OrderStatus.SETTLED.value,
    ):
        pgr_phone = o.photographer.contact_phone if o.photographer else None

    # 解析 delivery_preview_images JSON
    preview_images: list[str] = []
    if o.delivery_preview_images:
        try:
            preview_images = json.loads(o.delivery_preview_images)
        except Exception:
            preview_images = []

    # 决定 delivery_url / delivery_password 是否对调用方可见
    # 摄影师本人和管理员: 总是可见
    # 用户(买家): 只在订单进入 reviewed/auto_settled/settled 后可见
    delivery_unlocked = (
        is_photographer
        or is_admin
        or o.status in DELIVERY_UNLOCKED_STATUSES
    )
    delivery_url = o.delivery_url if delivery_unlocked else None
    delivery_password = o.delivery_password if delivery_unlocked else None

    return OrderDetail(
        id=o.id,
        order_no=o.order_no,
        user_id=o.user_id,
        user_nickname=o.user.nickname if o.user else None,
        photographer_id=o.photographer_id,
        photographer_nickname=o.photographer.nickname if o.photographer else None,
        photographer_avatar=o.photographer.avatar if o.photographer else None,
        photographer_phone=pgr_phone,
        package_id=o.package_id,
        package_name=o.package.name if o.package else None,
        package_description=o.package.description if o.package else None,
        shoot_date=o.shoot_date,
        location=o.location,
        requirements=o.requirements,
        contact_name=o.contact_name,
        contact_phone=o.contact_phone,
        amount_total=o.amount_total,
        commission=o.commission,
        commission_rate=o.commission_rate,
        status=o.status,
        reject_reason=o.reject_reason,
        delivery_preview_images=preview_images,
        delivery_url=delivery_url,
        delivery_password=delivery_password,
        delivery_note=o.delivery_note,
        delivery_at=o.delivery_at,
        delivery_unlocked=bool(delivery_unlocked and o.delivery_url),
        created_at=o.created_at,
        paid_at=o.paid_at,
        accepted_at=o.accepted_at,
        completed_at=o.completed_at,
        confirmed_at=o.confirmed_at,
        settled_at=o.settled_at,
    )


@router.post("", response_model=OrderDetail)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.shoot_date < date.today():
        raise HTTPException(status_code=400, detail="拍摄日期不能早于今天")

    pkg = (
        db.query(Package)
        .filter(
            Package.id == data.package_id,
            Package.photographer_id == data.photographer_id,
            Package.is_active == 1,
        )
        .first()
    )
    if not pkg:
        raise HTTPException(status_code=404, detail="套餐不存在或已下架")

    pgr = (
        db.query(Photographer)
        .filter(Photographer.id == data.photographer_id, Photographer.status == "approved")
        .first()
    )
    if not pgr:
        raise HTTPException(status_code=404, detail="摄影师不存在或未上架")

    if pgr.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能给自己下单")

    order = Order(
        order_no=gen_order_no(),
        user_id=current_user.id,
        photographer_id=data.photographer_id,
        package_id=data.package_id,
        category_id=pkg.category_id,
        shoot_date=data.shoot_date,
        location=data.location,
        requirements=data.requirements,
        contact_name=data.contact_name or current_user.nickname,
        contact_phone=data.contact_phone or current_user.pm_phone,
        amount_total=pkg.price,
        commission_rate=settings.DEFAULT_COMMISSION_RATE,
        commission=int(pkg.price * settings.DEFAULT_COMMISSION_RATE),
        status=OrderStatus.PENDING_PAY.value,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _to_detail(order, current_user)


@router.get("", response_model=list[OrderListItem])
def list_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    role: str = "buyer",
    status: str | None = None,
):
    q = db.query(Order).options(
        selectinload(Order.photographer),
        selectinload(Order.package),
    )

    if role == "buyer":
        q = q.filter(Order.user_id == current_user.id)
    elif role == "photographer":
        if not current_user.photographer:
            return []
        q = q.filter(Order.photographer_id == current_user.photographer.id)
    else:
        raise HTTPException(status_code=400, detail="role 只能是 buyer 或 photographer")

    if status:
        q = q.filter(Order.status == status)

    rows = q.order_by(desc(Order.created_at)).limit(100).all()
    return [_to_list_item(o) for o in rows]


@router.get("/{order_id}", response_model=OrderDetail)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    o = (
        db.query(Order)
        .options(selectinload(Order.photographer), selectinload(Order.package), selectinload(Order.user))
        .filter(Order.id == order_id)
        .first()
    )
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    return _to_detail(o, current_user)


@router.post("/{order_id}/prepay", response_model=WxPayPrepay)
def prepay(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    o = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if o.status != OrderStatus.PENDING_PAY.value:
        raise HTTPException(status_code=400, detail="订单状态不允许支付")
    timeout_at = o.created_at + timedelta(minutes=settings.PAY_TIMEOUT_MINUTES)
    if datetime.utcnow() > timeout_at:
        o.status = OrderStatus.CANCELLED.value
        o.cancelled_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=400, detail="订单已超时取消")

    params = create_jsapi_order(o, current_user.wx_openid or "")
    return WxPayPrepay(**{k: v for k, v in params.items() if k != "mock"})


@router.post("/{order_id}/mock-pay", response_model=OrderDetail)
def mock_pay(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """开发期模拟支付成功(微信支付未对接前用)。生产环境应关闭。"""
    o = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if o.status != OrderStatus.PENDING_PAY.value:
        raise HTTPException(status_code=400, detail="订单状态不允许支付")
    o.status = OrderStatus.PENDING_CONFIRM.value
    o.paid_at = datetime.utcnow()
    db.add(
        Payment(
            order_id=o.id,
            type="pay",
            amount=o.amount_total,
            wx_transaction_id=f"mock_{uuid.uuid4().hex[:16]}",
            status="success",
            raw_callback=json.dumps({"mock": True}),
        )
    )
    db.commit()
    db.refresh(o)
    return _to_detail(o, current_user)


@router.post("/{order_id}/accept", response_model=OrderDetail)
def accept_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if not (current_user.photographer and o.photographer_id == current_user.photographer.id):
        raise HTTPException(status_code=403, detail="只有接单摄影师可以确认")
    if o.status != OrderStatus.PENDING_CONFIRM.value:
        raise HTTPException(status_code=400, detail="订单状态不允许接单")
    o.status = OrderStatus.ACCEPTED.value
    o.accepted_at = datetime.utcnow()
    db.commit()
    db.refresh(o)
    return _to_detail(o, current_user)


@router.post("/{order_id}/reject", response_model=OrderDetail)
def reject_order(
    order_id: int,
    data: OrderRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if not (current_user.photographer and o.photographer_id == current_user.photographer.id):
        raise HTTPException(status_code=403, detail="只有接单摄影师可以拒单")
    if o.status != OrderStatus.PENDING_CONFIRM.value:
        raise HTTPException(status_code=400, detail="订单状态不允许拒单")
    o.status = OrderStatus.REJECTED.value
    o.reject_reason = data.reason
    o.cancelled_at = datetime.utcnow()
    db.commit()
    db.refresh(o)
    return _to_detail(o, current_user)


def _do_deliver(
    o: Order,
    data: OrderDeliverRequest,
    db: Session,
    current_user: User,
) -> Order:
    if not (current_user.photographer and o.photographer_id == current_user.photographer.id):
        raise HTTPException(status_code=403, detail="只有接单摄影师可以交付成片")
    if o.status != OrderStatus.ACCEPTED.value:
        raise HTTPException(status_code=400, detail="订单状态不允许交付")
    if not data.preview_images:
        raise HTTPException(status_code=400, detail="至少上传 1 张水印预览图")
    if not data.delivery_url or not data.delivery_url.strip():
        raise HTTPException(status_code=400, detail="请填写百度云链接")

    o.status = OrderStatus.SHOOTING_DONE.value
    o.completed_at = datetime.utcnow()
    o.delivery_at = datetime.utcnow()
    o.delivery_url = data.delivery_url.strip()
    o.delivery_password = (data.delivery_password or "").strip() or None
    o.delivery_note = (data.delivery_note or "").strip() or None
    o.delivery_preview_images = json.dumps(data.preview_images, ensure_ascii=False)
    db.commit()
    db.refresh(o)
    return o


@router.post("/{order_id}/deliver", response_model=OrderDetail)
def deliver_order(
    order_id: int,
    data: OrderDeliverRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """摄影师上传成片(预览图 + 百度云链接 + 提取码 + 备注)。

    用户在订单详情页可以看到预览图,但 delivery_url 和 delivery_password
    在用户确认收片或评价之前会被 API 层屏蔽。
    """
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    o = _do_deliver(o, data, db, current_user)
    return _to_detail(o, current_user)


@router.post("/{order_id}/complete", response_model=OrderDetail, deprecated=True)
def complete_order(
    order_id: int,
    data: OrderCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """旧版仅含 delivery_url 的接口,保留兼容。新代码请用 /deliver。"""
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    deliver_data = OrderDeliverRequest(
        preview_images=[],
        delivery_url=data.delivery_url or "",
    )
    o = _do_deliver(o, deliver_data, db, current_user)
    return _to_detail(o, current_user)


@router.post("/{order_id}/cancel", response_model=OrderDetail)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    o = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")

    now = datetime.utcnow()

    if o.status == OrderStatus.PENDING_PAY.value:
        o.status = OrderStatus.CANCELLED.value
        o.cancelled_at = now
        db.commit()
        db.refresh(o)
        return _to_detail(o, current_user)

    if o.status == OrderStatus.ACCEPTED.value:
        cutoff = datetime.combine(o.shoot_date, datetime.min.time()) - timedelta(hours=48)
        if now > cutoff:
            raise HTTPException(status_code=400, detail="拍摄前 48 小时内不可取消")
        o.status = OrderStatus.USER_CANCELLED.value
        o.cancelled_at = now
        # TODO: 触发微信支付退款,这里只标记状态
        o.status = OrderStatus.REFUNDED.value
        db.commit()
        db.refresh(o)
        return _to_detail(o, current_user)

    raise HTTPException(status_code=400, detail="当前状态不允许取消")


@router.post("/{order_id}/confirm", response_model=OrderDetail)
def confirm_delivery(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """用户确认收片(也是评价之外的提前结算入口)。"""
    o = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if o.status != OrderStatus.SHOOTING_DONE.value:
        raise HTTPException(status_code=400, detail="订单状态不允许确认")
    o.status = OrderStatus.AUTO_SETTLED.value
    o.confirmed_at = datetime.utcnow()
    o.settled_at = datetime.utcnow()
    if o.photographer:
        o.photographer.completed_orders = (o.photographer.completed_orders or 0) + 1
    db.commit()
    db.refresh(o)
    return _to_detail(o, current_user)


@router.post("/{order_id}/review", response_model=OrderDetail)
def review_order(
    order_id: int,
    data: OrderReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    o = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if o.status not in (OrderStatus.SHOOTING_DONE.value, OrderStatus.AUTO_SETTLED.value):
        raise HTTPException(status_code=400, detail="当前状态不允许评价")
    if not (1 <= data.rating <= 5):
        raise HTTPException(status_code=400, detail="评分应在 1-5 星")

    review = Review(
        order_id=o.id,
        user_id=o.user_id,
        photographer_id=o.photographer_id,
        rating=data.rating,
        text=data.text,
        tags=json.dumps(data.tags or [], ensure_ascii=False),
        images=json.dumps(data.images or [], ensure_ascii=False),
    )
    db.add(review)

    if o.photographer:
        cnt = (o.photographer.review_count or 0) + 1
        old_avg = o.photographer.avg_rating or 5.0
        o.photographer.avg_rating = round((old_avg * (cnt - 1) + data.rating) / cnt, 2)
        o.photographer.review_count = cnt
        if o.status == OrderStatus.SHOOTING_DONE.value:
            o.photographer.completed_orders = (o.photographer.completed_orders or 0) + 1

    o.status = OrderStatus.REVIEWED.value
    o.confirmed_at = o.confirmed_at or datetime.utcnow()
    o.settled_at = datetime.utcnow()
    db.commit()
    db.refresh(o)
    return _to_detail(o, current_user)


@router.post("/cron/timeout-pending-pay", response_model=OkResponse)
def cron_timeout_pending_pay(db: Session = Depends(get_db)):
    """定时任务调用:把超过 30 分钟未支付的订单置为 cancelled。"""
    cutoff = datetime.utcnow() - timedelta(minutes=settings.PAY_TIMEOUT_MINUTES)
    rows = (
        db.query(Order)
        .filter(Order.status == OrderStatus.PENDING_PAY.value, Order.created_at < cutoff)
        .all()
    )
    for o in rows:
        o.status = OrderStatus.CANCELLED.value
        o.cancelled_at = datetime.utcnow()
    db.commit()
    return OkResponse(ok=True, message=f"已取消 {len(rows)} 单")
