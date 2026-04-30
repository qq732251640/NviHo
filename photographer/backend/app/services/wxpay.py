"""微信支付封装。

第 0 周申请到商户号之前走 mock 模式:订单创建时直接打回一组占位的支付参数,
小程序端调用 wx.requestPayment 会失败,但订单流程可以通过手动调
POST /api/pm/orders/{id}/mock-pay 来推进到 pending_confirm,方便端到端联调。
"""

from __future__ import annotations

import time
import uuid
from typing import Any

from app.config import get_settings
from app.models.order import Order

settings = get_settings()


def is_wxpay_ready() -> bool:
    return bool(settings.WX_MCH_ID and settings.WX_MCH_KEY)


def create_jsapi_order(order: Order, openid: str) -> dict[str, Any]:
    """生成 JSAPI 支付参数(prepay_id + 签名)。"""
    if is_wxpay_ready():
        # TODO: 第 0 周接入 wechatpayv3 SDK
        # from wechatpayv3 import WeChatPay, WeChatPayType
        # ...
        prepay_id = "prepay_id_REAL_TODO"
    else:
        prepay_id = f"prepay_id_mock_{order.order_no}"

    timestamp = str(int(time.time()))
    nonce_str = uuid.uuid4().hex
    package = f"prepay_id={prepay_id}"

    return {
        "timeStamp": timestamp,
        "nonceStr": nonce_str,
        "package": package,
        "signType": "RSA",
        "paySign": "MOCK_SIGN",
        "order_no": order.order_no,
        "mock": not is_wxpay_ready(),
    }


def verify_callback(raw_body: bytes, headers: dict[str, str]) -> dict[str, Any] | None:
    """验证微信支付回调签名,返回标准化结果或 None(签名失败)。

    生产模式:用商户证书 + nonce 验签(待接入 wechatpayv3.notify)。
    占位模式:直接信任 body 里的 JSON,便于本地联调。
    """
    if is_wxpay_ready():
        # TODO: from wechatpayv3 import notify; notify.parse(...)
        return None

    import json

    try:
        return json.loads(raw_body.decode("utf-8"))
    except Exception:
        return None
