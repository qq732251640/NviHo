"""轻量数据库迁移:给已有的旧表平滑增加新字段(SQLite ALTER TABLE ADD COLUMN)。

新建数据库时 ``Base.metadata.create_all`` 已经创建带新字段的表,本模块只处理升级场景。

调用时机:
- ``app.main`` 模块导入(uvicorn 启动)
- ``seed_data.py`` 跑种子前
- ``deploy_server.sh`` 在 admin 存在性检查之前
"""
from __future__ import annotations

from sqlalchemy import inspect, text

from app.database import engine

SCHEMA_UPDATES: dict[str, list[tuple[str, str]]] = {
    "users": [
        ("user_agreement_version", "VARCHAR(20)"),
        ("user_agreement_accepted_at", "DATETIME"),
        ("banned_at", "DATETIME"),
        ("banned_reason", "VARCHAR(500)"),
    ],
    "pm_photographers": [
        ("photographer_agreement_version", "VARCHAR(20)"),
        ("service_commitment_version", "VARCHAR(20)"),
        ("agreements_accepted_at", "DATETIME"),
        ("commission_rate", "FLOAT"),
    ],
    "pm_packages": [
        ("commission_rate", "FLOAT"),
    ],
    "pm_orders": [
        ("delivery_password", "VARCHAR(50)"),
        ("delivery_preview_images", "TEXT"),
        ("delivery_note", "VARCHAR(500)"),
        ("delivery_at", "DATETIME"),
        ("refund_amount", "INTEGER DEFAULT 0"),
        ("refund_reason", "VARCHAR(500)"),
        ("refunded_at", "DATETIME"),
    ],
    "pm_reviews": [
        ("is_hidden", "INTEGER DEFAULT 0"),
        ("hidden_reason", "VARCHAR(300)"),
        ("hidden_by", "INTEGER"),
        ("hidden_at", "DATETIME"),
    ],
}


def run_migrations() -> None:
    insp = inspect(engine)
    pending: list[tuple[str, str]] = []

    table_names = set(insp.get_table_names())
    for table, cols in SCHEMA_UPDATES.items():
        if table not in table_names:
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


if __name__ == "__main__":
    run_migrations()
    print("[migration] done")
