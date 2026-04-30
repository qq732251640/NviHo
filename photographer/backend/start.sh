#!/usr/bin/env bash
# 本地开发启动脚本
set -e

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "已生成 .env,首次运行可保持默认配置"
fi

# 用 admin 账号是否存在判断要不要 seed(避免 uvicorn 自动建空表后误以为已 seed)
NEED_SEED=$(python - <<'PY'
import sys
sys.path.insert(0, '.')
try:
    from app.database import SessionLocal
    from app.models.user import User
    db = SessionLocal()
    n = db.query(User).filter(User.username == 'admin').count()
    db.close()
    print('1' if n == 0 else '0')
except Exception:
    print('1')
PY
)
if [ "$NEED_SEED" = "1" ]; then
    echo "[start] 数据库为空,跑 seed_data.py 初始化品类和示例摄影师..."
    python seed_data.py
fi

uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
