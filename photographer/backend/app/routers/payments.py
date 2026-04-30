import json
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.payment import Payment
from app.services.wxpay import verify_callback

router = APIRouter()


@router.post("/wx-callback")
async def wx_callback(request: Request, db: Session = Depends(get_db)):
    """微信支付异步通知。

    生产模式: 验签后根据 transaction_id 推进订单到 pending_confirm。
    占位模式: 直接信任请求体里的 order_no + amount(便于本地联调)。
    """
    raw = await request.body()
    parsed = verify_callback(raw, dict(request.headers))
    if not parsed:
        return {"code": "FAIL", "message": "verify failed"}

    order_no = parsed.get("order_no") or parsed.get("out_trade_no")
    amount = parsed.get("amount") or parsed.get("total")
    transaction_id = parsed.get("transaction_id") or parsed.get("wx_transaction_id", "mock")

    o = db.query(Order).filter(Order.order_no == order_no).first()
    if not o:
        return {"code": "FAIL", "message": "order not found"}

    if o.status == OrderStatus.PENDING_PAY.value:
        o.status = OrderStatus.PENDING_CONFIRM.value
        o.paid_at = datetime.utcnow()
        db.add(
            Payment(
                order_id=o.id,
                type="pay",
                amount=amount or o.amount_total,
                wx_transaction_id=transaction_id,
                status="success",
                raw_callback=json.dumps(parsed, ensure_ascii=False),
            )
        )
        db.commit()
    return {"code": "SUCCESS", "message": "OK"}
