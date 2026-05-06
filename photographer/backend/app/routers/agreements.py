"""协议查询与接受。

3 份协议的 markdown 文档放在 photographer/docs/agreements/ 下,
本路由直接读取文件返回给前端展示。
"""
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.agreement import (
    CURRENT_USER_AGREEMENT_VERSION,
    CURRENT_PHOTOGRAPHER_AGREEMENT_VERSION,
    CURRENT_SERVICE_COMMITMENT_VERSION,
    AcceptUserAgreementRequest,
    AgreementContent,
)

router = APIRouter()

# docs 目录路径(相对 backend/app/routers/agreements.py 三层)
AGREEMENTS_DIR = (
    Path(__file__).resolve().parents[3] / "docs" / "agreements"
)


_AGREEMENT_META = {
    "user": {
        "title": "用户协议",
        "version": CURRENT_USER_AGREEMENT_VERSION,
        "filename": "用户协议.md",
    },
    "photographer": {
        "title": "摄影师入驻协议",
        "version": CURRENT_PHOTOGRAPHER_AGREEMENT_VERSION,
        "filename": "摄影师入驻协议.md",
    },
    "service_commitment": {
        "title": "服务承诺书",
        "version": CURRENT_SERVICE_COMMITMENT_VERSION,
        "filename": "服务承诺书.md",
    },
}


@router.get("/{agreement_type}", response_model=AgreementContent)
def get_agreement(agreement_type: str):
    meta = _AGREEMENT_META.get(agreement_type)
    if not meta:
        raise HTTPException(status_code=404, detail="未知的协议类型")
    path = AGREEMENTS_DIR / meta["filename"]
    if not path.exists():
        raise HTTPException(status_code=500, detail=f"协议文件缺失: {meta['filename']}")
    return AgreementContent(
        type=agreement_type,
        title=meta["title"],
        version=meta["version"],
        content_md=path.read_text(encoding="utf-8"),
    )


@router.post("/user/accept")
def accept_user_agreement(
    data: AcceptUserAgreementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """用户接受用户协议。一般在首次下单或注册后引导接受。"""
    current_user.user_agreement_version = data.version
    current_user.user_agreement_accepted_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "accepted_version": data.version}
