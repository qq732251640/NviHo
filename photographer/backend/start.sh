#!/usr/bin/env bash
# 本地开发启动脚本(带 --reload, 仅 Mac 本地用)
# 服务器请用 ./deploy_server.sh + systemd 管理服务,不要跑这个
set -e

cd "$(dirname "$0")"

# 防呆: 服务器上 systemd 已经在跑就提示走正规流程
if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet photographer-backend 2>/dev/null; then
        echo "⚠️  systemd 服务 photographer-backend 已经在运行(8001 端口已占用)。"
        echo "    本机看起来是服务器,生产环境请用 systemd 管理:"
        echo ""
        echo "    systemctl status photographer-backend       # 看状态"
        echo "    systemctl restart photographer-backend      # 重启"
        echo "    journalctl -u photographer-backend -f       # 看实时日志"
        echo ""
        echo "    如要拉新代码部署,跑: ./deploy_server.sh"
        echo ""
        echo "    本脚本仅供 Mac 本地开发(带 --reload)使用,已退出。"
        exit 0
    fi
fi

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
