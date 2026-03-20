#!/bin/bash
set -e

APP_DIR="/opt/grade-analysis-web"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "========================================="
echo "  学习成绩分析系统 - Ubuntu 部署脚本"
echo "========================================="

# 1. 安装系统依赖
echo ""
echo "[1/7] 安装系统依赖..."
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx nodejs npm

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Node.js 版本过低 ($(node -v))，正在安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "  Python: $(python3 --version)"
echo "  Node.js: $(node -v)"
echo "  npm: $(npm -v)"

# 2. 创建部署目录
echo ""
echo "[2/7] 部署项目文件..."
sudo mkdir -p $APP_DIR
sudo cp -r "$REPO_DIR/backend" $APP_DIR/
sudo cp -r "$REPO_DIR/frontend" $APP_DIR/
sudo chown -R www-data:www-data $APP_DIR

# 3. 后端设置
echo ""
echo "[3/7] 安装后端依赖..."
cd $APP_DIR/backend
sudo -u www-data python3 -m venv venv
sudo -u www-data venv/bin/pip install --upgrade pip -q
sudo -u www-data venv/bin/pip install -r requirements.txt -q
echo "  后端依赖安装完成"

# 4. 初始化数据库
echo ""
echo "[4/7] 初始化数据库..."
sudo -u www-data venv/bin/python seed_data.py
sudo -u www-data venv/bin/python seed_regions_full.py

# 5. 前端构建
echo ""
echo "[5/7] 构建前端..."
cd $APP_DIR/frontend
sudo -u www-data npm install --silent 2>/dev/null
sudo -u www-data npm run build
echo "  前端构建完成"

# 6. 配置 Nginx
echo ""
echo "[6/7] 配置 Nginx..."
sudo cp "$REPO_DIR/deploy/nginx.conf" /etc/nginx/sites-available/grade-analysis
sudo ln -sf /etc/nginx/sites-available/grade-analysis /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "  Nginx 配置完成"

# 7. 配置 systemd 服务
echo ""
echo "[7/7] 配置系统服务..."
sudo cp "$REPO_DIR/deploy/grade-analysis.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable grade-analysis
sudo systemctl restart grade-analysis
echo "  服务启动完成"

# 完成
echo ""
echo "========================================="
echo "  部署完成！"
echo "========================================="
echo ""
echo "  访问地址: http://$(hostname -I | awk '{print $1}')"
echo "  API 文档: http://$(hostname -I | awk '{print $1}')/api/docs"
echo ""
echo "  管理命令:"
echo "    查看状态: sudo systemctl status grade-analysis"
echo "    查看日志: sudo journalctl -u grade-analysis -f"
echo "    重启后端: sudo systemctl restart grade-analysis"
echo "    重启Nginx: sudo systemctl restart nginx"
echo ""
echo "  配置文件:"
echo "    后端环境: $APP_DIR/backend/.env"
echo "    Nginx:   /etc/nginx/sites-available/grade-analysis"
echo "    服务:    /etc/systemd/system/grade-analysis.service"
echo ""
