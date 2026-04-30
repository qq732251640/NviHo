#!/usr/bin/env bash
# 服务器端一键部署脚本
# 用法: ssh root@111.228.10.86 后,在 /data/NviHo/photographer/backend 下执行 ./deploy_server.sh
#
# 适用场景:
# - 首次部署: 创建 venv、装依赖、初始化 .env、跑 seed、安装 systemd 服务
# - 后续更新: 拉新代码后再跑一次,会自动 pip install 新依赖 + 重启服务
set -e

cd "$(dirname "$0")"
BACKEND_DIR=$(pwd)
SERVICE_NAME=photographer-backend

echo "==== 1/5 创建/更新 venv ===="
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
venv/bin/pip install --upgrade pip -q
venv/bin/pip install -q -r requirements.txt
echo "依赖安装完成"

echo "==== 2/5 准备 .env ===="
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "已生成 .env(默认配置, 微信支付/京东云 OSS 走占位模式)"
    echo "★ 第 0 周资质拿到后, 编辑 .env 填入真实凭证"
else
    echo ".env 已存在, 跳过"
fi

echo "==== 3/5 数据库初始化 ===="
NEED_SEED=$(venv/bin/python - <<'PY'
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
    echo "数据库为空, 跑 seed_data.py..."
    venv/bin/python seed_data.py
else
    echo "数据库已有数据, 跳过 seed"
fi

echo "==== 4/5 安装 systemd 服务 ===="
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
if [ ! -f "$SERVICE_FILE" ] || ! cmp -s "${BACKEND_DIR}/${SERVICE_NAME}.service" "$SERVICE_FILE"; then
    cp "${BACKEND_DIR}/${SERVICE_NAME}.service" "$SERVICE_FILE"
    systemctl daemon-reload
    systemctl enable ${SERVICE_NAME}
    echo "systemd 服务已注册"
else
    echo "systemd 服务文件未变, 跳过"
fi

echo "==== 5/5 启动/重启服务 ===="
systemctl restart ${SERVICE_NAME}
sleep 2
if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "✓ ${SERVICE_NAME} 运行中"
    echo ""
    echo "本机自检:"
    curl -fsS http://127.0.0.1:8001/api/pm/health && echo ""
    echo ""
    echo "公网测试(等 nginx 配好后): https://www.xinweijia.net/api/pm/health"
    echo ""
    echo "查看日志: journalctl -u ${SERVICE_NAME} -f"
    echo "重启服务: systemctl restart ${SERVICE_NAME}"
else
    echo "✗ ${SERVICE_NAME} 启动失败, 查看日志:"
    journalctl -u ${SERVICE_NAME} -n 30 --no-pager
    exit 1
fi
