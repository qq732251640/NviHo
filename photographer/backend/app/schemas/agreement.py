from pydantic import BaseModel


CURRENT_USER_AGREEMENT_VERSION = "v1.0"
CURRENT_PHOTOGRAPHER_AGREEMENT_VERSION = "v1.0"
CURRENT_SERVICE_COMMITMENT_VERSION = "v1.0"


class AgreementContent(BaseModel):
    type: str
    title: str
    version: str
    content_md: str
    effective_date: str = "2026-05-06"


class AcceptUserAgreementRequest(BaseModel):
    version: str
