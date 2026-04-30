import secrets
from datetime import datetime


def gen_order_no() -> str:
    """生成订单号: PM + yyyyMMddHHmmss + 6位随机"""
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    rand = secrets.randbelow(1_000_000)
    return f"PM{ts}{rand:06d}"
