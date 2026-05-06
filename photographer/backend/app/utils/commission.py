"""佣金率三层 fallback 计算工具。

优先级:套餐 commission_rate > 摄影师 commission_rate > 全局默认(.env)
下单时计算一次, snapshot 到订单上, 之后改任何一层都不影响历史订单。
"""
from __future__ import annotations

from app.config import get_settings
from app.models.package import Package
from app.models.photographer import Photographer


def resolve_commission_rate(
    package: Package | None = None,
    photographer: Photographer | None = None,
) -> float:
    """返回最终生效的抽佣比例 (0.0 ~ 1.0)。"""
    if package is not None and package.commission_rate is not None:
        return float(package.commission_rate)
    if photographer is not None and photographer.commission_rate is not None:
        return float(photographer.commission_rate)
    return float(get_settings().DEFAULT_COMMISSION_RATE)
