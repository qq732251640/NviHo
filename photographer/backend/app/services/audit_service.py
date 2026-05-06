"""审计日志写入封装。

调用例:
    from app.services.audit_service import audit_log
    audit_log(
        db, operator_id=user.id,
        action="refund", target_type="order", target_id=o.id,
        summary=f"退款 ¥{amount/100:.0f}",
        details={"reason": reason, "type": refund_type},
    )

不抛异常: 写日志失败不能阻塞业务。
"""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def audit_log(
    db: Session,
    *,
    operator_id: int | None,
    action: str,
    target_type: str | None = None,
    target_id: int | None = None,
    summary: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    try:
        log = AuditLog(
            operator_id=operator_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            summary=summary,
            details=json.dumps(details, ensure_ascii=False) if details else None,
        )
        db.add(log)
        db.flush()
    except Exception as e:  # 审计失败不能影响业务
        try:
            db.rollback()
        except Exception:
            pass
        print(f"[audit] failed: {e}")
