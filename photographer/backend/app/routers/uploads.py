import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.deps import get_current_user
from app.models.user import User
from app.schemas.upload import UploadSignRequest, UploadSignResponse
from app.services.jd_oss import gen_presigned_put, is_oss_ready, make_object_key

router = APIRouter()

LOCAL_UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "uploads"
LOCAL_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


@router.post("/sign", response_model=UploadSignResponse)
def sign(
    data: UploadSignRequest,
    current_user: User = Depends(get_current_user),
):
    """前端拿到签名 URL 后,直接 PUT 到 OSS / 本地占位接口,不经过本服务带宽。"""
    object_key = make_object_key(data.scope, data.filename)
    info = gen_presigned_put(object_key, data.content_type)
    return UploadSignResponse(**info)


@router.put("/local/{object_key:path}")
async def local_put(object_key: str, request: Request):
    """本地占位:OSS 未开通前接收 PUT 上传。生产环境配上 OSS 后此路由不再被调用。"""
    if is_oss_ready():
        raise HTTPException(status_code=400, detail="OSS 已配置,不应使用本地兜底")

    raw = await request.body()
    target = LOCAL_UPLOAD_ROOT / object_key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    return {"ok": True, "size": len(raw), "url": f"/uploads/{object_key}"}


@router.post("/direct", response_model=UploadSignResponse)
async def upload_direct(
    file: UploadFile = File(...),
    scope: str = "work",
    current_user: User = Depends(get_current_user),
):
    """简易直传(经过后端):用于 OSS 还没开通时的开发联调。"""
    object_key = make_object_key(scope, file.filename or "upload.jpg")
    target = LOCAL_UPLOAD_ROOT / object_key
    target.parent.mkdir(parents=True, exist_ok=True)
    contents = await file.read()
    target.write_bytes(contents)
    return UploadSignResponse(
        upload_url="",
        public_url=f"/uploads/{object_key}",
        object_key=object_key,
        mode="direct_local",
    )
