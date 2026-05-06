"""SystemConfig 读写服务。

设计原则:
- 命中 DB 优先, fallback 到 .env / 默认。
- 进程内 LRU 缓存, set 后会清理避免脏读。
- 所有 key 必须先在 KNOWN_CONFIGS 注册, 才会出现在后台编辑页。
"""
from __future__ import annotations

import json
from threading import Lock
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models.system_config import SystemConfig


# 已知配置项目录(决定后台编辑页展示什么)
# 字段:key, value_type, label, description, fallback_attr_in_settings
KNOWN_CONFIGS: list[dict[str, Any]] = [
    {
        "key": "default_commission_rate",
        "type": "rate",
        "label": "平台默认抽佣比例",
        "description": "0.08 = 8%。摄影师/套餐都没单独设置时使用这个值。",
        "fallback_attr": "DEFAULT_COMMISSION_RATE",
    },
    {
        "key": "pay_timeout_minutes",
        "type": "int",
        "label": "支付超时(分钟)",
        "description": "下单后 N 分钟内未支付自动取消。",
        "fallback_attr": "PAY_TIMEOUT_MINUTES",
    },
    {
        "key": "accept_timeout_hours",
        "type": "int",
        "label": "摄影师接单超时(小时)",
        "description": "用户付款后 N 小时摄影师未接单, 系统自动退款 + 警告处罚。",
        "fallback_attr": "ACCEPT_TIMEOUT_HOURS",
    },
    {
        "key": "auto_confirm_days",
        "type": "int",
        "label": "自动确认收片天数",
        "description": "摄影师交付后 N 天用户未确认 / 未申诉, 自动确认收片。",
        "fallback_attr": "AUTO_CONFIRM_DAYS",
    },
    {
        "key": "warning_auto_freeze_threshold",
        "type": "int",
        "label": "累计警告自动下架阈值",
        "description": "摄影师累计 N 次「警告」级处罚后自动下架。",
        "fallback_attr": None,
        "default": 3,
    },
    {
        "key": "settlement_period_days",
        "type": "int",
        "label": "结算周期(天)",
        "description": "默认结算周期长度, 用于生成结算单。",
        "fallback_attr": None,
        "default": 7,
    },
]

KNOWN_KEYS = {c["key"] for c in KNOWN_CONFIGS}

_cache: dict[str, Any] = {}
_cache_lock = Lock()


def _read_db(session: Session, key: str) -> Any | None:
    row = session.query(SystemConfig).filter(SystemConfig.key == key).first()
    if not row:
        return None
    try:
        return json.loads(row.value)
    except Exception:
        return None


def _config_meta(key: str) -> dict[str, Any]:
    for c in KNOWN_CONFIGS:
        if c["key"] == key:
            return c
    return {"key": key, "type": "raw", "fallback_attr": None}


def _resolve_fallback(meta: dict[str, Any]) -> Any:
    if "default" in meta and meta["default"] is not None:
        return meta["default"]
    attr = meta.get("fallback_attr")
    if not attr:
        return None
    return getattr(get_settings(), attr, None)


def get_config(key: str, default: Any | None = None, session: Session | None = None) -> Any:
    with _cache_lock:
        if key in _cache:
            return _cache[key]

    own_session = False
    if session is None:
        session = SessionLocal()
        own_session = True
    try:
        v = _read_db(session, key)
    finally:
        if own_session:
            session.close()

    if v is None:
        meta = _config_meta(key)
        v = _resolve_fallback(meta)
        if v is None:
            v = default

    with _cache_lock:
        _cache[key] = v
    return v


def set_config(
    key: str,
    value: Any,
    operator_id: int | None,
    session: Session,
    description: str | None = None,
) -> None:
    row = session.query(SystemConfig).filter(SystemConfig.key == key).first()
    val_str = json.dumps(value, ensure_ascii=False)
    if row:
        row.value = val_str
        row.updated_by = operator_id
        if description is not None:
            row.description = description
    else:
        row = SystemConfig(
            key=key,
            value=val_str,
            description=description,
            updated_by=operator_id,
        )
        session.add(row)
    session.flush()
    with _cache_lock:
        _cache.pop(key, None)


def invalidate_cache(key: str | None = None) -> None:
    with _cache_lock:
        if key is None:
            _cache.clear()
        else:
            _cache.pop(key, None)


def get_known_configs(session: Session) -> list[dict[str, Any]]:
    """返回 KNOWN_CONFIGS + 当前生效值, 给后台页面渲染。"""
    rows = {r.key: r for r in session.query(SystemConfig).all()}
    out = []
    for meta in KNOWN_CONFIGS:
        key = meta["key"]
        row = rows.get(key)
        if row:
            try:
                current = json.loads(row.value)
            except Exception:
                current = None
            updated_at = row.updated_at
        else:
            current = None
            updated_at = None
        fallback = _resolve_fallback(meta)
        out.append(
            {
                **meta,
                "current": current,
                "fallback": fallback,
                "effective": current if current is not None else fallback,
                "updated_at": updated_at,
            }
        )
    return out
