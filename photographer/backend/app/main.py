from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.config import get_settings
from app.database import Base, engine
from app.models import (  # noqa: F401  (触发 metadata 注册)
    Category,
    Favorite,
    Order,
    Package,
    Payment,
    Photographer,
    Review,
    Schedule,
    User,
    Work,
)
from app.admin.router import router as admin_ssr_router
from app.routers import (
    admin,
    agreements,
    auth,
    categories,
    orders,
    payments,
    pgr,
    photographers,
    uploads,
)

settings = get_settings()

Base.metadata.create_all(bind=engine)


def _run_migrations():
    """给已有的旧表平滑增加新字段(SQLite ALTER TABLE ADD COLUMN)。

    新建数据库时 Base.metadata.create_all 已经创建带新字段的表,这里只处理升级场景。
    """
    insp = inspect(engine)
    pending: list[tuple[str, str]] = []

    schema_updates = {
        "users": [
            ("user_agreement_version", "VARCHAR(20)"),
            ("user_agreement_accepted_at", "DATETIME"),
        ],
        "pm_photographers": [
            ("photographer_agreement_version", "VARCHAR(20)"),
            ("service_commitment_version", "VARCHAR(20)"),
            ("agreements_accepted_at", "DATETIME"),
        ],
        "pm_orders": [
            ("delivery_password", "VARCHAR(50)"),
            ("delivery_preview_images", "TEXT"),
            ("delivery_note", "VARCHAR(500)"),
            ("delivery_at", "DATETIME"),
        ],
    }

    for table, cols in schema_updates.items():
        if table not in insp.get_table_names():
            continue
        existing = {c["name"] for c in insp.get_columns(table)}
        for col_name, col_type in cols:
            if col_name not in existing:
                pending.append((table, f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))

    if not pending:
        return
    with engine.begin() as conn:
        for table, sql in pending:
            try:
                conn.execute(text(sql))
                print(f"[migration] {table}: {sql}")
            except Exception as e:
                print(f"[migration] 跳过 {sql}: {e}")


_run_migrations()

app = FastAPI(
    title="摄影师预约小程序后端",
    version="0.1.0",
    description="API 前缀 /api/pm/*",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/pm-uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="pm-uploads")

app.include_router(auth.router, prefix="/api/pm/auth", tags=["认证"])
app.include_router(agreements.router, prefix="/api/pm/agreements", tags=["协议"])
app.include_router(categories.router, prefix="/api/pm/categories", tags=["品类字典"])
app.include_router(photographers.router, prefix="/api/pm/photographers", tags=["摄影师"])
app.include_router(orders.router, prefix="/api/pm/orders", tags=["订单"])
app.include_router(payments.router, prefix="/api/pm/pay", tags=["支付"])
app.include_router(uploads.router, prefix="/api/pm/uploads", tags=["上传"])
app.include_router(pgr.router, prefix="/api/pm/pgr", tags=["摄影师自助"])
app.include_router(admin.router, prefix="/api/pm/admin", tags=["运营后台 API"])

app.include_router(admin_ssr_router, prefix="/admin", include_in_schema=False)


@app.get("/api/pm/health")
def health():
    return {"status": "ok", "service": "photographer-backend"}
