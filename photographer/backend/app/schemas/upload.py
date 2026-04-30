from pydantic import BaseModel


class UploadSignRequest(BaseModel):
    filename: str
    content_type: str = "image/jpeg"
    scope: str = "work"


class UploadSignResponse(BaseModel):
    upload_url: str
    public_url: str
    object_key: str
    headers: dict[str, str] = {}
    expires_in: int = 600
    mode: str = "oss_presigned"
