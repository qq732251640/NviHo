"""京东云 OSS 上传服务封装。

第 0 周拿到 OSS access key 之前,走"本地占位"模式:
- 后端返回一个本地伪造的 upload_url (实际上是后端的 /api/pm/uploads/local 接口)
- 客户端 PUT 上去后,文件落到本地 uploads/ 目录,返回相对路径作为 public_url
- 上线前补全 .env 里的 JD_OSS_* 配置后,自动切到真实 OSS 直传模式
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime

from app.config import get_settings

settings = get_settings()


def is_oss_ready() -> bool:
    return bool(
        settings.JD_OSS_ACCESS_KEY
        and settings.JD_OSS_SECRET_KEY
        and settings.JD_OSS_ENDPOINT
        and settings.JD_OSS_BUCKET
    )


def make_object_key(scope: str, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower() or ".jpg"
    today = datetime.now().strftime("%Y%m%d")
    return f"{scope}/{today}/{uuid.uuid4().hex}{ext}"


def gen_presigned_put(object_key: str, content_type: str = "image/jpeg") -> dict:
    """生成 PUT 直传签名 URL。

    生产模式:调用 jdcloud-sdk-python 生成真实签名(待 OSS 开通后接入)。
    占位模式:返回后端本地兜底接口地址。
    """
    if is_oss_ready():
        # TODO: 在第 0 周拿到 OSS 凭证后接入 jdcloud-sdk
        # from jdcloud_sdk.services.oss.client.OssClient import OssClient
        # ...
        upload_url = f"{settings.JD_OSS_ENDPOINT}/{settings.JD_OSS_BUCKET}/{object_key}"
        public_url = (
            f"https://{settings.JD_OSS_CDN_DOMAIN}/{object_key}"
            if settings.JD_OSS_CDN_DOMAIN
            else upload_url
        )
        return {
            "upload_url": upload_url,
            "public_url": public_url,
            "object_key": object_key,
            "headers": {"Content-Type": content_type},
            "mode": "oss_presigned",
        }

    upload_url = f"/api/pm/uploads/local/{object_key}"
    public_url = f"/uploads/{object_key}"
    return {
        "upload_url": upload_url,
        "public_url": public_url,
        "object_key": object_key,
        "headers": {"Content-Type": content_type},
        "mode": "local_fallback",
    }
